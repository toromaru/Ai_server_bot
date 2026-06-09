/**
 * サーバービルダー（メインオーケストレーター）
 * ロール・チャンネル・権限の生成を統合管理し、進捗表示とロールバック機能を提供する
 */

const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder, ChannelType } = require('discord.js');
const { generateRoles } = require('./roleGenerator');
const { generateChannels } = require('./channelGenerator');
const { setupPermissions } = require('./permissionGenerator');
const { COLORS } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * サーバー構造を構築する
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - コマンドインタラクション
 * @param {Object} serverStructure - AIが生成したサーバー構造
 * @param {boolean} clearServer - 既存の構成を削除するかどうか
 */
async function buildServer(interaction, serverStructure, clearServer = false) {
  const guild = interaction.guild;
  const allErrors = [];
  let roleResult = null;
  let channelResult = null;
  let permissionResult = null;

  // 進捗表示用Embedを作成
  const progressEmbed = new EmbedBuilder()
    .setTitle(`🏗️ サーバー構築中: ${serverStructure.serverName}`)
    .setDescription('サーバーを自動生成しています...')
    .setColor(COLORS.primary)
    .setTimestamp();

  try {
    // === Step 0: 既存構成のクリア（オプション） ===
    if (clearServer) {
      progressEmbed.setFields([
        { name: 'ステータス', value: '🗑️ 既存のチャンネルとロールを削除中...' },
      ]);
      await interaction.editReply({ embeds: [progressEmbed], components: [] });

      // コマンドを実行したチャンネル以外を削除
      const channelsToDelete = guild.channels.cache.filter(ch => ch.id !== interaction.channelId);
      for (const [, channel] of channelsToDelete) {
        try {
          await channel.delete('Genesis AI - 既存構成のクリア');
        } catch (e) {
          logger.warn(`チャンネル ${channel.name} の削除に失敗: ${e.message}`);
        }
      }

      // 削除可能なロールを削除（@everyoneやBot管理ロールは除く）
      const rolesToDelete = guild.roles.cache.filter(role => !role.managed && role.id !== guild.id && role.editable);
      for (const [, role] of rolesToDelete) {
        try {
          await role.delete('Genesis AI - 既存構成のクリア');
        } catch (e) {
          logger.warn(`ロール ${role.name} の削除に失敗: ${e.message}`);
        }
      }
    }

    // === Step 1: ロール作成 ===
    progressEmbed.setFields([
      { name: 'ステータス', value: (clearServer ? '✅ 既存構成のクリア完了\n' : '') + '🔄 ロール作成中...' },
    ]);
    await interaction.editReply({ embeds: [progressEmbed], components: [] });

    roleResult = await generateRoles(guild, serverStructure.roles);
    allErrors.push(...roleResult.errors);

    // ロール作成が完全に失敗した場合はロールバック
    if (roleResult.created.size === 0 && serverStructure.roles?.length > 0) {
      throw new Error('ロール作成が全て失敗しました。構築を中止します。');
    }

    // === Step 2: チャンネル作成 ===
    progressEmbed.setFields([
      { name: 'ステータス', value: '✅ ロール作成完了\n🔄 チャンネル作成中...' },
    ]);
    await interaction.editReply({ embeds: [progressEmbed], components: [] });

    channelResult = await generateChannels(guild, serverStructure.categories);
    allErrors.push(...channelResult.errors);

    // チャンネル作成が完全に失敗した場合はロールバック
    if (channelResult.created.categories === 0 && serverStructure.categories?.length > 0) {
      throw new Error('チャンネル作成が全て失敗しました。ロールバックを実行します。');
    }

    // === Step 3: 権限設定 ===
    progressEmbed.setFields([
      { name: 'ステータス', value: '✅ ロール作成完了\n✅ チャンネル作成完了\n🔄 権限設定中...' },
    ]);
    await interaction.editReply({ embeds: [progressEmbed], components: [] });

    permissionResult = await setupPermissions(
      guild,
      channelResult.categoryMap,
      roleResult.created,
      serverStructure.categories,
    );
    allErrors.push(...permissionResult.errors);

    // === Step 4: 完了サマリーの作成 ===
    const hasErrors = allErrors.length > 0;
    const summaryColor = hasErrors ? COLORS.warning : COLORS.success;

    const summaryEmbed = new EmbedBuilder()
      .setTitle(`${hasErrors ? '⚠️' : '✅'} サーバー構築${hasErrors ? '完了（一部エラー）' : '完了'}`)
      .setDescription(serverStructure.description || 'サーバーが正常に構築されました。')
      .setColor(summaryColor)
      .setTimestamp();

    // サーバー名
    summaryEmbed.addFields({
      name: '🏠 サーバー名',
      value: serverStructure.serverName || guild.name,
      inline: true,
    });

    // ロール情報
    const roleNames = [...roleResult.created.keys()].map(name => `\`${name}\``).join(', ') || 'なし';
    summaryEmbed.addFields({
      name: `👥 ロール (${roleResult.created.size}個)`,
      value: roleNames,
      inline: false,
    });

    // チャンネル情報
    summaryEmbed.addFields({
      name: '📁 カテゴリ・チャンネル',
      value: `カテゴリ: ${channelResult.created.categories}個 / チャンネル: ${channelResult.created.channels}個`,
      inline: false,
    });

    // 権限設定情報
    summaryEmbed.addFields({
      name: '🔒 権限設定',
      value: `${permissionResult.configured}件 設定完了`,
      inline: true,
    });

    // 推奨BOT
    if (serverStructure.suggestedBots && serverStructure.suggestedBots.length > 0) {
      const botList = serverStructure.suggestedBots
        .map(bot => `• **${bot.name}** - ${bot.reason || bot.description || ''}`)
        .join('\n');
      summaryEmbed.addFields({
        name: '🤖 推奨BOT',
        value: botList,
        inline: false,
      });
    }

    // 初期ルール
    if (serverStructure.rules && serverStructure.rules.length > 0) {
      const rulesList = serverStructure.rules
        .map((rule, i) => `${i + 1}. ${rule}`)
        .join('\n');
      summaryEmbed.addFields({
        name: '📜 初期ルール',
        value: rulesList.length > 1024 ? rulesList.substring(0, 1021) + '...' : rulesList,
        inline: false,
      });
    }

    // エラー情報
    if (allErrors.length > 0) {
      const errorText = allErrors.map(e => `• ${e}`).join('\n');
      summaryEmbed.addFields({
        name: `⚠️ エラー (${allErrors.length}件)`,
        value: errorText.length > 1024 ? errorText.substring(0, 1021) + '...' : errorText,
        inline: false,
      });
    }

    // === 永久な招待リンクの作成と保存 ===
    try {
      // 最初のテキストチャンネルを探す
      const textChannel = guild.channels.cache.find(ch => ch.type === ChannelType.GuildText);
      if (textChannel) {
        // 永久リンクを作成 (maxAge: 0 = 無期限, maxUses: 0 = 無制限)
        const invite = await textChannel.createInvite({ maxAge: 0, maxUses: 0, unique: true });
        
        // 招待リンクを Embed に追加
        summaryEmbed.addFields({
          name: '🔗 永久招待リンク',
          value: invite.url,
          inline: false,
        });

        // ファイルに保存
        const invitesPath = path.join(__dirname, '../../data/invites.json');
        const invitesDir = path.dirname(invitesPath);
        if (!fs.existsSync(invitesDir)) {
          fs.mkdirSync(invitesDir, { recursive: true });
        }
        
        let invitesList = [];
        if (fs.existsSync(invitesPath)) {
          invitesList = JSON.parse(fs.readFileSync(invitesPath, 'utf-8'));
        }
        
        invitesList.push({
          guildId: guild.id,
          guildName: serverStructure.serverName || guild.name,
          theme: serverStructure.description || '不明',
          inviteUrl: invite.url,
          createdAt: new Date().toISOString()
        });
        
        fs.writeFileSync(invitesPath, JSON.stringify(invitesList, null, 2), 'utf-8');
        logger.info(`永久招待リンクを保存しました: ${invite.url}`);
      }
    } catch (inviteError) {
      logger.error('招待リンクの作成・保存に失敗:', inviteError);
    }

    await interaction.editReply({ embeds: [summaryEmbed], components: [] });
    logger.info(`サーバー構築完了: ${serverStructure.serverName} (エラー: ${allErrors.length}件)`);

    // 自動退出
    try {
      await guild.leave();
      logger.info(`ギルド ${guild.name} (${guild.id}) から自動退出しました`);
    } catch (leaveError) {
      logger.error('ギルドからの退出に失敗:', leaveError);
    }
  } catch (error) {
    logger.error('サーバー構築中に致命的エラーが発生:', error);

    // ロールバック実行
    try {
      await rollback(
        guild,
        roleResult?.created || new Map(),
        channelResult?.categoryMap || new Map(),
      );
    } catch (rollbackError) {
      logger.error('ロールバック中にエラーが発生:', rollbackError);
    }

    // エラーEmbed表示
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ サーバー構築失敗')
      .setDescription(`致命的なエラーが発生したため、構築を中止しました。\n作成済みのロール・チャンネルはロールバックされました。`)
      .setColor(COLORS.error)
      .addFields({
        name: 'エラー詳細',
        value: error.message || '不明なエラー',
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [errorEmbed], components: [] });
  }
}

