/**
 * Genesis AI - /create コマンド
 * AIでサーバー構成を自動生成するメインコマンド
 */

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const { generateServerStructure } = require('../ai/gemini');
const { buildServer } = require('../generators/serverBuilder');
const { COLORS } = require('../config/constants');
const logger = require('../utils/logger');

// 進行中の生成データを一時保存（interaction.id → serverStructure）
const pendingCreations = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create')
    .setDescription('AIでサーバー構成を自動生成します')
    .addStringOption(option =>
      option
        .setName('theme')
        .setDescription('サーバーのテーマ（例: esports, school, chill, gaming, community）')
        .setRequired(true)
    ),

  /** @type {Map} 進行中の生成データ */
  pendingCreations,

  /**
   * コマンド実行
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const theme = interaction.options.getString('theme');

    // 処理中メッセージ
    await interaction.deferReply();

    logger.info(`🎨 サーバー生成リクエスト: テーマ="${theme}" by ${interaction.user.tag}`);

    try {
      // ============================================
      // Step 1: AI にサーバー構成を生成させる
      // ============================================
      const loadingEmbed = new EmbedBuilder()
        .setTitle('🤖 AI がサーバー構成を設計中...')
        .setDescription(`テーマ: **${theme}**\n\nGemini 2.0 Flash で最適な構成を生成しています...`)
        .setColor(COLORS.info)
        .setTimestamp();

      await interaction.editReply({ embeds: [loadingEmbed] });

      const serverStructure = await generateServerStructure(theme);

      // ============================================
      // Step 2: プレビューEmbed を作成
      // ============================================
      const rolesPreview = serverStructure.roles
        .map(r => `\`${r.name}\` — ${r.permissions.slice(0, 3).join(', ')}${r.permissions.length > 3 ? '...' : ''}`)
        .join('\n') || 'なし';

      const channelsPreview = serverStructure.categories
        .map(cat => {
          const chList = cat.channels
            .map(ch => {
              const typeEmoji = {
                'GuildText': '💬',
                'GuildVoice': '🔊',
                'GuildForum': '📋',
                'GuildStageVoice': '🎙️',
              };
              return `  ${typeEmoji[ch.type] || '💬'} ${ch.name}`;
            })
            .join('\n');
          return `**${cat.name}**\n${chList}`;
        })
        .join('\n\n') || 'なし';

      const botsPreview = serverStructure.suggestedBots?.join(', ') || 'なし';
      const rulesPreview = serverStructure.initialRules
        ?.map((r, i) => `${i + 1}. ${r}`)
        .join('\n') || 'なし';

      const previewEmbed = new EmbedBuilder()
        .setTitle(`🏗️ サーバー構成プレビュー: ${serverStructure.serverName || theme}`)
        .setDescription(serverStructure.description || `テーマ「${theme}」のサーバー構成`)
        .addFields(
          {
            name: '👥 ロール一覧',
            value: rolesPreview.substring(0, 1024),
            inline: false,
          },
          {
            name: '📂 カテゴリ・チャンネル',
            value: channelsPreview.substring(0, 1024),
            inline: false,
          },
          {
            name: '🤖 推奨BOT',
            value: botsPreview,
            inline: true,
          },
          {
            name: '📜 初期ルール',
            value: rulesPreview.substring(0, 1024),
            inline: false,
          }
        )
        .setColor(COLORS.primary)
        .setFooter({ text: '⚠️ 生成を実行すると、このサーバーにロール・チャンネルが追加されます' })
        .setTimestamp();

      // ============================================
      // Step 3: 確認ボタンを追加
      // ============================================
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_create_clear')
          .setLabel('🗑️ 既存を削除して生成')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('confirm_create_keep')
          .setLabel('✅ そのまま追加生成')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_create')
          .setLabel('❌ キャンセル')
          .setStyle(ButtonStyle.Secondary)
      );

      const response = await interaction.editReply({
        embeds: [previewEmbed],
        components: [buttons],
      });

      // 生成データを一時保存
      pendingCreations.set(interaction.id, serverStructure);

      // ============================================
      // Step 4: ボタンのインタラクションを待機
      // ============================================
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000, // 2分間有効
        filter: i => i.user.id === interaction.user.id,
      });

      collector.on('collect', async (buttonInteraction) => {
        try {
          if (buttonInteraction.customId.startsWith('confirm_create')) {
            const clearServer = buttonInteraction.customId === 'confirm_create_clear';

            // ボタンを無効化
            const disabledButtons = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('confirm_create_clear')
                .setLabel('🗑️ 既存を削除して生成')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('confirm_create_keep')
                .setLabel(clearServer ? '🔄 削除後に生成中...' : '🔄 追加生成中...')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('cancel_create')
                .setLabel('❌ キャンセル')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );

            await buttonInteraction.update({ components: [disabledButtons] });

            logger.info(`✅ サーバー生成承認 (既存削除=${clearServer}): ${interaction.user.tag}`);

            // サーバー構築実行
            const structure = pendingCreations.get(interaction.id);
            if (structure) {
              await buildServer(interaction, structure, clearServer);
              pendingCreations.delete(interaction.id);
            }
          } else if (buttonInteraction.customId === 'cancel_create') {
            // キャンセル処理
            const cancelEmbed = new EmbedBuilder()
              .setTitle('❌ サーバー生成をキャンセルしました')
              .setDescription('再度 `/create` コマンドで生成できます。')
              .setColor(COLORS.error)
              .setTimestamp();

            const disabledButtons = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('confirm_create_clear')
                .setLabel('🗑️ 既存を削除して生成')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('confirm_create_keep')
                .setLabel('✅ そのまま追加生成')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('cancel_create')
                .setLabel('❌ キャンセル済み')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );

            await buttonInteraction.update({
              embeds: [cancelEmbed],
              components: [disabledButtons],
            });

            pendingCreations.delete(interaction.id);
            logger.info(`❌ サーバー生成キャンセル: ${interaction.user.tag}`);
          }

          collector.stop();
        } catch (error) {
          logger.error(`ボタンインタラクションエラー: ${error.message}`);
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          // タイムアウト
          const timeoutEmbed = new EmbedBuilder()
            .setTitle('⏰ タイムアウト')
            .setDescription('確認の有効期限が切れました。再度 `/create` コマンドを実行してください。')
            .setColor(COLORS.warning)
            .setTimestamp();

          const disabledButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('confirm_create_clear')
              .setLabel('🗑️ 既存を削除して生成')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('confirm_create_keep')
              .setLabel('✅ そのまま追加生成')
              .setStyle(ButtonStyle.Success)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('cancel_create')
              .setLabel('❌ キャンセル')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );

          try {
            await interaction.editReply({
              embeds: [timeoutEmbed],
              components: [disabledButtons],
            });
          } catch {
            // メッセージが既に削除されている場合は無視
          }

          pendingCreations.delete(interaction.id);
        }
      });

    } catch (error) {
      logger.error(`/create コマンドエラー: ${error.message}`);

      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ エラーが発生しました')
        .setDescription(`サーバー構成の生成に失敗しました。\n\n**原因:** ${error.message}`)
        .setColor(COLORS.error)
        .addFields({
          name: '💡 ヒント',
          value: '• テーマを変えて再度お試しください\n• しばらく待ってから再実行してください\n• 問題が続く場合は管理者に連絡してください',
        })
        .setTimestamp();

      try {
        await interaction.editReply({ embeds: [errorEmbed], components: [] });
      } catch {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
};
