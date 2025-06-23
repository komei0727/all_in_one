import { IngredientStock } from '@/modules/ingredients/server/domain/entities/ingredient-stock.entity'
import {
  IngredientStockId,
  Quantity,
  UnitId,
  StorageLocation,
  StorageType,
  Price,
} from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers } from '../faker.config'

interface IngredientStockProps {
  id?: IngredientStockId
  quantity: Quantity
  unitId: UnitId
  storageLocation: StorageLocation
  bestBeforeDate: Date | null
  expiryDate: Date | null
  purchaseDate: Date
  price: Price | null
}

/**
 * IngredientStock エンティティのテストデータビルダー
 */
export class IngredientStockBuilder extends BaseBuilder<IngredientStockProps, IngredientStock> {
  constructor() {
    super()
    // デフォルト値を設定
    this.props = {
      quantity: new Quantity(testDataHelpers.quantity()),
      unitId: new UnitId(testDataHelpers.cuid()),
      storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      bestBeforeDate: testDataHelpers.futureDate(),
      expiryDate: null,
      purchaseDate: new Date(),
      price: new Price(testDataHelpers.price()),
    }
  }

  /**
   * IDを設定
   */
  withId(id: string | IngredientStockId): this {
    const stockId = typeof id === 'string' ? new IngredientStockId(id) : id
    return this.with('id', stockId)
  }

  /**
   * 数量を設定
   */
  withQuantity(quantity: number | Quantity): this {
    const qty = typeof quantity === 'number' ? new Quantity(quantity) : quantity
    return this.with('quantity', qty)
  }

  /**
   * 単位IDを設定
   */
  withUnitId(unitId: string | UnitId): this {
    const id = typeof unitId === 'string' ? new UnitId(unitId) : unitId
    return this.with('unitId', id)
  }

  /**
   * 保存場所を設定
   */
  withStorageLocation(location: StorageLocation): this {
    return this.with('storageLocation', location)
  }

  /**
   * 保存タイプを設定
   */
  withStorageType(type: StorageType, detail?: string): this {
    return this.with('storageLocation', new StorageLocation(type, detail))
  }

  /**
   * 冷蔵保管を設定
   */
  withRefrigeratedStorage(detail?: string): this {
    return this.with('storageLocation', new StorageLocation(StorageType.REFRIGERATED, detail))
  }

  /**
   * 冷凍保管を設定
   */
  withFrozenStorage(detail?: string): this {
    return this.with('storageLocation', new StorageLocation(StorageType.FROZEN, detail))
  }

  /**
   * 常温保管を設定
   */
  withRoomTemperatureStorage(detail?: string): this {
    return this.with('storageLocation', new StorageLocation(StorageType.ROOM_TEMPERATURE, detail))
  }

  /**
   * 保存詳細を設定
   */
  withStorageDetail(detail: string): this {
    const current = this.props.storageLocation as StorageLocation
    return this.with('storageLocation', new StorageLocation(current.getType(), detail))
  }

  /**
   * 賞味期限を設定
   */
  withBestBeforeDate(date: Date | null): this {
    return this.with('bestBeforeDate', date)
  }

  /**
   * 将来の賞味期限を設定（デフォルトは7日後）
   */
  withFutureBestBeforeDate(days: number = 7): this {
    return this.with('bestBeforeDate', testDataHelpers.daysFromNow(days))
  }

  /**
   * 過去の賞味期限を設定（期限切れ）
   */
  withPastBestBeforeDate(days: number = -7): this {
    return this.with('bestBeforeDate', testDataHelpers.daysFromNow(days))
  }

  /**
   * 消費期限を設定
   */
  withExpiryDate(date: Date | null): this {
    return this.with('expiryDate', date)
  }

  /**
   * 将来の消費期限を設定（デフォルトは3日後）
   */
  withFutureExpiryDate(days: number = 3): this {
    return this.with('expiryDate', testDataHelpers.daysFromNow(days))
  }

  /**
   * 過去の消費期限を設定（期限切れ）
   */
  withPastExpiryDate(days: number = -3): this {
    return this.with('expiryDate', testDataHelpers.daysFromNow(days))
  }

  /**
   * 購入日を設定
   */
  withPurchaseDate(date: Date): this {
    return this.with('purchaseDate', date)
  }

  /**
   * 今日を購入日として設定
   */
  withPurchasedToday(): this {
    return this.with('purchaseDate', new Date())
  }

  /**
   * 過去の購入日を設定
   */
  withPurchasedDaysAgo(days: number): this {
    return this.with('purchaseDate', testDataHelpers.daysFromNow(-days))
  }

  /**
   * 価格を設定
   */
  withPrice(price: number | Price | null): this {
    const priceVo = typeof price === 'number' ? new Price(price) : price
    return this.with('price', priceVo)
  }

  /**
   * ランダムな価格を設定
   */
  withRandomPrice(): this {
    return this.with('price', new Price(testDataHelpers.price()))
  }

  /**
   * 価格なしを設定
   */
  withoutPrice(): this {
    return this.with('price', null)
  }

  build(): IngredientStock {
    return new IngredientStock(this.props as IngredientStockProps)
  }
}

/**
 * 既存のファクトリー関数との互換性を保つためのヘルパー関数
 */
export const createTestIngredientStock = (
  overrides?: Partial<{
    id: string
    ingredientId: string
    quantity: number
    unitId: string
    storageType: StorageType
    storageDetail?: string
    bestBeforeDate?: string
    expiryDate?: string
    purchaseDate: string
    price?: number
  }>
): IngredientStock => {
  const builder = new IngredientStockBuilder()

  if (overrides?.id) {
    builder.withId(overrides.id)
  }
  if (overrides?.quantity !== undefined) {
    builder.withQuantity(overrides.quantity)
  }
  if (overrides?.unitId) {
    builder.withUnitId(overrides.unitId)
  }
  if (overrides?.storageType) {
    builder.withStorageType(overrides.storageType, overrides.storageDetail)
  }
  if (overrides?.bestBeforeDate) {
    builder.withBestBeforeDate(new Date(overrides.bestBeforeDate))
  }
  if (overrides?.expiryDate) {
    builder.withExpiryDate(new Date(overrides.expiryDate))
  }
  if (overrides?.purchaseDate) {
    builder.withPurchaseDate(new Date(overrides.purchaseDate))
  }
  if (overrides?.price !== undefined) {
    builder.withPrice(overrides.price)
  }

  return builder.build()
}
