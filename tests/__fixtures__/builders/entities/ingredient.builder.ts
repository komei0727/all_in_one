import { createId } from '@paralleldrive/cuid2'

import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import {
  IngredientId,
  IngredientName,
  CategoryId,
  Memo,
  Price,
  Quantity,
  UnitId,
  StorageLocation,
  StorageType,
  ExpiryInfo,
} from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers, faker } from '../faker.config'

interface IngredientProps {
  id: IngredientId
  userId: string
  name: IngredientName
  categoryId: CategoryId
  memo: Memo | null
  price: Price | null
  purchaseDate: Date
  quantity: Quantity
  unitId: UnitId
  threshold: Quantity | null
  storageLocation: StorageLocation
  expiryInfo: ExpiryInfo
}

/**
 * Ingredient エンティティのテストデータビルダー
 */
export class IngredientBuilder extends BaseBuilder<IngredientProps, Ingredient> {
  constructor() {
    super()
    // デフォルト値を設定
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(now.getDate() + 7)

    this.props = {
      id: IngredientId.generate(),
      userId: createId(),
      name: new IngredientName(testDataHelpers.ingredientName()),
      categoryId: new CategoryId(createId()),
      memo: null,
      price: new Price(faker.number.int({ min: 100, max: 1000 })),
      purchaseDate: now,
      quantity: new Quantity(faker.number.int({ min: 1, max: 10 })),
      unitId: new UnitId(createId()),
      threshold: new Quantity(1),
      storageLocation: new StorageLocation(StorageType.REFRIGERATED, '冷蔵室'),
      expiryInfo: new ExpiryInfo({
        bestBeforeDate: futureDate,
        useByDate: null,
      }),
    }
  }

  /**
   * IDを設定
   */
  withId(id: string | IngredientId): this {
    const ingredientId = typeof id === 'string' ? new IngredientId(id) : id
    return this.with('id', ingredientId)
  }

  /**
   * 新規生成されたIDを設定
   */
  withGeneratedId(): this {
    return this.with('id', IngredientId.generate())
  }

  /**
   * ユーザーIDを設定
   */
  withUserId(userId: string): this {
    return this.with('userId', userId)
  }

  /**
   * 食材名を設定
   */
  withName(name: string | IngredientName): this {
    const ingredientName = typeof name === 'string' ? new IngredientName(name) : name
    return this.with('name', ingredientName)
  }

  /**
   * ランダムな食材名を設定
   */
  withRandomName(): this {
    return this.with('name', new IngredientName(testDataHelpers.ingredientName()))
  }

  /**
   * カテゴリーIDを設定
   */
  withCategoryId(categoryId: string | CategoryId): this {
    const id = typeof categoryId === 'string' ? new CategoryId(categoryId) : categoryId
    return this.with('categoryId', id)
  }

  /**
   * メモを設定
   */
  withMemo(memo: string | Memo | null): this {
    const memoVo = typeof memo === 'string' ? new Memo(memo) : memo
    return this.with('memo', memoVo)
  }

  /**
   * メモなしを設定
   */
  withoutMemo(): this {
    return this.with('memo', null)
  }

  /**
   * ランダムなメモを設定
   */
  withRandomMemo(): this {
    return this.with('memo', new Memo(faker.lorem.sentence()))
  }

  /**
   * 価格を設定
   */
  withPrice(price: number | Price | null): this {
    const priceVo = typeof price === 'number' ? new Price(price) : price
    return this.with('price', priceVo)
  }

  /**
   * 購入日を設定
   */
  withPurchaseDate(date: Date): this {
    return this.with('purchaseDate', date)
  }

  /**
   * 在庫数量を設定
   */
  withQuantity(quantity: number | Quantity): this {
    const quantityVo = typeof quantity === 'number' ? new Quantity(quantity) : quantity
    return this.with('quantity', quantityVo)
  }

  /**
   * 単位IDを設定
   */
  withUnitId(unitId: string | UnitId): this {
    const id = typeof unitId === 'string' ? new UnitId(unitId) : unitId
    return this.with('unitId', id)
  }

  /**
   * 閾値を設定
   */
  withThreshold(threshold: number | Quantity | null): this {
    const thresholdVo = typeof threshold === 'number' ? new Quantity(threshold) : threshold
    return this.with('threshold', thresholdVo)
  }

  /**
   * 保存場所を設定
   */
  withStorageLocation(storageLocation: StorageLocation): this {
    return this.with('storageLocation', storageLocation)
  }

