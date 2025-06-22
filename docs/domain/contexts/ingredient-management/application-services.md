# 食材管理コンテキスト - アプリケーションサービス仕様

## 概要

このドキュメントでは、食材管理コンテキストのアプリケーションサービスの仕様を定義します。
アプリケーションサービスは、ユースケースを実装し、ドメイン層とプレゼンテーション層の橋渡しを行います。

## アプリケーションサービスの責務

### 主な責務

1. **ユースケースの調整**
   - 複数の集約を協調させる
   - トランザクション境界の管理
2. **入出力の変換**
   - DTOとドメインモデルの相互変換
   - バリデーション
3. **横断的関心事の処理**
   - 認証・認可
   - ロギング
   - 監査

### 責務外のこと

- ビジネスロジック（ドメイン層の責務）
- データアクセス（インフラストラクチャ層の責務）
- プレゼンテーションロジック（UI層の責務）

## 食材管理サービス（IngredientApplicationService）

### インターフェース定義

```typescript
// application/services/ingredient-application-service.ts
export interface IngredientApplicationService {
  // ===== 食材のCRUD操作 =====

  /**
   * 食材を登録する
   * @param command 登録コマンド
   * @returns 登録された食材のID
   * @throws {ValidationError} 入力値が不正な場合
   * @throws {DuplicateIngredientError} 重複する食材が存在する場合
   */
  createIngredient(command: CreateIngredientCommand): Promise<string>

  /**
   * 食材情報を更新する
   * @param command 更新コマンド
   * @throws {IngredientNotFoundError} 食材が存在しない場合
   */
  updateIngredient(command: UpdateIngredientCommand): Promise<void>

  /**
   * 食材を削除する
   * @param command 削除コマンド
   * @throws {IngredientNotFoundError} 食材が存在しない場合
   */
  deleteIngredient(command: DeleteIngredientCommand): Promise<void>

  // ===== 在庫操作 =====

  /**
   * 食材を消費する
   * @param command 消費コマンド
   * @throws {InsufficientStockError} 在庫が不足している場合
   */
  consumeIngredient(command: ConsumeIngredientCommand): Promise<void>

  /**
   * 食材を補充する
   * @param command 補充コマンド
   */
  replenishIngredient(command: ReplenishIngredientCommand): Promise<void>

  /**
   * 複数の食材を一括消費する
   * @param command 一括消費コマンド
   * @returns 消費結果
   */
  consumeMultipleIngredients(command: ConsumeMultipleIngredientsCommand): Promise<ConsumeResult[]>

  // ===== 検索・照会 =====

  /**
   * 食材を検索する
   * @param query 検索クエリ
   * @returns 検索結果
   */
  searchIngredients(query: SearchIngredientsQuery): Promise<PagedResult<IngredientDTO>>

  /**
   * 食材の詳細を取得する
   * @param query 詳細取得クエリ
   * @returns 食材詳細
   * @throws {IngredientNotFoundError} 食材が存在しない場合
   */
  getIngredientDetail(query: GetIngredientDetailQuery): Promise<IngredientDetailDTO>

  /**
   * 期限切れ間近の食材を取得する
   * @param query 期限切れ間近クエリ
   * @returns 期限切れ間近の食材リスト
   */
  getExpiringSoonIngredients(query: GetExpiringSoonQuery): Promise<ExpiringSoonIngredientDTO[]>

  /**
   * カテゴリー別の在庫サマリーを取得する
   * @returns カテゴリー別サマリー
   */
  getStockSummaryByCategory(): Promise<CategoryStockSummaryDTO[]>
}
```

### コマンド定義

```typescript
// 食材登録コマンド
export interface CreateIngredientCommand {
  name: string
  categoryId: string
  quantity: number
  unitId: string
  storageLocation: StorageLocationType
  bestBeforeDate?: Date
  expiryDate?: Date
  notes?: string
  userId: string // 実行ユーザー
}

// 食材更新コマンド
export interface UpdateIngredientCommand {
  ingredientId: string
  name?: string
  categoryId?: string
  storageLocation?: StorageLocationType
  bestBeforeDate?: Date
  expiryDate?: Date
  notes?: string
  userId: string
}

// 食材削除コマンド
export interface DeleteIngredientCommand {
  ingredientId: string
  reason?: string
  userId: string
}

// 食材消費コマンド
export interface ConsumeIngredientCommand {
  ingredientId: string
  quantity: number
  consumedFor?: string // レシピIDなど
  userId: string
}

// 食材補充コマンド
export interface ReplenishIngredientCommand {
  ingredientId: string
  quantity: number
  purchasePrice?: number
  purchaseDate?: Date
  userId: string
}

// 複数食材消費コマンド
export interface ConsumeMultipleIngredientsCommand {
  consumptions: Array<{
    ingredientId: string
    quantity: number
  }>
  consumedFor?: string
  userId: string
}
```

