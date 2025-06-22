# 食材管理コンテキスト - ドメインイベント仕様

## 概要

このドキュメントでは、食材管理コンテキストで発生するドメインイベントの仕様を定義します。
ドメインイベントは、ビジネス上の重要な出来事を表現し、コンテキスト間の統合や監査ログ、通知などに使用されます。

## イベント設計原則

### 基本原則

1. **過去形で命名**
   - 既に起きた事実を表現（例：IngredientCreated）
2. **不変性**
   - イベントは作成後に変更されない
3. **自己完結性**
   - イベント単体で意味が理解できる情報を含む
4. **時系列性**
   - 発生時刻を必ず含む

### イベントの分類

| 分類                   | 説明                           | 例                 |
| ---------------------- | ------------------------------ | ------------------ |
| ライフサイクルイベント | エンティティの作成・更新・削除 | IngredientCreated  |
| 状態変更イベント       | 重要な状態の変化               | StockDepleted      |
| 閾値イベント           | 特定の条件を満たした時         | ExpiringSoon       |
| ビジネスイベント       | ビジネス上の重要な出来事       | IngredientConsumed |

## 基底イベントクラス

```typescript
// domain/events/domain-event.ts
export abstract class DomainEvent {
  readonly aggregateId: string
  readonly eventType: string
  readonly occurredAt: Date
  readonly eventId: string
  readonly version: number = 1

  constructor(aggregateId: string) {
    this.aggregateId = aggregateId
    this.eventType = this.constructor.name
    this.occurredAt = new Date()
    this.eventId = generateEventId()
  }

  abstract getEventData(): Record<string, any>
}

// イベントメタデータ
export interface EventMetadata {
  userId?: string // イベントを発生させたユーザー
  correlationId?: string // リクエストの追跡ID
  causationId?: string // このイベントを引き起こしたイベントのID
}
```

## 食材ライフサイクルイベント

### IngredientCreated（食材登録イベント）

```typescript
export class IngredientCreated extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      ingredientId: string
      name: string
      categoryId: string
      quantity: {
        amount: number
        unitId: string
      }
      storageLocation: string
      bestBeforeDate?: Date
      expiryDate?: Date
      createdBy: string
    }
  ) {
    super(aggregateId)
  }

  getEventData(): Record<string, any> {
    return {
      ingredientId: this.data.ingredientId,
      name: this.data.name,
      categoryId: this.data.categoryId,
      quantity: this.data.quantity,
      storageLocation: this.data.storageLocation,
      bestBeforeDate: this.data.bestBeforeDate?.toISOString(),
      expiryDate: this.data.expiryDate?.toISOString(),
      createdBy: this.data.createdBy,
    }
  }
}
```

**発生タイミング**: 新しい食材が登録された時

**用途**:

- 監査ログ
- 統計情報の更新
- 初期在庫の記録

### IngredientUpdated（食材更新イベント）

```typescript
export class IngredientUpdated extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      ingredientId: string
      changes: {
        name?: { old: string; new: string }
        categoryId?: { old: string; new: string }
        storageLocation?: { old: string; new: string }
        bestBeforeDate?: { old?: Date; new?: Date }
        expiryDate?: { old?: Date; new?: Date }
      }
      updatedBy: string
    }
  ) {
    super(aggregateId)
  }

  getEventData(): Record<string, any> {
    return {
      ingredientId: this.data.ingredientId,
      changes: this.data.changes,
      updatedBy: this.data.updatedBy,
    }
  }
}
```

**発生タイミング**: 食材の基本情報が更新された時

**用途**:

- 変更履歴の追跡
- 監査ログ

### IngredientDeleted（食材削除イベント）

```typescript
export class IngredientDeleted extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      ingredientId: string
      name: string
      reason?: string
      deletedBy: string
    }
  ) {
    super(aggregateId)
  }

  getEventData(): Record<string, any> {
    return this.data
  }
}
```

**発生タイミング**: 食材が削除（論理削除）された時

**用途**:

- 削除履歴の記録
- 関連データのクリーンアップ

## 在庫関連イベント

### StockUpdated（在庫更新イベント）

