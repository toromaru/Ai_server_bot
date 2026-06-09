// src/events/interactionCreate.js
// インタラクションイベントハンドラー - コマンド、ボタン、セレクトメニュー

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

// エラーEmbed用のカラー定数
const COLORS = {
  error: 0xff0000,
  warning: 0xffaa00,
};

// 権限チェックが必要なコマンド一覧
const PERMISSION_REQUIRED_COMMANDS = ['create', 'template'];

module.exports = {
  name: 'interactionCreate',
  once: false,

  async execute(interaction) {
    // チャットコマンドの処理
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }

    // ボタン・セレクトメニューは各コマンドのCollectorで処理するため、
    // グローバルハンドラでは何もしない
  },
};

/**
 * スラッシュコマンドを処理する
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function handleCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`⚠️ 不明なコマンド: ${interaction.commandName}`);
    return;
  }

  // 権限チェック（create, templateコマンドはManageChannels権限が必要）
  if (PERMISSION_REQUIRED_COMMANDS.includes(interaction.commandName)) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
      const errorEmbed = new EmbedBuilder()
        .setColor(COLORS.error)
        .setTitle('❌ 権限エラー')
        .setDescription('このコマンドを実行するには「チャンネルの管理」権限が必要です。')
        .setTimestamp();

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }
  }

  try {
    logger.info(`📨 コマンド実行: /${interaction.commandName} by ${interaction.user.tag}`);
    await command.execute(interaction);
  } catch (error) {
    logger.error(`❌ コマンド実行エラー (/${interaction.commandName}): ${error.message}`);

    const errorEmbed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setTitle('❌ エラーが発生しました')
      .setDescription('コマンドの実行中にエラーが発生しました。しばらく後に再試行してください。')
      .addFields({ name: '詳細', value: `\`\`\`${error.message.substring(0, 1000)}\`\`\`` })
      .setTimestamp();

    // 既に返信済みかどうかで処理を分岐
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}

/**
 * ボタンインタラクションを処理する
 * customIdのフォーマット: 'action_data'（例: 'confirm_create', 'cancel_create'）
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleButton(interaction) {
  const [action, ...dataParts] = interaction.customId.split('_');
  const data = dataParts.join('_');

  logger.info(`🔘 ボタン押下: ${interaction.customId} by ${interaction.user.tag}`);

  try {
    switch (action) {
      case 'confirm':
        await handleConfirmButton(interaction, data);
        break;

      case 'cancel':
        await handleCancelButton(interaction, data);
        break;

      default:
        logger.warn(`⚠️ 不明なボタンアクション: ${action}`);
        break;
    }
  } catch (error) {
    logger.error(`❌ ボタン処理エラー (${interaction.customId}): ${error.message}`);

    const errorEmbed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setTitle('❌ エラーが発生しました')
      .setDescription('ボタンの処理中にエラーが発生しました。')
      .setTimestamp();

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}

/**
 * 確認ボタンの処理
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {string} data - ボタンに紐付けられたデータ
 */
async function handleConfirmButton(interaction, data) {
  await interaction.deferUpdate();

  // サーバー作成の確認処理
  if (data === 'create') {
    const confirmEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('⏳ サーバーを構築中...')
      .setDescription('サーバー構造を適用しています。しばらくお待ちください。')
      .setTimestamp();

    await interaction.editReply({ embeds: [confirmEmbed], components: [] });

    // 注: 実際のサーバー構築処理はコマンドハンドラー側で
    // pendingCreationsなどのストアを通じて実行される
    logger.info(`✅ サーバー作成が確認されました by ${interaction.user.tag}`);
  }
}

/**
 * キャンセルボタンの処理
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {string} data - ボタンに紐付けられたデータ
 */
async function handleCancelButton(interaction, data) {
  await interaction.deferUpdate();

  if (data === 'create') {
    const cancelEmbed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle('🚫 キャンセルされました')
      .setDescription('サーバー構造の作成がキャンセルされました。')
      .setTimestamp();

    await interaction.editReply({ embeds: [cancelEmbed], components: [] });
    logger.info(`🚫 サーバー作成がキャンセルされました by ${interaction.user.tag}`);
  }
}

/**
 * セレクトメニューインタラクションを処理する
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleSelectMenu(interaction) {
  logger.info(
    `📋 セレクトメニュー選択: ${interaction.customId} = ${interaction.values.join(', ')} by ${interaction.user.tag}`
  );

  try {
    await interaction.deferUpdate();

    // セレクトメニューの処理は各コマンドで定義されたハンドラーに委譲
    // ここでは基本的なログ記録のみ行う
  } catch (error) {
    logger.error(`❌ セレクトメニュー処理エラー (${interaction.customId}): ${error.message}`);

    const errorEmbed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setTitle('❌ エラーが発生しました')
      .setDescription('選択メニューの処理中にエラーが発生しました。')
      .setTimestamp();

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}
