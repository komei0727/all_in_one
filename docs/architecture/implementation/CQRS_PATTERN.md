# CQRS パターン実装ガイド

## 概要

CQRS (Command Query Responsibility Segregation) は、データの読み取り（Query）と書き込み（Command）を分離するアーキテクチャパターンです。本プロジェクトでは、パフォーマンスとスケーラビリティを最大化するためにCQRSを採用しています。

## 基本概念

### Command（書き込み）

- **目的**: ビジネス操作の実行、状態の変更
- **特徴**: 副作用あり、ビジネスルールの検証、整合性保証
- **戻り値**: 操作結果（成功/失敗）

### Query（読み取り）

- **目的**: データの取得、表示用データの準備
- **特徴**: 副作用なし、パフォーマンス最適化、非正規化
- **戻り値**: 要求されたデータ

## 実装例

### 1. Command実装

#### Command定義

```typescript
// src/modules/ingredients/server/application/commands/consume-ingredient/consume-ingredient.command.ts
export class ConsumeIngredientCommand {
  constructor(
    public readonly ingredientId: string,
    public readonly amount: number,
    public readonly reason?: string,
    public readonly consumedBy?: string
  ) {}

  validate(): void {
    if (!this.ingredientId) {
      throw new ValidationError('食材IDは必須です')
    }
    if (this.amount <= 0) {
      throw new ValidationError('消費量は正の数である必要があります')
    }
  }
}
```

#### Command Handler

```typescript
// src/modules/ingredients/server/application/commands/consume-ingredient/consume-ingredient.handler.ts
export class ConsumeIngredientHandler {
  constructor(
    private readonly ingredientRepo: IngredientRepository,
    private readonly stockService: StockManagementService,
    private readonly eventPublisher: DomainEventPublisher
  ) {}

  async handle(command: ConsumeIngredientCommand): Promise<ConsumeIngredientResult> {
    // コマンド検証
    command.validate()

    // トランザクション開始
    return await this.ingredientRepo.transaction(async () => {
      // 1. エンティティ取得
      const ingredient = await this.ingredientRepo.findById(
        new IngredientId(command.ingredientId)
      )
      
      if (!ingredient) {
        throw new IngredientNotFoundException(command.ingredientId)
      }

      // 2. ビジネスロジック実行
      ingredient.consume(command.amount, command.reason)

      // 3. 在庫状態の更新
      await this.stockService.updateStockStatus(ingredient)

      // 4. エンティティ保存
      await this.ingredientRepo.save(ingredient)

      // 5. ドメインイベント発行
      await this.eventPublisher.publishAll(ingredient.domainEvents)

      // 6. 結果返却
      return new ConsumeIngredientResult(
        ingredient.id.value,
        ingredient.quantity,
        ingredient.isOutOfStock()
      )
    })
  }
}
```

#### Result DTO

```typescript
// src/modules/ingredients/server/application/commands/consume-ingredient/consume-ingredient.result.ts
export class ConsumeIngredientResult {
  constructor(
    public readonly ingredientId: string,
    public readonly remainingQuantity: Quantity,
    public readonly isOutOfStock: boolean
  ) {}

  toResponse() {
    return {
      ingredientId: this.ingredientId,
      remainingQuantity: {
        amount: this.remainingQuantity.amount,
        unit: this.remainingQuantity.unit.symbol
      },
      isOutOfStock: this.isOutOfStock,
      timestamp: new Date().toISOString()
    }
  }
}
```

### 2. Query実装

#### Query定義

```typescript
// src/modules/ingredients/server/application/queries/get-ingredients/get-ingredients.query.ts
export class GetIngredientsQuery {
  constructor(
    public readonly filters: IngredientFilters = {},
    public readonly sorting: SortingOptions = { field: 'name', order: 'asc' },
    public readonly pagination: PaginationOptions = { page: 1, limit: 20 }
  ) {}

  getCacheKey(): string {
    return `ingredients:${JSON.stringify({
      filters: this.filters,
      sorting: this.sorting,
      pagination: this.pagination
    })}`
  }
}

export interface IngredientFilters {
  categoryId?: string
  storageLocation?: StorageLocationType
  isOutOfStock?: boolean
  expiringWithinDays?: number
  searchTerm?: string
}
```

#### Query Handler

