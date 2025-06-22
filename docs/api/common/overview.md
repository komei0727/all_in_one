# API概要

## 基本情報

### ベースURL

| 環境             | URL                                  |
| ---------------- | ------------------------------------ |
| 開発環境         | `http://localhost:3000/api/v1`       |
| ステージング環境 | `https://staging.example.com/api/v1` |
| 本番環境         | `https://api.example.com/api/v1`     |

### APIバージョン

- 現在のバージョン: `v1`
- バージョニング方式: URLパス方式
- 例: `/api/v1/ingredients`

## 認証

### 現在の認証方式

初期バージョンでは認証なし（すべてのエンドポイントが公開）

### 将来の認証方式（予定）

```
Authorization: Bearer {token}
```

**実装予定の認証フロー**

1. ユーザー登録・ログイン
2. JWTトークンの発行
3. リクエストヘッダーにトークンを含める
4. サーバー側でトークン検証

## リクエスト仕様

### 共通ヘッダー

| ヘッダー     | 値               | 必須 | 説明                       |
| ------------ | ---------------- | ---- | -------------------------- |
| Content-Type | application/json | Yes  | リクエストボディがある場合 |
| Accept       | application/json | No   | レスポンス形式の指定       |
| X-Request-ID | UUID             | No   | リクエストの追跡用         |

### リクエストボディ

- JSON形式
- UTF-8エンコーディング
- 最大サイズ: 1MB

### メソッド別の使用方法

| メソッド | 用途               | リクエストボディ | 冪等性 |
| -------- | ------------------ | ---------------- | ------ |
| GET      | リソースの取得     | なし             | Yes    |
| POST     | リソースの作成     | あり             | No     |
| PUT      | リソースの全体更新 | あり             | Yes    |
| PATCH    | リソースの部分更新 | あり             | Yes    |
| DELETE   | リソースの削除     | なし             | Yes    |

## レスポンス仕様

### 共通レスポンスヘッダー

| ヘッダー              | 説明                            |
| --------------------- | ------------------------------- |
| Content-Type          | application/json; charset=utf-8 |
| X-Request-ID          | リクエストIDのエコーバック      |
| X-RateLimit-Limit     | レート制限の上限                |
| X-RateLimit-Remaining | 残りリクエスト数                |
| X-RateLimit-Reset     | リセット時刻（Unix timestamp）  |

### 成功レスポンス形式

**単一リソース**

```json
{
  "data": {
    "id": "clm1234567890",
    "name": "牛乳",
    "categoryId": "clm0987654321"
    // ... その他のフィールド
  },
  "meta": {
    "timestamp": "2025-01-21T12:00:00Z",
    "version": "1.0.0"
  }
}
```

**リソースコレクション**

```json
{
  "data": [
    {
      "id": "clm1234567890",
      "name": "牛乳"
      // ...
    },
    {
      "id": "clm2345678901",
      "name": "卵"
      // ...
    }
  ],
  "meta": {
    "timestamp": "2025-01-21T12:00:00Z",
    "version": "1.0.0"
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true
  }
}
```

**作成・更新成功**

```json
{
  "data": {
    // 作成・更新されたリソース
  },
  "meta": {
    "timestamp": "2025-01-21T12:00:00Z",
    "version": "1.0.0"
  }
}
```

**削除成功**

- ステータスコード: 204 No Content
- レスポンスボディ: なし

### タイムゾーン

- すべての日時はUTC（ISO 8601形式）
- 例: `2025-01-21T12:00:00Z`

## レート制限

### 制限値

| 認証状態         | 制限           | 期間 |
| ---------------- | -------------- | ---- |
| 未認証           | 100リクエスト  | 1分  |
| 認証済み（将来） | 1000リクエスト | 1分  |

### 制限超過時のレスポンス

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "レート制限を超過しました。しばらく待ってから再試行してください。",
    "retryAfter": 60
  }
}
```

- ステータスコード: 429 Too Many Requests
- Retry-After ヘッダー: 待機秒数

## CORS (Cross-Origin Resource Sharing)

### 開発環境

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-ID
Access-Control-Max-Age: 86400
```

### 本番環境

```
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-ID
Access-Control-Max-Age: 86400
```

## データ形式の規約

### ID形式

- CUID (Collision-resistant Unique Identifier)
- 例: `clm1234567890abcdef`
- 理由: 分散環境でも衝突しない、ソート可能

### 日時形式

- ISO 8601形式（UTC）
- 例: `2025-01-21T12:00:00Z`
- タイムゾーン変換はクライアント側で実施

### 数値

- 整数: number型
- 小数: number型（小数点以下2桁まで）
- 金額: 整数（円単位）

### 文字列

- UTF-8エンコーディング
- 最大長はフィールドごとに定義
- 前後の空白は自動トリミング

### Boolean

- `true` または `false`
- 文字列の "true"/"false" は使用しない

### Null値

- 省略可能なフィールドはnullまたは省略
- 空文字列 "" は使用しない

## セキュリティ

### HTTPS

- 本番環境では必須
- 開発環境ではHTTPを許可

### 入力検証

- すべての入力値をサーバー側で検証
- SQLインジェクション対策（Prisma使用）
- XSS対策（適切なエスケープ）

### ヘッダーインジェクション対策

- レスポンスヘッダーの値を適切にサニタイズ

## 監視とロギング

### アクセスログ

- すべてのAPIアクセスを記録
- X-Request-IDで追跡可能

### エラーログ

- 5xxエラーは自動的にアラート
- スタックトレースの記録

### パフォーマンス監視

- レスポンスタイムの計測
- スロークエリの検出

## サポート

### 問い合わせ

- 開発環境: 開発チームSlackチャンネル
- 本番環境: api-support@example.com

### ステータスページ

- https://status.example.com

### 変更通知

- 破壊的変更は6ヶ月前に通知
- 新機能は随時リリースノートで通知
