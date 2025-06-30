import { AggregateRoot } from '@/modules/shared/server/domain/entities/aggregate-root.base'

import {
  IngredientCreated,
  StockConsumed,
  StockDepleted,
  StockReplenished,
  IngredientUpdated,
  IngredientDeleted,
  IngredientExpired,
  IngredientExpiringSoon,
  StockLevelLow,
} from '../events'
import { BusinessRuleException } from '../exceptions'

import type {
  IngredientId,
  IngredientName,
  CategoryId,
  Memo,
  Price,
  ExpiryInfo,
  IngredientStock,
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
    isNew?: boolean // 新規作成フラグ
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

    // 新規作成の場合はイベントを発行
    if (params.isNew) {
      this.addDomainEvent(
        new IngredientCreated(
          this.id.getValue(),
          this.userId,
          this.name.getValue(),
          this.categoryId.getValue(),
          this.ingredientStock.getQuantity(),
          this.ingredientStock.getUnitId().getValue(),
          { userId: this.userId }
        )
      )

      // 在庫が閾値以下の場合は在庫不足イベントも発行
      if (this.ingredientStock.isLowStock()) {
        this.addDomainEvent(
          new StockLevelLow(
            this.id.getValue(),
            this.name.getValue(),
            this.ingredientStock.getQuantity(),
            this.ingredientStock.getThreshold() || 0,
            this.ingredientStock.getUnitId().getValue(),
            undefined,
            { userId: this.userId }
          )
        )
      }
    }
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

    // 在庫が0になった場合は在庫切れイベントを発行
    if (this.ingredientStock.isOutOfStock()) {
      this.addDomainEvent(
        new StockDepleted(this.id.getValue(), this.userId, this.name.getValue(), {
          userId: this.userId,
        })
      )
    }
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
   * 価格を更新
   * @param newPrice 新しい価格
   * @param userId 更新者ID
   */
  updatePrice(newPrice: Price | null, userId?: string): void {
    this.checkUpdatePermission(userId)
    const previousPrice = this.price?.getValue() || null
    this.price = newPrice
    this.updateTimestamp()

    // 食材更新イベントを発行
    this.addDomainEvent(
      new IngredientUpdated(
        this.id.getValue(),
        userId || this.userId,
        { price: { from: previousPrice, to: newPrice?.getValue() || null } },
        { userId: userId || this.userId }
      )
    )
  }

  /**
   * 期限情報を更新
   * @param newExpiryInfo 新しい期限情報
   * @param userId 更新者ID
   */
  updateExpiryInfo(newExpiryInfo: ExpiryInfo | null, userId?: string): void {
    this.checkUpdatePermission(userId)
    const previousExpiryInfo = this.expiryInfo
      ? {
          bestBeforeDate: this.expiryInfo.getBestBeforeDate()?.toISOString() || null,
          useByDate: this.expiryInfo.getUseByDate()?.toISOString() || null,
        }
      : null
    this.expiryInfo = newExpiryInfo
    this.updateTimestamp()

    // 食材更新イベントを発行
    this.addDomainEvent(
      new IngredientUpdated(
        this.id.getValue(),
        userId || this.userId,
        {
          expiryInfo: {
            from: previousExpiryInfo,
            to: newExpiryInfo
              ? {
                  bestBeforeDate: newExpiryInfo.getBestBeforeDate()?.toISOString() || null,
                  useByDate: newExpiryInfo.getUseByDate()?.toISOString() || null,
                }
              : null,
          },
        },
        { userId: userId || this.userId }
      )
    )
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
  delete(userId?: string, reason = 'user-action'): void {
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
   * 期限切れ間近を通知
   * @param remainingDays 期限までの残り日数
   */
  notifyExpiringSoon(remainingDays: number): void {
    if (!this.expiryInfo || this.isExpired()) {
      throw new BusinessRuleException('期限切れ間近の通知は期限内の食材のみ可能です')
    }

    // 期限切れ間近イベントを発行
    this.addDomainEvent(
      new IngredientExpiringSoon(
        this.id.getValue(),
        this.userId,
        this.name.getValue(),
        remainingDays,
        { userId: this.userId, systemCheck: true }
      )
    )
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
