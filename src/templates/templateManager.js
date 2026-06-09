/**
 * Genesis AI - テンプレートマネージャー
 * サーバー構成テンプレートの保存・読み込み・管理
 */

const fs = require('node:fs');
const path = require('node:path');
const logger = require('../utils/logger');

// テンプレート保存ディレクトリ
const TEMPLATES_DIR = path.join(__dirname, '../../data/templates');

class TemplateManager {
  /**
   * テンプレート保存ディレクトリを確認・作成
   */
  static ensureDir() {
    if (!fs.existsSync(TEMPLATES_DIR)) {
      fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
      logger.info(`📁 テンプレートディレクトリを作成: ${TEMPLATES_DIR}`);
    }
  }

  /**
   * テンプレートを保存
   * @param {string} name - テンプレート名
   * @param {object} data - サーバー構成データ
   * @returns {boolean} 保存成功かどうか
   */
  static save(name, data) {
    try {
      this.ensureDir();

      const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const filePath = path.join(TEMPLATES_DIR, `${sanitizedName}.json`);

      const template = {
        templateName: sanitizedName,
        displayName: name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
      };

      fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8');
      logger.success(`💾 テンプレート保存完了: ${sanitizedName}`);
      return true;
    } catch (error) {
      logger.error(`テンプレート保存エラー: ${error.message}`);
      return false;
    }
  }

  /**
   * テンプレートを読み込み
   * @param {string} name - テンプレート名
   * @returns {object|null} テンプレートデータ（存在しない場合はnull）
   */
  static load(name) {
    try {
      const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const filePath = path.join(TEMPLATES_DIR, `${sanitizedName}.json`);

      if (!fs.existsSync(filePath)) {
        logger.warn(`テンプレートが見つかりません: ${sanitizedName}`);
        return null;
      }

      const data = fs.readFileSync(filePath, 'utf-8');
      logger.info(`📂 テンプレート読み込み: ${sanitizedName}`);
      return JSON.parse(data);
    } catch (error) {
      logger.error(`テンプレート読み込みエラー: ${error.message}`);
      return null;
    }
  }

  /**
   * 保存済みテンプレート一覧を取得
   * @returns {Array<{name: string, displayName: string, createdAt: string}>}
   */
  static list() {
    try {
      this.ensureDir();

      const files = fs.readdirSync(TEMPLATES_DIR)
        .filter(file => file.endsWith('.json'));

      return files.map(file => {
        try {
          const data = JSON.parse(
            fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf-8')
          );
          return {
            name: data.templateName || file.replace('.json', ''),
            displayName: data.displayName || data.templateName || file.replace('.json', ''),
            createdAt: data.createdAt || '不明',
            rolesCount: data.roles?.length || 0,
            categoriesCount: data.categories?.length || 0,
          };
        } catch {
          return {
            name: file.replace('.json', ''),
            displayName: file.replace('.json', ''),
            createdAt: '不明',
            rolesCount: 0,
            categoriesCount: 0,
          };
        }
      });
    } catch (error) {
      logger.error(`テンプレート一覧取得エラー: ${error.message}`);
      return [];
    }
  }

  /**
   * テンプレートを削除
   * @param {string} name - テンプレート名
   * @returns {boolean} 削除成功かどうか
   */
  static delete(name) {
    try {
      const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const filePath = path.join(TEMPLATES_DIR, `${sanitizedName}.json`);

      if (!fs.existsSync(filePath)) {
        logger.warn(`削除対象テンプレートが見つかりません: ${sanitizedName}`);
        return false;
      }

      fs.unlinkSync(filePath);
      logger.success(`🗑️ テンプレート削除: ${sanitizedName}`);
      return true;
    } catch (error) {
      logger.error(`テンプレート削除エラー: ${error.message}`);
      return false;
    }
  }

  /**
   * テンプレートの存在確認
   * @param {string} name - テンプレート名
   * @returns {boolean}
   */
  static exists(name) {
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const filePath = path.join(TEMPLATES_DIR, `${sanitizedName}.json`);
    return fs.existsSync(filePath);
  }

  /**
   * Guildの現在の構成をテンプレート形式で抽出
   * @param {import('discord.js').Guild} guild - Discordギルド
   * @returns {object} テンプレート形式のデータ
   */
  static async extractGuildStructure(guild) {
    try {
      // ロール取得（@everyone除外、Bot管理ロール除外）
      const roles = guild.roles.cache
        .filter(role => !role.managed && role.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map(role => ({
          name: role.name,
          color: role.hexColor,
          permissions: role.permissions.toArray(),
          position: role.position,
        }));

      // カテゴリとチャンネル取得
      const categories = guild.channels.cache
        .filter(ch => ch.type === 4) // GuildCategory
        .sort((a, b) => a.position - b.position)
        .map(category => ({
          name: category.name,
          channels: guild.channels.cache
            .filter(ch => ch.parentId === category.id)
            .sort((a, b) => a.position - b.position)
            .map(ch => {
              const typeMap = { 0: 'GuildText', 2: 'GuildVoice', 15: 'GuildForum', 13: 'GuildStageVoice' };
              return {
                name: ch.name,
                type: typeMap[ch.type] || 'GuildText',
                topic: ch.topic || undefined,
              };
            }),
        }));

      return {
        serverName: guild.name,
        description: guild.description || '',
        roles,
        categories,
        suggestedBots: [],
        initialRules: [],
      };
    } catch (error) {
      logger.error(`Guild構成抽出エラー: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { TemplateManager };
