import { IngredientStock } from '@/modules/ingredients/server/domain/entities/ingredient-stock.entity'
import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import {
  IngredientId,
  IngredientName,
  CategoryId,
  Memo,
  StorageType,
} from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers, faker } from '../faker.config'
import { IngredientStockBuilder } from './ingredient-stock.builder'

interface IngredientProps {
  id: IngredientId
  name: IngredientName
  categoryId: CategoryId
  memo: Memo | null
  currentStock: IngredientStock | null
}

/**
 * Ingredient エンティティのテストデータビルダー
 */
export class IngredientBuilder extends BaseBuilder<IngredientProps, Ingredient> {
  constructor() {
    super()
    // デフォルト値を設定
    this.props = {
      id: IngredientId.generate(),
      name: new IngredientName(testDataHelpers.ingredientName()),
      categoryId: new CategoryId(testDataHelpers.cuid()),
      memo: null,
      currentStock: null,
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
   * 在庫を設定
   */
  withStock(stock: IngredientStock | null): this {
    return this.with('currentStock', stock)
  }

  /**
   * デフォルトの在庫を設定
   */
  withDefaultStock(): this {
    const stock = new IngredientStockBuilder().build()
    return this.with('currentStock', stock)
  }

  /**
   * 期限切れの在庫を設定
   */
  withExpiredStock(): this {
    const stock = new IngredientStockBuilder()
      .withPastBestBeforeDate() // 賞味期限を過去に設定
      .withExpiryDate(null) // 消費期限はなし
      .build()
    return this.with('currentStock', stock)
  }

  /**
   * 在庫なしの状態を設定
   */
  withoutStock(): this {
    return this.with('currentStock', null)
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
    name: string
    categoryId: string
    memo?: string
    stock?: {
      quantity: number
      unitId: string
      storageType: string
      storageDetail?: string
      bestBeforeDate?: string
      expiryDate?: string
      purchaseDate: string
      price?: number
    }
  }>
): Ingredient => {
  const builder = new IngredientBuilder()

  if (overrides?.id) {
    builder.withId(overrides.id)
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
  if (overrides?.stock) {
    const stockBuilder = new IngredientStockBuilder()
    if (overrides.stock.quantity !== undefined) {
      stockBuilder.withQuantity(overrides.stock.quantity)
    }
    if (overrides.stock.unitId) {
      stockBuilder.withUnitId(overrides.stock.unitId)
    }
    if (overrides.stock.storageType) {
      stockBuilder.withStorageType(overrides.stock.storageType as StorageType)
    }
    if (overrides.stock.storageDetail) {
      stockBuilder.withStorageDetail(overrides.stock.storageDetail)
    }
    if (overrides.stock.bestBeforeDate) {
      stockBuilder.withBestBeforeDate(new Date(overrides.stock.bestBeforeDate))
    }
    if (overrides.stock.expiryDate) {
      stockBuilder.withExpiryDate(new Date(overrides.stock.expiryDate))
    }
    if (overrides.stock.purchaseDate) {
      stockBuilder.withPurchaseDate(new Date(overrides.stock.purchaseDate))
    }
    if (overrides.stock.price !== undefined) {
      stockBuilder.withPrice(overrides.stock.price)
    }
    builder.withStock(stockBuilder.build())
  }

  return builder.build()
}
