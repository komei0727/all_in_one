# API仕様書

## 概要

Next.js App RouterのRoute Handlersを使用したRESTful API設計。
すべてのAPIは`/api`プレフィックスを持ちます。

## 共通仕様

### レスポンス形式

```typescript
// 成功レスポンス
interface SuccessResponse<T> {
  data: T
  success: true
}

// エラーレスポンス
interface ErrorResponse {
  error: string
  success: false
  code?: string
}
```

### HTTPステータスコード

| コード | 説明                  | 使用場面             |
| ------ | --------------------- | -------------------- |
| 200    | OK                    | 取得・更新成功       |
| 201    | Created               | 作成成功             |
| 204    | No Content            | 削除成功             |
| 400    | Bad Request           | バリデーションエラー |
| 401    | Unauthorized          | 認証エラー           |
| 403    | Forbidden             | 権限エラー           |
| 404    | Not Found             | リソースが存在しない |
| 500    | Internal Server Error | サーバーエラー       |

### 共通ヘッダー

```
Content-Type: application/json
X-Request-ID: {uuid}
```

## 食材管理API

### 食材一覧取得

**エンドポイント**: `GET /api/ingredients`

**クエリパラメータ**:

```typescript
{
  page?: number      // ページ番号（デフォルト: 1）
  limit?: number     // 取得件数（デフォルト: 20、最大: 100）
  status?: string    // ステータスフィルタ（AVAILABLE | LOW | OUT）
  category?: string  // カテゴリフィルタ
  sort?: string      // ソート項目（name | expirationDate | updatedAt）
  order?: string     // ソート順（asc | desc）
}
```

**レスポンス**:

```typescript
{
  data: {
    items: Ingredient[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  },
  success: true
}
```

### 食材詳細取得

**エンドポイント**: `GET /api/ingredients/{id}`

**レスポンス**:

```typescript
{
  data: Ingredient,
  success: true
}
```

### 食材登録

**エンドポイント**: `POST /api/ingredients`

**リクエストボディ**:

```typescript
{
  name: string         // 必須
  quantity?: number
  unit?: string
  expirationDate?: string  // ISO 8601形式
  category?: string
}
```

**バリデーション**:

- name: 1-100文字
- quantity: 0以上の数値
- unit: 定義された単位のみ
- category: 定義されたカテゴリのみ

**レスポンス**: 201 Created

```typescript
{
  data: Ingredient,
  success: true
}
```

### 食材更新

**エンドポイント**: `PUT /api/ingredients/{id}`

**リクエストボディ**:

```typescript
{
  name?: string
  quantity?: number
  unit?: string
  expirationDate?: string
  category?: string
  status?: 'AVAILABLE' | 'LOW' | 'OUT'
}
```

**レスポンス**: 200 OK

```typescript
{
  data: Ingredient,
  success: true
}
```

### 食材削除

**エンドポイント**: `DELETE /api/ingredients/{id}`

**レスポンス**: 204 No Content

### 賞味期限切れ食材取得

**エンドポイント**: `GET /api/ingredients/expiring`

**クエリパラメータ**:

```typescript
{
  days?: number  // 何日以内に期限切れか（デフォルト: 7）
}
```

**レスポンス**:

```typescript
{
  data: {
    items: Ingredient[]
    count: number
  },
  success: true
}
```

## 認証API（将来実装）

### ログイン

**エンドポイント**: `POST /api/auth/login`

### ログアウト

**エンドポイント**: `POST /api/auth/logout`

### ユーザー情報取得

**エンドポイント**: `GET /api/auth/me`

## エラーハンドリング

### バリデーションエラー

```typescript
{
  error: "Validation failed",
  success: false,
  code: "VALIDATION_ERROR",
  details: {
    name: ["Name is required"],
    quantity: ["Must be a positive number"]
  }
}
```

### 認証エラー

```typescript
{
  error: "Authentication required",
  success: false,
  code: "AUTH_REQUIRED"
}
```

### リソース不在エラー

```typescript
{
  error: "Ingredient not found",
  success: false,
  code: "NOT_FOUND"
}
```

## APIクライアント実装例

```typescript
// src/modules/ingredients/client/services/api.ts
class IngredientsAPI {
  private baseURL = '/api/ingredients'

  async getAll(params?: GetIngredientsParams) {
    const query = new URLSearchParams(params)
    const response = await fetch(`${this.baseURL}?${query}`)
    return response.json()
  }

  async getById(id: string) {
    const response = await fetch(`${this.baseURL}/${id}`)
    return response.json()
  }

  async create(data: CreateIngredientInput) {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  }

  async update(id: string, data: UpdateIngredientInput) {
    const response = await fetch(`${this.baseURL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  }

  async delete(id: string) {
    await fetch(`${this.baseURL}/${id}`, {
      method: 'DELETE',
    })
  }
}
```

## 今後の拡張

### レシピ管理API

- `GET /api/recipes` - レシピ一覧
- `GET /api/recipes/{id}` - レシピ詳細
- `POST /api/recipes` - レシピ作成

### 買い物リストAPI

- `GET /api/shopping-lists` - リスト一覧
- `POST /api/shopping-lists/generate` - 自動生成

### WebSocket対応

- リアルタイム在庫更新
- 複数デバイス間の同期
