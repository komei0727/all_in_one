# リポジトリパターン実装ガイド

## 概要

リポジトリパターンは、ドメイン層とデータアクセス層の間の抽象化を提供するデザインパターンです。ドメインオブジェクトの永続化に関する詳細を隠蔽し、メモリ上のコレクションのようなインターフェースを提供します。

## 基本概念

### リポジトリの責務

1. **永続化の抽象化**: データベースアクセスの詳細を隠蔽
2. **集約の境界保護**: 集約ルートを通じたアクセスを保証
3. **ドメイン指向のインターフェース**: ビジネス用語でのクエリメソッド
4. **トランザクション管理**: データ整合性の保証

### リポジトリパターンの利点

- **テスタビリティ**: モックやスタブによる単体テストが容易
- **柔軟性**: データストアの変更が容易
- **関心の分離**: ビジネスロジックとデータアクセスの分離
- **再利用性**: 共通のデータアクセスパターンの再利用

## 実装例

### 1. リポジトリインターフェース（ドメイン層）

```typescript
// src/modules/ingredients/server/domain/repositories/ingredient.repository.ts
export interface IngredientRepository {
  // 基本的なCRUD操作
  save(ingredient: Ingredient): Promise<void>
  findById(id: IngredientId): Promise<Ingredient | null>
  findAll(filters?: IngredientFilters): Promise<Ingredient[]>
  delete(id: IngredientId): Promise<void>

  // ビジネス指向のクエリメソッド
  findByCategory(categoryId: CategoryId): Promise<Ingredient[]>
  findExpiring(withinDays: number): Promise<Ingredient[]>
  findOutOfStock(): Promise<Ingredient[]>
  findByStorageLocation(location: StorageLocation): Promise<Ingredient[]>

  // 集約のための特別なメソッド
  exists(id: IngredientId): Promise<boolean>
  countByCategory(categoryId: CategoryId): Promise<number>

  // トランザクション管理
  transaction<T>(work: () => Promise<T>): Promise<T>
}

// 仕様パターンのサポート
export interface SpecificationRepository<T> {
  findBySpecification(spec: Specification<T>): Promise<T[]>
  countBySpecification(spec: Specification<T>): Promise<number>
}
```

### 2. リポジトリ実装（インフラストラクチャ層）

```typescript
// src/modules/ingredients/server/infrastructure/persistence/repositories/prisma-ingredient.repository.ts
export class PrismaIngredientRepository implements IngredientRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly mapper: IngredientMapper
  ) {}

  async save(ingredient: Ingredient): Promise<void> {
    // エンティティからモデルへの変換
    const model = this.mapper.toPersistence(ingredient)

    // トランザクション内で保存
    await this.prisma.$transaction(async (tx) => {
      // Upsert（存在すれば更新、なければ作成）
      await tx.ingredient.upsert({
        where: { id: ingredient.id.value },
        create: model,
        update: model,
      })

      // 関連エンティティの保存
      if (ingredient.stockHistory.length > 0) {
        await this.saveStockHistory(tx, ingredient.id, ingredient.stockHistory)
      }

      // ドメインイベントの保存
      if (ingredient.domainEvents.length > 0) {
        await this.saveDomainEvents(tx, ingredient.domainEvents)
      }
    })

    // イベント発行後にクリア
    ingredient.clearEvents()
  }

  async findById(id: IngredientId): Promise<Ingredient | null> {
    const model = await this.prisma.ingredient.findUnique({
      where: { id: id.value },
      include: {
        category: true,
        unit: true,
        stockHistory: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!model) {
      return null
    }

    // モデルからエンティティへの変換
    return this.mapper.toDomain(model)
  }

  async findExpiring(withinDays: number): Promise<Ingredient[]> {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + withinDays)

    const models = await this.prisma.ingredient.findMany({
      where: {
        expiryDate: {
          gte: new Date(), // 既に期限切れのものは除外
          lte: targetDate,
        },
      },
      include: {
        category: true,
        unit: true,
      },
      orderBy: { expiryDate: 'asc' },
    })

    return Promise.all(models.map((model) => this.mapper.toDomain(model)))
  }

  async findOutOfStock(): Promise<Ingredient[]> {
    const models = await this.prisma.ingredient.findMany({
      where: {
        quantity: {
          lte: 0,
        },
      },
      include: {
        category: true,
        unit: true,
      },
    })

    return Promise.all(models.map((model) => this.mapper.toDomain(model)))
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async () => {
      return await work()
    })
  }

  // プライベートメソッド
  private async saveStockHistory(
    tx: Prisma.TransactionClient,
    ingredientId: IngredientId,
    history: StockRecord[]
  ): Promise<void> {
    await tx.stockHistory.createMany({
      data: history.map((record) => ({
        id: record.id.value,
        ingredientId: ingredientId.value,
        type: record.type,
        amount: record.amount,
        reason: record.reason,
        recordedAt: record.recordedAt,
        recordedBy: record.recordedBy,
      })),
    })
  }

  private async saveDomainEvents(
    tx: Prisma.TransactionClient,
    events: readonly DomainEvent[]
  ): Promise<void> {
    await tx.domainEvent.createMany({
      data: events.map((event) => ({
        id: event.id,
        aggregateId: event.aggregateId,
        eventName: event.eventName,
        eventData: JSON.stringify(event.toJSON()),
        occurredAt: event.occurredAt,
        version: event.version,
      })),
    })
  }
}
```

