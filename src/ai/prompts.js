// src/ai/prompts.js
// AIプロンプトテンプレート - サーバー構造生成とBot提案用

/**
 * サーバー構造生成用のシステムプロンプトを返す
 * @param {string} theme - サーバーのテーマ
 * @returns {string} Gemini用のシステムプロンプト
 */
function generateServerPrompt(theme) {
  return `あなたはDiscordサーバーの設計を専門とするAIアーキテクトです。
与えられたテーマに基づいて、最適なDiscordサーバー構造を設計してください。

テーマ: ${theme}

以下の厳密なJSON形式で回答してください。JSON以外のテキストは含めないでください。

{
  "serverName": "サーバー名（テーマに合った名前）",
  "description": "サーバーの説明（日本語で記述）",
  "roles": [
    {
      "name": "ロール名",
      "color": "#hex形式のカラーコード",
      "permissions": ["権限名の配列"],
      "position": 1
    }
  ],
  "categories": [
    {
      "name": "カテゴリ名（絵文字付き）",
      "channels": [
        {
          "name": "チャンネル名",
          "type": "GuildText|GuildVoice|GuildForum|GuildStageVoice",
          "topic": "チャンネルの説明（オプション）"
        }
      ]
    }
  ],
  "suggestedBots": ["推奨Botの名前"],
  "initialRules": ["サーバールール（日本語で記述）"]
}

設計ルール:
1. ロールは3〜5個作成し、階層構造を持たせてください。positionは数字が大きいほど上位です。
2. 管理者用のロールには必要に応じてAdministrator権限を含めてください。
3. カテゴリは3〜6個作成してください。
4. 各カテゴリには2〜5個のチャンネルを含めてください。
5. チャンネル名は必ず半角英数字のlowercase-kebab-case（例: general-chat）で記述してください。
6. カテゴリ名には適切な絵文字を先頭に付けてください（例: 📢 お知らせ）。
7. 日本語コミュニティ向けに設計してください。
8. テーマに適したチャンネルタイプ（テキスト、ボイス、フォーラム、ステージ）を選択してください。
9. suggestedBotsには、このサーバーに役立つDiscord Botを3〜5個提案してください。
10. initialRulesには、サーバーの基本ルールを3〜5個、日本語で記述してください。

回答はJSON形式のみで、余計な説明文は不要です。`;
}

/**
 * Bot提案用のプロンプトを返す
 * @param {string} serverType - サーバーの種類
 * @returns {string} Gemini用のプロンプト
 */
function suggestBotsPrompt(serverType) {
  return `あなたはDiscord Botの専門家です。
以下のタイプのDiscordサーバーに最適なBotを3〜5個提案してください。

サーバータイプ: ${serverType}

各Botについて以下の情報を日本語で提供してください:
1. Bot名
2. 主な機能
3. このサーバーに推奨する理由
4. 導入の優先度（高/中/低）

日本語で回答してください。`;
}

module.exports = {
  generateServerPrompt,
  suggestBotsPrompt,
};
