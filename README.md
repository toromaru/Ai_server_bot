# AI server generator

## 概要
Genesis AI は、Discord サーバーを AI で自動構築・最適化できる管理 Bot です。ユーザーがテーマを指定すると、Gemini（Google Generative AI）を呼び出してサーバー構成（ロール、カテゴリ・チャンネル、推奨 Bot、初期ルール）を生成し、ボタン操作で即座に構築します。

## 主な機能
- **/create** コマンドでテーマ指定 → AI が JSON 形式でサーバー構成を提案
- **情報系カテゴリ** では閲覧のみ、**一般カテゴリ** ではメンバーが送信可能な権限設定
- **既存チャンネル削除** オプションでクリーンなサーバー作成が可能
- **!dejoin**（隠しコマンド）で全サーバーから一括退出（実行可能ユーザーは `.env` の `DEJOIN_OWNER_ID` で設定）
- 永久招待リンクを自動生成し、`data/invites.json` に保存

## 環境構築
1. **Node.js** (v18 以上) と **npm** をインストール
2. リポジトリをクローンし、ディレクトリ直下で以下を実行
   ```bash
   npm install
   ```
3. `.env` ファイルを作成（`.env.default` をコピー）し、以下の項目を設定
   - `TOKEN`            : Discord Bot Token
   - `CLIENT_ID`        : アプリケーションの Client ID
   - `GUILD_ID`         : 開発用サーバーの Guild ID（テスト時に使用）
   - `GEMINI_API_KEY`   : Google Gemini API キー
4. Bot を起動
   ```bash
   npm start
   ```
   起動後、`http://localhost:3000/` へアクセスするとヘルスチェックが返ります。

## コマンド一覧
| コマンド | 説明 |
|---|---|
| `/create <theme>` | 指定したテーマでサーバー構成を自動生成し、プレビューとボタンで確定・キャンセルができます |
| `/deploy-commands` (スクリプト) | 開発サーバーへスラッシュコマンドをデプロイします |
| `!dejoin` (隠し) | 環境変数 `DEJOIN_OWNER_ID` に設定したユーザーのみが実行可能。全サーバーから Bot が退出します |

## ディレクトリ構成
```
├─ .env.default      # 環境変数のサンプル
├─ .gitignore        # Git 除外設定
├─ data/
│   ├─ invites.json  # 永久招待リンクを保存
│   └─ templates/    # テンプレート JSON（git 管理のため .gitkeep）
├─ deploy-commands.js # スラッシュコマンドをデプロイするスクリプト
├─ index.js           # エントリーポイント、Bot 起動・イベント登録
├─ package.json        # 依存パッケージ情報
└─ src/
    ├─ ai/            # Gemini クライアント・プロンプト
    ├─ commands/      # スラッシュコマンド実装
    ├─ events/        # ready, interactionCreate, messageCreate 等
    ├─ generators/    # ロール、チャンネル、権限、サーバー構築ロジック
    └─ utils/         # logger, permissions, validator など
```

## 開発・テスト
- `npm run dev` でファイル変更を監視しながら自動リロード（`node --watch`）
- テスト用に `test-gemini.js` が用意されており、Gemini API の呼び出しをローカルで確認できます

## 貢献方法
1. Fork してブランチを作成
2. コードを修正・機能追加し、`npm run lint`（設定があれば）でスタイルを確認
3. Pull Request を作成し、レビューを受けてマージされます

## ライセンス
MIT License（自由に使用・改変できます）
