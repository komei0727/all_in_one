# ドメインイベント実装ガイド

## 概要

ドメインイベントは、ビジネス上重要な出来事を表現するオブジェクトです。Enhanced Modular Monolithアーキテクチャでは、モジュール間の疎結合を実現し、非同期処理を可能にする重要な要素です。

## 基本概念

### ドメインイベントとは

- **定義**: ドメイン内で発生した重要な出来事の記録
- **特徴**: 不変、過去形で命名、ビジネス用語を使用
- **用途**: 監査ログ、通知、データ同期、CQRS読み取りモデル更新

### イベント駆動アーキテクチャの利点

1. **疎結合**: モジュール間の直接的な依存を排除
2. **拡張性**: 新しいイベントハンドラーの追加が容易
3. **非同期処理**: パフォーマンスの向上
4. **監査性**: すべての変更の追跡が可能

## 実装例

### 1. ベースクラス実装

```typescript
// src/modules/shared/domain/events/domain-event.base.ts
export abstract class DomainEvent {
  public readonly id: string
  public readonly occurredAt: Date
  public readonly aggregateId: string
  public readonly version: number

  constructor(aggregateId: string, version: number = 1) {
    this.id = crypto.randomUUID()
    this.occurredAt = new Date()
    this.aggregateId = aggregateId
    this.version = version
  }

  abstract get eventName(): string

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      eventName: this.eventName,
      aggregateId: this.aggregateId,
      version: this.version,
      occurredAt: this.occurredAt.toISOString(),
      payload: this.getPayload(),
    }
  }

  protected abstract getPayload(): Record<string, any>
}
```

### 2. 具体的なイベント実装

```typescript
// src/modules/ingredients/server/domain/events/ingredient-consumed.event.ts
export class IngredientConsumedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly ingredientName: string,
    public readonly previousQuantity: Quantity,
    public readonly newQuantity: Quantity,
    public readonly consumedAmount: number,
    public readonly reason?: string,
    public readonly consumedBy?: string
  ) {
    super(aggregateId)
  }

  get eventName(): string {
    return 'ingredient.consumed'
  }

  protected getPayload(): Record<string, any> {
    return {
      ingredientName: this.ingredientName,
      previousQuantity: {
        amount: this.previousQuantity.amount,
        unit: this.previousQuantity.unit.symbol,
      },
      newQuantity: {
        amount: this.newQuantity.amount,
        unit: this.newQuantity.unit.symbol,
      },
      consumedAmount: this.consumedAmount,
      reason: this.reason,
      consumedBy: this.consumedBy,
    }
  }
}

// src/modules/ingredients/server/domain/events/ingredient-expired.event.ts
export class IngredientExpiredEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly ingredientName: string,
    public readonly expiryDate: Date,
    public readonly remainingQuantity: Quantity
  ) {
    super(aggregateId)
  }

  get eventName(): string {
    return 'ingredient.expired'
  }

  protected getPayload(): Record<string, any> {
    return {
      ingredientName: this.ingredientName,
      expiryDate: this.expiryDate.toISOString(),
      remainingQuantity: {
        amount: this.remainingQuantity.amount,
        unit: this.remainingQuantity.unit.symbol,
      },
    }
  }
}
```

### 3. Aggregate Rootでのイベント管理

```typescript
// src/modules/shared/domain/aggregate-root.base.ts
export abstract class AggregateRoot<T extends EntityId> extends Entity<T> {
  private _domainEvents: DomainEvent[] = []

  get domainEvents(): readonly DomainEvent[] {
    return this._domainEvents
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  clearEvents(): void {
    this._domainEvents = []
  }
}

// src/modules/ingredients/server/domain/entities/ingredient.entity.ts
export class Ingredient extends AggregateRoot<IngredientId> {
  consume(amount: number, reason?: string, consumedBy?: string): void {
    // ビジネスルール検証
    if (!this.hasSufficientStock(amount)) {
      throw new InsufficientStockException(
        `要求量 ${amount} が在庫 ${this._quantity.amount} を超えています`
      )
    }

    // 状態変更
    const previousQuantity = this._quantity
    this._quantity = this._quantity.subtract(amount)

    // イベント生成
    this.addDomainEvent(
      new IngredientConsumedEvent(
        this.id.value,
        this._name.value,
        previousQuantity,
        this._quantity,
        amount,
        reason,
        consumedBy
      )
    )

    // 在庫切れチェック
    if (this.isOutOfStock()) {
      this.addDomainEvent(new IngredientOutOfStockEvent(this.id.value, this._name.value))
    }
  }

  checkExpiry(): void {
    if (this.isExpired() && !this._isMarkedAsExpired) {
      this._isMarkedAsExpired = true

      this.addDomainEvent(
        new IngredientExpiredEvent(
          this.id.value,
          this._name.value,
          this._expiryDate!.value,
          this._quantity
        )
      )
    }
  }
}
```

