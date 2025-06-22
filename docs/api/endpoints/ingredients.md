# 食材管理API

## 概要

食材の登録、取得、更新、削除を行うAPIです。カテゴリーと単位のマスタデータ取得も含みます。

## エンドポイント一覧

### 食材管理

- `GET /api/v1/ingredients` - 食材一覧取得
- `GET /api/v1/ingredients/{id}` - 食材詳細取得
- `POST /api/v1/ingredients` - 食材登録
- `PUT /api/v1/ingredients/{id}` - 食材更新
- `DELETE /api/v1/ingredients/{id}` - 食材削除

### 在庫操作

- `POST /api/v1/ingredients/{id}/consume` - 食材を消費
- `POST /api/v1/ingredients/{id}/replenish` - 食材を補充
- `POST /api/v1/ingredients/batch-consume` - 複数食材を一括消費

### 集計・サマリー

- `GET /api/v1/ingredients/summary/by-category` - カテゴリー別在庫サマリー

### マスタデータ

- `GET /api/v1/ingredients/categories` - カテゴリー一覧取得
- `GET /api/v1/ingredients/units` - 単位一覧取得

---

## 食材一覧取得

### 概要

登録されている食材の一覧を取得します。検索、フィルタリング、ソート、ページネーションに対応しています。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/ingredients`
- **認証**: 不要
- **権限**: なし

### リクエスト

#### クエリパラメータ

| パラメータ         | 型      | 必須 | デフォルト | 説明                                                |
| ------------------ | ------- | ---- | ---------- | --------------------------------------------------- |
| page               | number  | No   | 1          | ページ番号（1から開始）                             |
| limit              | number  | No   | 20         | 1ページあたりの件数（最大100）                      |
| search             | string  | No   | -          | 食材名での部分一致検索                              |
| categoryId         | string  | No   | -          | カテゴリーIDでフィルタ                              |
| storageLocation    | string  | No   | -          | 保存場所でフィルタ                                  |
| hasStock           | boolean | No   | -          | 在庫有無でフィルタ（true:在庫あり、false:在庫切れ） |
| expiringWithinDays | number  | No   | -          | 指定日数以内に期限切れになる食材を抽出              |
| includeExpired     | boolean | No   | false      | 期限切れの食材を含むか                              |
| sortBy             | string  | No   | updatedAt  | ソート項目（name, updatedAt, expiryDate, quantity） |
| sortOrder          | string  | No   | desc       | ソート順（asc, desc）                               |

### レスポンス

#### 成功時（200 OK）

```typescript
interface IngredientsListResponse {
  data: Array<{
    id: string
    name: string
    category: {
      id: string
      name: string
    }
    quantity: {
      amount: number
      unit: {
        id: string
        name: string
        symbol: string
        type: 'COUNT' | 'WEIGHT' | 'VOLUME'
      }
    }
    expiryDate: string | null
    bestBeforeDate: string | null
    storageLocation: {
      type: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
      detail?: string
    }
    daysUntilExpiry: number | null
    expiryStatus: 'FRESH' | 'NEAR_EXPIRY' | 'EXPIRING_SOON' | 'CRITICAL' | 'EXPIRED'
    isExpired: boolean
    isExpiringSoon: boolean
    hasStock: boolean
    updatedAt: string
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
    nextPage: number | null
    prevPage: number | null
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

**レスポンス例**

```json
{
  "data": [
    {
      "id": "clm1234567890",
      "name": "牛乳",
      "category": {
        "id": "clm0987654321",
        "name": "乳製品"
      },
      "quantity": {
        "amount": 1000,
        "unit": {
          "id": "clm1111111111",
          "name": "ml",
          "symbol": "ml",
          "type": "VOLUME"
        }
      },
      "expiryDate": "2025-01-25",
      "bestBeforeDate": null,
      "storageLocation": {
        "type": "REFRIGERATED",
        "detail": "ドアポケット"
      },
      "daysUntilExpiry": 4,
      "expiryStatus": "NEAR_EXPIRY",
      "isExpired": false,
      "isExpiringSoon": true,
      "hasStock": true,
      "updatedAt": "2025-01-21T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false,
    "nextPage": 2,
    "prevPage": null
  },
  "meta": {
    "timestamp": "2025-01-21T12:00:00Z",
    "version": "1.0.0"
  }
}
```

### 実装例

#### cURL

```bash
curl -X GET "http://localhost:3000/api/v1/ingredients?page=1&limit=20&search=牛乳&sortBy=name&sortOrder=asc" \
  -H "Content-Type: application/json"
```

#### TypeScript

```typescript
async function fetchIngredients(params: {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  sortBy?: 'name' | 'updatedAt' | 'expiryDate'
  sortOrder?: 'asc' | 'desc'
}) {
  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, value.toString())
    }
  })

  const response = await fetch(`/api/v1/ingredients?${queryParams}`)
  if (!response.ok) {
    throw new Error('Failed to fetch ingredients')
  }
  return response.json()
}
```

---

## 食材詳細取得

### 概要

指定されたIDの食材詳細情報を取得します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/ingredients/{id}`
- **認証**: 不要
- **権限**: なし

### リクエスト

#### パスパラメータ

| パラメータ | 型     | 必須 | 説明               |
| ---------- | ------ | ---- | ------------------ |
| id         | string | Yes  | 食材ID（CUID形式） |

### レスポンス

#### 成功時（200 OK）

```typescript
interface IngredientDetailResponse {
  data: {
    id: string
    name: string
    categoryId: string
    categoryName: string
    quantity: number
    unitId: string
    unitName: string
    expiryDate: string | null
    bestBeforeDate: string | null
    purchaseDate: string
    price: number | null
    storageLocation: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
    memo: string | null
    createdAt: string
    updatedAt: string
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

#### エラーレスポンス

| ステータスコード | エラーコード | 説明                             |
| ---------------- | ------------ | -------------------------------- |
| 404              | NOT_FOUND    | 指定されたIDの食材が見つからない |

### 実装例

#### TypeScript

```typescript
async function fetchIngredientById(id: string) {
  const response = await fetch(`/api/v1/ingredients/${id}`)
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Ingredient not found')
    }
    throw new Error('Failed to fetch ingredient')
  }
  return response.json()
}
```

---

## 食材登録

### 概要

新しい食材を登録します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/ingredients`
- **認証**: 不要（将来必要）
- **権限**: なし（将来必要）

### リクエスト

#### リクエストボディ

```typescript
interface CreateIngredientRequest {
  name: string // 1-50文字
  categoryId: string // CUID形式
  quantity: number // 0より大きい数値、小数点以下2桁まで
  unitId: string // CUID形式
  storageLocation: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
  expiryDate?: string | null // ISO 8601形式
  bestBeforeDate?: string | null // ISO 8601形式
  purchaseDate: string // ISO 8601形式
  price?: number | null // 0以上の整数（円単位）
  memo?: string | null // 最大200文字
}
```

#### バリデーションルール

- `name`: 必須、1-50文字、前後の空白は自動トリミング
- `quantity`: 必須、0より大きい数値、小数点以下2桁まで
- `price`: 0以上の整数
- `expiryDate/bestBeforeDate`: 未来の日付のみ許可
- `memo`: 最大200文字

### レスポンス

#### 成功時（201 Created）

```typescript
interface CreateIngredientResponse {
  data: {
    id: string
    name: string
    categoryId: string
    quantity: number
    unitId: string
    storageLocation: string
    expiryDate: string | null
    bestBeforeDate: string | null
    purchaseDate: string
    price: number | null
    memo: string | null
    createdAt: string
    updatedAt: string
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

#### エラーレスポンス

| ステータスコード | エラーコード         | 説明                                           |
| ---------------- | -------------------- | ---------------------------------------------- |
| 400              | VALIDATION_ERROR     | 入力値が不正                                   |
| 404              | NOT_FOUND            | 指定されたカテゴリーIDまたは単位IDが存在しない |
| 409              | DUPLICATE_INGREDIENT | 同名の食材が既に存在（将来実装）               |

### 実装例

#### TypeScript

```typescript
async function createIngredient(data: CreateIngredientRequest) {
  const response = await fetch('/api/v1/ingredients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw error
  }

  return response.json()
}
```

---

## 食材更新

### 概要

既存の食材情報を更新します。

### エンドポイント情報

- **メソッド**: `PUT`
- **パス**: `/api/v1/ingredients/{id}`
- **認証**: 不要（将来必要）
- **権限**: なし（将来必要）

### リクエスト

#### パスパラメータ

| パラメータ | 型     | 必須 | 説明               |
| ---------- | ------ | ---- | ------------------ |
| id         | string | Yes  | 食材ID（CUID形式） |

#### リクエストボディ

```typescript
interface UpdateIngredientRequest {
  name: string
  categoryId: string
  quantity: number
  unitId: string
  storageLocation: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
  expiryDate?: string | null
  bestBeforeDate?: string | null
  purchaseDate: string
  price?: number | null
  memo?: string | null
}
```

### レスポンス

#### 成功時（200 OK）

登録APIと同じ形式のレスポンス

#### エラーレスポンス

| ステータスコード | エラーコード     | 説明                             |
| ---------------- | ---------------- | -------------------------------- |
| 400              | VALIDATION_ERROR | 入力値が不正                     |
| 404              | NOT_FOUND        | 指定されたIDの食材が見つからない |
| 409              | CONFLICT         | 楽観的ロック失敗（将来実装）     |

---

## 食材削除

### 概要

指定された食材を削除します。

### エンドポイント情報

- **メソッド**: `DELETE`
- **パス**: `/api/v1/ingredients/{id}`
- **認証**: 不要（将来必要）
- **権限**: なし（将来必要）

### リクエスト

#### パスパラメータ

| パラメータ | 型     | 必須 | 説明               |
| ---------- | ------ | ---- | ------------------ |
| id         | string | Yes  | 食材ID（CUID形式） |

### レスポンス

#### 成功時（204 No Content）

レスポンスボディなし

#### エラーレスポンス

| ステータスコード | エラーコード | 説明                             |
| ---------------- | ------------ | -------------------------------- |
| 404              | NOT_FOUND    | 指定されたIDの食材が見つからない |

---

## カテゴリー一覧取得

### 概要

食材カテゴリーのマスタデータを取得します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/ingredients/categories`
- **認証**: 不要
- **権限**: なし

### レスポンス

#### 成功時（200 OK）

```typescript
interface CategoriesResponse {
  data: Array<{
    id: string
    name: string
    description: string | null
    displayOrder: number
    createdAt: string
    updatedAt: string
  }>
  meta: {
    timestamp: string
    version: string
  }
}
```

**レスポンス例**

```json
{
  "data": [
    {
      "id": "clm0987654321",
      "name": "野菜",
      "description": "野菜類",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    },
    {
      "id": "clm0987654322",
      "name": "肉・魚",
      "description": "肉類・魚介類",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "timestamp": "2025-01-21T12:00:00Z",
    "version": "1.0.0"
  }
}
```

### 実装例

#### TypeScript (TanStack Query)

```typescript
import { useQuery } from '@tanstack/react-query'

function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/v1/ingredients/categories')
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }
      return response.json()
    },
    staleTime: 10 * 60 * 1000, // 10分間キャッシュ
  })
}
```

---

## 単位一覧取得

### 概要

食材の単位マスタデータを取得します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/ingredients/units`
- **認証**: 不要
- **権限**: なし

### レスポンス

#### 成功時（200 OK）

```typescript
interface UnitsResponse {
  data: Array<{
    id: string
    name: string
    symbol: string
    type: 'COUNT' | 'WEIGHT' | 'VOLUME'
    description: string | null
    displayOrder: number
    createdAt: string
    updatedAt: string
  }>
  meta: {
    timestamp: string
    version: string
  }
}
```

**レスポンス例**

```json
{
  "data": [
    {
      "id": "clm1111111111",
      "name": "個",
      "symbol": "個",
      "type": "COUNT",
      "description": "個数",
      "displayOrder": 1,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    },
    {
      "id": "clm1111111112",
      "name": "グラム",
      "symbol": "g",
      "type": "WEIGHT",
      "description": "重量（グラム）",
      "displayOrder": 10,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    },
    {
      "id": "clm1111111113",
      "name": "ミリリットル",
      "symbol": "ml",
      "type": "VOLUME",
      "description": "容量（ミリリットル）",
      "displayOrder": 20,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "timestamp": "2025-01-21T12:00:00Z",
    "version": "1.0.0"
  }
}
```

## 共通の注意事項

### パフォーマンス

- 一覧取得APIは適切なインデックスを設定
- N+1問題を避けるため、関連データは一括取得

### セキュリティ

- すべての入力値はサーバー側で検証
- SQLインジェクション対策（Prisma使用）
- 将来的には認証・認可を実装

### キャッシュ戦略

- マスタデータ（カテゴリー、単位）: 10分
- 一覧データ: 1分
- 詳細データ: キャッシュなし（常に最新）

---

## 食材を消費する

### 概要

食材の在庫を消費（減少）します。料理や使用により在庫が減った場合に使用します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/ingredients/{id}/consume`
- **認証**: 必要
- **権限**: 食材の所有者

### リクエスト

#### パスパラメータ

| パラメータ | 型     | 必須 | 説明               |
| ---------- | ------ | ---- | ------------------ |
| id         | string | Yes  | 食材ID（CUID形式） |

#### リクエストボディ

```typescript
interface ConsumeIngredientRequest {
  quantity: number // 消費する数量（0より大きい値）
  consumedFor?: string // 何に使用したか（例：「カレー」「朝食」）
  notes?: string // メモ（最大200文字）
}
```

### レスポンス

#### 成功時（200 OK）

```typescript
interface ConsumeIngredientResponse {
  data: {
    ingredientId: string
    name: string
    previousQuantity: {
      amount: number
      unit: {
        id: string
        name: string
        symbol: string
      }
    }
    consumedQuantity: {
      amount: number
      unit: {
        id: string
        name: string
        symbol: string
      }
    }
    remainingQuantity: {
      amount: number
      unit: {
        id: string
        name: string
        symbol: string
      }
    }
    isOutOfStock: boolean
    consumedAt: string
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

#### エラーレスポンス

| ステータスコード | エラーコード       | 説明               |
| ---------------- | ------------------ | ------------------ |
| 400              | INSUFFICIENT_STOCK | 在庫が不足している |
| 404              | NOT_FOUND          | 食材が見つからない |

---

## 食材を補充する

### 概要

食材の在庫を補充（増加）します。買い物により在庫が増えた場合に使用します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/ingredients/{id}/replenish`
- **認証**: 必要
- **権限**: 食材の所有者

### リクエスト

#### リクエストボディ

```typescript
interface ReplenishIngredientRequest {
  quantity: number // 補充する数量（0より大きい値）
  purchasePrice?: number // 購入価格（円）
  purchaseDate?: string // 購入日（ISO 8601形式）
  bestBeforeDate?: string // 新しい賞味期限
  expiryDate?: string // 新しい消費期限
  storageLocation?: {
    // 保存場所の変更
    type: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
    detail?: string
  }
  notes?: string // メモ
}
```

### レスポンス

#### 成功時（200 OK）

```typescript
interface ReplenishIngredientResponse {
  data: {
    ingredientId: string
    name: string
    previousQuantity: {
      amount: number
      unit: {
        id: string
        name: string
        symbol: string
      }
    }
    addedQuantity: {
      amount: number
      unit: {
        id: string
        name: string
        symbol: string
      }
    }
    currentQuantity: {
      amount: number
      unit: {
        id: string
        name: string
        symbol: string
      }
    }
    replenishedAt: string
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

---

## 複数食材を一括消費する

### 概要

レシピなどで複数の食材を同時に消費する場合に使用します。トランザクション処理により、すべて成功するか、すべて失敗するかのいずれかになります。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/ingredients/batch-consume`
- **認証**: 必要
- **権限**: 各食材の所有者

### リクエスト

```typescript
interface BatchConsumeRequest {
  consumptions: Array<{
    ingredientId: string
    quantity: number
  }>
  consumedFor?: string // 例：「チキンカレー」
  notes?: string // 例：「4人分」
}
```

### レスポンス

#### 成功時（200 OK）

```typescript
interface BatchConsumeResponse {
  data: {
    results: Array<{
      ingredientId: string
      ingredientName: string
      success: boolean
      remainingQuantity?: number
      error?: string
    }>
    allSuccessful: boolean
    consumedAt: string
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

#### エラーレスポンス

| ステータスコード | エラーコード           | 説明                         |
| ---------------- | ---------------------- | ---------------------------- |
| 400              | BATCH_OPERATION_FAILED | 一部またはすべての操作が失敗 |
| 400              | INSUFFICIENT_STOCK     | 1つ以上の食材で在庫不足      |

---

## カテゴリー別在庫サマリー

### 概要

カテゴリーごとの在庫状況のサマリーを取得します。ダッシュボードや統計表示に使用します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/ingredients/summary/by-category`
- **認証**: 必要
- **権限**: なし

### レスポンス

#### 成功時（200 OK）

```typescript
interface CategorySummaryResponse {
  data: {
    categories: Array<{
      category: {
        id: string
        name: string
      }
      totalItems: number // 総アイテム数
      itemsWithStock: number // 在庫ありアイテム数
      itemsOutOfStock: number // 在庫切れアイテム数
      itemsExpiringSoon: number // 期限切れ間近アイテム数
      itemsExpired: number // 期限切れアイテム数
    }>
    summary: {
      totalCategories: number
      totalItems: number
      totalItemsWithStock: number
      totalItemsExpiringSoon: number
      totalItemsExpired: number
    }
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

## 削除ポリシー

### 論理削除

DDD設計に基づき、食材の削除は論理削除として実装されます：

- `DELETE /api/v1/ingredients/{id}` は `deletedAt` フィールドを設定
- 削除された食材は通常の一覧取得では表示されない
- 履歴や統計のために削除済みデータも保持される

## 関連ドキュメント

- [共通仕様](../common/overview.md)
- [エラーハンドリング](../common/errors.md)
- [ページネーション](../common/pagination.md)
- [データフォーマット](../common/formats.md)