### クエリ定義

```typescript
// 食材検索クエリ
export interface SearchIngredientsQuery {
  keyword?: string
  categoryIds?: string[]
  storageLocations?: StorageLocationType[]
  hasStock?: boolean
  expiringWithinDays?: number
  sortBy?: 'name' | 'expiryDate' | 'quantity' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
  page: number
  pageSize: number
  userId: string
}

// 食材詳細取得クエリ
export interface GetIngredientDetailQuery {
  ingredientId: string
  userId: string
}

// 期限切れ間近クエリ
export interface GetExpiringSoonQuery {
  days?: number // デフォルト: 7
  limit?: number
  userId: string
}
```

### DTO定義

```typescript
// 食材DTO
export interface IngredientDTO {
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
  storageLocation: string
  bestBeforeDate?: string
  expiryDate?: string
  daysUntilExpiry?: number
  isExpired: boolean
  isExpiringSoon: boolean
  updatedAt: string
}

// 食材詳細DTO
export interface IngredientDetailDTO extends IngredientDTO {
  notes?: string
  createdAt: string
  consumptionHistory: Array<{
    date: string
    quantity: number
    consumedFor?: string
  }>
  averageConsumptionPerWeek?: number
  estimatedDaysUntilDepletion?: number
}

// 期限切れ間近DTO
export interface ExpiringSoonIngredientDTO {
  id: string
  name: string
  expiryDate: string
  daysUntilExpiry: number
  quantity: {
    amount: number
    unit: string
  }
  storageLocation: string
  urgencyLevel: 'HIGH' | 'MEDIUM' | 'LOW'
}

// カテゴリー別在庫サマリーDTO
export interface CategoryStockSummaryDTO {
  category: {
    id: string
    name: string
  }
  totalItems: number
  itemsWithStock: number
  itemsExpiringSoon: number
  itemsExpired: number
  totalValue?: number
}

// ページング結果
export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
}

// 消費結果
export interface ConsumeResult {
  ingredientId: string
  success: boolean
  error?: string
  remainingQuantity?: number
}
```

### 実装例

