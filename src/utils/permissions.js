// src/utils/permissions.js
// Discord権限ヘルパー - 権限解決・フィルタリング

const { PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');

// 文字列名からPermissionFlagsBitsへのマッピング
const PERMISSION_MAP = {
  Administrator: PermissionFlagsBits.Administrator,
  ManageChannels: PermissionFlagsBits.ManageChannels,
  ManageRoles: PermissionFlagsBits.ManageRoles,
  ManageMessages: PermissionFlagsBits.ManageMessages,
  KickMembers: PermissionFlagsBits.KickMembers,
  BanMembers: PermissionFlagsBits.BanMembers,
  ViewChannel: PermissionFlagsBits.ViewChannel,
  SendMessages: PermissionFlagsBits.SendMessages,
  Connect: PermissionFlagsBits.Connect,
  Speak: PermissionFlagsBits.Speak,
  AddReactions: PermissionFlagsBits.AddReactions,
  UseExternalEmojis: PermissionFlagsBits.UseExternalEmojis,
  ReadMessageHistory: PermissionFlagsBits.ReadMessageHistory,
  ManageGuild: PermissionFlagsBits.ManageGuild,
  ManageWebhooks: PermissionFlagsBits.ManageWebhooks,
  MuteMembers: PermissionFlagsBits.MuteMembers,
  DeafenMembers: PermissionFlagsBits.DeafenMembers,
  MoveMembers: PermissionFlagsBits.MoveMembers,
  ViewAuditLog: PermissionFlagsBits.ViewAuditLog,
  MentionEveryone: PermissionFlagsBits.MentionEveryone,
  EmbedLinks: PermissionFlagsBits.EmbedLinks,
  AttachFiles: PermissionFlagsBits.AttachFiles,
  UseApplicationCommands: PermissionFlagsBits.UseApplicationCommands,
};

// 危険な権限リスト（自動付与を禁止する）
const DANGEROUS_PERMISSIONS = ['Administrator', 'ManageGuild', 'ManageWebhooks'];

/**
 * 権限名の文字列配列をBigIntビットフィールドに変換する
 * 不明な権限名はスキップし、警告をログに出力する
 * @param {string[]} permissionStrings - 権限名の配列
 * @returns {bigint} 結合された権限ビットフィールド
 */
function resolvePermissions(permissionStrings) {
  let bitfield = BigInt(0);

  for (const perm of permissionStrings) {
    if (PERMISSION_MAP[perm] !== undefined) {
      bitfield |= PERMISSION_MAP[perm];
    } else {
      logger.warn(`⚠️ 不明な権限をスキップしました: ${perm}`);
    }
  }

  return bitfield;
}

/**
 * 危険な権限をフィルタリングして除去する
 * 除去された権限は警告としてログに出力される
 * @param {string[]} permissions - 権限名の配列
 * @returns {string[]} 危険な権限を除去した配列
 */
function filterDangerousPermissions(permissions) {
  const filtered = [];

  for (const perm of permissions) {
    if (DANGEROUS_PERMISSIONS.includes(perm)) {
      logger.warn(`🚫 危険な権限を除去しました: ${perm}`);
    } else {
      filtered.push(perm);
    }
  }

  return filtered;
}

/**
 * 権限名の配列から安全なビットフィールドを計算する
 * 危険な権限を自動的に除去してからビットフィールドに変換する
 * @param {string[]} permissions - 権限名の配列
 * @returns {bigint} 安全な権限ビットフィールド
 */
function calculatePermissionBitfield(permissions) {
  const safePerm = filterDangerousPermissions(permissions);
  return resolvePermissions(safePerm);
}

module.exports = {
  PERMISSION_MAP,
  DANGEROUS_PERMISSIONS,
  resolvePermissions,
  filterDangerousPermissions,
  calculatePermissionBitfield,
};
