# エラーハンドリング仕様

## 概要

すべてのAPIエラーは統一された形式で返されます。これにより、クライアント側で一貫したエラーハンドリングが可能になります。

## エラーレスポンス形式

### 基本構造

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "人間が読めるエラーメッセージ",
    "details": {
      // オプション: 詳細情報
    },
    "timestamp": "2025-01-21T12:00:00Z",
    "path": "/api/v1/ingredients",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### フィールド説明

| フィールド      | 型     | 必須 | 説明                                 |
| --------------- | ------ | ---- | ------------------------------------ |
| error           | object | Yes  | エラー情報のルートオブジェクト       |
| error.code      | string | Yes  | エラーコード（大文字スネークケース） |
| error.message   | string | Yes  | エラーメッセージ（日本語）           |
| error.details   | object | No   | 詳細情報（バリデーションエラーなど） |
| error.timestamp | string | Yes  | エラー発生時刻（ISO 8601）           |
| error.path      | string | Yes  | リクエストパス                       |
| error.requestId | string | No   | リクエストID（トレース用）           |

## HTTPステータスコード

### 4xx クライアントエラー

#### 400 Bad Request

不正なリクエスト（バリデーションエラー、パース不可など）

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": {
      "name": ["必須項目です"],
      "quantity": ["0より大きい値を入力してください"]
    },
    "timestamp": "2025-01-21T12:00:00Z",
    "path": "/api/v1/ingredients"
  }
}
```

#### 401 Unauthorized

認証が必要、または認証に失敗

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です",
    "timestamp": "2025-01-21T12:00:00Z",
    "path": "/api/v1/ingredients"
  }
}
```

#### 403 Forbidden

認証はされているが権限不足

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "このリソースへのアクセス権限がありません",
    "timestamp": "2025-01-21T12:00:00Z",
    "path": "/api/v1/ingredients/123"
  }
}
```

#### 404 Not Found

リソースが見つからない

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "指定された食材が見つかりません",
    "details": {
      "id": "clm1234567890"
    },
    "timestamp": "2025-01-21T12:00:00Z",
    "path": "/api/v1/ingredients/clm1234567890"
  }
}
```

#### 409 Conflict

リソースの競合（重複、楽観的ロック失敗など）

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "他のユーザーによって更新されています",
    "details": {
      "currentVersion": 2,
      "requestedVersion": 1
    },
    "timestamp": "2025-01-21T12:00:00Z",
    "path": "/api/v1/ingredients/123"
  }
}
```

#### 422 Unprocessable Entity

ビジネスロジックエラー

```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "在庫数が不足しています",
    "details": {
      "currentQuantity": 5,
      "requestedQuantity": 10
    },
    "timestamp": "2025-01-21T12:00:00Z",
    "path": "/api/v1/ingredients/123/consume"
  }
}
```

#### 429 Too Many Requests

レート制限超過

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "レート制限を超過しました",
    "details": {
      "limit": 100,
      "window": "1m",
      "retryAfter": 45
    },
    "timestamp": "2025-01-21T12:00:00Z",
    "path": "/api/v1/ingredients"
  }
}
```

### 5xx サーバーエラー

#### 500 Internal Server Error

予期しないサーバーエラー

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "サーバーエラーが発生しました。しばらく時間をおいて再試行してください",
    "timestamp": "2025-01-21T12:00:00Z",
    "path": "/api/v1/ingredients",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### 502 Bad Gateway

外部サービスエラー

```json
{
  "error": {
    "code": "EXTERNAL_SERVICE_ERROR",
    "message": "外部サービスとの通信に失敗しました",
    "timestamp": "2025-01-21T12:00:00Z",
    "path": "/api/v1/ingredients"
  }
}
```

#### 503 Service Unavailable

サービス一時停止（メンテナンスなど）

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "メンテナンス中です。10:00に再開予定です",
    "details": {
      "retryAfter": 3600
    },
    "timestamp": "2025-01-21T12:00:00Z",
    "path": "/api/v1/ingredients"
  }
}
```

## エラーコード一覧

### 共通エラーコード

| コード              | HTTPステータス | 説明                 |
| ------------------- | -------------- | -------------------- |
| VALIDATION_ERROR    | 400            | バリデーションエラー |
| INVALID_REQUEST     | 400            | リクエスト形式不正   |
| UNAUTHORIZED        | 401            | 認証エラー           |
| FORBIDDEN           | 403            | 権限エラー           |
| NOT_FOUND           | 404            | リソース未発見       |
| METHOD_NOT_ALLOWED  | 405            | HTTPメソッド不正     |
| CONFLICT            | 409            | リソース競合         |
| RATE_LIMIT_EXCEEDED | 429            | レート制限超過       |
| INTERNAL_ERROR      | 500            | 内部エラー           |
| SERVICE_UNAVAILABLE | 503            | サービス利用不可     |

### ドメイン固有エラーコード

| コード               | HTTPステータス | 説明               |
| -------------------- | -------------- | ------------------ |
| INGREDIENT_NOT_FOUND | 404            | 食材が見つからない |
| DUPLICATE_INGREDIENT | 409            | 食材名が重複       |
| INVALID_QUANTITY     | 400            | 数量が不正         |
| EXPIRED_INGREDIENT   | 422            | 賞味期限切れ       |
| INSUFFICIENT_STOCK   | 422            | 在庫不足           |

## クライアント実装ガイド

### TypeScript型定義

```typescript
interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, any>
    timestamp: string
    path: string
    requestId?: string
  }
}

// エラーコードのEnum
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  // ... その他のエラーコード
}
```

### エラーハンドリング例

```typescript
async function handleApiCall() {
  try {
    const response = await fetch('/api/v1/ingredients')

    if (!response.ok) {
      const errorData: ApiError = await response.json()

      switch (errorData.error.code) {
        case ErrorCode.VALIDATION_ERROR:
          // バリデーションエラーの処理
          showValidationErrors(errorData.error.details)
          break

        case ErrorCode.UNAUTHORIZED:
          // 認証エラーの処理
          redirectToLogin()
          break

        case ErrorCode.NOT_FOUND:
          // 404エラーの処理
          showNotFoundMessage()
          break

        default:
          // その他のエラー
          showErrorToast(errorData.error.message)
      }

      return
    }

    // 正常処理
    const data = await response.json()
    // ...
  } catch (error) {
    // ネットワークエラーなど
    showErrorToast('通信エラーが発生しました')
  }
}
```

### React (TanStack Query)での実装例

```typescript
import { useMutation } from '@tanstack/react-query'

function useCreateIngredient() {
  return useMutation({
    mutationFn: createIngredient,
    onError: (error: ApiError) => {
      if (error.error.code === 'VALIDATION_ERROR') {
        // フォームエラーの表示
        setFormErrors(error.error.details)
      } else {
        // トーストでエラー表示
        toast.error(error.error.message)
      }
    },
  })
}
```

## エラーメッセージのローカライゼーション

現在は日本語のみサポート。将来的には Accept-Language ヘッダーに基づいて多言語対応予定。

```
Accept-Language: ja  → 日本語メッセージ
Accept-Language: en  → 英語メッセージ（将来実装）
```

## ログとモニタリング

### エラーログ

- 5xxエラーは自動的にエラーログに記録
- requestIdで追跡可能
- スタックトレースは本番環境では返さない

### アラート

- 5xxエラーが閾値を超えた場合にアラート
- 特定のエラーコードの急増を検知

### メトリクス

- エラーレート（エラー数/リクエスト数）
- エラーコード別の発生頻度
- レスポンスタイムへの影響
