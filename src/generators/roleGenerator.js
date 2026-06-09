/**
 * ロールジェネレーター
 * AIが生成したサーバー構造からDiscordロールを作成する
 */

const { PermissionFlagsBits } = require('discord.js');
const { resolvePermissions, filterDangerousPermissions } = require('../utils/permissions');
const logger = require('../utils/logger');

/**
 * ギルドにロールを一括生成する
 * @param {import('discord.js').Guild} guild - 対象のギルド
 * @param {Array<Object>} roles - AIが生成したロール配列
 * @returns {Promise<{created: Map<string, import('discord.js').Role>, errors: string[]}>}
 */
async function generateRoles(guild, roles) {
  const created = new Map();
  const errors = [];

  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    logger.warn('ロール配列が空または無効です');
    return { created, errors };
  }

  // ポジション順にソート（高い方が上位）
  const sortedRoles = [...roles].sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

  for (const roleData of sortedRoles) {
    try {
      if (!roleData.name) {
        errors.push('ロール名が指定されていません');
        continue;
      }

      let rawPermissions = roleData.permissions || [];
      
      // 一番上位のロール（最初の要素）には、きれいな管理権限セットを確実に追加する
      if (roleData === sortedRoles[0]) {
        const adminPerms = [
          'Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 
          'ManageMessages', 'ManageWebhooks', 'KickMembers', 'BanMembers', 'ViewAuditLog'
        ];
        adminPerms.forEach(p => {
          if (!rawPermissions.includes(p)) rawPermissions.push(p);
        });
      }

      // 危険な権限をフィルタリング（トップロールの場合はフィルタリングをバイパスしてフル権限を許可）
      const safePermissions = roleData === sortedRoles[0] ? rawPermissions : filterDangerousPermissions(rawPermissions);
      // 権限文字列をビットフィールドに変換
      const resolvedPermissions = resolvePermissions(safePermissions);

      // カラーコードの変換（'#FF5733' → 0xFF5733）
      let color = undefined;
      if (roleData.color) {
        const hexString = roleData.color.replace('#', '');
        color = parseInt(hexString, 16);
        // 無効なカラー値のフォールバック
        if (isNaN(color)) {
          logger.warn(`無効なカラーコード: ${roleData.color} - デフォルトに設定`);
          color = undefined;
        }
      }

      const createdRole = await guild.roles.create({
        name: roleData.name,
        color: color,
        permissions: resolvedPermissions,
        reason: 'Genesis AI - サーバー自動生成',
      });

      created.set(roleData.name, createdRole);
      logger.info(`ロール作成完了: ${roleData.name}`);
    } catch (error) {
      const errorMsg = `ロール「${roleData.name || '不明'}」の作成に失敗: ${error.message}`;
      errors.push(errorMsg);
      logger.error(errorMsg, error);
      // 個別の失敗は続行
    }
  }

  logger.info(`ロール生成完了: ${created.size}/${sortedRoles.length} 成功`);
  return { created, errors };
}

module.exports = { generateRoles };
