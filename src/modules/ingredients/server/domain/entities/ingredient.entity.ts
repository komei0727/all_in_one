import { AggregateRoot } from '@/modules/shared/server/domain/entities/aggregate-root.base'

import {
  IngredientCreated,
  StockConsumed,
  StockReplenished,
  IngredientUpdated,
  IngredientDeleted,
  IngredientExpired,
} from '../events'
import { BusinessRuleException } from '../exceptions/business-rule.exception'
import {
  IngredientId,
  IngredientName,
  CategoryId,
  Memo,
  Price,
  ExpiryInfo,
  IngredientStock,
  UnitId,
  StorageLocation,
  StorageType,
} from '../value-objects'

/**
 * 食材エンティティ
 * 食材の基本情報と在庫情報を管理する集約ルート
 */
export class Ingredient extends AggregateRoot {
  private readonly id: IngredientId
  private readonly userId: string
  private name: IngredientName
  private categoryId: CategoryId
  private memo: Memo | null
  private price: Price | null
  private purchaseDate: Date
  private expiryInfo: ExpiryInfo | null
  private ingredientStock: IngredientStock
  private readonly createdAt: Date
  private updatedAt: Date
  private deletedAt: Date | null

  constructor(params: {
    id: IngredientId
    userId: string
    name: IngredientName
    categoryId: CategoryId
    purchaseDate: Date
    ingredientStock: IngredientStock
    memo?: Memo | null
    price?: Price | null
    expiryInfo?: ExpiryInfo | null
    createdAt?: Date
    updatedAt?: Date
    deletedAt?: Date | null
  }) {
    super()
    this.id = params.id
    this.userId = params.userId
    this.name = params.name
    this.categoryId = params.categoryId
    this.purchaseDate = params.purchaseDate
    this.ingredientStock = params.ingredientStock
    this.memo = params.memo ?? null
    this.price = params.price ?? null
    this.expiryInfo = params.expiryInfo ?? null
    this.createdAt = params.createdAt ?? new Date()
    this.updatedAt = params.updatedAt ?? new Date()
    this.deletedAt = params.deletedAt ?? null
  }

  /**
   * 食材を新規作成（ファクトリメソッド）
   */
  static create(params: {
    userId: string
    name: string
    categoryId: string
    unitId: string
    quantity: number
    purchaseDate: Date
    storageLocation: { type: StorageType; detail?: string }
    threshold?: number | null
    memo?: string | null
    price?: number | null
    expiryInfo?: { bestBeforeDate: Date; useByDate?: Date | null } | null
  }): Ingredient {
    const id = IngredientId.generate()
    const ingredientName = new IngredientName(params.name)
    const categoryId = new CategoryId(params.categoryId)
    const unitId = new UnitId(params.unitId)
    const ingredientStock = new IngredientStock({
      quantity: params.quantity,
      unitId,
      storageLocation: new StorageLocation(
        params.storageLocation.type,
        params.storageLocation.detail
      ),
      threshold: params.threshold,
    })

    const ingredient = new Ingredient({
      id,
      userId: params.userId,
      name: ingredientName,
      categoryId,
      purchaseDate: params.purchaseDate,
      ingredientStock,
      memo: params.memo ? new Memo(params.memo) : null,
      price: params.price ? new Price(params.price) : null,
      expiryInfo: params.expiryInfo
        ? new ExpiryInfo({
            bestBeforeDate: params.expiryInfo.bestBeforeDate,
            useByDate: params.expiryInfo.useByDate || null,
          })
        : null,
    })

    // 作成イベントを発行
    ingredient.addDomainEvent(
      new IngredientCreated(
        id.getValue(),
        params.userId,
        params.name,
        params.categoryId,
        params.quantity,
        params.unitId,
        { userId: params.userId }
      )
    )

    return ingredient
  }

  /**
   * IDを取得
   */
  getId(): IngredientId {
    return this.id
  }

  /**
   * 名前を取得
   */
  getName(): IngredientName {
    return this.name
  }

  /**
   * カテゴリーIDを取得
   */
  getCategoryId(): CategoryId {
    return this.categoryId
  }

  /**
   * メモを取得
   */
  getMemo(): Memo | null {
    return this.memo
  }

  /**
   * ユーザーIDを取得
   */
  getUserId(): string {
    return this.userId
  }

  /**
   * 価格を取得
   */
  getPrice(): Price | null {
    return this.price
  }

  /**
   * 購入日を取得
   */
  getPurchaseDate(): Date {
    return this.purchaseDate
  }

  /**
   * 期限情報を取得
   */
  getExpiryInfo(): ExpiryInfo | null {
    return this.expiryInfo
  }

  /**
   * 在庫情報を取得
   */
  getIngredientStock(): IngredientStock {
    return this.ingredientStock
  }

  /**
   * 作成日時を取得
   */
  getCreatedAt(): Date {
    return this.createdAt
  }

  /**
   * 更新日時を取得
   */
  getUpdatedAt(): Date {
    return this.updatedAt
  }

  /**
   * 削除日時を取得
   */
  getDeletedAt(): Date | null {
    return this.deletedAt
  }

  /**
   * 削除済みかどうか
   */
  isDeleted(): boolean {
    return this.deletedAt !== null
  }