```typescript
// src/modules/ingredients/server/application/queries/get-ingredients/get-ingredients.handler.ts
export class GetIngredientsHandler {
  constructor(
    private readonly queryService: IngredientQueryService,
    private readonly cacheService: CacheService
  ) {}

  async handle(query: GetIngredientsQuery): Promise<IngredientListDTO> {
    // キャッシュチェック
    const cached = await this.cacheService.get<IngredientListDTO>(
      query.getCacheKey()
    )
    if (cached) {
      return cached
    }

    // データ取得（読み取り最適化されたビューから）
    const ingredients = await this.queryService.findIngredients(
      query.filters,
      query.sorting,
      query.pagination
    )

    // DTO変換
    const dto = new IngredientListDTO(
      ingredients.items.map(item => this.toListItem(item)),
      ingredients.totalCount,
      ingredients.hasMore
    )

    // キャッシュ保存（5分間）
    await this.cacheService.set(
      query.getCacheKey(),
      dto,
      300
    )

    return dto
  }

  private toListItem(ingredient: IngredientView): IngredientListItemDTO {
    return new IngredientListItemDTO({
      id: ingredient.id,
      name: ingredient.name,
      category: ingredient.categoryName,
      quantity: {
        amount: ingredient.quantityAmount,
        unit: ingredient.unitSymbol,
        display: `${ingredient.quantityAmount}${ingredient.unitSymbol}`
      },
      storageLocation: {
        type: ingredient.storageLocationType,
        detail: ingredient.storageLocationDetail,
        display: ingredient.storageLocationDisplay
      },
      expiryInfo: {
        date: ingredient.expiryDate,
        status: ingredient.expiryStatus,
        daysUntilExpiry: ingredient.daysUntilExpiry
      },
      lastUpdated: ingredient.lastUpdated
    })
  }
}
```

#### Query Service（読み取り最適化）

```typescript
// src/modules/ingredients/server/infrastructure/query-services/ingredient-query.service.ts
export class IngredientQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  async findIngredients(
    filters: IngredientFilters,
    sorting: SortingOptions,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<IngredientView>> {
    const where = this.buildWhereClause(filters)
    const orderBy = this.buildOrderBy(sorting)
    
    // 非正規化されたビューから取得
    const [items, totalCount] = await Promise.all([
      this.prisma.ingredientView.findMany({
        where,
        orderBy,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit + 1, // +1 for hasMore check
      }),
      this.prisma.ingredientView.count({ where })
    ])

    const hasMore = items.length > pagination.limit
    if (hasMore) {
      items.pop() // Remove the extra item
    }

    return {
      items: items.map(item => this.mapToView(item)),
      totalCount,
      hasMore
    }
  }

  private buildWhereClause(filters: IngredientFilters): Prisma.IngredientViewWhereInput {
    const where: Prisma.IngredientViewWhereInput = {}

    if (filters.categoryId) {
      where.categoryId = filters.categoryId
    }

    if (filters.storageLocation) {
      where.storageLocationType = filters.storageLocation
    }

    if (filters.isOutOfStock !== undefined) {
      where.isOutOfStock = filters.isOutOfStock
    }

    if (filters.expiringWithinDays) {
      where.daysUntilExpiry = {
        lte: filters.expiringWithinDays,
        gte: 0
      }
    }

    if (filters.searchTerm) {
      where.OR = [
        { name: { contains: filters.searchTerm, mode: 'insensitive' } },
        { categoryName: { contains: filters.searchTerm, mode: 'insensitive' } }
      ]
    }

    return where
  }
}
```

### 3. Read Model Projection

#### Projection Handler

```typescript
// src/modules/ingredients/server/infrastructure/projections/ingredient-projection.handler.ts
export class IngredientProjectionHandler {
  constructor(private readonly prisma: PrismaClient) {}

  @EventHandler(IngredientCreatedEvent)
  async handleIngredientCreated(event: IngredientCreatedEvent): Promise<void> {
    await this.prisma.ingredientView.create({
      data: {
        id: event.ingredientId,
        name: event.name,
        categoryId: event.categoryId,
        categoryName: await this.getCategoryName(event.categoryId),
        quantityAmount: event.quantity.amount,
        unitId: event.quantity.unit.id,
        unitSymbol: event.quantity.unit.symbol,
        storageLocationType: event.storageLocation.type,
        storageLocationDetail: event.storageLocation.detail,
        storageLocationDisplay: this.formatStorageLocation(event.storageLocation),
        expiryDate: event.expiryDate,
        expiryStatus: this.calculateExpiryStatus(event.expiryDate),
        daysUntilExpiry: this.calculateDaysUntilExpiry(event.expiryDate),
        isOutOfStock: false,
        lastUpdated: event.occurredAt
      }
    })
  }

  @EventHandler(IngredientConsumedEvent)
  async handleIngredientConsumed(event: IngredientConsumedEvent): Promise<void> {
    await this.prisma.ingredientView.update({
      where: { id: event.ingredientId.value },
      data: {
        quantityAmount: event.newQuantity.amount,
        isOutOfStock: event.newQuantity.amount <= 0,
        lastConsumedAt: event.occurredAt,
        consumptionCount: { increment: 1 },
        totalConsumed: { increment: event.consumedAmount },
        lastUpdated: event.occurredAt
      }
    })

    // 消費統計の更新
    await this.updateConsumptionStatistics(event)
  }

  private async updateConsumptionStatistics(event: IngredientConsumedEvent): Promise<void> {
    const date = new Date(event.occurredAt)
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    await this.prisma.consumptionStatistics.upsert({
      where: {
        ingredientId_yearMonth: {
          ingredientId: event.ingredientId.value,
          yearMonth
        }
      },
      create: {
        ingredientId: event.ingredientId.value,
        yearMonth,
        totalAmount: event.consumedAmount,
        consumptionCount: 1
      },
      update: {
        totalAmount: { increment: event.consumedAmount },
        consumptionCount: { increment: 1 }
      }
    })
  }
}
```

