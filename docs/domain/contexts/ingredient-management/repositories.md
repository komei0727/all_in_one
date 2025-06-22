# 食材管理コンテキスト - リポジトリ仕様

## 概要

このドキュメントでは、食材管理コンテキストにおけるリポジトリインターフェースの仕様を定義します。
リポジトリはドメイン層に属し、永続化の詳細を隠蔽しながら集約の保存と取得を担当します。

## リポジトリ設計原則

### 基本原則

1. **集約単位での永続化**

   - リポジトリは集約ルートに対してのみ定義
   - 集約内部のエンティティへの直接アクセスは禁止

2. **ドメイン層のインターフェース**

   - インターフェースはドメイン層に配置
   - 実装はインフラストラクチャ層に配置

3. **永続化技術の隠蔽**
   - SQL、NoSQL等の詳細を露出しない
   - ドメインモデルの言葉で表現

## 食材リポジトリ（IngredientRepository）

### インターフェース定義

```typescript
// domain/repositories/ingredient-repository.ts
export interface IngredientRepository {
  // ===== 基本的なCRUD操作 =====

  /**
   * 食材を保存する（新規作成または更新）
   * @param ingredient 保存する食材
   * @throws {RepositoryError} 保存に失敗した場合
   */
  save(ingredient: Ingredient): Promise<void>

  /**
   * IDで食材を取得する
   * @param id 食材ID
   * @returns 食材またはnull
   */
  findById(id: IngredientId): Promise<Ingredient | null>

  /**
   * すべての食材を取得する（削除済みを除く）
   * @returns 食材の配列
   */
  findAll(): Promise<Ingredient[]>

  /**
   * 食材を削除する（論理削除）
   * @param id 削除する食材のID
   * @throws {IngredientNotFoundError} 食材が存在しない場合
   */
  delete(id: IngredientId): Promise<void>

  // ===== 検索操作 =====

  /**
   * カテゴリーで食材を検索する
   * @param categoryId カテゴリーID
   * @returns 該当する食材の配列
   */
  findByCategory(categoryId: CategoryId): Promise<Ingredient[]>

  /**
   * 保存場所で食材を検索する
   * @param location 保存場所
   * @returns 該当する食材の配列
   */
  findByStorageLocation(location: StorageLocationType): Promise<Ingredient[]>

  /**
   * 期限切れ間近の食材を検索する
   * @param days 期限までの日数
   * @returns 該当する食材の配列（期限の近い順）
   */
  findExpiringSoon(days: number): Promise<Ingredient[]>

  /**
   * 期限切れの食材を検索する
   * @returns 期限切れの食材の配列
   */
  findExpired(): Promise<Ingredient[]>

  /**
   * 在庫切れの食材を検索する
   * @returns 数量が0の食材の配列
   */
  findOutOfStock(): Promise<Ingredient[]>

  // ===== 複雑な検索 =====

  /**
   * 複数条件で食材を検索する
   * @param criteria 検索条件
   * @returns 検索結果
   */
  search(criteria: IngredientSearchCriteria): Promise<IngredientSearchResult>

  // ===== 一意性チェック =====

  /**
   * 同じ名前・期限・保存場所の食材が存在するかチェック
   * @param name 食材名
   * @param expiry 賞味期限または消費期限
   * @param location 保存場所
   * @param excludeId 除外する食材ID（更新時用）
   * @returns 存在する場合true
   */
  existsByNameAndExpiryAndLocation(
    name: IngredientName,
    expiry: Date | null,
    location: StorageLocation,
    excludeId?: IngredientId
  ): Promise<boolean>

  // ===== 集計操作 =====

  /**
   * カテゴリー別の食材数を集計する
   * @returns カテゴリーIDと件数のマップ
   */
  countByCategory(): Promise<Map<CategoryId, number>>

  /**
   * 保存場所別の食材数を集計する
   * @returns 保存場所と件数のマップ
   */
  countByStorageLocation(): Promise<Map<StorageLocationType, number>>

  // ===== バッチ操作 =====

  /**
   * 複数の食材を一括保存する
   * @param ingredients 保存する食材の配列
   * @throws {RepositoryError} 保存に失敗した場合
   */
  saveAll(ingredients: Ingredient[]): Promise<void>

  /**
   * IDのリストで食材を一括取得する
   * @param ids 食材IDの配列
   * @returns 食材の配列（見つからないIDは無視）
   */
  findByIds(ids: IngredientId[]): Promise<Ingredient[]>
}
```

