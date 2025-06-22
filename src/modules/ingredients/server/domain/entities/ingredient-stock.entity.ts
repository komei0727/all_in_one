import { BusinessRuleException } from '../exceptions/business-rule.exception'
import { IngredientStockId, Quantity, UnitId, StorageLocation, Price } from '../value-objects'

/**
 * 食材在庫エンティティ
 * 食材の在庫情報を表現する
 */
export class IngredientStock {
  private readonly id: IngredientStockId
  private quantity: Quantity
  private readonly unitId: UnitId
  private storageLocation: StorageLocation
  private readonly bestBeforeDate: Date | null
  private readonly expiryDate: Date | null
  private readonly purchaseDate: Date
  private readonly price: Price | null
  private isActive: boolean
  private readonly createdAt: Date
  private updatedAt: Date
  private deletedAt: Date | null
  private createdBy: string | null
  private updatedBy: string | null

  constructor(params: {
    id?: IngredientStockId
    quantity: Quantity
    unitId: UnitId
    storageLocation: StorageLocation
    bestBeforeDate: Date | null
    expiryDate: Date | null
    purchaseDate: Date
    price: Price | null
    isActive?: boolean
    createdAt?: Date
    updatedAt?: Date
    deletedAt?: Date | null
    createdBy?: string | null
    updatedBy?: string | null
  }) {
    this.id = params.id ?? IngredientStockId.generate()
    this.quantity = params.quantity
    this.unitId = params.unitId
    this.storageLocation = params.storageLocation
    this.bestBeforeDate = params.bestBeforeDate
    this.expiryDate = params.expiryDate
    this.purchaseDate = params.purchaseDate
    this.price = params.price
    this.isActive = params.isActive ?? true
    this.createdAt = params.createdAt ?? new Date()
    this.updatedAt = params.updatedAt ?? new Date()
    this.deletedAt = params.deletedAt ?? null
    this.createdBy = params.createdBy ?? null
    this.updatedBy = params.updatedBy ?? null
  }

  /**
   * IDを取得
   */
  getId(): IngredientStockId {
    return this.id
  }

  /**
   * 数量を取得
   */
  getQuantity(): Quantity {
    return this.quantity
  }

  /**
   * 単位IDを取得
   */
  getUnitId(): UnitId {
    return this.unitId
  }

  /**
   * 保管場所を取得
   */
  getStorageLocation(): StorageLocation {
    return this.storageLocation
  }

  /**
   * 賞味期限を取得
   */
  getBestBeforeDate(): Date | null {
    return this.bestBeforeDate
  }

  /**
   * 消費期限を取得
   */
  getExpiryDate(): Date | null {
    return this.expiryDate
  }

  /**
   * 購入日を取得
   */
  getPurchaseDate(): Date {
    return this.purchaseDate
  }

  /**
   * 価格を取得
   */
  getPrice(): Price | null {
    return this.price
  }

  /**
   * アクティブかどうか
   */
  getIsActive(): boolean {
    return this.isActive
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
   * 作成者を取得
   */
  getCreatedBy(): string | null {
    return this.createdBy
  }

  /**
   * 更新者を取得
   */
  getUpdatedBy(): string | null {
    return this.updatedBy
  }

  /**
   * 削除済みかどうか
   */
  isDeleted(): boolean {
    return this.deletedAt !== null
  }

  /**
   * 在庫を消費
   * @param consumeQuantity 消費する数量
   * @param userId 更新者ID
   */
  consume(consumeQuantity: Quantity, userId?: string): void {
    if (!this.isActive || this.isDeleted()) {
      throw new BusinessRuleException('無効な在庫です')
    }
    this.quantity = this.quantity.subtract(consumeQuantity)
    this.updateTimestamp(userId)
  }

  /**
   * 在庫を追加
   * @param addQuantity 追加する数量
   * @param userId 更新者ID
   */
  add(addQuantity: Quantity, userId?: string): void {
    if (!this.isActive || this.isDeleted()) {
      throw new BusinessRuleException('無効な在庫です')
    }
    this.quantity = this.quantity.add(addQuantity)
    this.updateTimestamp(userId)
  }

  /**
   * 保管場所を更新
   * @param newLocation 新しい保管場所
   * @param userId 更新者ID
   */
  updateStorageLocation(newLocation: StorageLocation, userId?: string): void {
    if (!this.isActive || this.isDeleted()) {
      throw new BusinessRuleException('無効な在庫です')
    }
    this.storageLocation = newLocation
    this.updateTimestamp(userId)
  }

  /**
   * 非アクティブ化
   * @param userId 更新者ID
   */
  deactivate(userId?: string): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('削除済みの在庫です')
    }
    this.isActive = false
    this.updateTimestamp(userId)
  }

  /**
   * 論理削除
   * @param userId 削除するユーザーID
   */
  delete(userId?: string): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('すでに削除されています')
    }
    this.deletedAt = new Date()
    this.isActive = false
    this.updateTimestamp(userId)
  }

  /**
   * 期限切れかどうかを判定
   * @returns 期限切れの場合true
   */
  isExpired(): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 賞味期限を優先的にチェック
    if (this.bestBeforeDate) {
      const bestBefore = new Date(this.bestBeforeDate)
      bestBefore.setHours(0, 0, 0, 0)
      return bestBefore < today
    }

    // 賞味期限がない場合は消費期限をチェック
    if (this.expiryDate) {
      const expiry = new Date(this.expiryDate)
      expiry.setHours(0, 0, 0, 0)
      return expiry < today
    }

    // どちらもない場合は期限切れではない
    return false
  }

  /**
   * 期限までの日数を取得
   * @returns 期限までの日数（過ぎている場合は負の値）、期限がない場合はnull
   */
  getDaysUntilExpiry(): number | null {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 賞味期限を優先的に使用
    const targetDate = this.bestBeforeDate || this.expiryDate
    if (!targetDate) {
      return null
    }

    const target = new Date(targetDate)
    target.setHours(0, 0, 0, 0)

    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  }

  /**
   * 更新日時を更新
   * @param userId 更新者ID
   */
  private updateTimestamp(userId?: string): void {
    this.updatedAt = new Date()
    if (userId) {
      this.updatedBy = userId
    }
  }
}