### 4. イベントバス実装

```typescript
// src/modules/shared/infrastructure/events/event-bus.ts
export interface EventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>
}

export class EventBus {
  private handlers: Map<string, EventHandler<any>[]> = new Map()
  private static instance: EventBus

  static getInstance(): EventBus {
    if (!this.instance) {
      this.instance = new EventBus()
    }
    return this.instance
  }

  register<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventName) || []
    handlers.push(handler)
    this.handlers.set(eventName, handlers)
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) || []

    // 並列実行
    await Promise.all(handlers.map((handler) => this.executeHandler(handler, event)))
  }

  async publishAll(events: readonly DomainEvent[]): Promise<void> {
    // イベントを順番に処理
    for (const event of events) {
      await this.publish(event)
    }
  }

  private async executeHandler(handler: EventHandler<any>, event: DomainEvent): Promise<void> {
    try {
      await handler.handle(event)
    } catch (error) {
      console.error(`Error handling event ${event.eventName}:`, error)
      // エラーを記録するが、他のハンドラーの実行は継続
    }
  }
}
```

### 5. イベントハンドラー実装

```typescript
// src/modules/ingredients/server/infrastructure/event-handlers/stock-notification.handler.ts
export class StockNotificationHandler implements EventHandler<IngredientOutOfStockEvent> {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly userRepository: UserRepository
  ) {}

  async handle(event: IngredientOutOfStockEvent): Promise<void> {
    // 通知対象ユーザーを取得
    const users = await this.userRepository.findAllActive()

    // 通知送信
    await Promise.all(
      users.map((user) =>
        this.notificationService.send({
          userId: user.id,
          type: 'STOCK_OUT',
          title: '在庫切れ通知',
          message: `${event.ingredientName}の在庫が切れました`,
          data: {
            ingredientId: event.aggregateId,
            ingredientName: event.ingredientName,
          },
        })
      )
    )
  }
}

// src/modules/ingredients/server/infrastructure/event-handlers/expiry-alert.handler.ts
export class ExpiryAlertHandler implements EventHandler<IngredientExpiredEvent> {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly analyticsService: AnalyticsService
  ) {}

  async handle(event: IngredientExpiredEvent): Promise<void> {
    // 通知送信
    await this.notificationService.sendExpiryAlert({
      ingredientId: event.aggregateId,
      ingredientName: event.ingredientName,
      expiryDate: event.expiryDate,
      remainingQuantity: event.remainingQuantity,
    })

    // 分析データ記録
    await this.analyticsService.recordExpiry({
      ingredientId: event.aggregateId,
      ingredientName: event.ingredientName,
      wastedAmount: event.remainingQuantity.amount,
      wastedValue: await this.calculateWastedValue(event.aggregateId, event.remainingQuantity),
    })
  }
}
```

### 6. イベントパブリッシャー

```typescript
// src/modules/shared/infrastructure/events/domain-event-publisher.ts
export class DomainEventPublisher {
  constructor(
    private readonly eventBus: EventBus,
    private readonly eventStore?: EventStore
  ) {}

  async publishAll(events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) return

    // イベントストアに保存（オプション）
    if (this.eventStore) {
      await this.eventStore.saveAll(events)
    }

    // イベントバスに発行
    for (const event of events) {
      await this.eventBus.publish(event)
    }
  }
}

// src/modules/shared/infrastructure/events/event-store.ts
export class EventStore {
  constructor(private readonly prisma: PrismaClient) {}

  async saveAll(events: readonly DomainEvent[]): Promise<void> {
    await this.prisma.domainEvent.createMany({
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

  async findByAggregateId(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]> {
    const records = await this.prisma.domainEvent.findMany({
      where: {
        aggregateId,
        ...(fromVersion && { version: { gte: fromVersion } }),
      },
      orderBy: { version: 'asc' },
    })

    return records.map((record) => this.deserializeEvent(record))
  }
}
```

