// ============================================================
// Genesis AI - コマンドデプロイスクリプト
// スラッシュコマンドを開発用ギルドに登録する
// ============================================================

require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

// 環境変数のバリデーション
const { TOKEN, CLIENT_ID } = process.env;

if (!TOKEN || !CLIENT_ID) {
  console.error(
    '[エラー] 環境変数 TOKEN, CLIENT_ID が必要です。.env ファイルを確認してください。'
  );
  process.exit(1);
}

// ─── コマンドファイルの読み込み ───
const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');

if (!fs.existsSync(commandsPath)) {
  console.error(
    '[エラー] コマンドディレクトリが見つかりません:', commandsPath
  );
  process.exit(1);
}

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.js'));

if (commandFiles.length === 0) {
  console.warn('[警告] デプロイ可能なコマンドファイルがありません。');
  process.exit(0);
}

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      console.log(`[読み込み] ${command.data.name}`);
    } else {
      console.warn(
        `[スキップ] ${filePath} には必須の "data" または "execute" プロパティがありません`
      );
    }
  } catch (error) {
    console.error(`[エラー] コマンドファイル ${filePath} の読み込みに失敗:`, error);
  }
}

// ─── REST APIでコマンドをデプロイ ───
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(
      `[デプロイ] ${commands.length} 件のコマンドをグローバルに登録中...`
    );

    const data = await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log(
      `[成功] ${data.length} 件のコマンドを正常にデプロイしました！`
    );
  } catch (error) {
    console.error('[エラー] コマンドのデプロイに失敗しました:', error);
    process.exit(1);
  }
})();