### 4. API実装

#### Command API

```typescript
// src/app/api/v1/ingredients/[id]/consume/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const user = await requireAuth(request)

    // リクエストボディ取得
    const body = await request.json()

    // 入力検証
    const validatedData = consumeIngredientSchema.parse(body)

    // コマンド作成
    const command = new ConsumeIngredientCommand(
      params.id,
      validatedData.amount,
      validatedData.reason,
      user.id
    )

    // ハンドラー実行
    const container = IngredientsModuleContainer.getInstance()
    const result = await container.consumeIngredientHandler.handle(command)

    // レスポンス生成
    return NextResponse.json({
      success: true,
      data: result.toResponse()
    })

  } catch (error) {
    return handleApiError(error)
  }
}
```

#### Query API

```typescript
// src/app/api/v1/ingredients/route.ts
export async function GET(request: Request) {
  try {
    // クエリパラメータ取得
    const { searchParams } = new URL(request.url)
    
    // クエリオブジェクト構築
    const query = new GetIngredientsQuery(
      parseFilters(searchParams),
      parseSorting(searchParams),
      parsePagination(searchParams)
    )

    // ハンドラー実行
    const container = IngredientsModuleContainer.getInstance()
    const result = await container.getIngredientsHandler.handle(query)

    // レスポンス生成
    return NextResponse.json({
      success: true,
      data: result.items,
      meta: {
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        page: query.pagination.page,
        limit: query.pagination.limit
      }
    })

  } catch (error) {
    return handleApiError(error)
  }
}
```

## ベストプラクティス

### 1. コマンドの設計

- **単一責任**: 1つのコマンドは1つのビジネス操作を表現
- **不変性**: コマンドオブジェクトは不変に保つ
- **検証**: コマンド内で基本的な検証を実装
- **明示的**: ビジネス意図を明確に表現する名前

### 2. クエリの最適化

- **非正規化**: 読み取り専用のビューを作成
- **キャッシング**: 頻繁にアクセスされるデータをキャッシュ
- **インデックス**: 検索条件に適切なインデックスを設定
- **ページネーション**: 大量データの効率的な取得

### 3. イベントソーシング（オプション）

```typescript
// イベントストアへの保存
export class EventStore {
  async append(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // バージョンチェック
      const currentVersion = await tx.eventStream.findUnique({
        where: { aggregateId },
        select: { version: true }
      })

      if (currentVersion?.version !== expectedVersion) {
        throw new ConcurrencyException()
      }

      // イベント保存
      await tx.event.createMany({
        data: events.map((event, index) => ({
          aggregateId,
          eventType: event.constructor.name,
          eventData: JSON.stringify(event),
          eventVersion: expectedVersion + index + 1,
          occurredAt: event.occurredAt
        }))
      })

      // バージョン更新
      await tx.eventStream.upsert({
        where: { aggregateId },
        create: {
          aggregateId,
          version: expectedVersion + events.length
        },
        update: {
          version: expectedVersion + events.length
        }
      })
    })
  }
}
```

## パフォーマンス考慮事項

### 1. Read Model の更新戦略

- **同期更新**: 即座に一貫性が必要な場合
- **非同期更新**: パフォーマンスを優先する場合
- **バッチ更新**: 大量データの効率的な処理

### 2. キャッシュ戦略

```typescript
export class CacheStrategy {
  // キャッシュキー生成
  static generateKey(query: Query): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(query))
      .digest('hex')
    return `query:${query.constructor.name}:${hash}`
  }

  // キャッシュ無効化
  static invalidatePattern(pattern: string): void {
    // Redis の場合
    await redis.eval(`
      local keys = redis.call('keys', ARGV[1])
      for i=1,#keys do
        redis.call('del', keys[i])
      end
    `, 0, pattern)
  }
}
```

## 関連ドキュメント

- [ドメインイベント実装ガイド](./DOMAIN_EVENTS.md)
- [リポジトリパターン実装ガイド](./REPOSITORY_PATTERN.md)
- [値オブジェクト実装ガイド](./VALUE_OBJECTS.md)