### 検索条件の定義

```typescript
// 検索条件
export interface IngredientSearchCriteria {
  // テキスト検索
  keyword?: string // 食材名の部分一致

  // カテゴリー絞り込み
  categoryIds?: CategoryId[] // 複数指定でOR条件

  // 保存場所絞り込み
  storageLocations?: StorageLocationType[] // 複数指定でOR条件

  // 期限絞り込み
  expiryDateFrom?: Date // この日付以降
  expiryDateTo?: Date // この日付以前
  hasExpiry?: boolean // 期限設定有無

  // 在庫絞り込み
  hasStock?: boolean // 在庫有無
  quantityFrom?: number // 最小数量
  quantityTo?: number // 最大数量

  // ソート
  sortBy?: IngredientSortKey // ソートキー
  sortOrder?: 'asc' | 'desc' // ソート順

  // ページング
  limit?: number // 取得件数
  offset?: number // オフセット
}

// ソートキー
export enum IngredientSortKey {
  NAME = 'name',
  EXPIRY_DATE = 'expiryDate',
  QUANTITY = 'quantity',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

// 検索結果
export interface IngredientSearchResult {
  items: Ingredient[] // 検索結果
  total: number // 全体件数
  hasMore: boolean // 次ページの有無
}
```

### エラー定義

```typescript
// リポジトリ固有のエラー
export class IngredientNotFoundError extends Error {
  constructor(id: IngredientId) {
    super(`食材が見つかりません: ${id.toString()}`)
  }
}

export class DuplicateIngredientError extends Error {
  constructor(name: string, expiry: Date | null, location: string) {
    super(`同じ食材が既に存在します: ${name}`)
  }
}

export class RepositoryError extends Error {
  constructor(message: string, cause?: Error) {
    super(message)
    this.cause = cause
  }
}
```

## カテゴリーリポジトリ（CategoryRepository）

### インターフェース定義

```typescript
// domain/repositories/category-repository.ts
export interface CategoryRepository {
  // ===== 基本的なCRUD操作 =====

  /**
   * カテゴリーを保存する
   * @param category 保存するカテゴリー
   * @throws {DuplicateCategoryError} 同名のカテゴリーが存在する場合
   */
  save(category: Category): Promise<void>

  /**
   * IDでカテゴリーを取得する
   * @param id カテゴリーID
   * @returns カテゴリーまたはnull
   */
  findById(id: CategoryId): Promise<Category | null>

  /**
   * すべてのカテゴリーを取得する
   * @returns カテゴリーの配列（表示順でソート済み）
   */
  findAll(): Promise<Category[]>

  /**
   * カテゴリーを削除する
   * @param id カテゴリーID
   * @throws {CategoryInUseError} 使用中の場合
   */
  delete(id: CategoryId): Promise<void>

  // ===== 検索操作 =====

  /**
   * 名前でカテゴリーを検索する
   * @param name カテゴリー名
   * @returns カテゴリーまたはnull
   */
  findByName(name: CategoryName): Promise<Category | null>

  // ===== 一意性チェック =====

  /**
   * カテゴリー名が既に存在するかチェック
   * @param name カテゴリー名
   * @param excludeId 除外するID（更新時用）
   * @returns 存在する場合true
   */
  existsByName(name: CategoryName, excludeId?: CategoryId): Promise<boolean>

  // ===== 使用状況チェック =====

  /**
   * カテゴリーが食材で使用されているかチェック
   * @param id カテゴリーID
   * @returns 使用されている場合true
   */
  isInUse(id: CategoryId): Promise<boolean>

  // ===== 特殊操作 =====

  /**
   * デフォルトカテゴリーを取得する
   * @returns デフォルトカテゴリー（未分類）
   */
  findDefault(): Promise<Category>

  /**
   * 表示順を一括更新する
   * @param orderMap カテゴリーIDと表示順のマップ
   */
  updateDisplayOrders(orderMap: Map<CategoryId, number>): Promise<void>
}
```

