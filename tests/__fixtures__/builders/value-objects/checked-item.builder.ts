import {
  CheckedItem,
  IngredientId,
  IngredientName,
  StockStatus,
  ExpiryStatus,
} from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers } from '../faker.config'

interface CheckedItemProps {
  ingredientId: IngredientId
  ingredientName: IngredientName
  stockStatus: StockStatus
  expiryStatus: ExpiryStatus
  checkedAt: Date
}

/**
 * CheckedItem 値オブジェクトのテストデータビルダー
 */
export class CheckedItemBuilder extends BaseBuilder<CheckedItemProps, CheckedItem> {
  protected props: CheckedItemProps

  constructor() {
    super()
    // デフォルト値を設定
    this.props = {
      ingredientId: IngredientId.generate(),
      ingredientName: new IngredientName(testDataHelpers.ingredientName()),
      stockStatus: StockStatus.IN_STOCK,
      expiryStatus: ExpiryStatus.FRESH,
      checkedAt: new Date(),
    }
  }

  /**
   * 食材IDを設定
   */
  withIngredientId(id: string | IngredientId): this {
    const ingredientId = typeof id === 'string' ? new IngredientId(id) : id
    return this.with('ingredientId', ingredientId)
  }

  /**
   * 食材名を設定
   */
  withIngredientName(name: string | IngredientName): this {
    const ingredientName = typeof name === 'string' ? new IngredientName(name) : name
    return this.with('ingredientName', ingredientName)
  }

  /**
   * 在庫状態を設定
   */
  withStockStatus(status: StockStatus): this {
    return this.with('stockStatus', status)
  }

  /**
   * 在庫あり状態を設定
   */
  asInStock(): this {
    return this.with('stockStatus', StockStatus.IN_STOCK)
  }

  /**
   * 在庫切れ状態を設定
   */
  asOutOfStock(): this {
    return this.with('stockStatus', StockStatus.OUT_OF_STOCK)
  }

  /**
   * 在庫不足状態を設定
   */
  asLowStock(): this {
    return this.with('stockStatus', StockStatus.LOW_STOCK)
  }

  /**
   * 期限状態を設定
   */
  withExpiryStatus(status: ExpiryStatus): this {
    return this.with('expiryStatus', status)
  }

  /**
   * 新鮮な状態を設定
   */
  asFresh(): this {
    return this.with('expiryStatus', ExpiryStatus.FRESH)
  }

  /**
   * 期限切れ間近状態を設定
   */
  asExpiringSoon(): this {
    return this.with('expiryStatus', ExpiryStatus.EXPIRING_SOON)
  }

  /**
   * 期限切れ状態を設定
   */
  asExpired(): this {
    return this.with('expiryStatus', ExpiryStatus.EXPIRED)
  }

  /**
   * 確認日時を設定
   */
  withCheckedAt(date: Date): this {
    return this.with('checkedAt', date)
  }

  /**
   * 現在時刻で確認
   */
  checkedNow(): this {
    return this.with('checkedAt', new Date())
  }

  build(): CheckedItem {
    return CheckedItem.create({
      ingredientId: this.props.ingredientId,
      ingredientName: this.props.ingredientName,
      stockStatus: this.props.stockStatus,
      expiryStatus: this.props.expiryStatus,
      checkedAt: this.props.checkedAt,
    })
  }
}