```typescript
// application/services/ingredient-application-service-impl.ts
export class IngredientApplicationServiceImpl implements IngredientApplicationService {
  constructor(
    private ingredientRepo: IngredientRepository,
    private categoryRepo: CategoryRepository,
    private unitRepo: UnitRepository,
    private eventBus: EventBus,
    private transactionManager: TransactionManager,
    private validator: Validator
  ) {}

  async createIngredient(command: CreateIngredientCommand): Promise<string> {
    // バリデーション
    await this.validator.validate(command, CreateIngredientCommandSchema)

    return this.transactionManager.transaction(async () => {
      // カテゴリーと単位の存在確認
      const [category, unit] = await Promise.all([
        this.categoryRepo.findById(new CategoryId(command.categoryId)),
        this.unitRepo.findById(new UnitId(command.unitId)),
      ])

      if (!category) {
        throw new CategoryNotFoundError(new CategoryId(command.categoryId))
      }
      if (!unit) {
        throw new UnitNotFoundError(new UnitId(command.unitId))
      }

      // 重複チェック
      const exists = await this.ingredientRepo.existsByNameAndExpiryAndLocation(
        new IngredientName(command.name),
        command.expiryDate || command.bestBeforeDate || null,
        new StorageLocation(command.storageLocation)
      )

      if (exists) {
        throw new DuplicateIngredientError(
          command.name,
          command.expiryDate || command.bestBeforeDate || null,
          command.storageLocation
        )
      }

      // 食材を作成
      const ingredient = IngredientFactory.create({
        name: command.name,
        categoryId: command.categoryId,
        quantity: command.quantity,
        unit: unit,
        storageLocation: command.storageLocation,
        bestBeforeDate: command.bestBeforeDate,
        expiryDate: command.expiryDate,
        notes: command.notes,
      })

      // 保存
      await this.ingredientRepo.save(ingredient)

      // イベント発行
      await this.eventBus.publish(
        new IngredientCreated(ingredient.id.toString(), {
          ingredientId: ingredient.id.toString(),
          name: ingredient.name.toString(),
          categoryId: ingredient.categoryId.toString(),
          quantity: {
            amount: ingredient.quantity.amount,
            unitId: unit.id.toString(),
          },
          storageLocation: ingredient.storageLocation.toString(),
          bestBeforeDate: ingredient.bestBeforeDate?.toDate(),
          expiryDate: ingredient.expiryDate?.toDate(),
          createdBy: command.userId,
        })
      )

      return ingredient.id.toString()
    })
  }

  async consumeIngredient(command: ConsumeIngredientCommand): Promise<void> {
    await this.validator.validate(command, ConsumeIngredientCommandSchema)

    return this.transactionManager.transaction(async () => {
      // 食材を取得
      const ingredient = await this.ingredientRepo.findById(new IngredientId(command.ingredientId))

      if (!ingredient) {
        throw new IngredientNotFoundError(new IngredientId(command.ingredientId))
      }

      // 単位を取得
      const unit = await this.unitRepo.findById(ingredient.quantity.unitId)
      if (!unit) {
        throw new UnitNotFoundError(ingredient.quantity.unitId)
      }

      // 消費
      const consumeQuantity = new Quantity(command.quantity, unit)
      const events = ingredient.consume(consumeQuantity)

      // 保存
      await this.ingredientRepo.save(ingredient)

      // イベント発行
      for (const event of events) {
        await this.eventBus.publish(event)
      }

      // 消費イベントを追加発行
      await this.eventBus.publish(
        new IngredientConsumed(ingredient.id.toString(), {
          ingredientId: ingredient.id.toString(),
          ingredientName: ingredient.name.toString(),
          consumedQuantity: {
            amount: command.quantity,
            unitId: unit.id.toString(),
          },
          remainingQuantity: {
            amount: ingredient.quantity.amount,
            unitId: unit.id.toString(),
          },
          consumedFor: command.consumedFor,
          consumedBy: command.userId,
        })
      )
    })
  }

  async searchIngredients(query: SearchIngredientsQuery): Promise<PagedResult<IngredientDTO>> {
    // 検索条件を構築
    const criteria: IngredientSearchCriteria = {
      keyword: query.keyword,
      categoryIds: query.categoryIds?.map((id) => new CategoryId(id)),
      storageLocations: query.storageLocations,
      hasStock: query.hasStock,
      sortBy: this.mapSortKey(query.sortBy),
      sortOrder: query.sortOrder,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    }

    // 期限切れ間近の条件
    if (query.expiringWithinDays) {
      const today = new Date()
      const threshold = new Date(today.getTime() + query.expiringWithinDays * 24 * 60 * 60 * 1000)
      criteria.expiryDateTo = threshold
    }

    // 検索実行
    const result = await this.ingredientRepo.search(criteria)

    // DTOに変換
    const items = await Promise.all(result.items.map((ingredient) => this.toDTO(ingredient)))

    return {
      items,
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
      hasNext: result.hasMore,
      hasPrevious: query.page > 1,
    }
  }

  private async toDTO(ingredient: Ingredient): Promise<IngredientDTO> {
    const [category, unit] = await Promise.all([
      this.categoryRepo.findById(ingredient.categoryId),
      this.unitRepo.findById(ingredient.quantity.unitId),
    ])

    const expiryDate = ingredient.expiryDate || ingredient.bestBeforeDate
    const daysUntilExpiry = expiryDate?.daysUntilExpiry() || null

    return {
      id: ingredient.id.toString(),
      name: ingredient.name.toString(),
      category: {
        id: category!.id.toString(),
        name: category!.name.toString(),
      },
      quantity: {
        amount: ingredient.quantity.amount,
        unit: {
          id: unit!.id.toString(),
          name: unit!.name.toString(),
          symbol: unit!.symbol,
        },
      },
      storageLocation: ingredient.storageLocation.toString(),
      bestBeforeDate: ingredient.bestBeforeDate?.toDate().toISOString(),
      expiryDate: ingredient.expiryDate?.toDate().toISOString(),
      daysUntilExpiry: daysUntilExpiry || undefined,
      isExpired: ingredient.isExpired(),
      isExpiringSoon: ingredient.isExpiringSoon(7),
      updatedAt: ingredient.updatedAt.toISOString(),
    }
  }
}
```

## カテゴリー管理サービス

### インターフェース定義

```typescript
export interface CategoryApplicationService {
  /**
   * カテゴリーを作成する
   */
  createCategory(command: CreateCategoryCommand): Promise<string>

  /**
   * カテゴリーを更新する
   */
  updateCategory(command: UpdateCategoryCommand): Promise<void>

  /**
   * カテゴリーを削除する
   */
  deleteCategory(command: DeleteCategoryCommand): Promise<void>

  /**
   * すべてのカテゴリーを取得する
   */
  getAllCategories(): Promise<CategoryDTO[]>

  /**
   * カテゴリーの表示順を更新する
   */
  updateCategoryOrder(command: UpdateCategoryOrderCommand): Promise<void>
}
```