### エラー定義

```typescript
export class CategoryNotFoundError extends Error {
  constructor(id: CategoryId) {
    super(`カテゴリーが見つかりません: ${id.toString()}`)
  }
}

export class DuplicateCategoryError extends Error {
  constructor(name: string) {
    super(`同名のカテゴリーが既に存在します: ${name}`)
  }
}

export class CategoryInUseError extends Error {
  constructor(id: CategoryId) {
    super(`カテゴリーは使用中のため削除できません: ${id.toString()}`)
  }
}
```

## 単位リポジトリ（UnitRepository）

### インターフェース定義

```typescript
// domain/repositories/unit-repository.ts
export interface UnitRepository {
  // ===== 基本的なCRUD操作 =====

  /**
   * 単位を保存する
   * @param unit 保存する単位
   * @throws {DuplicateUnitError} 同名またはシンボルが存在する場合
   */
  save(unit: Unit): Promise<void>

  /**
   * IDで単位を取得する
   * @param id 単位ID
   * @returns 単位またはnull
   */
  findById(id: UnitId): Promise<Unit | null>

  /**
   * すべての単位を取得する
   * @returns 単位の配列（表示順でソート済み）
   */
  findAll(): Promise<Unit[]>

  /**
   * 単位を削除する
   * @param id 単位ID
   * @throws {UnitInUseError} 使用中の場合
   */
  delete(id: UnitId): Promise<void>

  // ===== 検索操作 =====

  /**
   * タイプ別に単位を取得する
   * @param type 単位タイプ
   * @returns 該当する単位の配列
   */
  findByType(type: UnitType): Promise<Unit[]>

  /**
   * 名前で単位を検索する
   * @param name 単位名
   * @returns 単位またはnull
   */
  findByName(name: string): Promise<Unit | null>

  /**
   * シンボルで単位を検索する
   * @param symbol シンボル
   * @returns 単位またはnull
   */
  findBySymbol(symbol: string): Promise<Unit | null>

  // ===== 一意性チェック =====

  /**
   * 単位名またはシンボルが既に存在するかチェック
   * @param name 単位名
   * @param symbol シンボル
   * @param excludeId 除外するID（更新時用）
   * @returns 存在する場合true
   */
  existsByNameOrSymbol(name: string, symbol: string, excludeId?: UnitId): Promise<boolean>

  // ===== 使用状況チェック =====

  /**
   * 単位が食材で使用されているかチェック
   * @param id 単位ID
   * @returns 使用されている場合true
   */
  isInUse(id: UnitId): Promise<boolean>

  // ===== 変換情報 =====

  /**
   * 単位間の変換係数を取得する
   * @param fromId 変換元の単位ID
   * @param toId 変換先の単位ID
   * @returns 変換係数またはnull（変換不可の場合）
   */
  getConversionFactor(fromId: UnitId, toId: UnitId): Promise<number | null>
}
```

## 実装上の考慮事項

### トランザクション管理

