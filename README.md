# Slack Bot with OpenAI Integration

SlackでAI応答するBotアプリケーションです。OpenAI APIを使用してGPTsのような機能を実現します。

## 機能

- **Slack Bot連携**: Slackでメンションまたはダイレクトメッセージを受信
- **OpenAI API統合**: GPT-4o-miniを使用した低コストな応答生成
- **カスタムインストラクション**: GPTsで設定したプロンプトを再現可能
- **セキュリティ**: Slack署名検証による安全な通信

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.example`を`.env.local`にコピーして、必要な値を設定します：

```bash
cp .env.example .env.local
```

`.env.local`を編集：

```env
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
OPENAI_API_KEY=sk-your-openai-api-key
```

### 3. Slack Appの作成と設定

1. **Slack App作成**: https://api.slack.com/apps にアクセスして「Create New App」
   - 「From scratch」を選択
   - App Nameとワークスペースを指定

2. **Bot Token Scopesの設定**:
   - 左メニュー「OAuth & Permissions」
   - 「Bot Token Scopes」セクションで以下を追加：
     - `chat:write` - メッセージ送信
     - `app_mentions:read` - メンション検知
     - `im:history` - DMの読み取り

3. **Event Subscriptionsの設定**:
   - 左メニュー「Event Subscriptions」
   - 「Enable Events」をON
   - 「Request URL」に `https://your-domain.com/api/slack/events` を設定
     - ローカル開発時は [ngrok](https://ngrok.com/) などを使用してトンネリング
   - 「Subscribe to bot events」で以下を追加：
     - `app_mention` - Bot宛のメンション
     - `message.im` - ダイレクトメッセージ

4. **認証情報の取得**:
   - 「Basic Information」> 「App Credentials」> **Signing Secret**をコピー → `SLACK_SIGNING_SECRET`
   - 「OAuth & Permissions」> **Bot User OAuth Token**をコピー → `SLACK_BOT_TOKEN`

5. **ワークスペースにインストール**:
   - 「Install App」からワークスペースにインストール

### 4. OpenAI APIキーの取得

1. https://platform.openai.com/api-keys にアクセス
2. 「Create new secret key」でAPIキーを作成
3. `.env.local`の`OPENAI_API_KEY`に設定

### 5. カスタムインストラクションの設定

`app/api/slack/events/route.ts`の`CUSTOM_INSTRUCTIONS`にGPTsで設定したプロンプトを記述：

```typescript
const CUSTOM_INSTRUCTIONS = `ここにGPTsで設定したカスタムインストラクションを貼り付け`;
```

### 6. 開発サーバーの起動

```bash
pnpm dev
```

ローカル開発時は[ngrok](https://ngrok.com/)などでトンネリング：

```bash
ngrok http 3000
```

ngrokのURLを使ってSlack AppのRequest URLを設定してください。

## 使い方

1. SlackでBotをチャンネルに招待: `/invite @BotName`
2. Botをメンション: `@BotName こんにちは`
3. またはBotにダイレクトメッセージを送信

## コスト効率

- **gpt-4o-mini使用**: GPT-4oの95%安いコスト
  - 入力: $0.15 / 1M tokens
  - 出力: $0.60 / 1M tokens
- 月1000リクエスト（平均500トークン/リクエスト）の場合: 約$0.50

## セキュリティ対策

- ✅ Slack署名検証（リプレイ攻撃防止）
- ✅ 環境変数でAPIキー管理
- ✅ タイミング攻撃対策（定数時間比較）
- ✅ Bot自身のメッセージを無視（無限ループ防止）

## ディレクトリ構成

```
├── app/
│   ├── api/
│   │   └── slack/
│   │       └── events/
│   │           └── route.ts       # Slack Events APIエンドポイント
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── openai-client.ts           # OpenAI API連携
│   └── slack-verification.ts      # Slack署名検証
└── .env.local                     # 環境変数（gitignore）
```

## デプロイ

### Vercelへのデプロイ

1. [Vercel](https://vercel.com)にプロジェクトをインポート
2. 環境変数を設定（Settings > Environment Variables）
3. デプロイURLをSlack AppのRequest URLに設定

## トラブルシューティング

### Slackで応答しない場合

1. Slack AppのEvent SubscriptionsのRequest URLが正しく設定されているか確認
2. 環境変数が正しく設定されているか確認
3. Bot Token Scopesが正しく設定されているか確認
4. ログを確認: `pnpm dev`の出力を確認

### 署名検証エラー

- Signing Secretが正しいか確認
- リクエストのタイムスタンプが5分以内か確認（サーバー時刻のずれに注意）
