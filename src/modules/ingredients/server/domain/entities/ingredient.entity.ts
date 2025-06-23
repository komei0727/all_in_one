import { BusinessRuleException } from '../exceptions/business-rule.exception'
import { IngredientId, IngredientName, CategoryId, Memo, Quantity } from '../value-objects'
import { IngredientStock } from './ingredient-stock.entity'

/**
 * 食材エンティティ
 * 食材の基本情報と在庫情報を管理する集約ルート
 */
export class Ingredient {
  private readonly id: IngredientId
  private name: IngredientName
  private categoryId: CategoryId
  private memo: Memo | null
  private currentStock: IngredientStock | null
  private readonly createdAt: Date
  private updatedAt: Date
  private deletedAt: Date | null
  private createdBy: string | null
  private updatedBy: string | null

  constructor(params: {
    id: IngredientId
    name: IngredientName
    categoryId: CategoryId
    memo?: Memo | null
    currentStock?: IngredientStock | null
    createdAt?: Date
    updatedAt?: Date
    deletedAt?: Date | null
    createdBy?: string | null
    updatedBy?: string | null
  }) {
    this.id = params.id
    this.name = params.name
    this.categoryId = params.categoryId
    this.memo = params.memo ?? null
    this.currentStock = params.currentStock ?? null
    this.createdAt = params.createdAt ?? new Date()
    this.updatedAt = params.updatedAt ?? new Date()
    this.deletedAt = params.deletedAt ?? null
    this.createdBy = params.createdBy ?? null
    this.updatedBy = params.updatedBy ?? null
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
   * 現在の在庫を取得
   */
  getCurrentStock(): IngredientStock | null {
    return this.currentStock
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
   * 在庫があるかどうか
   */
  isInStock(): boolean {
    return this.currentStock !== null
  }

  /**
   * 在庫を設定
   * @param stock 新しい在庫情報
   * @param userId 更新者ID
   */
  setStock(stock: IngredientStock, userId?: string): void {
    this.currentStock = stock
    this.updateTimestamp(userId)
  }

  /**
   * 在庫を削除
   * @param userId 更新者ID
   */
  removeStock(userId?: string): void {
    this.currentStock = null
    this.updateTimestamp(userId)
  }

  /**
   * 在庫を消費
   * @param quantity 消費する数量
   * @param userId 更新者ID
   * @throws {DomainException} 在庫がない場合
   * @throws {DomainException} 在庫が不足している場合
   */
  consume(quantity: Quantity, userId?: string): void {
    if (!this.currentStock) {
      throw new BusinessRuleException('在庫がありません')
    }

    try {
      this.currentStock.consume(quantity, userId)
      this.updateTimestamp(userId)
    } catch (error) {
      throw new BusinessRuleException('在庫が不足しています')
    }
  }

  /**
   * 名前を更新
   * @param newName 新しい名前
   * @param userId 更新者ID
   */
  updateName(newName: IngredientName, userId?: string): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('削除済みの食材は更新できません')
    }
    this.name = newName
    this.updateTimestamp(userId)
  }

  /**
   * カテゴリーを更新
   * @param newCategoryId 新しいカテゴリーID
   * @param userId 更新者ID
   */
  updateCategory(newCategoryId: CategoryId, userId?: string): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('削除済みの食材は更新できません')
    }
    this.categoryId = newCategoryId
    this.updateTimestamp(userId)
  }

  /**
   * メモを更新
   * @param newMemo 新しいメモ
   * @param userId 更新者ID
   */
  updateMemo(newMemo: Memo | null, userId?: string): void {
    if (this.isDeleted()) {
      throw new BusinessRuleException('削除済みの食材は更新できません')
    }
    this.memo = newMemo
    this.updateTimestamp(userId)
  }

  /**
   * 期限切れかどうか
   */
  isExpired(): boolean {
    if (!this.currentStock) {
      return false
    }
    return this.currentStock.isExpired()
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
    this.updateTimestamp(userId)
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
