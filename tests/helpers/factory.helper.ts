import type { Category, Unit, Ingredient } from '../../src/generated/prisma-test'

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
  const now = new Date()
  return {
    id: 'test-ingredient-id',
    userId: 'test-user-id',
    name: 'テスト食材',
    categoryId: 'test-category-id',
    memo: 'テスト用のメモ',
    purchaseDate: now,
    price: null,
    quantity: 1,
    unitId: 'test-unit-id',
    threshold: null,
    storageLocationType: 'REFRIGERATED',
    storageLocationDetail: null,
    bestBeforeDate: null,
    useByDate: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

// テストデータセットの生成
export interface TestDataSet {
  categories: Category[]
  units: Unit[]
  ingredients: Ingredient[]
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
    createTestIngredient({
      id: 'ing1',
      name: 'トマト',
      categoryId: 'cat1',
      userId: 'user1',
      quantity: 5,
      unitId: 'unit1',
    }),
    createTestIngredient({
      id: 'ing2',
      name: '鶏肉',
      categoryId: 'cat2',
      userId: 'user1',
      quantity: 300,
      unitId: 'unit2',
    }),
    createTestIngredient({
      id: 'ing3',
      name: '醤油',
      categoryId: 'cat3',
      userId: 'user1',
      quantity: 500,
      unitId: 'unit3',
    }),
  ]

  return { categories, units, ingredients }
}