/**
 * 作成済みのロールとチャンネルをロールバック（削除）する
 * @param {import('discord.js').Guild} guild - 対象のギルド
 * @param {Map<string, import('discord.js').Role>} createdRoles - 作成済みロールのマップ
 * @param {Map<string, import('discord.js').CategoryChannel>} createdChannels - 作成済みカテゴリのマップ
 */
async function rollback(guild, createdRoles, createdChannels) {
  logger.warn('ロールバックを開始します...');

  // チャンネルの削除（カテゴリ内のチャンネルも含む）
  if (createdChannels && createdChannels.size > 0) {
    for (const [name, category] of createdChannels) {
      try {
        // カテゴリ内のチャンネルを先に削除
        const children = guild.channels.cache.filter(ch => ch.parentId === category.id);
        for (const [, child] of children) {
          try {
            await child.delete('Genesis AI - ロールバック');
            logger.info(`チャンネル削除: ${child.name}`);
          } catch (err) {
            logger.error(`チャンネル「${child.name}」の削除に失敗:`, err);
          }
        }

        // カテゴリ自体を削除
        await category.delete('Genesis AI - ロールバック');
        logger.info(`カテゴリ削除: ${name}`);
      } catch (error) {
        logger.error(`カテゴリ「${name}」の削除に失敗:`, error);
      }
    }
  }

  // ロールの削除
  if (createdRoles && createdRoles.size > 0) {
    for (const [name, role] of createdRoles) {
      try {
        await role.delete('Genesis AI - ロールバック');
        logger.info(`ロール削除: ${name}`);
      } catch (error) {
        logger.error(`ロール「${name}」の削除に失敗:`, error);
      }
    }
  }

  logger.info('ロールバック完了');
}

module.exports = { buildServer, rollback };
