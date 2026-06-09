// src/utils/logger.js
// カラー付きコンソールロガー

// ANSIカラーコード定義
const COLORS = {
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
};

/**
 * 現在のタイムスタンプを取得する
 * @returns {string} フォーマットされたタイムスタンプ
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * フォーマットされたログメッセージを出力する
 * @param {string} level - ログレベル
 * @param {string} color - ANSIカラーコード
 * @param {string} message - メッセージ
 */
function log(level, color, message) {
  const timestamp = getTimestamp();
  console.log(`${color}[${level} ${timestamp}]${COLORS.reset} ${message}`);
}

module.exports = {
  /**
   * 情報レベルのログを出力する
   * @param {string} message - メッセージ
   */
  info(message) {
    log('INFO', COLORS.cyan, message);
  },

  /**
   * 警告レベルのログを出力する
   * @param {string} message - メッセージ
   */
  warn(message) {
    log('WARN', COLORS.yellow, message);
  },

  /**
   * エラーレベルのログを出力する
   * @param {string} message - メッセージ
   */
  error(message) {
    log('ERROR', COLORS.red, message);
  },

  /**
   * 成功レベルのログを出力する
   * @param {string} message - メッセージ
   */
  success(message) {
    log('SUCCESS', COLORS.green, message);
  },

  /**
   * デバッグレベルのログを出力する
   * @param {string} message - メッセージ
   */
  debug(message) {
    log('DEBUG', COLORS.gray, message);
  },
};
