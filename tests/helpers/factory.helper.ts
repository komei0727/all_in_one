import { testDataHelpers } from '../__fixtures__/builders/faker.config'

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
  // プレフィックス付きCUIDを生成
  const categoryIds = [
    testDataHelpers.categoryId(),
    testDataHelpers.categoryId(),
    testDataHelpers.categoryId(),
  ]
  const unitIds = [testDataHelpers.unitId(), testDataHelpers.unitId(), testDataHelpers.unitId()]
  const userId = testDataHelpers.userId()
  const ingredientIds = [
    testDataHelpers.ingredientId(),
    testDataHelpers.ingredientId(),
    testDataHelpers.ingredientId(),
  ]

  const categories = [
    createTestCategory({ id: categoryIds[0], name: '野菜', displayOrder: 1 }),
    createTestCategory({ id: categoryIds[1], name: '肉・魚', displayOrder: 2 }),
    createTestCategory({ id: categoryIds[2], name: '調味料', displayOrder: 3 }),
  ]

  const units = [
    createTestUnit({ id: unitIds[0], name: '個', symbol: '個', type: 'COUNT' }),
    createTestUnit({ id: unitIds[1], name: 'グラム', symbol: 'g', type: 'WEIGHT' }),
    createTestUnit({ id: unitIds[2], name: 'ミリリットル', symbol: 'ml', type: 'VOLUME' }),
  ]

  const ingredients = [
    createTestIngredient({
      id: ingredientIds[0],
      name: 'トマト',
      categoryId: categoryIds[0],
      userId: userId,
      quantity: 5,
      unitId: unitIds[0],
    }),
    createTestIngredient({
      id: ingredientIds[1],
      name: '鶏肉',
      categoryId: categoryIds[1],
      userId: userId,
      quantity: 300,
      unitId: unitIds[1],
    }),
    createTestIngredient({
      id: ingredientIds[2],
      name: '醤油',
      categoryId: categoryIds[2],
      userId: userId,
      quantity: 500,
      unitId: unitIds[2],
    }),
  ]

  return { categories, units, ingredients }
}
