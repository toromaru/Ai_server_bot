// ============================================================
// Genesis AI - エントリーポイント
// Discord Botの起動・コマンド/イベントの動的読み込み・
// Expressヘルスチェックサーバーを管理する
// ============================================================

require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const express = require('express');

// ─── Discordクライアントの初期化 ───
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

// コマンドコレクションの作成
client.commands = new Collection();

// ─── コマンドファイルの動的読み込み ───
const commandsPath = path.join(__dirname, 'src', 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = require(filePath);

      // data と execute プロパティの存在を検証
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`[コマンド] ${command.data.name} を読み込みました`);
      } else {
        console.warn(
          `[警告] ${filePath} には必須の "data" または "execute" プロパティがありません`
        );
      }
    } catch (error) {
      console.error(`[エラー] コマンドファイル ${filePath} の読み込みに失敗:`, error);
    }
  }
} else {
  console.log('[情報] コマンドディレクトリが見つかりません。スキップします。');
}

// ─── イベントファイルの動的読み込み ───
const eventsPath = path.join(__dirname, 'src', 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      const event = require(filePath);

      // once フラグに応じてイベントリスナーを登録
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }

      console.log(
        `[イベント] ${event.name} を読み込みました (once: ${!!event.once})`
      );
    } catch (error) {
      console.error(`[エラー] イベントファイル ${filePath} の読み込みに失敗:`, error);
    }
  }
} else {
  console.log('[情報] イベントディレクトリが見つかりません。スキップします。');
}

// ─── Expressヘルスチェックサーバー ───
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
  res.json({ status: 'ok', bot: 'Genesis AI' });
});

app.listen(PORT, () => {
  console.log(`[Express] ヘルスチェックサーバーがポート ${PORT} で起動しました`);
});

// ─── グローバルエラーハンドリング ───
process.on('unhandledRejection', (error) => {
  console.error('[致命的エラー] 未処理のPromise拒否:', error);
});

process.on('uncaughtException', (error) => {
  console.error('[致命的エラー] 未捕捉の例外:', error);
  // 安全にプロセスを終了する（リスタートマネージャーによる再起動を想定）
  process.exit(1);
});

// ─── Botログイン ───
client.login(process.env.TOKEN).catch((error) => {
  console.error('[致命的エラー] Botのログインに失敗しました:', error);
  process.exit(1);
});
