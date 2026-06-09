/**
 * Genesis AI - /help コマンド
 * 使い方を表示します
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Genesis AI の使い方を表示します'),

  /**
   * コマンド実行
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const helpEmbed = new EmbedBuilder()
      .setTitle('🤖 Genesis AI - ヘルプ')
      .setDescription('AIを使ってDiscordサーバーを自動構築・最適化する統合管理Botです。\n\n以下のコマンドが利用できます：')
      .addFields(
        {
          name: '✨ サーバー生成',
          value: '`/create [theme]`\nAIにテーマ（例: gaming, school, chill）を伝えて、カテゴリ・チャンネル・ロール・権限を自動生成します。',
        },
        {
          name: '💾 テンプレート管理',
          value: '`/template save [name]` - 現在のサーバー構成をテンプレートとして保存\n`/template load [name]` - テンプレートからサーバーを生成\n`/template list` - 保存されているテンプレート一覧を表示',
        },
        {
          name: 'ℹ️ その他',
          value: '`/help` - このヘルプメッセージを表示',
        }
      )
      .setColor(COLORS.primary)
      .setFooter({ text: 'Genesis AI v1.0.0 | Powered by Gemini 2.0 Flash' })
      .setTimestamp();

    await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
  },
};
