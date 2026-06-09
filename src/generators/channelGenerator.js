/**
 * チャンネルジェネレーター
 * AIが生成したサーバー構造からカテゴリとチャンネルを作成する
 */

const { ChannelType } = require('discord.js');
const { CHANNEL_TYPES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * ギルドにカテゴリとチャンネルを一括生成する
 * @param {import('discord.js').Guild} guild - 対象のギルド
 * @param {Array<Object>} categories - AIが生成したカテゴリ配列
 * @returns {Promise<{created: {categories: number, channels: number}, errors: string[], categoryMap: Map<string, import('discord.js').CategoryChannel>}>}
 */
async function generateChannels(guild, categories) {
  const errors = [];
  const categoryMap = new Map();
  let createdCategoryCount = 0;
  let createdChannelCount = 0;

  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    logger.warn('カテゴリ配列が空または無効です');
    return {
      created: { categories: 0, channels: 0 },
      errors,
      categoryMap,
    };
  }

  for (const categoryData of categories) {
    try {
      if (!categoryData.name) {
        errors.push('カテゴリ名が指定されていません');
        continue;
      }

      // カテゴリチャンネルを作成
      const category = await guild.channels.create({
        name: categoryData.name,
        type: ChannelType.GuildCategory,
        reason: 'Genesis AI - サーバー自動生成',
      });

      categoryMap.set(categoryData.name, category);
      createdCategoryCount++;
      logger.info(`カテゴリ作成完了: ${categoryData.name}`);

      // カテゴリ内のチャンネルを作成
      if (categoryData.channels && Array.isArray(categoryData.channels)) {
        for (const channelData of categoryData.channels) {
          try {
            if (!channelData.name) {
              errors.push(`カテゴリ「${categoryData.name}」内のチャンネル名が未指定`);
              continue;
            }

            // チャンネルタイプ文字列をChannelType列挙値にマッピング
            const channelType = CHANNEL_TYPES[channelData.type] ?? ChannelType.GuildText;

            const channelOptions = {
              name: channelData.name,
              type: channelType,
              parent: category,
              reason: 'Genesis AI - サーバー自動生成',
            };

            // テキストチャンネルの場合のみトピックを設定
            if (channelData.topic && channelType === ChannelType.GuildText) {
              channelOptions.topic = channelData.topic;
            }

            await guild.channels.create(channelOptions);
            createdChannelCount++;
            logger.info(`チャンネル作成完了: ${categoryData.name}/${channelData.name}`);
          } catch (error) {
            const errorMsg = `チャンネル「${channelData.name || '不明'}」（カテゴリ: ${categoryData.name}）の作成に失敗: ${error.message}`;
            errors.push(errorMsg);
            logger.error(errorMsg, error);
            // 個別の失敗は続行
          }
        }
      }
    } catch (error) {
      const errorMsg = `カテゴリ「${categoryData.name || '不明'}」の作成に失敗: ${error.message}`;
      errors.push(errorMsg);
      logger.error(errorMsg, error);
      // 個別の失敗は続行
    }
  }

  logger.info(`チャンネル生成完了: カテゴリ ${createdCategoryCount}個, チャンネル ${createdChannelCount}個`);

  return {
    created: {
      categories: createdCategoryCount,
      channels: createdChannelCount,
    },
    errors,
    categoryMap,
  };
}

module.exports = { generateChannels };
