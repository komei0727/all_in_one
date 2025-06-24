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
    price: null,
    purchaseDate: now,
    quantity: 1,
    unitId: 'test-unit-id',
    threshold: null,
    storageLocationType: 'REFRIGERATED',
    storageLocationDetail: '冷蔵庫',
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
    createTestCategory({ id: 'cat12345678', name: '野菜', displayOrder: 1 }),
    createTestCategory({ id: 'cat23456789', name: '肉・魚', displayOrder: 2 }),
    createTestCategory({ id: 'cat34567890', name: '調味料', displayOrder: 3 }),
  ]

  const units = [
    createTestUnit({ id: 'unit12345678', name: '個', symbol: '個', type: 'COUNT' }),
    createTestUnit({ id: 'unit23456789', name: 'グラム', symbol: 'g', type: 'WEIGHT' }),
    createTestUnit({ id: 'unit34567890', name: 'ミリリットル', symbol: 'ml', type: 'VOLUME' }),
  ]

  const ingredients = [
    createTestIngredient({
      id: 'ing12345678',
      name: 'トマト',
      categoryId: 'cat12345678',
      unitId: 'unit12345678',
      quantity: 5,
    }),
    createTestIngredient({
      id: 'ing23456789',
      name: '鶏肉',
      categoryId: 'cat23456789',
      unitId: 'unit23456789',
      quantity: 300,
    }),
    createTestIngredient({
      id: 'ing34567890',
      name: '醤油',
      categoryId: 'cat34567890',
      unitId: 'unit34567890',
      quantity: 500,
    }),
  ]

  return { categories, units, ingredients }
}
