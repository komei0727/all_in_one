import type { Category, Unit, Ingredient, IngredientStock } from '../../src/generated/prisma-test'

/**
 * テストデータファクトリー
 * 再利用可能なテストデータの生成
 */

// カテゴリーのファクトリー
export function createTestCategory(overrides?: Partial<Category>): Category {
  return {
    id: 'test-category-id',
    name: 'テストカテゴリー',
    description: 'テスト用のカテゴリー',
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// 単位のファクトリー
export function createTestUnit(overrides?: Partial<Unit>): Unit {
  return {
    id: 'test-unit-id',
    name: 'テスト単位',
    symbol: 'test',
    type: 'COUNT',
    description: 'テスト用の単位',
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// 食材のファクトリー
export function createTestIngredient(overrides?: Partial<Ingredient>): Ingredient {
  return {
    id: 'test-ingredient-id',
    name: 'テスト食材',
    categoryId: 'test-category-id',
    memo: 'テスト用のメモ',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdBy: 'test-user',
    updatedBy: 'test-user',
    ...overrides,
  }
}

// 在庫のファクトリー
export function createTestIngredientStock(overrides?: Partial<IngredientStock>): IngredientStock {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return {
    id: 'test-stock-id',
    ingredientId: 'test-ingredient-id',
    quantity: 100,
    unitId: 'test-unit-id',
    storageLocationType: 'REFRIGERATED',
    storageLocationDetail: '冷蔵庫の野菜室',
    bestBeforeDate: tomorrow,
    expiryDate: tomorrow,
    purchaseDate: now,
    price: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdBy: 'test-user',
    updatedBy: 'test-user',
    ...overrides,
  }
}

// テストデータセットの生成
export interface TestDataSet {
  categories: Category[]
  units: Unit[]
  ingredients: Ingredient[]
  stocks: IngredientStock[]
}

export function createTestDataSet(): TestDataSet {
  const categories = [
    createTestCategory({ id: 'cat1', name: '野菜', displayOrder: 1 }),
    createTestCategory({ id: 'cat2', name: '肉・魚', displayOrder: 2 }),
    createTestCategory({ id: 'cat3', name: '調味料', displayOrder: 3 }),
  ]

  const units = [
    createTestUnit({ id: 'unit1', name: '個', symbol: '個', type: 'COUNT' }),
    createTestUnit({ id: 'unit2', name: 'グラム', symbol: 'g', type: 'WEIGHT' }),
    createTestUnit({ id: 'unit3', name: 'ミリリットル', symbol: 'ml', type: 'VOLUME' }),
  ]

  const ingredients = [
    createTestIngredient({ id: 'ing1', name: 'トマト', categoryId: 'cat1' }),
    createTestIngredient({ id: 'ing2', name: '鶏肉', categoryId: 'cat2' }),
    createTestIngredient({ id: 'ing3', name: '醤油', categoryId: 'cat3' }),
  ]

  const stocks = [
    createTestIngredientStock({
      id: 'stock1',
      ingredientId: 'ing1',
      quantity: 5,
      unitId: 'unit1',
    }),
    createTestIngredientStock({
      id: 'stock2',
      ingredientId: 'ing2',
      quantity: 300,
      unitId: 'unit2',
    }),
    createTestIngredientStock({
      id: 'stock3',
      ingredientId: 'ing3',
      quantity: 500,
      unitId: 'unit3',
    }),
  ]

  return { categories, units, ingredients, stocks }
}
