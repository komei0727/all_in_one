# [エンドポイント名]

## 概要

[このエンドポイントの目的と機能の説明]

## エンドポイント情報

### 基本情報

- **メソッド**: `GET|POST|PUT|DELETE`
- **パス**: `/api/v1/resource`
- **認証**: 必要 | 不要
- **権限**: [必要な権限レベル]

### レート制限

- **制限**: 100リクエスト/分
- **スコープ**: IPアドレス単位

## リクエスト

### パスパラメータ

| パラメータ | 型     | 必須 | 説明       |
| ---------- | ------ | ---- | ---------- |
| id         | string | Yes  | リソースID |

### クエリパラメータ

| パラメータ | 型     | 必須 | デフォルト | 説明                |
| ---------- | ------ | ---- | ---------- | ------------------- |
| page       | number | No   | 1          | ページ番号          |
| limit      | number | No   | 20         | 1ページあたりの件数 |

### リクエストボディ

```typescript
interface RequestBody {
  // TypeScript型定義
}
```

### バリデーションルール

- フィールド1: 制約の説明
- フィールド2: 制約の説明

## レスポンス

### 成功時（200 OK）

```typescript
interface SuccessResponse {
  // TypeScript型定義
}
```

**レスポンス例**

```json
{
  "data": {
    // 実際のレスポンス例
  },
  "meta": {
    "timestamp": "2025-01-21T12:00:00Z"
  }
}
```

### エラーレスポンス

| ステータスコード | エラーコード     | 説明                   | 対処法                     |
| ---------------- | ---------------- | ---------------------- | -------------------------- |
| 400              | VALIDATION_ERROR | バリデーションエラー   | リクエストパラメータを確認 |
| 401              | UNAUTHORIZED     | 認証エラー             | 認証トークンを確認         |
| 404              | NOT_FOUND        | リソースが見つからない | IDを確認                   |
| 500              | INTERNAL_ERROR   | サーバーエラー         | 時間をおいてリトライ       |

**エラーレスポンス例**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": {
      "name": ["必須項目です"]
    }
  }
}
```

## 実装例

### cURL

```bash
curl -X GET "https://api.example.com/api/v1/resource?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### TypeScript (fetch)

```typescript
async function fetchResource(params: RequestParams): Promise<ResponseData> {
  const queryParams = new URLSearchParams(params)
  const response = await fetch(`/api/v1/resource?${queryParams}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  return response.json()
}
```

### TypeScript (TanStack Query)

```typescript
import { useQuery } from '@tanstack/react-query'

function useResource(params: RequestParams) {
  return useQuery({
    queryKey: ['resource', params],
    queryFn: () => fetchResource(params),
    staleTime: 5 * 60 * 1000, // 5分
  })
}
```

## 注意事項

- [実装時の注意点]
- [パフォーマンスに関する考慮事項]
- [セキュリティに関する注意]

## 変更履歴

| バージョン | 日付       | 変更内容 |
| ---------- | ---------- | -------- |
| 1.0.0      | 2025-01-21 | 初版作成 |
