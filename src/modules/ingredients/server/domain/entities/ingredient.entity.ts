import { BusinessRuleException } from '../exceptions/business-rule.exception'
import {
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
export class Ingredient {
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
    if (this.ingredientStock.getQuantity() < quantity) {
      throw new BusinessRuleException('在庫が不足しています')
    }
    this.ingredientStock = this.ingredientStock.subtract(quantity)
    this.updateTimestamp()
  }

  /**
   * 在庫を補充
   * @param quantity 補充する数量
   */
  replenish(quantity: number): void {
    this.ingredientStock = this.ingredientStock.add(quantity)
    this.updateTimestamp()
  }

  /**
   * 名前を更新
   * @param newName 新しい名前
   * @param userId 更新者ID
   */
  updateName(newName: IngredientName, userId?: string): void {
    this.checkUpdatePermission(userId)
    this.name = newName
    this.updateTimestamp()
  }

  /**
   * カテゴリーを更新
   * @param newCategoryId 新しいカテゴリーID
   * @param userId 更新者ID
   */
  updateCategory(newCategoryId: CategoryId, userId?: string): void {
    this.checkUpdatePermission(userId)
    this.categoryId = newCategoryId
    this.updateTimestamp()
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
   */
  delete(userId?: string): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('すでに削除されています')
    }
    if (userId && userId !== this.userId) {
      throw new BusinessRuleException('他のユーザーの食材は削除できません')
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