  /**
   * 保存場所を設定（タイプと詳細指定）
   */
  withStorageLocationDetails(type: StorageType, detail?: string): this {
    return this.with('storageLocation', new StorageLocation(type, detail))
  }

  /**
   * 期限情報を設定
   */
  withExpiryInfo(expiryInfo: ExpiryInfo): this {
    return this.with('expiryInfo', expiryInfo)
  }

  /**
   * 期限切れの食材を設定
   */
  withExpiredFood(): this {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)

    return this.with(
      'expiryInfo',
      new ExpiryInfo({
        bestBeforeDate: pastDate,
        useByDate: null,
      })
    )
  }

  /**
   * 期限なしの食材を設定
   */
  withoutExpiry(): this {
    return this.with(
      'expiryInfo',
      new ExpiryInfo({
        bestBeforeDate: null,
        useByDate: null,
      })
    )
  }

  /**
   * 今日購入した食材を設定
   */
  withPurchasedToday(): this {
    return this.with('purchaseDate', new Date())
  }

  /**
   * 価格なしの食材を設定
   */
  withoutPrice(): this {
    return this.with('price', null)
  }

  /**
   * 指定日数後の賞味期限を設定
   */
  withFutureBestBeforeDate(days: number): this {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    const currentExpiry = this.props.expiryInfo as ExpiryInfo
    return this.with(
      'expiryInfo',
      new ExpiryInfo({
        bestBeforeDate: futureDate,
        useByDate: currentExpiry?.getUseByDate() || null,
      })
    )
  }

  /**
   * 指定日数後の消費期限を設定
   */
  withFutureUseByDate(days: number): this {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    const currentExpiry = this.props.expiryInfo as ExpiryInfo
    return this.with(
      'expiryInfo',
      new ExpiryInfo({
        bestBeforeDate: currentExpiry?.getBestBeforeDate() || null,
        useByDate: futureDate,
      })
    )
  }

  /**
   * 冷蔵保存の食材を設定
   */
  withRefrigeratedStorage(detail?: string): this {
    return this.withStorageLocationDetails(StorageType.REFRIGERATED, detail)
  }

  /**
   * 冷凍保存の食材を設定
   */
  withFrozenStorage(detail?: string): this {
    return this.withStorageLocationDetails(StorageType.FROZEN, detail)
  }

  /**
   * 常温保存の食材を設定
   */
  withRoomTemperatureStorage(detail?: string): this {
    return this.withStorageLocationDetails(StorageType.ROOM_TEMPERATURE, detail)
  }

  build(): Ingredient {
    return new Ingredient(this.props as IngredientProps)
  }
}

/**
 * 既存のファクトリー関数との互換性を保つためのヘルパー関数
 */
export const createTestIngredient = (
  overrides?: Partial<{
    id: string
    userId: string
    name: string
    categoryId: string
    memo?: string
    price?: number
    purchaseDate: string
    quantity: number
    unitId: string
    threshold?: number
    storageType: string
    storageDetail?: string
    bestBeforeDate?: string
    useByDate?: string
  }>
): Ingredient => {
  const builder = new IngredientBuilder()

  if (overrides?.id) {
    builder.withId(overrides.id)
  }
  if (overrides?.userId) {
    builder.withUserId(overrides.userId)
  }
  if (overrides?.name) {
    builder.withName(overrides.name)
  }
  if (overrides?.categoryId) {
    builder.withCategoryId(overrides.categoryId)
  }
  if (overrides?.memo) {
    builder.withMemo(overrides.memo)
  }
  if (overrides?.price !== undefined) {
    builder.withPrice(overrides.price)
  }
  if (overrides?.purchaseDate) {
    builder.withPurchaseDate(new Date(overrides.purchaseDate))
  }
  if (overrides?.quantity !== undefined) {
    builder.withQuantity(overrides.quantity)
  }
  if (overrides?.unitId) {
    builder.withUnitId(overrides.unitId)
  }
  if (overrides?.threshold !== undefined) {
    builder.withThreshold(overrides.threshold)
  }
  if (overrides?.storageType) {
    builder.withStorageLocationDetails(
      overrides.storageType as StorageType,
      overrides.storageDetail
    )
  }
  if (overrides?.bestBeforeDate || overrides?.useByDate) {
    builder.withExpiryInfo(
      new ExpiryInfo({
        bestBeforeDate: overrides.bestBeforeDate ? new Date(overrides.bestBeforeDate) : null,
        useByDate: overrides.useByDate ? new Date(overrides.useByDate) : null,
      })
    )
  }

  return builder.build()
}
