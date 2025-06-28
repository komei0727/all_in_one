import { ValueObject } from '@/modules/shared/server/domain/value-objects'

import type { ExpiryStatus } from './expiry-status.vo'
import type { IngredientId } from './ingredient-id.vo'
import type { IngredientName } from './ingredient-name.vo'
import type { StockStatus } from './stock-status.vo'

/**
 * 確認済み食材の情報を表す値オブジェクト
 */
export class CheckedItem extends ValueObject<{
  ingredientId: IngredientId
  ingredientName: IngredientName
  checkedAt: Date
  stockStatus: StockStatus
  expiryStatus: ExpiryStatus
}> {
  /**
   * 確認済み食材を作成
   */
  static create(params: {
    ingredientId: IngredientId
    ingredientName: IngredientName
    stockStatus: StockStatus
    expiryStatus: ExpiryStatus
    checkedAt?: Date
  }): CheckedItem {
    return new CheckedItem({
      ingredientId: params.ingredientId,
      ingredientName: params.ingredientName,
      checkedAt: params.checkedAt || new Date(),
      stockStatus: params.stockStatus,
      expiryStatus: params.expiryStatus,
    })
  }

  /**
   * 値のバリデーション
   */
  protected validate(value: {
    ingredientId: IngredientId
    ingredientName: IngredientName
    checkedAt: Date
    stockStatus: StockStatus
    expiryStatus: ExpiryStatus
  }): void {
    if (!value.ingredientId) {
      throw new Error('食材IDは必須です')
    }
    if (!value.ingredientName) {
      throw new Error('食材名は必須です')
    }
    if (!value.checkedAt) {
      throw new Error('確認時刻は必須です')
    }
    if (!value.stockStatus) {
      throw new Error('在庫状態は必須です')
    }
    if (!value.expiryStatus) {
      throw new Error('期限状態は必須です')
    }
  }

  /**
   * 食材IDを取得
   */
  getIngredientId(): IngredientId {
    return this.value.ingredientId
  }

  /**
   * 食材名を取得
   */
  getIngredientName(): IngredientName {
    return this.value.ingredientName
  }

  /**
   * 確認時刻を取得
   */
  getCheckedAt(): Date {
    return this.value.checkedAt
  }

  /**
   * 在庫状態を取得
   */
  getStockStatus(): StockStatus {
    return this.value.stockStatus
  }

  /**
   * 期限状態を取得
   */
  getExpiryStatus(): ExpiryStatus {
    return this.value.expiryStatus
  }

  /**
   * 注意が必要かどうかを判定
   * 在庫少、在庫切れ、期限切れ間近、期限切れの場合はtrue
   */
  needsAttention(): boolean {
    return this.value.stockStatus.needsReplenishment() || this.value.expiryStatus.needsAttention()
  }

  /**
   * 優先度を取得（在庫状態と期限状態の優先度の合計）
   */
  getPriority(): number {
    return this.value.stockStatus.getPriority() + this.value.expiryStatus.getPriority()
  }

  /**
   * JSONオブジェクトに変換
   */
  toJSON(): {
    ingredientId: string
    ingredientName: string
    checkedAt: string
    stockStatus: string
    expiryStatus: string
  } {
    return {
      ingredientId: this.value.ingredientId.getValue(),
      ingredientName: this.value.ingredientName.getValue(),
      checkedAt: this.value.checkedAt.toISOString(),
      stockStatus: this.value.stockStatus.getValue(),
      expiryStatus: this.value.expiryStatus.getValue(),
    }
  }

  /**
   * 等価性の判定（食材IDと確認時刻で判定）
   */
  equals(other: CheckedItem | null | undefined): boolean {
    if (!other || !(other instanceof CheckedItem)) {
      return false
    }

    return (
      this.value.ingredientId.equals(other.value.ingredientId) &&
      this.value.checkedAt.getTime() === other.value.checkedAt.getTime()
    )
  }
}