```typescript
export class StockUpdated extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      ingredientId: string
      ingredientName: string
      previousQuantity: {
        amount: number
        unitId: string
      }
      currentQuantity: {
        amount: number
        unitId: string
      }
      updateType: 'CONSUMED' | 'REPLENISHED' | 'ADJUSTED'
      reason?: string
      updatedBy: string
    }
  ) {
    super(aggregateId)
  }

  getEventData(): Record<string, any> {
    return this.data
  }

  getQuantityChange(): number {
    return this.data.currentQuantity.amount - this.data.previousQuantity.amount
  }
}
```

**発生タイミング**: 食材の数量が変更された時

**用途**:

- 在庫履歴の記録
- 消費パターンの分析
- 在庫レポートの生成

### StockDepleted（在庫切れイベント）

```typescript
export class StockDepleted extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      ingredientId: string
      ingredientName: string
      categoryId: string
      lastConsumedAt: Date
    }
  ) {
    super(aggregateId)
  }

  getEventData(): Record<string, any> {
    return this.data
  }
}
```

**発生タイミング**: 食材の在庫が0になった時

**用途**:

- 買い物リストへの自動追加
- 在庫切れ通知
- 購入提案

### LowStockDetected（在庫不足検出イベント）

```typescript
export class LowStockDetected extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      ingredientId: string
      ingredientName: string
      currentQuantity: {
        amount: number
        unitId: string
      }
      threshold: {
        amount: number
        unitId: string
      }
      categoryId: string
    }
  ) {
    super(aggregateId)
  }

  getEventData(): Record<string, any> {
    return this.data
  }
}
```

**発生タイミング**: 在庫が設定した閾値を下回った時

**用途**:

- 在庫補充リマインダー
- 買い物リスト提案

## 期限関連イベント

### IngredientExpiringSoon（期限切れ間近イベント）

```typescript
export class IngredientExpiringSoon extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      ingredientId: string
      ingredientName: string
      expiryDate: Date
      daysUntilExpiry: number
      quantity: {
        amount: number
        unitId: string
      }
      storageLocation: string
    }
  ) {
    super(aggregateId)
  }

  getEventData(): Record<string, any> {
    return {
      ...this.data,
      expiryDate: this.data.expiryDate.toISOString(),
    }
  }

  getUrgencyLevel(): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (this.data.daysUntilExpiry <= 1) return 'HIGH'
    if (this.data.daysUntilExpiry <= 3) return 'MEDIUM'
    return 'LOW'
  }
}
```

**発生タイミング**: 賞味期限が設定日数以内になった時（デフォルト7日）

**用途**:

- プッシュ通知
- メール通知
- 消費促進

### IngredientExpired（期限切れイベント）

```typescript
export class IngredientExpired extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      ingredientId: string
      ingredientName: string
      expiredDate: Date
      daysSinceExpiry: number
      quantity: {
        amount: number
        unitId: string
      }
      estimatedValue?: number
    }
  ) {
    super(aggregateId)
  }

  getEventData(): Record<string, any> {
    return {
      ...this.data,
      expiredDate: this.data.expiredDate.toISOString(),
    }
  }
}
```

**発生タイミング**: 賞味期限を過ぎた時

**用途**:

- 廃棄推奨通知
- 食材ロス統計
- 改善提案

## ビジネスイベント

### IngredientConsumed（食材消費イベント）

```typescript
export class IngredientConsumed extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly data: {
      ingredientId: string
      ingredientName: string
      consumedQuantity: {
        amount: number
        unitId: string
      }
      remainingQuantity: {
        amount: number
        unitId: string
      }
      consumedFor?: string // レシピIDなど
      consumedBy: string
    }
  ) {
    super(aggregateId)
  }

  getEventData(): Record<string, any> {
    return this.data
  }

  isFullyConsumed(): boolean {
    return this.data.remainingQuantity.amount === 0
  }
}
```

**発生タイミング**: 食材が消費された時

**用途**:

- 消費履歴の記録
- 消費パターン分析
- レシピとの連携

## イベントハンドラー

### イベントハンドラーインターフェース

```typescript
export interface EventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>
  canHandle(event: DomainEvent): boolean
}

export abstract class BaseEventHandler<T extends DomainEvent> implements EventHandler<T> {
  abstract eventType: string

  canHandle(event: DomainEvent): boolean {
    return event.eventType === this.eventType
  }

  abstract handle(event: T): Promise<void>
}
```

