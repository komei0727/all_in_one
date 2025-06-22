# 食材管理コンテキスト - ドメインモデル仕様

## 概要

このドキュメントでは、食材管理コンテキストのドメインモデルの詳細仕様を定義します。
エンティティ、値オブジェクト、ドメインサービスの具体的な設計を記載します。

## エンティティ

### 食材（Ingredient）

食材管理の中核となるエンティティ。在庫管理の対象となる個々の食材を表現します。

```typescript
// 概念的な型定義
interface Ingredient {
  // 識別子
  id: IngredientId

  // 基本情報
  name: IngredientName
  categoryId: CategoryId

  // 在庫情報
  quantity: Quantity
  storageLocation: StorageLocation

  // 期限情報
  bestBeforeDate?: BestBeforeDate
  expiryDate?: ExpiryDate

  // メタ情報
  notes?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date // 論理削除
}
```

#### ビジネスルール

1. **識別ルール**

   - IDによる一意識別
   - 同じ名前・期限・保存場所の組み合わせは重複不可

2. **在庫ルール**

   - 数量は0以上
   - 数量0でも履歴のため保持可能

3. **期限ルール**
   - 消費期限は賞味期限以前
   - 期限は任意（調味料など）

#### 振る舞い

```typescript
interface IngredientBehavior {
  // 在庫操作
  consume(quantity: Quantity): void
  replenish(quantity: Quantity): void

  // 期限チェック
  isExpired(): boolean
  isExpiringSoon(days: number): boolean
  daysUntilExpiry(): number | null

  // 在庫チェック
  hasStock(): boolean
  isLowStock(threshold: Quantity): boolean

  // 更新
  updateCategory(categoryId: CategoryId): void
  updateStorageLocation(location: StorageLocation): void
  updateExpiry(bestBefore?: Date, expiryDate?: Date): void

  // 削除
  delete(): void
  restore(): void
}
```

### カテゴリー（Category）

食材を分類するためのマスタエンティティ。

```typescript
interface Category {
  id: CategoryId
  name: CategoryName
  description?: string
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}
```

#### ビジネスルール

1. カテゴリー名は一意
2. 表示順序で並び替え可能
3. カテゴリーは階層化しない（フラット構造）

### 単位（Unit）

数量を表現するためのマスタエンティティ。

```typescript
interface Unit {
  id: UnitId
  name: UnitName // "個", "g", "ml"
  symbol: string // "個", "g", "ml"
  type: UnitType // "COUNT", "WEIGHT", "VOLUME"
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

enum UnitType {
  COUNT = 'COUNT', // 個数系
  WEIGHT = 'WEIGHT', // 重量系
  VOLUME = 'VOLUME', // 容量系
}
```

## 値オブジェクト

### 食材ID（IngredientId）

```typescript
class IngredientId {
  private readonly value: string

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('食材IDは必須です')
    }
    this.value = value
  }

  equals(other: IngredientId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
```

### 食材名（IngredientName）

```typescript
class IngredientName {
  private readonly value: string

  constructor(value: string) {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      throw new Error('食材名は必須です')
    }
    if (trimmed.length > 50) {
      throw new Error('食材名は50文字以内で入力してください')
    }
    this.value = trimmed
  }

  equals(other: IngredientName): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
```

### 数量（Quantity）

```typescript
class Quantity {
  private readonly amount: number
  private readonly unit: Unit

  constructor(amount: number, unit: Unit) {
    if (amount < 0) {
      throw new Error('数量は0以上である必要があります')
    }
    this.amount = amount
    this.unit = unit
  }

  add(other: Quantity): Quantity {
    if (!this.unit.equals(other.unit)) {
      throw new Error('異なる単位の数量は加算できません')
    }
    return new Quantity(this.amount + other.amount, this.unit)
  }

  subtract(other: Quantity): Quantity {
    if (!this.unit.equals(other.unit)) {
      throw new Error('異なる単位の数量は減算できません')
    }
    const result = this.amount - other.amount
    if (result < 0) {
      throw new Error('数量が不足しています')
    }
    return new Quantity(result, this.unit)
  }

  isZero(): boolean {
    return this.amount === 0
  }

  isLessThan(other: Quantity): boolean {
    if (!this.unit.equals(other.unit)) {
      throw new Error('異なる単位の数量は比較できません')
    }
    return this.amount < other.amount
  }

  toString(): string {
    return `${this.amount}${this.unit.symbol}`
  }
}
```

### 賞味期限（BestBeforeDate）

```typescript
class BestBeforeDate {
  private readonly value: Date

  constructor(value: Date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (value < today) {
      // 過去の日付も許可（既に期限切れの食材登録のため）
      console.warn('賞味期限が過去の日付です')
    }
    this.value = value
  }

  isExpired(): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return this.value < today
  }

  isExpiringSoon(days: number): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const threshold = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
    return this.value <= threshold
  }

  daysUntilExpiry(): number {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = this.value.getTime() - today.getTime()
    return Math.ceil(diff / (24 * 60 * 60 * 1000))
  }

  toDate(): Date {
    return new Date(this.value)
  }
}
```

### 消費期限（ExpiryDate）

```typescript
class ExpiryDate extends BestBeforeDate {
  // 基本的な振る舞いは賞味期限と同じ
  // 意味的な違いを型で表現
}
```

