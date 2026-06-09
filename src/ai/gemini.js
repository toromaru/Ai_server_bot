// src/ai/gemini.js
// Gemini AIクライアント - サーバー構造生成とBot提案

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const { validateServerStructure } = require('../utils/validator');
const { generateServerPrompt, suggestBotsPrompt } = require('./prompts');

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

// レート制限用のリクエストタイムスタンプ記録
const requestTimestamps = [];
const RATE_LIMIT_MAX = 15; // 1分あたりの最大リクエスト数
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分（ミリ秒）

/**
 * レート制限をチェックする
 * 1分あたり15リクエストを超える場合はエラーをスローする
 * @throws {Error} レート制限超過時
 */
function checkRateLimit() {
  const now = Date.now();

  // ウィンドウ外の古いタイムスタンプを除去
  while (requestTimestamps.length > 0 && requestTimestamps[0] <= now - RATE_LIMIT_WINDOW) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= RATE_LIMIT_MAX) {
    const oldestTimestamp = requestTimestamps[0];
    const waitTime = Math.ceil((oldestTimestamp + RATE_LIMIT_WINDOW - now) / 1000);
    throw new Error(
      `レート制限に達しました。${waitTime}秒後に再試行してください。（${RATE_LIMIT_MAX}リクエスト/分）`
    );
  }

  requestTimestamps.push(now);
}

/**
 * レスポンステキストからJSONを抽出する
 * マークダウンコードブロック（```json ... ```）も処理する
 * @param {string} text - レスポンステキスト
 * @returns {object} パースされたJSONオブジェクト
 * @throws {Error} JSON解析失敗時
 */
function extractJSON(text) {
  let jsonString = text.trim();

  // マークダウンのコードブロックを除去する
  const codeBlockMatch = jsonString.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1].trim();
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`JSON解析に失敗しました: ${error.message}\n受信テキスト: ${jsonString.substring(0, 200)}...`);
  }
}

/**
 * テーマに基づいてサーバー構造を生成する
 * @param {string} theme - サーバーのテーマ
 * @returns {Promise<object>} バリデーション済みのサーバー構造データ
 * @throws {Error} API呼び出し失敗、JSON解析失敗、バリデーション失敗時
 */
async function generateServerStructure(theme) {
  try {
    // レート制限チェック
    checkRateLimit();

    logger.info(`🤖 サーバー構造を生成中... テーマ: "${theme}"`);

    // タイムアウト付きでGemini APIを呼び出す
    const prompt = generateServerPrompt(theme);
    const timeoutMs = 60000; // 60秒
    
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`APIリクエストが${timeoutMs/1000}秒でタイムアウトしました`)), timeoutMs)
      )
    ]);
    
    const response = result.response;
    const text = response.text();

    logger.debug(`📝 Geminiからのレスポンスを受信しました（${text.length}文字）`);

    // レスポンスからJSONを抽出・パース
    const parsedData = extractJSON(text);

    // サーバー構造をバリデーション・サニタイズ
    const validation = validateServerStructure(parsedData);

    if (!validation.valid) {
      const errorList = validation.errors.join('\n  - ');
      throw new Error(`サーバー構造のバリデーションに失敗しました:\n  - ${errorList}`);
    }

    logger.success('✅ サーバー構造の生成が完了しました');
    return validation.data;
  } catch (error) {
    logger.error(`❌ サーバー構造の生成に失敗しました: ${error.message}`);
    throw error;
  }
}

/**
 * サーバータイプに適したBotを提案する
 * @param {string} serverType - サーバーの種類
 * @returns {Promise<string>} Bot提案のテキスト
 * @throws {Error} API呼び出し失敗時
 */
async function suggestBots(serverType) {
  try {
    // レート制限チェック
    checkRateLimit();

    logger.info(`🤖 Bot提案を生成中... サーバータイプ: "${serverType}"`);

    // タイムアウト付きでGemini APIを呼び出す
    const prompt = suggestBotsPrompt(serverType);
    const timeoutMs = 30000; // 30秒
    
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`APIリクエストが${timeoutMs/1000}秒でタイムアウトしました`)), timeoutMs)
      )
    ]);
    
    const response = result.response;
    const text = response.text();

    logger.success('✅ Bot提案の生成が完了しました');
    return text;
  } catch (error) {
    logger.error(`❌ Bot提案の生成に失敗しました: ${error.message}`);
    throw error;
  }
}

module.exports = {
  generateServerStructure,
  suggestBots,
};