## 単位管理サービス

### インターフェース定義

```typescript
export interface UnitApplicationService {
  /**
   * 単位を作成する
   */
  createUnit(command: CreateUnitCommand): Promise<string>

  /**
   * 単位を更新する
   */
  updateUnit(command: UpdateUnitCommand): Promise<void>

  /**
   * 単位を削除する
   */
  deleteUnit(command: DeleteUnitCommand): Promise<void>

  /**
   * すべての単位を取得する
   */
  getAllUnits(): Promise<UnitDTO[]>

  /**
   * タイプ別に単位を取得する
   */
  getUnitsByType(type: UnitType): Promise<UnitDTO[]>
}
```

## 在庫チェックサービス

### インターフェース定義

```typescript
export interface StockCheckApplicationService {
  /**
   * レシピに必要な食材の在庫をチェックする
   */
  checkStockForRecipe(query: CheckStockForRecipeQuery): Promise<StockCheckResultDTO>

  /**
   * 在庫不足の食材を取得する
   */
  getLowStockIngredients(query: GetLowStockQuery): Promise<LowStockIngredientDTO[]>

  /**
   * カテゴリー別の在庫閾値を設定する
   */
  setStockThreshold(command: SetStockThresholdCommand): Promise<void>
}
```

## エラーハンドリング

### アプリケーション層のエラー

```typescript
// バリデーションエラー
export class ValidationError extends Error {
  constructor(
    public readonly errors: Array<{
      field: string
      message: string
    }>
  ) {
    super('入力値が不正です')
  }
}

// 認可エラー
export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`権限がありません: ${action}`)
  }
}

// 業務エラー
export class BusinessRuleViolationError extends Error {
  constructor(message: string) {
    super(message)
  }
}
```

### エラーハンドリングの実装

```typescript
export class ErrorHandlingDecorator implements IngredientApplicationService {
  constructor(
    private delegate: IngredientApplicationService,
    private logger: Logger
  ) {}

  async createIngredient(command: CreateIngredientCommand): Promise<string> {
    try {
      return await this.delegate.createIngredient(command)
    } catch (error) {
      this.logger.error('食材登録エラー', { command, error })

      if (error instanceof ValidationError) {
        throw error // そのまま再throw
      }

      if (error instanceof DuplicateIngredientError) {
        throw new BusinessRuleViolationError('同じ食材が既に登録されています')
      }

      // 予期しないエラー
      throw new Error('食材の登録に失敗しました')
    }
  }
}
```

## 監査とロギング

### 監査ログ

```typescript
export interface AuditLogger {
  log(entry: AuditEntry): Promise<void>
}

export interface AuditEntry {
  userId: string
  action: string
  entityType: string
  entityId?: string
  changes?: Record<string, any>
  timestamp: Date
  ipAddress?: string
}

export class AuditingDecorator implements IngredientApplicationService {
  constructor(
    private delegate: IngredientApplicationService,
    private auditLogger: AuditLogger
  ) {}

  async createIngredient(command: CreateIngredientCommand): Promise<string> {
    const ingredientId = await this.delegate.createIngredient(command)

    await this.auditLogger.log({
      userId: command.userId,
      action: 'CREATE_INGREDIENT',
      entityType: 'Ingredient',
      entityId: ingredientId,
      changes: command,
      timestamp: new Date(),
    })

    return ingredientId
  }
}
```

## パフォーマンス最適化

### バッチ処理

```typescript
export class BatchIngredientService {
  async importIngredients(commands: CreateIngredientCommand[]): Promise<BatchImportResult> {
    const results: Array<{
      index: number
      success: boolean
      ingredientId?: string
      error?: string
    }> = []

    // バッチサイズで分割
    const batchSize = 100
    for (let i = 0; i < commands.length; i += batchSize) {
      const batch = commands.slice(i, i + batchSize)

      // 並列処理
      const batchResults = await Promise.allSettled(
        batch.map((command, index) =>
          this.createIngredient(command)
            .then((id) => ({ index: i + index, success: true, ingredientId: id }))
            .catch((error) => ({ index: i + index, success: false, error: error.message }))
        )
      )

      results.push(...batchResults.map((r) => (r.status === 'fulfilled' ? r.value : r.reason)))
    }

    return {
      total: commands.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    }
  }
}
```

## 更新履歴

| 日付       | 内容     | 作成者  |
| ---------- | -------- | ------- |
| 2025-01-21 | 初版作成 | @system |