### 保存場所（StorageLocation）

```typescript
enum StorageLocationType {
  REFRIGERATED = 'REFRIGERATED', // 冷蔵
  FROZEN = 'FROZEN', // 冷凍
  ROOM_TEMP = 'ROOM_TEMP', // 常温
}

class StorageLocation {
  private readonly type: StorageLocationType
  private readonly detail?: string // 詳細な場所（例：冷蔵庫の野菜室）

  constructor(type: StorageLocationType, detail?: string) {
    this.type = type
    this.detail = detail
  }

  equals(other: StorageLocation): boolean {
    return this.type === other.type && this.detail === other.detail
  }

  getType(): StorageLocationType {
    return this.type
  }

  getDetail(): string | undefined {
    return this.detail
  }

  toString(): string {
    return this.detail ? `${this.type}（${this.detail}）` : this.type
  }
}
```

### カテゴリーID（CategoryId）

```typescript
class CategoryId {
  private readonly value: string

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('カテゴリーIDは必須です')
    }
    this.value = value
  }

  equals(other: CategoryId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
```

### カテゴリー名（CategoryName）

```typescript
class CategoryName {
  private readonly value: string

  constructor(value: string) {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      throw new Error('カテゴリー名は必須です')
    }
    if (trimmed.length > 20) {
      throw new Error('カテゴリー名は20文字以内で入力してください')
    }
    this.value = trimmed
  }

  equals(other: CategoryName): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
```

## ドメインサービス

### 在庫チェックサービス

複数の食材の在庫を一括でチェックするサービス。

```typescript
interface StockCheckService {
  // 複数食材の在庫チェック
  checkMultipleStock(
    ingredientIds: IngredientId[],
    requiredQuantities: Map<IngredientId, Quantity>
  ): StockCheckResult

  // 在庫不足の食材を取得
  findLowStockIngredients(
    ingredients: Ingredient[],
    thresholds: Map<CategoryId, Quantity>
  ): Ingredient[]
}

interface StockCheckResult {
  hasAllStock: boolean
  insufficientIngredients: Array<{
    ingredientId: IngredientId
    required: Quantity
    available: Quantity
  }>
}
```

### 期限管理サービス

期限に関する処理を行うサービス。

```typescript
interface ExpiryManagementService {
  // 期限切れ間近の食材を取得
  findExpiringSoonIngredients(ingredients: Ingredient[], daysBeforeExpiry: number = 7): Ingredient[]

  // 期限切れの食材を取得
  findExpiredIngredients(ingredients: Ingredient[]): Ingredient[]

  // 期限によるソート
  sortByExpiry(ingredients: Ingredient[], ascending: boolean = true): Ingredient[]
}
```

### カテゴリー分類サービス

食材の適切なカテゴリーを判定するサービス。

```typescript
interface CategoryClassificationService {
  // 食材名から適切なカテゴリーを推定
  suggestCategory(ingredientName: string, categories: Category[]): CategoryId | null

  // カテゴリー別に食材をグループ化
  groupByCategory(ingredients: Ingredient[]): Map<CategoryId, Ingredient[]>
}
```

## ファクトリ

### 食材ファクトリ

```typescript
class IngredientFactory {
  static create(params: {
    name: string
    categoryId: string
    quantity: number
    unitId: string
    storageLocation: StorageLocationType
    bestBeforeDate?: Date
    expiryDate?: Date
    notes?: string
  }): Ingredient {
    // バリデーションとエンティティ生成
    const id = new IngredientId(generateId())
    const name = new IngredientName(params.name)
    const categoryId = new CategoryId(params.categoryId)
    const unit = // 単位リポジトリから取得
    const quantity = new Quantity(params.quantity, unit)
    const storageLocation = new StorageLocation(params.storageLocation)

    // 期限の検証
    if (params.expiryDate && params.bestBeforeDate) {
      if (params.expiryDate > params.bestBeforeDate) {
        throw new Error("消費期限は賞味期限以前である必要があります")
      }
    }

    return new Ingredient({
      id,
      name,
      categoryId,
      quantity,
      storageLocation,
      bestBeforeDate: params.bestBeforeDate ? new BestBeforeDate(params.bestBeforeDate) : undefined,
      expiryDate: params.expiryDate ? new ExpiryDate(params.expiryDate) : undefined,
      notes: params.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }
}
```

## 仕様パターン

### 期限切れ間近仕様

```typescript
class ExpiringSoonSpecification {
  constructor(private days: number = 7) {}

  isSatisfiedBy(ingredient: Ingredient): boolean {
    if (!ingredient.bestBeforeDate && !ingredient.expiryDate) {
      return false
    }

    const expiryDate = ingredient.expiryDate || ingredient.bestBeforeDate
    return expiryDate.isExpiringSoon(this.days)
  }
}
```

### 在庫不足仕様

```typescript
class LowStockSpecification {
  constructor(private threshold: Quantity) {}

  isSatisfiedBy(ingredient: Ingredient): boolean {
    return ingredient.quantity.isLessThan(this.threshold)
  }
}
```

## 更新履歴

| 日付       | 内容     | 作成者  |
| ---------- | -------- | ------- |
| 2025-01-21 | 初版作成 | @system |
