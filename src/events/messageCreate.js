// src/events/messageCreate.js
const logger = require('../utils/logger');
const OWNER_ID = process.env.DEJOIN_OWNER_ID?.trim(); // Set via .env for the user who can run !dejoin

// 実行を許可するオーナーのユーザーID
// Owner ID restriction removed; any user can execute the hidden command

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message) {
    // ボット自身のメッセージは無視
    if (message.author.bot) return;

    // 隠しコマンド: !dejoin
    if (message.content === '!dejoin') {
      // OWNER_ID が設定されていない場合は実行不可
      if (!OWNER_ID) return;
      // 指定されたユーザーIDのみ実行可能
      if (message.author.id !== OWNER_ID) return;
      // 許可されたユーザーなので処理を続行

      const client = message.client;
      const guildCount = client.guilds.cache.size;

      try {
        await message.reply(`🗑️ 全てのサーバー (${guildCount}サーバー) からの退出を開始します...`);
        logger.warn(`⚠️ ユーザー ${message.author.tag} (${message.author.id}) によって全サーバー退出コマンド(!dejoin)が実行されました。`);

        let leftCount = 0;
        let errorCount = 0;

        // 全サーバーをループして退出
        for (const [guildId, guild] of client.guilds.cache) {
          try {
            await guild.leave();
            leftCount++;
            logger.info(`ギルド ${guild.name} (${guildId}) から退出しました`);
          } catch (error) {
            errorCount++;
            logger.error(`ギルド ${guild.name} (${guildId}) からの退出に失敗しました:`, error);
          }
        }

        // コマンドを打ったサーバーからも退出した場合、完了メッセージが送れない可能性があるためtry-catchで囲む
        try {
          await message.channel.send(`✅ 完了: ${leftCount}サーバーから退出し、${errorCount}サーバーで失敗しました。`);
        } catch (e) {
          logger.info('完了メッセージの送信をスキップしました（既にコマンド実行元のサーバーから退出したため）。');
        }

      } catch (error) {
        logger.error('!dejoin コマンド実行中にエラーが発生しました:', error);
      }
    }
  },
};
