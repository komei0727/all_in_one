# 食材管理API

## 概要

食材の登録、取得、更新、削除を行うAPIです。カテゴリーと単位のマスタデータ取得も含みます。

### 認証・認可

- すべての食材操作APIは認証が必要です
- 認証トークンからユーザーIDを取得し、そのユーザーの食材のみ操作可能です
- 認証方式: Bearer Token（Authorization ヘッダー）

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
- `POST /api/v1/ingredients/{id}/discard` - 食材を廃棄
- `POST /api/v1/ingredients/{id}/adjust` - 在庫を調整（棚卸し）
- `POST /api/v1/ingredients/batch-consume` - 複数食材を一括消費
- `POST /api/v1/ingredients/batch-replenish` - 複数食材を一括補充
- `POST /api/v1/ingredients/batch-adjust` - 複数食材を一括調整
- `POST /api/v1/ingredients/batch-discard` - 複数食材を一括廃棄

### 在庫チェック

- `GET /api/v1/ingredients/{id}/stock-status` - 食材の在庫状態取得
- `GET /api/v1/ingredients/low-stock` - 在庫不足食材一覧

### 期限管理

- `GET /api/v1/ingredients/expiring-soon` - 期限切れ間近食材一覧
- `GET /api/v1/ingredients/expired` - 期限切れ食材一覧
- `POST /api/v1/ingredients/{id}/update-expiry` - 期限情報更新
- `GET /api/v1/ingredients/expiry-statistics` - 期限統計取得

### 集計・サマリー

- `GET /api/v1/ingredients/summary/by-category` - カテゴリー別在庫サマリー

### 履歴・監査

- `GET /api/v1/ingredients/{id}/events` - 食材のイベント履歴取得
- `GET /api/v1/events` - 全体のイベント履歴検索

### 買い物サポート

- `POST /api/v1/shopping/sessions` - 買い物セッション開始
- `GET /api/v1/shopping/sessions/active` - アクティブセッション取得
- `PUT /api/v1/shopping/sessions/{id}/complete` - セッション完了
- `POST /api/v1/shopping/sessions/{id}/check/{ingredientId}` - 食材確認
- `GET /api/v1/shopping/history` - 買い物履歴取得
- `GET /api/v1/shopping/quick-access` - クイックアクセス食材取得
- `GET /api/v1/shopping/categories/{id}/ingredients` - カテゴリー別食材取得（買い物用）
- `GET /api/v1/shopping/statistics` - 買い物統計取得

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
- **認証**: 必要
- **権限**: 認証ユーザーの食材のみ取得

### リクエスト

#### クエリパラメータ

| パラメータ         | 型      | 必須 | デフォルト | 説明                                                |
| ------------------ | ------- | ---- | ---------- | --------------------------------------------------- |
| page               | number  | No   | 1          | ページ番号（1から開始）                             |
| limit              | number  | No   | 20         | 1ページあたりの件数（最大100）                      |
| search             | string  | No   | -          | 食材名でのキーワード検索（部分一致）                |
| categoryId         | string  | No   | -          | カテゴリーIDでフィルタ                              |
| storageLocation    | string  | No   | -          | 保存場所でフィルタ                                  |
| hasStock           | boolean | No   | -          | 在庫有無でフィルタ（true:在庫あり、false:在庫切れ） |
| expiringWithinDays | number  | No   | -          | 指定日数以内に期限切れになる食材を抽出              |
| includeExpired     | boolean | No   | false      | 期限切れの食材を含むか                              |
| sortBy             | string  | No   | updatedAt  | ソート項目（name, updatedAt, expiryDate, quantity） |
| sortOrder          | string  | No   | desc       | ソート順（asc, desc）                               |

### レスポンス

#### 成功時（200 OK）

認証されたユーザーの食材のみが返されます。

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
    expiryInfo: {
      bestBeforeDate: string | null
      useByDate: string | null
    } | null
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

---

## 食材詳細取得

### 概要

指定されたIDの食材詳細情報を取得します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/ingredients/{id}`
- **認証**: 必要
- **権限**: 食材の所有者のみ

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
    storageLocation: {
      type: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
      detail?: string
    }
    expiryInfo: {
      bestBeforeDate: string | null
      useByDate: string | null
    } | null
    purchaseDate: string
    price: number | null
    memo: string | null
    daysUntilExpiry: number | null
    expiryStatus: 'FRESH' | 'NEAR_EXPIRY' | 'EXPIRING_SOON' | 'CRITICAL' | 'EXPIRED'
    isExpired: boolean
    isExpiringSoon: boolean
    hasStock: boolean
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

---

## 食材登録

### 概要

新しい食材を登録します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/ingredients`
- **認証**: 必要
- **権限**: 認証ユーザー

