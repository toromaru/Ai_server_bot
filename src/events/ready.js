// src/events/ready.js
// Bot起動イベントハンドラー

const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    logger.success(`✅ ${client.user.tag} が起動しました！`);
    logger.info(`📡 ${client.guilds.cache.size} サーバーに接続中`);
    client.user.setActivity('/create でサーバー生成', { type: 3 }); // Watching
  },
};
