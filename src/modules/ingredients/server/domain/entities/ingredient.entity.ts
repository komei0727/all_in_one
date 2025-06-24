import { BusinessRuleException } from '../exceptions/business-rule.exception'
import {
  IngredientId,
  IngredientName,
  CategoryId,
  Memo,
  Quantity,
  Price,
  UnitId,
  StorageLocation,
  ExpiryInfo,
} from '../value-objects'

/**
 * 食材エンティティ
 * 食材の基本情報と在庫情報を管理する集約ルート（在庫情報統合版）
 */
export class Ingredient {
  private readonly id: IngredientId
  private readonly userId: string // 所有者のユーザーID
  private name: IngredientName
  private categoryId: CategoryId
  private memo: Memo | null
  // 在庫情報（統合）
  private price: Price | null
  private purchaseDate: Date
  private quantity: Quantity
  private unitId: UnitId
  private threshold: Quantity | null
  private storageLocation: StorageLocation
  private expiryInfo: ExpiryInfo
  private readonly createdAt: Date
  private updatedAt: Date
  private deletedAt: Date | null

  constructor(params: {
    id: IngredientId
    userId: string
    name: IngredientName
    categoryId: CategoryId
    memo?: Memo | null
    price?: Price | null
    purchaseDate: Date
    quantity: Quantity
    unitId: UnitId
    threshold?: Quantity | null
    storageLocation: StorageLocation
    expiryInfo: ExpiryInfo
    createdAt?: Date
    updatedAt?: Date
    deletedAt?: Date | null
  }) {
    this.id = params.id
    this.userId = params.userId
    this.name = params.name
    this.categoryId = params.categoryId
    this.memo = params.memo ?? null
    this.price = params.price ?? null
    this.purchaseDate = params.purchaseDate
    this.quantity = params.quantity
    this.unitId = params.unitId
    this.threshold = params.threshold ?? null
    this.storageLocation = params.storageLocation
    this.expiryInfo = params.expiryInfo
    this.createdAt = params.createdAt ?? new Date()
    this.updatedAt = params.updatedAt ?? new Date()
    this.deletedAt = params.deletedAt ?? null
  }

  /**
   * IDを取得
   */
  getId(): IngredientId {
    return this.id
  }

  /**
   * ユーザーIDを取得
   */
  getUserId(): string {
    return this.userId
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
   * 在庫閾値を取得
   */
  getThreshold(): Quantity | null {
    return this.threshold
  }

  /**
   * 保存場所を取得
   */
  getStorageLocation(): StorageLocation {
    return this.storageLocation
  }

  /**
   * 賞味期限情報を取得
   */
  getExpiryInfo(): ExpiryInfo {
    return this.expiryInfo
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
    return this.quantity.getValue() > 0
  }

  /**
   * 在庫を消費
   * @param consumeQuantity 消費する数量
   * @throws {BusinessRuleException} 在庫が不足している場合
   */
  consume(consumeQuantity: Quantity): void {
    if (this.quantity.getValue() < consumeQuantity.getValue()) {
      throw new BusinessRuleException('在庫が不足しています')
    }

    this.quantity = new Quantity(this.quantity.getValue() - consumeQuantity.getValue())
    this.updateTimestamp()
  }

  /**
   * 在庫を補充
   * @param addQuantity 補充する数量
   */
  replenish(addQuantity: Quantity): void {
    this.quantity = new Quantity(this.quantity.getValue() + addQuantity.getValue())
    this.updateTimestamp()
  }

  /**
   * 在庫を調整
   * @param newQuantity 新しい数量
   */
  adjustQuantity(newQuantity: Quantity): void {
    this.quantity = newQuantity
    this.updateTimestamp()
  }

  /**
   * 名前を更新
   * @param newName 新しい名前
   */
  updateName(newName: IngredientName): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('削除済みの食材は更新できません')
    }
    this.name = newName
    this.updateTimestamp()
  }

  /**
   * カテゴリーを更新
   * @param newCategoryId 新しいカテゴリーID
   */
  updateCategory(newCategoryId: CategoryId): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('削除済みの食材は更新できません')
    }
    this.categoryId = newCategoryId
    this.updateTimestamp()
  }

  /**
   * メモを更新
   * @param newMemo 新しいメモ
   */
  updateMemo(newMemo: Memo | null): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('削除済みの食材は更新できません')
    }
    this.memo = newMemo
    this.updateTimestamp()
  }

  /**
   * 価格を更新
   * @param newPrice 新しい価格
   */
  updatePrice(newPrice: Price | null): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('削除済みの食材は更新できません')
    }
    this.price = newPrice
    this.updateTimestamp()
  }

  /**
   * 保存場所を更新
   * @param newStorageLocation 新しい保存場所
   */
  updateStorageLocation(newStorageLocation: StorageLocation): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('削除済みの食材は更新できません')
    }
    this.storageLocation = newStorageLocation
    this.updateTimestamp()
  }

  /**
   * 賞味期限情報を更新
   * @param newExpiryInfo 新しい賞味期限情報
   */
  updateExpiryInfo(newExpiryInfo: ExpiryInfo): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('削除済みの食材は更新できません')
    }
    this.expiryInfo = newExpiryInfo
    this.updateTimestamp()
  }

  /**
   * 期限切れかどうか
   */
  isExpired(): boolean {
    return this.expiryInfo.isExpired()
  }

  /**
   * 賞味期限切れかどうか
   */
  isBestBeforeExpired(): boolean {
    return this.expiryInfo.isBestBeforeExpired()
  }

  /**
   * 論理削除
   */
  delete(): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('すでに削除されています')
    }
    this.deletedAt = new Date()
    this.updateTimestamp()
  }

  /**
   * 更新日時を更新
   */
  private updateTimestamp(): void {
    this.updatedAt = new Date()
  }
}