  /**
   * 在庫があるかどうか
   */
  isInStock(): boolean {
    return !this.ingredientStock.isOutOfStock()
  }

  /**
   * 在庫を設定
   * @param stock 新しい在庫情報
   */
  setStock(stock: IngredientStock): void {
    this.ingredientStock = stock
    this.updateTimestamp()
  }

  /**
   * 在庫を消費
   * @param quantity 消費する数量
   * @throws {BusinessRuleException} 在庫が不足している場合
   */
  consume(quantity: number): void {
    const currentQuantity = this.ingredientStock.getQuantity()
    if (currentQuantity < quantity) {
      throw new BusinessRuleException('在庫が不足しています')
    }

    this.ingredientStock = this.ingredientStock.subtract(quantity)
    this.updateTimestamp()

    // 在庫消費イベントを発行
    this.addDomainEvent(
      new StockConsumed(
        this.id.getValue(),
        this.userId,
        quantity,
        this.ingredientStock.getQuantity(),
        this.ingredientStock.getUnitId().getValue(),
        { userId: this.userId }
      )
    )
  }

  /**
   * 在庫を補充
   * @param quantity 補充する数量
   */
  replenish(quantity: number): void {
    const previousQuantity = this.ingredientStock.getQuantity()
    this.ingredientStock = this.ingredientStock.add(quantity)
    this.updateTimestamp()

    // 在庫補充イベントを発行
    this.addDomainEvent(
      new StockReplenished(
        this.id.getValue(),
        this.userId,
        quantity,
        previousQuantity,
        this.ingredientStock.getQuantity(),
        this.ingredientStock.getUnitId().getValue(),
        { userId: this.userId }
      )
    )
  }

  /**
   * 名前を更新
   * @param newName 新しい名前
   * @param userId 更新者ID
   */
  updateName(newName: IngredientName, userId?: string): void {
    this.checkUpdatePermission(userId)
    const previousName = this.name.getValue()
    this.name = newName
    this.updateTimestamp()

    // 食材更新イベントを発行
    this.addDomainEvent(
      new IngredientUpdated(
        this.id.getValue(),
        userId || this.userId,
        { name: { from: previousName, to: newName.getValue() } },
        { userId: userId || this.userId }
      )
    )
  }

  /**
   * カテゴリーを更新
   * @param newCategoryId 新しいカテゴリーID
   * @param userId 更新者ID
   */
  updateCategory(newCategoryId: CategoryId, userId?: string): void {
    this.checkUpdatePermission(userId)
    const previousCategoryId = this.categoryId.getValue()
    this.categoryId = newCategoryId
    this.updateTimestamp()

    // 食材更新イベントを発行
    this.addDomainEvent(
      new IngredientUpdated(
        this.id.getValue(),
        userId || this.userId,
        { categoryId: { from: previousCategoryId, to: newCategoryId.getValue() } },
        { userId: userId || this.userId }
      )
    )
  }

  /**
   * メモを更新
   * @param newMemo 新しいメモ
   * @param userId 更新者ID
   */
  updateMemo(newMemo: Memo | null, userId?: string): void {
    this.checkUpdatePermission(userId)
    this.memo = newMemo
    this.updateTimestamp()
  }

  /**
   * 期限切れかどうか
   */
  isExpired(): boolean {
    if (!this.expiryInfo) {
      return false
    }
    return this.expiryInfo.isExpired()
  }

  /**
   * 論理削除
   * @param userId 削除するユーザーID
   * @param reason 削除理由
   */
  delete(userId?: string, reason: string = 'user-action'): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('すでに削除されています')
    }
    if (userId && userId !== this.userId) {
      throw new BusinessRuleException('他のユーザーの食材は削除できません')
    }

    this.deletedAt = new Date()
    this.updateTimestamp()

    // 削除イベントを発行
    this.addDomainEvent(
      new IngredientDeleted(
        this.id.getValue(),
        userId || this.userId,
        this.name.getValue(),
        this.categoryId.getValue(),
        this.ingredientStock.getQuantity(),
        this.ingredientStock.getUnitId().getValue(),
        reason,
        { userId: userId || this.userId }
      )
    )
  }

  /**
   * 期限切れをチェックして通知
   * @returns 期限切れを検出した場合true
   */
  checkAndNotifyExpiry(): boolean {
    if (!this.expiryInfo || !this.isExpired()) {
      return false
    }

    const remainingDays = this.expiryInfo.getRemainingDays()

    // 期限切れイベントを発行
    this.addDomainEvent(
      new IngredientExpired(
        this.id.getValue(),
        this.name.getValue(),
        this.categoryId.getValue(),
        this.expiryInfo.getBestBeforeDate() || this.expiryInfo.getUseByDate()!,
        remainingDays,
        this.ingredientStock.getQuantity(),
        this.ingredientStock.getUnitId().getValue(),
        { systemCheck: true }
      )
    )

    return true
  }

  /**
   * 更新日時を更新
   */
  private updateTimestamp(): void {
    this.updatedAt = new Date()
  }

  /**
   * 更新権限をチェック
   * @param userId 更新者ID
   */
  private checkUpdatePermission(userId?: string): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('削除済みの食材は更新できません')
    }
    if (userId && userId !== this.userId) {
      throw new BusinessRuleException('他のユーザーの食材は更新できません')
    }
  }
}