### 3. エンティティマッパー

```typescript
// src/modules/ingredients/server/infrastructure/persistence/mappers/ingredient.mapper.ts
export class IngredientMapper {
  constructor(
    private readonly categoryMapper: CategoryMapper,
    private readonly unitMapper: UnitMapper
  ) {}

  async toDomain(model: IngredientModel): Promise<Ingredient> {
    // 値オブジェクトの再構築
    const id = new IngredientId(model.id)
    const name = new IngredientName(model.name)
    const quantity = new Quantity(model.quantity, this.unitMapper.toDomain(model.unit))
    const storageLocation = StorageLocation.fromPersistence({
      type: model.storageLocationType as StorageLocationType,
      detail: model.storageLocationDetail,
    })

    // エンティティの再構築
    const ingredient = Ingredient.reconstitute(
      id,
      name,
      quantity,
      storageLocation,
      model.expiryDate ? new ExpiryDate(model.expiryDate) : undefined,
      model.createdAt,
      model.updatedAt
    )

    // 関連エンティティの設定
    if (model.category) {
      ingredient.setCategory(this.categoryMapper.toDomain(model.category))
    }

    return ingredient
  }

  toPersistence(entity: Ingredient): IngredientPersistenceModel {
    return {
      id: entity.id.value,
      name: entity.name.value,
      categoryId: entity.category?.id.value,
      quantity: entity.quantity.amount,
      unitId: entity.quantity.unit.id,
      storageLocationType: entity.storageLocation.type,
      storageLocationDetail: entity.storageLocation.detail,
      expiryDate: entity.expiryDate?.value,
      isMarkedAsExpired: entity.isMarkedAsExpired,
      createdAt: entity.createdAt,
      updatedAt: new Date(),
    }
  }
}
```

### 4. 仕様パターンの実装

