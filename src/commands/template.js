/**
 * Genesis AI - /template コマンド
 * サーバー構成テンプレートの保存・読み込み
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { TemplateManager } = require('../templates/templateManager');
const { buildServer } = require('../generators/serverBuilder');
const { COLORS } = require('../config/constants');
const logger = require('../utils/logger');

// （createコマンドと同様に一時保存するためのマップ）
const pendingCreations = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('template')
    .setDescription('サーバーテンプレートを管理します')
    .addSubcommand(subcommand =>
      subcommand
        .setName('save')
        .setDescription('現在のサーバー構成をテンプレートとして保存します')
        .addStringOption(option =>
          option.setName('name').setDescription('テンプレート名').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('load')
        .setDescription('テンプレートからサーバー構成を生成します')
        .addStringOption(option =>
          option.setName('name').setDescription('テンプレート名').setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('保存されているテンプレート一覧を表示します')
    ),

  /** @type {Map} 進行中の生成データ */
  pendingCreations,

  /**
   * コマンド実行
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'save') {
        await interaction.deferReply({ ephemeral: true });
        const name = interaction.options.getString('name');

        const structure = await TemplateManager.extractGuildStructure(interaction.guild);
        const success = TemplateManager.save(name, structure);

        if (success) {
          const embed = new EmbedBuilder()
            .setTitle('✅ テンプレート保存完了')
            .setDescription(`現在のサーバー構成を \`${name}\` として保存しました。`)
            .setColor(COLORS.success)
            .setTimestamp();
          await interaction.editReply({ embeds: [embed] });
        } else {
          throw new Error('保存に失敗しました');
        }

      } else if (subcommand === 'load') {
        await interaction.deferReply();
        const name = interaction.options.getString('name');

        const structure = TemplateManager.load(name);
        
        if (!structure) {
          const embed = new EmbedBuilder()
            .setTitle('❌ テンプレートが見つかりません')
            .setDescription(`テンプレート \`${name}\` は存在しません。\n\`/template list\` で一覧を確認してください。`)
            .setColor(COLORS.error);
          return await interaction.editReply({ embeds: [embed] });
        }

        // /create コマンドと同様のプレビュー処理をここに実装予定
        // ※ Phase 2での本格実装のため、ここでは簡易的なメッセージを表示
        const embed = new EmbedBuilder()
          .setTitle(`🏗️ テンプレート展開プレビュー: ${structure.displayName}`)
          .setDescription('※ テンプレート展開機能は現在開発中（Phase 2）です。\nデータの読み込みまでは成功しています！')
          .setColor(COLORS.primary)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'list') {
        await interaction.deferReply({ ephemeral: true });
        
        const list = TemplateManager.list();
        
        if (list.length === 0) {
          const embed = new EmbedBuilder()
            .setTitle('📂 テンプレート一覧')
            .setDescription('保存されているテンプレートはありません。')
            .setColor(COLORS.info);
          return await interaction.editReply({ embeds: [embed] });
        }

        const listString = list.map(t => 
          `**${t.displayName}** (\`${t.name}\`)\n└ 👥 ロール: ${t.rolesCount} | 📂 カテゴリ: ${t.categoriesCount}`
        ).join('\n\n');

        const embed = new EmbedBuilder()
          .setTitle('📂 テンプレート一覧')
          .setDescription(listString)
          .setColor(COLORS.primary)
          .setTimestamp();
          
        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      logger.error(`/template コマンドエラー: ${error.message}`);
      try {
        await interaction.editReply({ 
          content: `エラーが発生しました: ${error.message}`, 
          embeds: [], components: [] 
        });
      } catch {
        // do nothing
      }
    }
  },
};
