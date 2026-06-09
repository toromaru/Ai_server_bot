// src/utils/validator.js
// サーバー構造JSONのバリデーションとサニタイズ

const { filterDangerousPermissions } = require('./permissions');

// 有効なチャンネルタイプの一覧
const VALID_CHANNEL_TYPES = ['GuildText', 'GuildVoice', 'GuildForum', 'GuildStageVoice'];

// HEXカラーコードの正規表現パターン
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * サーバー構造のJSONデータをバリデーション・サニタイズする
 * @param {object} data - バリデーション対象のデータ
 * @returns {{ valid: boolean, errors: string[], data: object|null }} バリデーション結果
 */
function validateServerStructure(data) {
  const errors = [];

  // データがオブジェクトであることを確認
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    errors.push('データがオブジェクトではありません');
    return { valid: false, errors, data: null };
  }

  // ロール配列の検証
  if (!Array.isArray(data.roles) || data.roles.length === 0) {
    errors.push('roles配列が存在しないか空です');
  }

  // カテゴリ配列の検証
  if (!Array.isArray(data.categories) || data.categories.length === 0) {
    errors.push('categories配列が存在しないか空です');
  }

  // 基本構造にエラーがある場合は早期リターン
  if (errors.length > 0) {
    return { valid: false, errors, data: null };
  }

  // サニタイズ用にデータをディープコピー
  const sanitized = JSON.parse(JSON.stringify(data));

  // ロールのバリデーションとサニタイズ
  for (let i = 0; i < sanitized.roles.length; i++) {
    const role = sanitized.roles[i];

    if (!role.name || typeof role.name !== 'string') {
      errors.push(`roles[${i}]: nameが文字列ではありません`);
    }

    if (!role.color || typeof role.color !== 'string' || !HEX_COLOR_PATTERN.test(role.color)) {
      errors.push(`roles[${i}]: colorが有効なHEXカラーコード（例: #FF5733）ではありません`);
    }

    if (!Array.isArray(role.permissions)) {
      errors.push(`roles[${i}]: permissionsが配列ではありません`);
    } else {
      // 危険な権限をフィルタリング
      sanitized.roles[i].permissions = filterDangerousPermissions(role.permissions);
    }
  }

  // カテゴリとチャンネルのバリデーションとサニタイズ
  for (let i = 0; i < sanitized.categories.length; i++) {
    const category = sanitized.categories[i];

    if (!category.name || typeof category.name !== 'string') {
      errors.push(`categories[${i}]: nameが文字列ではありません`);
    }

    if (!Array.isArray(category.channels) || category.channels.length === 0) {
      errors.push(`categories[${i}]: channels配列が存在しないか空です`);
      continue;
    }

    for (let j = 0; j < category.channels.length; j++) {
      const channel = category.channels[j];

      if (!channel.name || typeof channel.name !== 'string') {
        errors.push(`categories[${i}].channels[${j}]: nameが文字列ではありません`);
      } else {
        // チャンネル名をサニタイズ: 小文字化し、スペースをハイフンに変換
        sanitized.categories[i].channels[j].name = channel.name
          .toLowerCase()
          .replace(/\s+/g, '-');
      }

      if (!channel.type || !VALID_CHANNEL_TYPES.includes(channel.type)) {
        errors.push(
          `categories[${i}].channels[${j}]: typeが無効です（有効値: ${VALID_CHANNEL_TYPES.join(', ')}）`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: sanitized,
  };
}

module.exports = {
  validateServerStructure,
};
