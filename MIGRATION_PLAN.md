# GPTsからSlackbotへの移行計画

## 現状（GPTs）
- カスタムインストラクションで動作
- Notion APIをActionsで連携
- GPTsメモリー機能で会話履歴管理
- OpenAI GPT-4/GPT-4o使用

## 移行先（Slackbot）
- Next.js + Slack API
- 社内独自RAGシステム
- OpenAI API（GPT-4o-mini）

## 実装フェーズ

### フェーズ1: 基本的なSlackbot機能（✅ 完了）
- [x] Slack Events API連携
- [x] OpenAI API統合
- [x] 署名検証

### フェーズ2: PIマスキング機能
- [ ] PIマスキングライブラリの選定・実装
  - 候補: @microsoft/presidio, 独自実装
- [ ] マスク対象の定義（氏名、メール、電話番号等）
- [ ] マスク・復元処理の実装
- [ ] テストケース作成

### フェーズ3: Notion API連携
- [ ] Notion API認証設定
- [ ] 検索対象のNotionデータベース選定
- [ ] Notion検索機能の実装
- [ ] 取得データのサニタイズ

### フェーズ4: RAGシステム構築
- [ ] ベクトルデータベース選定
  - 候補: PostgreSQL+pgvector, Pinecone, Weaviate
- [ ] 埋め込みモデル選定
  - 候補: OpenAI Embeddings, sentence-transformers
- [ ] 過去ログの埋め込み生成
- [ ] セマンティック検索実装
- [ ] コンテキスト生成ロジック

### フェーズ5: 会話履歴管理
- [ ] データベース選定（PostgreSQL, Redis等）
- [ ] 会話履歴の保存処理
- [ ] スレッド管理機能
- [ ] 履歴検索機能

### フェーズ6: セキュリティ強化
- [ ] 監査ログ実装
- [ ] アクセス制御
- [ ] データ暗号化
- [ ] エラーハンドリング強化

## 環境変数（追加予定）

```env
# Notion API
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx

# ベクトルDB（例: Pinecone）
PINECONE_API_KEY=xxx
PINECONE_ENVIRONMENT=xxx
PINECONE_INDEX_NAME=xxx

# データベース（会話履歴用）
DATABASE_URL=postgresql://xxx

# PIマスキング設定
PI_MASK_ENABLED=true
```

## データガバナンス方針

### OpenAI APIのデータ利用
- API経由のデータは学習に使用されない（OpenAI規約）
- 30日後に自動削除（デフォルト設定）
- Zero Data Retention（ZDR）オプション検討

### 社内データの取り扱い
- Notion APIから取得したデータはメモリ上のみで処理
- 永続化する場合は暗号化必須
- PIマスク後のデータのみ保存

### ログ・監査
- OpenAI送信内容のログ記録（マスク後）
- アクセスログの保管（90日間）
- 定期的なセキュリティレビュー

## コスト見積もり

### OpenAI API
- GPT-4o-mini: $0.15/1M入力トークン, $0.60/1M出力トークン
- Embeddings: $0.02/1M tokens
- 想定: 月10,000リクエスト → 約$50-100/月

### ベクトルDB（例: Pinecone）
- Starter: $70/月（500万ベクトル）
- または PostgreSQL+pgvector（自社ホスティング、追加コストなし）

### インフラ（Vercel等）
- Hobby: $20/月
- Pro: $50/月

**合計想定**: $70-220/月

## セキュリティチェックリスト

- [ ] Slack署名検証 ✅
- [ ] OpenAI API通信のTLS暗号化 ✅
- [ ] PIマスキング実装
- [ ] 環境変数の適切な管理（.env.local）
- [ ] 監査ログ実装
- [ ] アクセス制御（Slack App権限）
- [ ] エラー時の個人情報漏洩防止
- [ ] 定期的な依存関係の更新

## リスク管理

### リスク1: OpenAIへのPI送信
- **対策**: フェーズ2でPIマスキング必須実装

### リスク2: Notion APIの認証情報漏洩
- **対策**: 環境変数管理、最小権限の原則

### リスク3: RAGシステムのレイテンシ
- **対策**: ベクトルDBのキャッシング、並列処理

### リスク4: コスト超過
- **対策**: リクエスト数制限、トークン数制限

## 次のステップ

1. OpenAI APIキー申請時に、この移行計画を添付
2. セキュリティレビュー実施
3. フェーズ2（PIマスキング）から実装開始
4. 各フェーズでテスト・検証を実施
