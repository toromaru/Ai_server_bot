// ============================================================
// Genesis AI - 定数定義
// Botの動作に必要な各種定数をまとめて管理する
// ============================================================

const { ChannelType } = require('discord.js');

/**
 * チャンネルタイプのマッピング
 * 文字列名からdiscord.js ChannelType列挙値への変換用
 */
const CHANNEL_TYPES = {
  GuildText: ChannelType.GuildText,
  GuildVoice: ChannelType.GuildVoice,
  GuildForum: ChannelType.GuildForum,
  GuildStageVoice: ChannelType.GuildStageVoice,
  GuildCategory: ChannelType.GuildCategory,
};

/**
 * 危険な権限リスト
 * これらの権限は慎重に扱う必要がある
 */
const DANGEROUS_PERMISSIONS = [
  'ManageGuild',
  'ManageWebhooks',
];

/**
 * デフォルト権限設定
 * ロールタイプごとに推奨される権限配列
 */
const DEFAULT_PERMISSIONS = {
  admin: [
    'ManageChannels',
    'ManageRoles',
    'KickMembers',
    'BanMembers',
    'ManageMessages',
    'ViewAuditLog',
  ],
  moderator: [
    'KickMembers',
    'ManageMessages',
    'MuteMembers',
    'DeafenMembers',
    'MoveMembers',
  ],
  member: [
    'SendMessages',
    'ViewChannel',
    'Connect',
    'Speak',
    'AddReactions',
    'UseExternalEmojis',
    'ReadMessageHistory',
  ],
  unverified: [
    'ViewChannel',
    'ReadMessageHistory',
  ],
};

/**
 * レートリミット設定
 * APIリクエストの制限値
 */
const RATE_LIMIT = {
  maxRequests: 15,
  windowMs: 60000,
};

/**
 * Embed用カラー定数
 * Discord Embedメッセージのカラーテーマ
 */
const COLORS = {
  primary: '#5865F2',
  success: '#57F287',
  warning: '#FEE75C',
  error: '#ED4245',
  info: '#5865F2',
};

/**
 * サーバータイプ別おすすめBot
 * サーバーの用途に応じた推奨Bot一覧
 */
const BOT_SUGGESTIONS = {
  gaming: ['Dyno', 'MEE6'],
  support: ['Ticket Tool', 'Helper.gg'],
  security: ['Wick', 'Beemo'],
  community: ['Carl-bot', 'Tatsu'],
};

module.exports = {
  CHANNEL_TYPES,
  DANGEROUS_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  RATE_LIMIT,
  COLORS,
  BOT_SUGGESTIONS,
};
