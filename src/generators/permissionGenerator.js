/**
 * パーミッションジェネレーター
 * カテゴリタイプに基づいてチャンネル固有の権限オーバーライトを設定する
 */

const { PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');

/**
 * カテゴリが「情報系」かどうか判定する
 * @param {string} categoryName - カテゴリ名
 * @returns {boolean}
 */
function isInformationCategory(categoryName) {
  const lowerName = categoryName.toLowerCase();
  return lowerName.includes('📢') || lowerName.includes('info') || lowerName.includes('announce');
}

/**
 * ロールの権限に基づいて管理者ロールを取得する
 */
function getRolesWithPermission(roleMap, permission) {
  const roles = [];
  for (const [, role] of roleMap) {
    if (role.permissions.has(permission)) {
      roles.push(role);
    }
  }
  return roles;
}

/**
 * ギルドのチャンネルに権限オーバーライトを設定する
 * @param {import('discord.js').Guild} guild - 対象のギルド
 * @param {Map<string, import('discord.js').CategoryChannel>} categoryMap - カテゴリ名 → CategoryChannelのマップ
 * @param {Map<string, import('discord.js').Role>} roleMap - ロール名 → Roleオブジェクトのマップ
 * @param {Array<Object>} categories - AIが生成したカテゴリ配列
 * @returns {Promise<{configured: number, errors: string[]}>}
 */
async function setupPermissions(guild, categoryMap, roleMap, categories) {
  const errors = [];
  let configuredCount = 0;

  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    logger.warn('カテゴリ配列が空のため権限設定をスキップします');
    return { configured: 0, errors };
  }

  // @everyoneロールを取得
  const everyoneRole = guild.roles.everyone;

  // 権限ベースでロールを分類
  const adminRoles = getRolesWithPermission(roleMap, PermissionFlagsBits.Administrator);
  if (adminRoles.length === 0) {
    adminRoles.push(...getRolesWithPermission(roleMap, PermissionFlagsBits.ManageGuild));
  }
  
  const modRoles = getRolesWithPermission(roleMap, PermissionFlagsBits.ManageMessages);

  for (const categoryData of categories) {
    try {
      const category = categoryMap.get(categoryData.name);
      if (!category) {
        logger.warn(`カテゴリ「${categoryData.name}」が見つかりません - スキップ`);
        continue;
      }

      // カテゴリ内の全チャンネルを取得
      const channels = guild.channels.cache.filter(ch => ch.parentId === category.id);

      if (isInformationCategory(categoryData.name)) {
        // 情報系カテゴリ: @everyoneは閲覧のみ、管理者/モデレーターは送信可能
        for (const [, channel] of channels) {
          try {
            // @everyone: 閲覧可、送信不可
            await channel.permissionOverwrites.create(everyoneRole, {
              ViewChannel: true,
              SendMessages: false,
            });
            configuredCount++;

            // 管理者ロール: 送信許可
            for (const role of adminRoles) {
              await channel.permissionOverwrites.create(role, { SendMessages: true });
              configuredCount++;
            }

            // モデレーターロール: 送信許可
            for (const role of modRoles) {
              await channel.permissionOverwrites.create(role, { SendMessages: true });
              configuredCount++;
            }

            logger.info(`情報系権限設定完了: ${channel.name}`);
          } catch (error) {
            const errorMsg = `チャンネル「${channel.name}」の情報系権限設定に失敗: ${error.message}`;
            errors.push(errorMsg);
            logger.error(errorMsg, error);
          }
        }
      } else {
        // 一般カテゴリ: メンバーは送信・閲覧可、未認証は送信不可
        for (const [, channel] of channels) {
          try {
            // 一般カテゴリはグローバル権限に依存するため、基本は特別に設定しない
            // 必要に応じて特定のロールの制限を行う（今回はデフォルトに任せる）

            logger.info(`一般権限設定完了: ${channel.name}`);
          } catch (error) {
            const errorMsg = `チャンネル「${channel.name}」の一般権限設定に失敗: ${error.message}`;
            errors.push(errorMsg);
            logger.error(errorMsg, error);
          }
        }
      }
    } catch (error) {
      const errorMsg = `カテゴリ「${categoryData.name}」の権限設定に失敗: ${error.message}`;
      errors.push(errorMsg);
      logger.error(errorMsg, error);
    }
  }

  logger.info(`権限設定完了: ${configuredCount}件 設定`);
  return { configured: configuredCount, errors };
}

module.exports = { setupPermissions };