```typescript
// application/services/ingredient-service.ts
export class IngredientApplicationService {
  constructor(
    private ingredientRepo: IngredientRepository,
    private categoryRepo: CategoryRepository,
    private unitRepo: UnitRepository,
    private transactionManager: TransactionManager
  ) {}

  async createIngredient(command: CreateIngredientCommand): Promise<void> {
    await this.transactionManager.transaction(async () => {
      // カテゴリーと単位の存在確認
      const category = await this.categoryRepo.findById(command.categoryId)
      if (!category) {
        throw new CategoryNotFoundError(command.categoryId)
      }

      const unit = await this.unitRepo.findById(command.unitId)
      if (!unit) {
        throw new UnitNotFoundError(command.unitId)
      }

      // 重複チェック
      const exists = await this.ingredientRepo.existsByNameAndExpiryAndLocation(
        new IngredientName(command.name),
        command.expiryDate,
        new StorageLocation(command.storageLocation)
      )

      if (exists) {
        throw new DuplicateIngredientError(...)
      }

      // 食材作成と保存
      const ingredient = IngredientFactory.create({...})
      await this.ingredientRepo.save(ingredient)
    })
  }
}
```

### キャッシュ戦略

```typescript
// infrastructure/repositories/cached-category-repository.ts
export class CachedCategoryRepository implements CategoryRepository {
  private cache: Cache<CategoryId, Category>

  constructor(
    private delegate: CategoryRepository,
    private cacheManager: CacheManager
  ) {
    this.cache = cacheManager.createCache('categories', {
      ttl: 3600, // 1時間
      maxSize: 100,
    })
  }

  async findById(id: CategoryId): Promise<Category | null> {
    // キャッシュチェック
    const cached = await this.cache.get(id)
    if (cached) {
      return cached
    }

    // DBから取得してキャッシュ
    const category = await this.delegate.findById(id)
    if (category) {
      await this.cache.set(id, category)
    }

    return category
  }

  async save(category: Category): Promise<void> {
    await this.delegate.save(category)
    // キャッシュ無効化
    await this.cache.invalidate(category.id)
    await this.cache.invalidatePattern('categories:*')
  }
}
```

### ページング実装

```typescript
// infrastructure/repositories/prisma-ingredient-repository.ts
export class PrismaIngredientRepository implements IngredientRepository {
  async search(criteria: IngredientSearchCriteria): Promise<IngredientSearchResult> {
    const where = this.buildWhereClause(criteria)
    const orderBy = this.buildOrderByClause(criteria)

    // 全体件数を取得
    const total = await this.prisma.ingredient.count({ where })

    // ページングして取得
    const records = await this.prisma.ingredient.findMany({
      where,
      orderBy,
      skip: criteria.offset || 0,
      take: criteria.limit || 20,
      include: {
        category: true,
        unit: true,
      },
    })

    // ドメインモデルに変換
    const items = records.map((record) => this.toDomainModel(record))

    return {
      items,
      total,
      hasMore: (criteria.offset || 0) + items.length < total,
    }
  }
}
```

## テスト戦略

### リポジトリのモック

```typescript
// test/mocks/mock-ingredient-repository.ts
export class MockIngredientRepository implements IngredientRepository {
  private ingredients: Map<string, Ingredient> = new Map()

  async save(ingredient: Ingredient): Promise<void> {
    this.ingredients.set(ingredient.id.toString(), ingredient)
  }

  async findById(id: IngredientId): Promise<Ingredient | null> {
    return this.ingredients.get(id.toString()) || null
  }

  // 他のメソッドも同様に実装
}
```

### 統合テスト

```typescript
// test/integration/ingredient-repository.test.ts
describe('IngredientRepository', () => {
  let repository: IngredientRepository
  let testDb: TestDatabase

  beforeEach(async () => {
    testDb = await TestDatabase.create()
    repository = new PrismaIngredientRepository(testDb.client)
  })

  afterEach(async () => {
    await testDb.cleanup()
  })

  it('should save and retrieve ingredient', async () => {
    const ingredient = IngredientFactory.create({...})

    await repository.save(ingredient)
    const retrieved = await repository.findById(ingredient.id)

    expect(retrieved).toEqual(ingredient)
  })
})
```

## 更新履歴

| 日付       | 内容     | 作成者  |
| ---------- | -------- | ------- |
| 2025-01-21 | 初版作成 | @system |