### リクエスト

#### リクエストボディ

```typescript
interface CreateIngredientRequest {
  name: string // 1-50文字
  categoryId: string // CUID形式
  quantity: {
    amount: number // 0より大きい数値、小数点以下2桁まで
    unitId: string // CUID形式
  }
  storageLocation: {
    type: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
    detail?: string // 保存場所の詳細（例：「ドアポケット」）最大50文字
  }
  expiryInfo?: {
    bestBeforeDate?: string | null // 賞味期限（ISO 8601形式）
    useByDate?: string | null // 消費期限（ISO 8601形式）
  } | null
  purchaseDate: string // ISO 8601形式
  price?: number | null // 0以上の数値（小数点以下2桁まで対応）
  memo?: string | null // 最大200文字
}
```

#### バリデーションルール

- `name`: 必須、1-50文字、前後の空白は自動トリミング
- `quantity.amount`: 必須、0より大きい数値、小数点以下2桁まで
- `quantity.unitId`: 必須、存在する単位ID
- `storageLocation.type`: 必須、定義された値のみ
- `storageLocation.detail`: 任意、最大50文字
- `price`: 0以上の数値（小数点以下2桁まで）
- `expiryInfo.bestBeforeDate/useByDate`: 未来の日付のみ許可
- `expiryInfo`: useByDateはbestBeforeDate以前でなければならない
- `memo`: 最大200文字

### レスポンス

#### 成功時（201 Created）

```typescript
interface CreateIngredientResponse {
  ingredient: {
    id: string
    name: string
    memo: string | null
    category: {
      id: string
      name: string
    }
    currentStock: {
      quantity: number
      isInStock: boolean
      unit: {
        id: string
        name: string
        symbol: string
      }
      storageLocation: {
        type: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
        detail?: string
      }
      expiryInfo?: {
        bestBeforeDate?: string
        useByDate?: string
      }
      purchaseDate: string
      price?: number // 小数点対応
    }
    createdAt: string
    updatedAt: string
  }
}
```

#### エラーレスポンス

| ステータスコード | エラーコード         | 説明                                                |
| ---------------- | -------------------- | --------------------------------------------------- |
| 400              | VALIDATION_ERROR     | 入力値が不正                                        |
| 404              | NOT_FOUND            | 指定されたカテゴリーIDまたは単位IDが存在しない 　　 |
| 409              | DUPLICATE_INGREDIENT | ユーザーID・名前・期限・保存場所が重複              |

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
  quantity: {
    amount: number
    unitId: string
  }
  storageLocation: {
    type: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
    detail?: string
  }
  expiryInfo?: {
    bestBeforeDate?: string | null
    useByDate?: string | null
  } | null
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

## 共通仕様

### 共通エラーコード

| コード                 | HTTP | 説明                                   |
| ---------------------- | ---- | -------------------------------------- |
| VALIDATION_ERROR       | 400  | 入力データの検証エラー                 |
| UNAUTHORIZED           | 401  | 認証が必要                             |
| FORBIDDEN              | 403  | アクセス権限がない（他ユーザーの食材） |
| NOT_FOUND              | 404  | リソースが見つからない                 |
| DUPLICATE_INGREDIENT   | 409  | 同一ユーザー内で食材が重複             |
| INSUFFICIENT_STOCK     | 400  | 在庫が不足している                     |
| ALREADY_DISCARDED      | 400  | すでに廃棄されている                   |
| BATCH_OPERATION_FAILED | 400  | バッチ処理が失敗                       |
| INTERNAL_SERVER_ERROR  | 500  | サーバー内部エラー                     |

### エラーレスポンス形式

すべてのAPIで共通のエラーレスポンス形式を使用します。

```typescript
interface ErrorResponse {
  error: {
    code: string // エラーコード（例：INSUFFICIENT_STOCK）
    message: string // ユーザー向けメッセージ
    type: 'BUSINESS_RULE_VIOLATION' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'SYSTEM_ERROR'
    details?: {
      // ビジネスルール違反の詳細
      rule?: string // 違反したルール名
      constraints?: Record<string, any> // 制約の詳細
      suggestions?: string[] // ユーザーへの提案
      fields?: Array<{
        // フィールドごとのエラー（バリデーションエラー時）
        field: string
        message: string
        code: string
      }>
    }
  }
  meta: {
    timestamp: string
    correlationId: string // エラー追跡用ID
  }
}
```

### パフォーマンス

- 一覧取得APIは適切なインデックスを設定
- N+1問題を避けるため、関連データは一括取得

### セキュリティ