```typescript
// src/modules/shared/domain/specifications/specification.base.ts
export abstract class Specification<T> {
  abstract isSatisfiedBy(entity: T): boolean

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other)
  }

  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other)
  }

  not(): Specification<T> {
    return new NotSpecification(this)
  }
}

// 具体的な仕様
export class HasSufficientStockSpecification extends Specification<Ingredient> {
  constructor(private readonly minAmount: number) {
    super()
  }

  isSatisfiedBy(ingredient: Ingredient): boolean {
    return ingredient.quantity.amount >= this.minAmount
  }
}

export class IsExpiringWithinDaysSpecification extends Specification<Ingredient> {
  constructor(private readonly days: number) {
    super()
  }

  isSatisfiedBy(ingredient: Ingredient): boolean {
    if (!ingredient.expiryDate) return false

    const daysUntilExpiry = ingredient.expiryDate.daysUntilExpiry()
    return daysUntilExpiry >= 0 && daysUntilExpiry <= this.days
  }
}

// 仕様を使用したリポジトリメソッド
export class SpecificationIngredientRepository extends PrismaIngredientRepository {
  async findBySpecification(spec: Specification<Ingredient>): Promise<Ingredient[]> {
    // 全件取得してメモリ上でフィルタリング（小規模データの場合）
    const allIngredients = await this.findAll()
    return allIngredients.filter((ingredient) => spec.isSatisfiedBy(ingredient))
  }

  // SQLへの変換（大規模データの場合）
  async findBySpecificationOptimized(spec: Specification<Ingredient>): Promise<Ingredient[]> {
    const whereClause = this.specificationToWhereClause(spec)

    const models = await this.prisma.ingredient.findMany({
      where: whereClause,
      include: {
        category: true,
        unit: true,
      },
    })

    return Promise.all(models.map((model) => this.mapper.toDomain(model)))
  }
}
```

### 5. Unit of Work パターン

```typescript
// src/modules/shared/infrastructure/persistence/unit-of-work.ts
export interface UnitOfWork {
  ingredientRepository: IngredientRepository
  categoryRepository: CategoryRepository
  unitRepository: UnitRepository

  commit(): Promise<void>
  rollback(): Promise<void>
}

export class PrismaUnitOfWork implements UnitOfWork {
  private tx: Prisma.TransactionClient | null = null

  constructor(private readonly prisma: PrismaClient) {}

  get ingredientRepository(): IngredientRepository {
    if (!this.tx) throw new Error('Transaction not started')
    return new PrismaIngredientRepository(this.tx, new IngredientMapper())
  }

  get categoryRepository(): CategoryRepository {
    if (!this.tx) throw new Error('Transaction not started')
    return new PrismaCategoryRepository(this.tx)
  }

  async execute<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      this.tx = tx
      try {
        return await work(this)
      } finally {
        this.tx = null
      }
    })
  }

  async commit(): Promise<void> {
    // Prismaのトランザクションは自動コミット
  }

  async rollback(): Promise<void> {
    throw new Error('Rollback requested')
  }
}

// 使用例
export class TransferIngredientHandler {
  constructor(private readonly uow: PrismaUnitOfWork) {}

  async handle(command: TransferIngredientCommand): Promise<void> {
    await this.uow.execute(async (uow) => {
      const source = await uow.ingredientRepository.findById(command.sourceId)
      const target = await uow.ingredientRepository.findById(command.targetId)

      if (!source || !target) {
        throw new IngredientNotFoundException()
      }

      // ビジネスロジック実行
      source.transfer(command.amount, target)

      // 両方のエンティティを保存
      await uow.ingredientRepository.save(source)
      await uow.ingredientRepository.save(target)
    })
  }
}
```

### 6. キャッシング戦略

```typescript
// src/modules/ingredients/server/infrastructure/persistence/repositories/cached-ingredient.repository.ts
export class CachedIngredientRepository implements IngredientRepository {
  constructor(
    private readonly repository: IngredientRepository,
    private readonly cache: CacheService
  ) {}

  async findById(id: IngredientId): Promise<Ingredient | null> {
    const cacheKey = `ingredient:${id.value}`

    // キャッシュから取得
    const cached = await this.cache.get<Ingredient>(cacheKey)
    if (cached) {
      return cached
    }

    // リポジトリから取得
    const ingredient = await this.repository.findById(id)

    // キャッシュに保存（5分間）
    if (ingredient) {
      await this.cache.set(cacheKey, ingredient, 300)
    }

    return ingredient
  }

  async save(ingredient: Ingredient): Promise<void> {
    // データベースに保存
    await this.repository.save(ingredient)

    // キャッシュを無効化
    await this.cache.delete(`ingredient:${ingredient.id.value}`)

    // 関連するリストキャッシュも無効化
    await this.cache.deletePattern('ingredients:list:*')
  }

  async findExpiring(withinDays: number): Promise<Ingredient[]> {
    const cacheKey = `ingredients:expiring:${withinDays}`

    // キャッシュから取得
    const cached = await this.cache.get<Ingredient[]>(cacheKey)
    if (cached) {
      return cached
    }

    // リポジトリから取得
    const ingredients = await this.repository.findExpiring(withinDays)

    // キャッシュに保存（1時間）
    await this.cache.set(cacheKey, ingredients, 3600)

    return ingredients
  }
}
```