### 実装例：期限切れ通知ハンドラー

```typescript
export class ExpiringSoonNotificationHandler extends BaseEventHandler<IngredientExpiringSoon> {
  eventType = 'IngredientExpiringSoon'

  constructor(
    private notificationService: NotificationService,
    private userRepository: UserRepository
  ) {
    super()
  }

  async handle(event: IngredientExpiringSoon): Promise<void> {
    const urgency = event.getUrgencyLevel()

    // ユーザー設定を確認
    const user = await this.userRepository.findByIngredientId(event.data.ingredientId)
    if (!user.notificationSettings.expiryAlerts) {
      return
    }

    // 通知を送信
    await this.notificationService.send({
      userId: user.id,
      type: 'EXPIRY_WARNING',
      title: `${event.data.ingredientName}の賞味期限が近づいています`,
      message: `あと${event.data.daysUntilExpiry}日で期限切れです`,
      urgency,
      data: {
        ingredientId: event.data.ingredientId,
        expiryDate: event.data.expiryDate,
      },
    })
  }
}
```

## イベントバス

### イベントバスインターフェース

```typescript
export interface EventBus {
  publish(event: DomainEvent): Promise<void>
  publishAll(events: DomainEvent[]): Promise<void>
  subscribe(handler: EventHandler<any>): void
}

export class InMemoryEventBus implements EventBus {
  private handlers: EventHandler<any>[] = []

  subscribe(handler: EventHandler<any>): void {
    this.handlers.push(handler)
  }

  async publish(event: DomainEvent): Promise<void> {
    const promises = this.handlers
      .filter((handler) => handler.canHandle(event))
      .map((handler) => handler.handle(event))

    await Promise.all(promises)
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event)
    }
  }
}
```

## イベントストア

### イベント永続化

```typescript
export interface EventStore {
  save(event: DomainEvent): Promise<void>
  saveAll(events: DomainEvent[]): Promise<void>
  findByAggregateId(aggregateId: string): Promise<DomainEvent[]>
  findByEventType(eventType: string, from?: Date, to?: Date): Promise<DomainEvent[]>
}

export interface StoredEvent {
  id: string
  aggregateId: string
  eventType: string
  eventData: string // JSON
  metadata: string // JSON
  occurredAt: Date
  storedAt: Date
}
```

## イベント駆動の実装例

### 集約でのイベント発行

```typescript
export class Ingredient {
  private events: DomainEvent[] = []

  consume(amount: Quantity): void {
    const previousQuantity = this.quantity
    this.quantity = this.quantity.subtract(amount)

    // イベントを記録
    this.events.push(
      new StockUpdated(this.id.toString(), {
        ingredientId: this.id.toString(),
        ingredientName: this.name.toString(),
        previousQuantity: previousQuantity.toDTO(),
        currentQuantity: this.quantity.toDTO(),
        updateType: 'CONSUMED',
        updatedBy: 'system', // 実際はコンテキストから取得
      })
    )

    if (this.quantity.isZero()) {
      this.events.push(
        new StockDepleted(this.id.toString(), {
          ingredientId: this.id.toString(),
          ingredientName: this.name.toString(),
          categoryId: this.categoryId.toString(),
          lastConsumedAt: new Date(),
        })
      )
    }
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.events]
  }

  markEventsAsCommitted(): void {
    this.events = []
  }
}
```

### リポジトリでのイベント処理

```typescript
export class EventAwareIngredientRepository implements IngredientRepository {
  constructor(
    private delegate: IngredientRepository,
    private eventBus: EventBus,
    private eventStore: EventStore
  ) {}

  async save(ingredient: Ingredient): Promise<void> {
    // エンティティを保存
    await this.delegate.save(ingredient)

    // イベントを取得して処理
    const events = ingredient.getUncommittedEvents()

    // イベントストアに保存
    await this.eventStore.saveAll(events)

    // イベントバスに発行
    await this.eventBus.publishAll(events)

    // イベントをコミット済みにマーク
    ingredient.markEventsAsCommitted()
  }
}
```

## 更新履歴

| 日付       | 内容     | 作成者  |
| ---------- | -------- | ------- |
| 2025-01-21 | 初版作成 | @system |
