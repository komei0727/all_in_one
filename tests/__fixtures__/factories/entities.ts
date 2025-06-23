import { Category } from '@/modules/ingredients/server/domain/entities/category.entity'
import { IngredientStock } from '@/modules/ingredients/server/domain/entities/ingredient-stock.entity'
import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import { Unit } from '@/modules/ingredients/server/domain/entities/unit.entity'
import {
  StorageType,
  CategoryId,
  UnitId,
  IngredientId,
  IngredientName,
  Memo,
  IngredientStockId,
  Quantity,
  StorageLocation,
  Price,
} from '@/modules/ingredients/server/domain/value-objects'

/**
 * テスト用のカテゴリーを作成する
 */
export const createTestCategory = (
  overrides?: Partial<{
    id: string
    name: string
    displayOrder: number
  }>
): Category => {
  return new Category({
    id: overrides?.id ?? '550e8400-e29b-41d4-a716-446655440000',
    name: overrides?.name ?? '野菜',
    displayOrder: overrides?.displayOrder ?? 1,
  })
}

/**
 * テスト用の単位を作成する
 */
export const createTestUnit = (
  overrides?: Partial<{
    id: string
    name: string
    symbol: string
    displayOrder: number
  }>
): Unit => {
  return new Unit({
    id: overrides?.id ?? '550e8400-e29b-41d4-a716-446655440001',
    name: overrides?.name ?? '個',
    symbol: overrides?.symbol ?? '個',
    displayOrder: overrides?.displayOrder ?? 1,
  })
}

/**
 * テスト用の食材を作成する
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
      storageType: StorageType
      storageDetail?: string
      bestBeforeDate?: string
      expiryDate?: string
      purchaseDate: string
      price?: number
    }
  }>
): Ingredient => {
  let currentStock: IngredientStock | null = null

  if (overrides?.stock) {
    currentStock = new IngredientStock({
      quantity: new Quantity(overrides.stock.quantity),
      unitId: new UnitId(overrides.stock.unitId),
      storageLocation: new StorageLocation(
        overrides.stock.storageType,
        overrides.stock.storageDetail
      ),
      bestBeforeDate: overrides.stock.bestBeforeDate
        ? new Date(overrides.stock.bestBeforeDate)
        : null,
      expiryDate: overrides.stock.expiryDate ? new Date(overrides.stock.expiryDate) : null,
      purchaseDate: new Date(overrides.stock.purchaseDate),
      price: overrides.stock.price ? new Price(overrides.stock.price) : null,
    })
  }

  return new Ingredient({
    id: overrides?.id ? new IngredientId(overrides.id) : IngredientId.generate(),
    name: new IngredientName(overrides?.name ?? 'トマト'),
    categoryId: new CategoryId(overrides?.categoryId ?? '550e8400-e29b-41d4-a716-446655440000'),
    memo: overrides?.memo ? new Memo(overrides.memo) : null,
    currentStock: currentStock,
  })
}

/**
 * テスト用の食材在庫を作成する
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
  return new IngredientStock({
    id: overrides?.id ? new IngredientStockId(overrides.id) : undefined,
    quantity: new Quantity(overrides?.quantity ?? 3),
    unitId: new UnitId(overrides?.unitId ?? '550e8400-e29b-41d4-a716-446655440001'),
    storageLocation: new StorageLocation(
      overrides?.storageType ?? StorageType.REFRIGERATED,
      overrides?.storageDetail
    ),
    bestBeforeDate: overrides?.bestBeforeDate ? new Date(overrides.bestBeforeDate) : null,
    expiryDate: overrides?.expiryDate ? new Date(overrides.expiryDate) : null,
    purchaseDate: new Date(overrides?.purchaseDate ?? '2024-12-20'),
    price: overrides?.price ? new Price(overrides.price) : null,
  })
}