- すべての入力値はサーバー側で検証
- SQLインジェクション対策（Prisma使用）
- Bearer Tokenによる認証を実装
- ユーザーIDによるアクセス制御（自分の食材のみ操作可能）

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
  events: Array<{
    id: string
    type: 'IngredientConsumed'
    occurredAt: string
    aggregateId: string
    userId: string
    data: {
      ingredientName: string
      consumedQuantity: {
        amount: number
        unit: string
      }
      remainingQuantity: {
        amount: number
        unit: string
      }
      consumedFor?: string
    }
  }>
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
  purchasePrice?: number // 購入価格（小数点以下2桁まで対応）
  purchaseDate?: string // 購入日（ISO 8601形式）
  expiryInfo?: {
    // 新しい期限情報
    bestBeforeDate?: string | null
    useByDate?: string | null
  } | null
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

## 食材を廃棄する

### 概要

期限切れや損傷などにより食材を廃棄します。在庫を0にし、廃棄理由を記録します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/ingredients/{id}/discard`
- **認証**: 必要
- **権限**: 食材の所有者

### リクエスト

#### パスパラメータ

| パラメータ | 型     | 必須 | 説明               |
| ---------- | ------ | ---- | ------------------ |
| id         | string | Yes  | 食材ID（CUID形式） |

#### リクエストボディ

```typescript
interface DiscardIngredientRequest {
  reason: 'EXPIRED' | 'DAMAGED' | 'LOST' | 'OTHER' // 廃棄理由
  quantity?: number // 廃棄数量（省略時は全量廃棄）
  notes?: string // 詳細理由（最大200文字）
}
```

### レスポンス

#### 成功時（200 OK）

```typescript
interface DiscardIngredientResponse {
  data: {
    ingredientId: string
    ingredientName: string
    discardedQuantity: {
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
    reason: string
    discardedAt: string
    isCompletelyDiscarded: boolean // 完全に廃棄されたかどうか
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

#### エラーレスポンス

| ステータスコード | エラーコード       | 説明                       |
| ---------------- | ------------------ | -------------------------- |
| 400              | INSUFFICIENT_STOCK | 廃棄数量が在庫を超えている |
| 404              | NOT_FOUND          | 食材が見つからない         |
| 400              | ALREADY_DISCARDED  | 既に完全に廃棄済みの食材   |

---

## 在庫を調整する

### 概要

棚卸しや実地調査により実際の在庫と記録が異なる場合に、在庫数を調整します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/ingredients/{id}/adjust`
- **認証**: 必要
- **権限**: 食材の所有者

### リクエスト

#### パスパラメータ

| パラメータ | 型     | 必須 | 説明               |
| ---------- | ------ | ---- | ------------------ |
| id         | string | Yes  | 食材ID（CUID形式） |

#### リクエストボディ

```typescript
interface AdjustIngredientRequest {
  actualQuantity: number // 実際の在庫数量
  reason: string // 調整理由（例：「棚卸し」「紛失発見」）
  notes?: string // 詳細メモ（最大200文字）
}
```

### レスポンス

#### 成功時（200 OK）

```typescript
interface AdjustIngredientResponse {
  data: {
    ingredientId: string
    ingredientName: string
    previousQuantity: {
      amount: number
      unit: {
        id: string
        name: string
        symbol: string
      }
    }
    actualQuantity: {
      amount: number
      unit: {
        id: string
        name: string
        symbol: string
      }
    }
    difference: {
      amount: number // 差分（正=増加、負=減少）
      unit: {
        id: string
        name: string
        symbol: string
      }
    }
    adjustmentType: 'INCREASE' | 'DECREASE' | 'NO_CHANGE'
    reason: string
    adjustedAt: string
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

#### エラーレスポンス

| ステータスコード | エラーコード  | 説明                   |
| ---------------- | ------------- | ---------------------- |
| 400              | INVALID_VALUE | 実際の在庫数量が負の値 |
| 404              | NOT_FOUND     | 食材が見つからない     |

---

## 在庫状態取得

### 概要

指定された食材の現在の在庫状態を取得します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/ingredients/{id}/stock-status`
- **認証**: 必要
- **権限**: 食材の所有者

### レスポンス

#### 成功時（200 OK）

```typescript
interface StockStatusResponse {
  data: {
    ingredientId: string
    name: string
    quantity: {
      amount: number
      unit: {
        id: string
        name: string
        symbol: string
      }
    }
    hasStock: boolean
    isLowStock: boolean
    stockLevel: 'OUT_OF_STOCK' | 'LOW' | 'NORMAL' | 'HIGH'
    threshold?: number // 在庫不足闾値
    lastUpdated: string
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

---

## 在庫不足食材一覧

### 概要

在庫が不足している食材の一覧を取得します。買い物提案に使用します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/ingredients/low-stock`
- **認証**: 必要
- **権限**: なし

### リクエスト

#### クエリパラメータ

| パラメータ | 型     | 必須 | デフォルト | 説明                   |
| ---------- | ------ | ---- | ---------- | ---------------------- |
| page       | number | No   | 1          | ページ番号             |
| limit      | number | No   | 20         | 1ページあたりの件数    |
| categoryId | string | No   | -          | カテゴリーIDでフィルタ |

### レスポンス

#### 成功時（200 OK）

```typescript
interface LowStockIngredientsResponse {
  data: Array<{
    id: string
    name: string
    category: {
      id: string
      name: string
    }
    currentQuantity: {
      amount: number
      unit: {
        id: string
        name: string
        symbol: string
      }
    }
    threshold: number
    shortage: number // 不足量
    suggestedPurchaseAmount: number // 推奨購入量
    lastPurchaseDate?: string
    averageConsumptionRate?: number // 平均消費率（将来実装）
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

---

## 期限切れ間近食材一覧

### 概要

期限切れ間近の食材一覧を取得します。デフォルトでは3日以内に期限切れとなる食材を返します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/ingredients/expiring-soon`
- **認証**: 必要
- **権限**: なし

### リクエスト

#### クエリパラメータ

| パラメータ | 型     | 必須 | デフォルト | 説明                               |
| ---------- | ------ | ---- | ---------- | ---------------------------------- |
| days       | number | No   | 3          | 何日以内に期限切れとなる食材を取得 |
| page       | number | No   | 1          | ページ番号                         |
| limit      | number | No   | 20         | 1ページあたりの件数                |

### レスポンス

#### 成功時（200 OK）

```typescript
interface ExpiringSoonIngredientsResponse {
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
      }
    }
    expiryInfo: {
      bestBeforeDate: string | null
      useByDate: string | null
    }
    daysUntilExpiry: number
    expiryDate: string // 表示用の期限日（useByDate優先）
    expiryStatus: 'EXPIRING_SOON' | 'CRITICAL' // CRITICALは1日以内
    storageLocation: {
      type: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
      detail?: string
    }
  }>
  summary: {
    totalExpiringSoon: number
    byCategoryCount: Array<{
      categoryId: string
      categoryName: string
      count: number
    }>
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

---

## 期限切れ食材一覧

### 概要

既に期限切れとなっている食材の一覧を取得します。廃棄候補の確認に使用します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/ingredients/expired`
- **認証**: 必要
- **権限**: なし

### レスポンス

#### 成功時（200 OK）

```typescript
interface ExpiredIngredientsResponse {
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
      }
    }
    expiryInfo: {
      bestBeforeDate: string | null
      useByDate: string | null
    }
    expiredDate: string // 期限切れ日
    daysExpired: number // 期限切れからの日数
    estimatedLoss?: number // 推定損失額（将来実装）
  }>
  summary: {
    totalExpired: number
    totalEstimatedLoss?: number
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

---

## 期限情報更新

### 概要

食材の期限情報を更新します。賞味期限や消費期限の修正に使用します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/ingredients/{id}/update-expiry`
- **認証**: 必要
- **権限**: 食材の所有者

### リクエスト

#### リクエストボディ

```typescript
interface UpdateExpiryRequest {
  expiryInfo: {
    bestBeforeDate?: string | null // 賞味期限（ISO 8601形式）
    useByDate?: string | null // 消費期限（ISO 8601形式）
  }
  reason?: string // 更新理由
}
```

### レスポンス

#### 成功時（200 OK）

```typescript
interface UpdateExpiryResponse {
  data: {
    ingredientId: string
    name: string
    previousExpiryInfo: {
      bestBeforeDate: string | null
      useByDate: string | null
    }
    newExpiryInfo: {
      bestBeforeDate: string | null
      useByDate: string | null
    }
    updatedAt: string
  }
  events: Array<{
    type: 'ExpiryInfoUpdated'
    occurredAt: string
    data: {
      previousExpiryInfo: {
        bestBeforeDate: string | null
        useByDate: string | null
      }
      newExpiryInfo: {
        bestBeforeDate: string | null
        useByDate: string | null
      }
      reason?: string
    }
  }>
  meta: {
    timestamp: string
    version: string
  }
}
```

#### エラーレスポンス

| ステータスコード | エラーコード        | 説明                                  |
| ---------------- | ------------------- | ------------------------------------- |
| 400              | INVALID_EXPIRY_INFO | useByDateがbestBeforeDateより後の日付 |
| 404              | NOT_FOUND           | 食材が見つからない                    |

---

## 期限統計取得

### 概要

食材の期限に関する統計情報を取得します。ダッシュボード表示や分析に使用します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/ingredients/expiry-statistics`
- **認証**: 必要
- **権限**: なし

### レスポンス

#### 成功時（200 OK）

```typescript
interface ExpiryStatisticsResponse {
  data: {
    overview: {
      totalIngredients: number
      expiredCount: number
      expiringSoonCount: number // 3日以内
      freshCount: number // 7日以上
    }
    byStatus: Array<{
      status: 'EXPIRED' | 'CRITICAL' | 'EXPIRING_SOON' | 'NEAR_EXPIRY' | 'FRESH'
      count: number
      percentage: number
    }>
    byCategory: Array<{
      categoryId: string
      categoryName: string
      expired: number
      expiringSoon: number
      total: number
    }>
    trends: {
      // 将来実装: 過去30日間の廃棄傾向
      last30Days?: {
        totalDiscarded: number
        estimatedLoss: number
      }
    }
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

---

## 食材のイベント履歴取得

### 概要

指定した食材に対するすべての操作履歴（作成、消費、補充、廃棄、調整など）を時系列で取得します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/ingredients/{id}/events`
- **認証**: 必要
- **権限**: 食材の所有者

### リクエスト

#### パスパラメータ

| パラメータ | 型     | 必須 | 説明               |
| ---------- | ------ | ---- | ------------------ |
| id         | string | Yes  | 食材ID（CUID形式） |

#### クエリパラメータ

| パラメータ | 型     | 必須 | デフォルト | 説明                           |
| ---------- | ------ | ---- | ---------- | ------------------------------ |
| from       | string | No   | -          | 開始日時（ISO 8601形式）       |
| to         | string | No   | -          | 終了日時（ISO 8601形式）       |
| eventType  | string | No   | -          | イベントタイプフィルタ         |
| page       | number | No   | 1          | ページ番号                     |
| limit      | number | No   | 50         | 1ページあたりの件数（最大100） |

### レスポンス

#### 成功時（200 OK）

```typescript
interface IngredientEventsResponse {
  data: Array<{
    id: string
    type:
      | 'IngredientCreated'
      | 'IngredientConsumed'
      | 'IngredientReplenished'
      | 'IngredientDiscarded'
      | 'IngredientAdjusted'
      | 'IngredientUpdated'
    occurredAt: string
    userId: string
    data: {
      // イベントタイプごとに異なるペイロード
      ingredientName: string
      previousQuantity?: {
        amount: number
        unit: string
      }
      newQuantity?: {
        amount: number
        unit: string
      }
      reason?: string
      notes?: string
    }
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

---

## 全体イベント履歴検索

### 概要

システム全体のイベント履歴を検索します。管理者用途や統計分析に使用します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/events`
- **認証**: 必要
- **権限**: 認証ユーザーの食材のイベントのみ取得可能

### リクエスト

#### クエリパラメータ

| パラメータ    | 型     | 必須 | デフォルト | 説明                                       |
| ------------- | ------ | ---- | ---------- | ------------------------------------------ |
| aggregateId   | string | No   | -          | 特定の食材IDでフィルタ                     |
| aggregateType | string | No   | -          | 集約タイプ（Ingredient）                   |
| eventType     | string | No   | -          | イベントタイプでフィルタ                   |
| userId        | string | No   | -          | ユーザーIDでフィルタ（他ユーザー指定不可） |
| from          | string | No   | -          | 開始日時                                   |
| to            | string | No   | -          | 終了日時                                   |
| page          | number | No   | 1          | ページ番号                                 |
| limit         | number | No   | 50         | 1ページあたりの件数                        |

### レスポンス

#### 成功時（200 OK）

```typescript
interface EventsResponse {
  data: Array<{
    id: string
    aggregateId: string
    aggregateType: string
    eventType: string
    eventData: Record<string, any>
    occurredAt: string
    userId: string
    correlationId?: string
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

---

## 買い物セッション開始

### 概要

買い物モードを開始し、新しい買い物セッションを作成します。同時にアクティブなセッションは1つまでです。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/shopping/sessions`
- **認証**: 必要
- **権限**: 認証ユーザー

### リクエスト

#### リクエストボディ

```typescript
interface StartShoppingSessionRequest {
  deviceType?: 'MOBILE' | 'DESKTOP' | 'TABLET' // デバイスタイプ
  location?: {
    latitude?: number
    longitude?: number
    placeName?: string // 店舗名など
  }
  notes?: string // セッション開始時のメモ
}
```

### レスポンス

#### 成功時（201 Created）

```typescript
interface StartShoppingSessionResponse {
  data: {
    sessionId: string
    userId: string
    status: 'ACTIVE'
    startedAt: string
    deviceType?: string
    location?: {
      latitude?: number
      longitude?: number
      placeName?: string
    }
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

#### エラーレスポンス

| ステータスコード | エラーコード          | 説明                                   |
| ---------------- | --------------------- | -------------------------------------- |
| 409              | ACTIVE_SESSION_EXISTS | 既にアクティブなセッションが存在します |
| 401              | UNAUTHORIZED          | 認証が必要                             |

---

## アクティブセッション取得

### 概要

現在アクティブな買い物セッションの情報を取得します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/shopping/sessions/active`
- **認証**: 必要
- **権限**: 認証ユーザー

### レスポンス

#### 成功時（200 OK）

```typescript
interface ActiveShoppingSessionResponse {
  data: {
    sessionId: string
    userId: string
    status: 'ACTIVE'
    startedAt: string
    duration: number // 秒単位
    checkedItemsCount: number
    lastActivityAt: string
  } | null // アクティブセッションがない場合はnull
  meta: {
    timestamp: string
    version: string
  }
}
```

---

## セッション完了

### 概要

アクティブな買い物セッションを完了させます。

### エンドポイント情報

- **メソッド**: `PUT`
- **パス**: `/api/v1/shopping/sessions/{id}/complete`
- **認証**: 必要
- **権限**: セッションの所有者

### リクエスト

#### パスパラメータ

| パラメータ | 型     | 必須 | 説明                     |
| ---------- | ------ | ---- | ------------------------ |
| id         | string | Yes  | セッションID（CUID形式） |

#### リクエストボディ

```typescript
interface CompleteShoppingSessionRequest {
  notes?: string // 完了時のメモ
  totalSpent?: number // 総支出額（小数点以下2桁まで）
}
```

### レスポンス

#### 成功時（200 OK）

```typescript
interface CompleteShoppingSessionResponse {
  data: {
    sessionId: string
    userId: string
    status: 'COMPLETED'
    startedAt: string
    completedAt: string
    duration: number // 秒単位
    checkedItemsCount: number
    totalSpent?: number
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

#### エラーレスポンス

| ステータスコード | エラーコード              | 説明                       |
| ---------------- | ------------------------- | -------------------------- |
| 404              | SESSION_NOT_FOUND         | セッションが見つからない   |
| 409              | SESSION_ALREADY_COMPLETED | セッションは既に完了済み   |
| 403              | FORBIDDEN                 | セッションの所有者ではない |

---

## 食材確認

### 概要

買い物セッション中に食材の在庫状態を確認し、履歴に記録します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/shopping/sessions/{sessionId}/check/{ingredientId}`
- **認証**: 必要
- **権限**: セッションと食材の所有者

### リクエスト

#### パスパラメータ

| パラメータ   | 型     | 必須 | 説明                     |
| ------------ | ------ | ---- | ------------------------ |
| sessionId    | string | Yes  | セッションID（CUID形式） |
| ingredientId | string | Yes  | 食材ID（CUID形式）       |

### レスポンス

#### 成功時（200 OK）

```typescript
interface CheckIngredientResponse {
  data: {
    sessionId: string
    ingredientId: string
    ingredientName: string
    categoryId: string
    stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK'
    expiryStatus?: 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED'
    currentQuantity: {
      amount: number
      unit: {
        id: string
        name: string
        symbol: string
      }
    }
    threshold?: number
    checkedAt: string
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

#### エラーレスポンス

| ステータスコード | エラーコード      | 説明                     |
| ---------------- | ----------------- | ------------------------ |
| 404              | SESSION_NOT_FOUND | セッションが見つからない |
| 404              | NOT_FOUND         | 食材が見つからない       |
| 403              | FORBIDDEN         | アクセス権限がない       |

---

## 買い物履歴取得

### 概要

過去の買い物セッションの履歴を取得します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/shopping/history`
- **認証**: 必要
- **権限**: 認証ユーザー

### リクエスト

#### クエリパラメータ

| パラメータ | 型     | 必須 | デフォルト | 説明                     |
| ---------- | ------ | ---- | ---------- | ------------------------ |
| page       | number | No   | 1          | ページ番号               |
| limit      | number | No   | 20         | 1ページあたりの件数      |
| from       | string | No   | -          | 開始日時（ISO 8601形式） |
| to         | string | No   | -          | 終了日時（ISO 8601形式） |
| status     | string | No   | -          | ステータスフィルタ       |

### レスポンス

#### 成功時（200 OK）

```typescript
interface ShoppingHistoryResponse {
  data: Array<{
    sessionId: string
    status: 'COMPLETED' | 'ABANDONED'
    startedAt: string
    completedAt?: string
    duration: number // 秒単位
    checkedItemsCount: number
    totalSpent?: number
    deviceType?: string
    location?: {
      placeName?: string
    }
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

---

## クイックアクセス食材取得

### 概要

最近確認した食材やよく確認する食材を取得します。買い物モードでの高速アクセス用です。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/shopping/quick-access`
- **認証**: 必要
- **権限**: 認証ユーザー

### リクエスト

#### クエリパラメータ

| パラメータ | 型     | 必須 | デフォルト | 説明               |
| ---------- | ------ | ---- | ---------- | ------------------ |
| limit      | number | No   | 20         | 取得件数（最大50） |

### レスポンス

#### 成功時（200 OK）

```typescript
interface QuickAccessIngredientsResponse {
  data: {
    recentlyChecked: Array<{
      ingredientId: string
      name: string
      categoryId: string
      categoryName: string
      stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK'
      expiryStatus?: 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED'
      lastCheckedAt: string
    }>
    frequentlyChecked: Array<{
      ingredientId: string
      name: string
      categoryId: string
      categoryName: string
      stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK'
      expiryStatus?: 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED'
      checkCount: number
      lastCheckedAt: string
    }>
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

---

## カテゴリー別食材取得（買い物用）

### 概要

指定したカテゴリーの食材を買い物モード用の軽量フォーマットで取得します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/shopping/categories/{id}/ingredients`
- **認証**: 必要
- **権限**: 認証ユーザー

### リクエスト

#### パスパラメータ

| パラメータ | 型     | 必須 | 説明                     |
| ---------- | ------ | ---- | ------------------------ |
| id         | string | Yes  | カテゴリーID（CUID形式） |

#### クエリパラメータ

| パラメータ | 型     | 必須 | デフォルト  | 説明                            |
| ---------- | ------ | ---- | ----------- | ------------------------------- |
| sortBy     | string | No   | stockStatus | ソート項目（stockStatus, name） |

### レスポンス

#### 成功時（200 OK）

```typescript
interface ShoppingCategoryIngredientsResponse {
  data: {
    category: {
      id: string
      name: string
    }
    ingredients: Array<{
      id: string
      name: string
      stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK'
      expiryStatus?: 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED'
      lastCheckedAt?: string // セッション内での最終確認時刻
      currentQuantity: {
        amount: number
        unit: {
          symbol: string
        }
      }
    }>
    summary: {
      totalItems: number
      outOfStockCount: number
      lowStockCount: number
      expiringSoonCount: number
    }
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

---

## 買い物統計取得

### 概要

買い物行動の統計情報を取得します。分析やダッシュボード表示に使用します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/shopping/statistics`
- **認証**: 必要
- **権限**: 認証ユーザー

### リクエスト

#### クエリパラメータ

| パラメータ | 型     | 必須 | デフォルト | 説明                          |
| ---------- | ------ | ---- | ---------- | ----------------------------- |
| period     | string | No   | month      | 集計期間（week, month, year） |
| from       | string | No   | -          | 開始日時（ISO 8601形式）      |
| to         | string | No   | -          | 終了日時（ISO 8601形式）      |

### レスポンス

#### 成功時（200 OK）

```typescript
interface ShoppingStatisticsResponse {
  data: {
    overview: {
      totalSessions: number
      completedSessions: number
      abandonedSessions: number
      averageSessionDuration: number // 秒単位
      averageCheckedItems: number
      totalSpent?: number
    }
    topCheckedIngredients: Array<{
      ingredientId: string
      ingredientName: string
      categoryName: string
      checkCount: number
      outOfStockRate: number // 在庫切れ率（0-1）
    }>
    sessionPatterns: {
      byHour: Array<{
        hour: number // 0-23
        sessionCount: number
      }>
      byDayOfWeek: Array<{
        dayOfWeek: number // 0(日)-6(土)
        sessionCount: number
      }>
    }
    recommendations: Array<{
      type: 'FREQUENT_OUT_OF_STOCK' | 'NEVER_CHECKED' | 'EXPIRING_OFTEN'
      ingredientId: string
      ingredientName: string
      message: string
    }>
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

## 買い物サポート専用エラーコード

買い物セッション関連の操作で発生する可能性があるエラーコード：

| コード                    | HTTPステータス | 説明                               | 対処方法                           |
| ------------------------- | -------------- | ---------------------------------- | ---------------------------------- |
| ACTIVE_SESSION_EXISTS     | 409            | 既にアクティブなセッションが存在   | 既存セッションを完了してから再開始 |
| SESSION_NOT_FOUND         | 404            | 指定されたセッションが見つからない | セッションIDを確認                 |
| SESSION_ALREADY_COMPLETED | 400            | セッションは既に完了済み           | 新しいセッションを開始             |
| BATCH_VALIDATION_FAILED   | 400            | バッチ操作の検証エラー             | リクエストデータを修正             |

---

## バッチ操作API詳細仕様

### 一括補充（batch-replenish）

#### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/ingredients/batch-replenish`
- **認証**: 必要
- **権限**: 認証ユーザーの食材のみ操作可能

#### リクエスト

```typescript
interface BatchReplenishRequest {
  items: Array<{
    ingredientId: string
    quantity: number
    memo?: string
  }>
}
```

#### レスポンス

##### 成功時（200 OK）

```typescript
interface BatchReplenishResponse {
  data: {
    processed: number
    succeeded: Array<{
      ingredientId: string
      ingredientName: string
      previousQuantity: number
      newQuantity: number
      unit: string
    }>
    failed: Array<{
      ingredientId: string
      error: string
      reason: string
    }>
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

---

### 一括調整（batch-adjust）

#### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/ingredients/batch-adjust`
- **認証**: 必要
- **権限**: 認証ユーザーの食材のみ操作可能

#### リクエスト

```typescript
interface BatchAdjustRequest {
  items: Array<{
    ingredientId: string
    newQuantity: number
    reason: 'INVENTORY_COUNT' | 'SYSTEM_CORRECTION' | 'MANUAL_ADJUSTMENT'
    memo?: string
  }>
}
```

#### レスポンス

##### 成功時（200 OK）

```typescript
interface BatchAdjustResponse {
  data: {
    processed: number
    succeeded: Array<{
      ingredientId: string
      ingredientName: string
      previousQuantity: number
      newQuantity: number
      difference: number
      unit: string
      reason: string
    }>
    failed: Array<{
      ingredientId: string
      error: string
      reason: string
    }>
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

---

### 一括廃棄（batch-discard）

#### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/ingredients/batch-discard`
- **認証**: 必要
- **権限**: 認証ユーザーの食材のみ操作可能

#### リクエスト

```typescript
interface BatchDiscardRequest {
  items: Array<{
    ingredientId: string
    quantity: number
    reason: 'EXPIRED' | 'SPOILED' | 'DAMAGED' | 'OTHER'
    memo?: string
  }>
}
```

#### レスポンス

##### 成功時（200 OK）

```typescript
interface BatchDiscardResponse {
  data: {
    processed: number
    succeeded: Array<{
      ingredientId: string
      ingredientName: string
      discardedQuantity: number
      remainingQuantity: number
      unit: string
      reason: string
    }>
    failed: Array<{
      ingredientId: string
      error: string
      reason: string
    }>
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

---

## ドメイン制約の明示化

### 食材名制約

- **最小長**: 1文字
- **最大長**: 50文字
- **許可文字**: 全角・半角文字、数字、記号（ただし制御文字は除く）
- **前後空白**: 自動で除去される

### 保存場所詳細制約

- **最大長**: 50文字
- **例**: "ドアポケット"、"野菜室"、"冷凍庫上段"
- **空文字**: 許可される（詳細なし）

### 期限日制約

- **形式**: ISO 8601 日付形式（YYYY-MM-DD）
- **範囲**: 1900年1月1日 ～ 2100年12月31日
- **賞味期限と消費期限の関係**: 消費期限 ≤ 賞味期限
- **過去日設定**: 許可される（すでに購入済みの食材の場合）

### セッション制約

- **同時アクティブセッション数**: ユーザーごとに1つまで
- **セッション継続時間**: 最大8時間（自動タイムアウト）
- **無操作タイムアウト**: 30分で自動中断
- **確認履歴**: セッションあたり最大1000件

### 数量制約

- **最小値**: 0（在庫切れ状態）
- **最大値**: 99999.99（小数点以下2桁まで）
- **負数**: 許可されない

---

## 削除ポリシー

### 論理削除

DDD設計に基づき、食材の削除は論理削除として実装されます：

- `DELETE /api/v1/ingredients/{id}` は `deletedAt` フィールドを設定
- 削除された食材は通常の一覧取得では表示されない
- 履歴や統計のために削除済みデータも保持される

## 更新履歴

| 日付       | 内容                                                                              | 更新者     |
| ---------- | --------------------------------------------------------------------------------- | ---------- |
| 2025-06-23 | 価格フィールドを小数点対応に変更、食材登録APIのレスポンス形式を実装に合わせて修正 | @komei0727 |
| 2025-06-24 | ExpiryInfo統合、期限管理・在庫チェックAPIエンドポイント追加                       | @komei0727 |
| 2025-06-24 | ユーザーID前提の設計に更新、認証・認可を必須化、共通エラーコード追加              | @komei0727 |
| 2025-06-28 | 買い物サポート機能統合、バッチ操作API詳細仕様追加、ドメイン制約明示化             | Claude     |

## 関連ドキュメント

- [共通仕様](../common/overview.md)
- [エラーハンドリング](../common/errors.md)
- [ページネーション](../common/pagination.md)
- [データフォーマット](../common/formats.md)