### 7. モジュール間通信

```typescript
// src/modules/shared/events/ingredient-events.ts
export interface IngredientConsumedEventData {
  ingredientId: string
  ingredientName: string
  consumedAmount: number
  newQuantity: {
    amount: number
    unit: string
  }
}

// src/modules/recipes/server/infrastructure/event-handlers/recipe-ingredient-sync.handler.ts
export class RecipeIngredientSyncHandler implements EventHandler<IngredientConsumedEvent> {
  constructor(
    private readonly recipeRepository: RecipeRepository,
    private readonly recipeService: RecipeAvailabilityService
  ) {}

  async handle(event: IngredientConsumedEvent): Promise<void> {
    // 該当食材を使用するレシピを検索
    const recipes = await this.recipeRepository.findByIngredientId(event.aggregateId)

    // 各レシピの利用可能状態を更新
    for (const recipe of recipes) {
      const isAvailable = await this.recipeService.checkAvailability(recipe)

      if (recipe.isAvailable !== isAvailable) {
        recipe.updateAvailability(isAvailable)
        await this.recipeRepository.save(recipe)
      }
    }
  }
}
```

### 8. イベントハンドラー登録

```typescript
// src/modules/ingredients/server/infrastructure/composition-root.ts
export class IngredientsModuleContainer {
  private registerEventHandlers(): void {
    const eventBus = EventBus.getInstance()

    // 在庫切れ通知
    eventBus.register(
      'ingredient.outOfStock',
      new StockNotificationHandler(this.notificationService, this.userRepository)
    )

    // 賞味期限アラート
    eventBus.register(
      'ingredient.expired',
      new ExpiryAlertHandler(this.notificationService, this.analyticsService)
    )

    // 消費統計更新
    eventBus.register(
      'ingredient.consumed',
      new ConsumptionStatisticsHandler(this.statisticsRepository)
    )

    // Read Model更新
    eventBus.register('ingredient.consumed', new IngredientProjectionHandler(this.prisma))
  }
}
```

## ベストプラクティス

### 1. イベント設計

- **ビジネス用語使用**: 技術的な用語ではなくビジネス用語を使用
- **過去形命名**: `IngredientConsumed` not `ConsumeIngredient`
- **自己完結型**: イベントは外部への依存なく理解可能
- **不変性**: イベントは一度作成されたら変更不可

### 2. イベントハンドラー

- **冪等性**: 同じイベントを複数回処理しても結果が同じ
- **エラー処理**: 失敗してもシステム全体に影響しない
- **非同期実行**: 長時間処理は非同期で実行
- **順序保証**: 必要に応じてイベントの順序を保証

### 3. パフォーマンス最適化

```typescript
// バッチ処理
export class BatchEventProcessor {
  private queue: DomainEvent[] = []
  private timer: NodeJS.Timeout | null = null

  async add(event: DomainEvent): Promise<void> {
    this.queue.push(event)

    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), 100)
    }
  }

  private async flush(): Promise<void> {
    const events = [...this.queue]
    this.queue = []
    this.timer = null

    if (events.length > 0) {
      await this.processEvents(events)
    }
  }
}
```

## トラブルシューティング

### 1. イベント重複

```typescript
// 重複防止
export class IdempotentEventHandler<T extends DomainEvent> {
  constructor(
    private readonly handler: EventHandler<T>,
    private readonly cache: CacheService
  ) {}

  async handle(event: T): Promise<void> {
    const key = `event:${event.id}`

    // 既に処理済みかチェック
    if (await this.cache.exists(key)) {
      return
    }

    // 処理実行
    await this.handler.handle(event)

    // 処理済みマーク（24時間保持）
    await this.cache.set(key, true, 86400)
  }
}
```

### 2. イベント順序

```typescript
// 順序保証
export class OrderedEventProcessor {
  async processInOrder(aggregateId: string, events: DomainEvent[]): Promise<void> {
    // バージョン順にソート
    const sorted = events.sort((a, b) => a.version - b.version)

    // 順番に処理
    for (const event of sorted) {
      await this.eventBus.publish(event)
    }
  }
}
```

## 関連ドキュメント

- [CQRS パターン実装ガイド](./CQRS_PATTERN.md)
- [イベントソーシング実装ガイド](./EVENT_SOURCING.md)
- [非同期処理パターン](./ASYNC_PATTERNS.md)