### 7. テスト用リポジトリ

```typescript
// src/modules/ingredients/server/infrastructure/persistence/repositories/in-memory-ingredient.repository.ts
export class InMemoryIngredientRepository implements IngredientRepository {
  private store = new Map<string, Ingredient>()
  private events: DomainEvent[] = []

  async save(ingredient: Ingredient): Promise<void> {
    // ディープコピーして保存
    const copy = this.deepCopy(ingredient)
    this.store.set(ingredient.id.value, copy)

    // イベントを記録
    this.events.push(...ingredient.domainEvents)
    ingredient.clearEvents()
  }

  async findById(id: IngredientId): Promise<Ingredient | null> {
    const ingredient = this.store.get(id.value)
    return ingredient ? this.deepCopy(ingredient) : null
  }

  async findExpiring(withinDays: number): Promise<Ingredient[]> {
    const results: Ingredient[] = []
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + withinDays)

    for (const ingredient of this.store.values()) {
      if (ingredient.expiryDate) {
        const expiryDate = ingredient.expiryDate.value
        if (expiryDate >= new Date() && expiryDate <= targetDate) {
          results.push(this.deepCopy(ingredient))
        }
      }
    }

    return results.sort((a, b) => a.expiryDate!.value.getTime() - b.expiryDate!.value.getTime())
  }

  // テスト用ヘルパーメソッド
  getPublishedEvents(): DomainEvent[] {
    return [...this.events]
  }

  clear(): void {
    this.store.clear()
    this.events = []
  }

  private deepCopy(ingredient: Ingredient): Ingredient {
    // シリアライズ/デシリアライズによるディープコピー
    return Ingredient.reconstitute(
      ingredient.id,
      ingredient.name,
      ingredient.quantity,
      ingredient.storageLocation,
      ingredient.expiryDate,
      ingredient.createdAt,
      ingredient.updatedAt
    )
  }
}
```

## ベストプラクティス

### 1. インターフェース設計

- **ドメイン指向**: 技術的な用語ではなくビジネス用語を使用
- **集約の境界**: 集約ルートのみのリポジトリを作成
- **読み取り専用**: 必要に応じて読み取り専用インターフェースを提供
- **非同期**: すべてのメソッドを非同期として設計

### 2. 実装の指針

- **単一責任**: リポジトリは永続化のみに責任を持つ
- **トランザクション境界**: ビジネストランザクションと一致
- **遅延読み込み**: 必要なデータのみを読み込む
- **楽観的ロック**: 同時実行制御の実装

### 3. パフォーマンス最適化

```typescript
// バッチ操作
export interface BatchRepository<T> {
  saveAll(entities: T[]): Promise<void>
  findByIds(ids: string[]): Promise<T[]>
}

// 投影
export interface ProjectionRepository {
  project<T>(query: Query, projection: Projection<T>): Promise<T[]>
}

// ページネーション
export interface PageableRepository<T> {
  findPage(criteria: Criteria, pageable: Pageable): Promise<Page<T>>
}
```

## 関連ドキュメント

- [ドメインエンティティ実装ガイド](./DOMAIN_ENTITIES.md)
- [値オブジェクト実装ガイド](./VALUE_OBJECTS.md)
- [Unit of Work パターン](./UNIT_OF_WORK.md)
