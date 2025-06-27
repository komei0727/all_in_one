/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'

import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import {
  CategoryNotFoundException,
  UnitNotFoundException,
} from '@/modules/ingredients/server/domain/exceptions/not-found.exception'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'
import { PrismaCategoryRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-category-repository'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'
import { PrismaUnitRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-unit-repository'

import {
  CreateIngredientCommandBuilder,
  testDataHelpers,
} from '../../../../../../__fixtures__/builders'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
} from '../../../../../../helpers/database.helper'

// テストデータ生成用のヘルパー関数
const createTestCommand = () => {
  const testDataIds = getTestDataIds()
  return new CreateIngredientCommandBuilder()
    .withUserId('test-user-' + faker.string.uuid())
    .withCategoryId(testDataIds.categories.vegetable) // 統合テストなので実在するカテゴリーID
    .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece) // 統合テストなので実在する単位ID
    .withStorageLocation({
      type: faker.helpers.arrayElement([
        StorageType.REFRIGERATED,
        StorageType.FROZEN,
        StorageType.ROOM_TEMPERATURE,
      ]),
    })
    .withPurchaseDate(new Date().toISOString())
    .build()
}

describe('CreateIngredientHandler Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>
  let handler: CreateIngredientHandler
  let ingredientRepository: PrismaIngredientRepository
  let categoryRepository: PrismaCategoryRepository
  let unitRepository: PrismaUnitRepository

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // リポジトリとハンドラーの初期化
    ingredientRepository = new PrismaIngredientRepository(prisma as any)
    categoryRepository = new PrismaCategoryRepository(prisma as any)
    unitRepository = new PrismaUnitRepository(prisma as any)
    handler = new CreateIngredientHandler(ingredientRepository, categoryRepository, unitRepository)
  })

  afterEach(async () => {
    // 各テストの後にデータベースをクリーンアップ
    await cleanupIntegrationTest()
  })

  afterAll(async () => {
    // 全テスト終了後にPrismaクライアントを切断
    await cleanupPrismaClient()
  })

  describe('正常系', () => {
    it('有効なコマンドで食材を作成できる', async () => {
      // Given: 有効なコマンドを作成
      const command = createTestCommand()

      // When: ハンドラーを実行
      const result = await handler.execute(command)

      // Then: 食材が正しく作成されている
      expect(result).toBeDefined()
      expect(result.getName().getValue()).toBe(command.name)
      expect(result.getCategoryId().getValue()).toBe(command.categoryId)
      expect(result.getUserId()).toBe(command.userId)
      expect(result.getPurchaseDate()).toBeInstanceOf(Date)
      if (command.memo) {
        expect(result.getMemo()?.getValue()).toBe(command.memo)
      } else {
        expect(result.getMemo()).toBeNull()
      }

      // 在庫情報も正しく設定されている
      const stock = result.getIngredientStock()
      expect(stock).toBeDefined()
      expect(stock.getQuantity()).toBe(command.quantity.amount)
      expect(stock.getUnitId().getValue()).toBe(command.quantity.unitId)
      expect(stock.getStorageLocation().getType()).toBe(command.storageLocation.type)
      if (command.storageLocation.detail) {
        expect(stock.getStorageLocation().getDetail()).toBe(command.storageLocation.detail)
      } else {
        expect(stock.getStorageLocation().getDetail()).toBeNull()
      }

      // データベースに実際に保存されていることを確認
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: result.getId().getValue() },
      })
      expect(dbIngredient).toBeDefined()
      expect(dbIngredient?.name).toBe(command.name)
      expect(dbIngredient?.userId).toBe(command.userId)
      expect(dbIngredient?.quantity).toBe(command.quantity.amount)
    })

    it('メモなしで食材を作成できる', async () => {
      // Given: メモなしのコマンド
      const testDataIds = getTestDataIds()
      const command = new CreateIngredientCommandBuilder()
        .withUserId('test-user-' + faker.string.uuid())
        .withCategoryId(testDataIds.categories.vegetable)
        .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
        .withStorageLocation({
          type: faker.helpers.arrayElement([
            StorageType.REFRIGERATED,
            StorageType.FROZEN,
            StorageType.ROOM_TEMPERATURE,
          ]),
        })
        .withPurchaseDate(new Date().toISOString())
        .withMemo(undefined)
        .build()

      // When: ハンドラーを実行
      const result = await handler.execute(command)

      // Then: メモがnullで作成される
      expect(result.getMemo()).toBeNull()
    })

    it('価格なしで食材を作成できる', async () => {
      // Given: 価格なしのコマンド
      const testDataIds = getTestDataIds()
      const command = new CreateIngredientCommandBuilder()
        .withUserId('test-user-' + faker.string.uuid())
        .withCategoryId(testDataIds.categories.vegetable)
        .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
        .withStorageLocation({
          type: faker.helpers.arrayElement([
            StorageType.REFRIGERATED,
            StorageType.FROZEN,
            StorageType.ROOM_TEMPERATURE,
          ]),
        })
        .withPurchaseDate(new Date().toISOString())
        .withPrice(undefined)
        .build()

      // When: ハンドラーを実行
      const result = await handler.execute(command)

      // Then: 価格がnullで作成される
      expect(result.getPrice()).toBeNull()
    })

    it('賞味期限・消費期限なしで食材を作成できる', async () => {
      // Given: 期限なしのコマンド
      const testDataIds = getTestDataIds()
      const command = new CreateIngredientCommandBuilder()
        .withUserId('test-user-' + faker.string.uuid())
        .withCategoryId(testDataIds.categories.vegetable)
        .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
        .withStorageLocation({ type: StorageType.REFRIGERATED })
        .withPurchaseDate(new Date().toISOString())
        .withExpiryInfo(null)
        .build()

      // When: ハンドラーを実行
      const result = await handler.execute(command)

      // Then: 期限がnullで作成される
      expect(result.getExpiryInfo()).toBeNull()
    })

    it('全ての保管場所タイプで食材を作成できる', async () => {
      // Given: 各保管場所タイプのコマンド
      const storageTypes = [
        StorageType.REFRIGERATED,
        StorageType.FROZEN,
        StorageType.ROOM_TEMPERATURE,
      ]

      const testDataIds = getTestDataIds()
      for (const storageType of storageTypes) {
        const command = new CreateIngredientCommandBuilder()
          .withUserId('test-user-' + faker.string.uuid())
          .withName(`${faker.food.ingredient()}_${storageType}`)
          .withCategoryId(testDataIds.categories.vegetable)
          .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
          .withStorageLocation({ type: storageType })
          .withPurchaseDate(new Date().toISOString())
          .build()

        // When: ハンドラーを実行
        const result = await handler.execute(command)

        // Then: 正しい保管場所タイプで作成される
        expect(result.getIngredientStock().getStorageLocation().getType()).toBe(storageType)
      }
    })

    it('複数の異なるカテゴリーで食材を作成できる', async () => {
      // Given: 異なるカテゴリーのコマンド
      const testDataIds = getTestDataIds()
      const categories = [
        testDataIds.categories.vegetable,
        testDataIds.categories.meatFish,
        testDataIds.categories.seasoning,
      ]

      for (const categoryId of categories) {
        const command = new CreateIngredientCommandBuilder()
          .withUserId('test-user-' + faker.string.uuid())
          .withName(`${faker.food.ingredient()}_${categoryId}`)
          .withCategoryId(categoryId)
          .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
          .withStorageLocation({
            type: faker.helpers.arrayElement([
              StorageType.REFRIGERATED,
              StorageType.FROZEN,
              StorageType.ROOM_TEMPERATURE,
            ]),
          })
          .withPurchaseDate(new Date().toISOString())
          .build()

        // When: ハンドラーを実行
        const result = await handler.execute(command)

        // Then: 正しいカテゴリーで作成される
        expect(result.getCategoryId().getValue()).toBe(categoryId)
      }
    })

    it('複数の異なる単位で食材を作成できる', async () => {
      // Given: 異なる単位のコマンド
      const testDataIds = getTestDataIds()
      const units = [testDataIds.units.piece, testDataIds.units.gram, testDataIds.units.milliliter]

      for (const unitId of units) {
        const command = new CreateIngredientCommandBuilder()
          .withUserId('test-user-' + faker.string.uuid())
          .withName(`${faker.food.ingredient()}_${unitId}`)
          .withCategoryId(testDataIds.categories.vegetable)
          .withQuantity(faker.number.int({ min: 1, max: 20 }), unitId)
          .withStorageLocation({
            type: faker.helpers.arrayElement([
              StorageType.REFRIGERATED,
              StorageType.FROZEN,
              StorageType.ROOM_TEMPERATURE,
            ]),
          })
          .withPurchaseDate(new Date().toISOString())
          .build()

        // When: ハンドラーを実行
        const result = await handler.execute(command)

        // Then: 正しい単位で作成される
        expect(result.getIngredientStock().getUnitId().getValue()).toBe(unitId)
      }
    })
  })

  describe('異常系', () => {
    it('存在しないカテゴリーIDの場合エラーになる', async () => {
      // Given: 存在しないカテゴリーIDを持つコマンド
      const nonExistentCategoryId = testDataHelpers.categoryId()
      const testDataIds = getTestDataIds()
      const command = new CreateIngredientCommandBuilder()
        .withUserId('test-user-' + faker.string.uuid())
        .withCategoryId(nonExistentCategoryId)
        .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
        .withStorageLocation({
          type: faker.helpers.arrayElement([
            StorageType.REFRIGERATED,
            StorageType.FROZEN,
            StorageType.ROOM_TEMPERATURE,
          ]),
        })
        .withPurchaseDate(new Date().toISOString())
        .build()

      // When/Then: CategoryNotFoundExceptionがスローされる
      await expect(handler.execute(command)).rejects.toThrow(CategoryNotFoundException)
      await expect(handler.execute(command)).rejects.toThrow(
        `Category not found: ${nonExistentCategoryId}`
      )
    })

    it('存在しない単位IDの場合エラーになる', async () => {
      // Given: 存在しない単位IDを持つコマンド
      const nonExistentUnitId = testDataHelpers.unitId()
      const testDataIds = getTestDataIds()
      const command = new CreateIngredientCommandBuilder()
        .withUserId('test-user-' + faker.string.uuid())
        .withCategoryId(testDataIds.categories.vegetable)
        .withQuantity(faker.number.int({ min: 1, max: 20 }), nonExistentUnitId)
        .withStorageLocation({
          type: faker.helpers.arrayElement([
            StorageType.REFRIGERATED,
            StorageType.FROZEN,
            StorageType.ROOM_TEMPERATURE,
          ]),
        })
        .withPurchaseDate(new Date().toISOString())
        .build()

      // When/Then: UnitNotFoundExceptionがスローされる
      await expect(handler.execute(command)).rejects.toThrow(UnitNotFoundException)
      await expect(handler.execute(command)).rejects.toThrow(`Unit not found: ${nonExistentUnitId}`)
    })
  })

  describe('トランザクション処理', () => {
    it('食材が正しく保存される', async () => {
      // Given: 有効なコマンド
      const command = createTestCommand()

      // When: ハンドラーを実行
      const result = await handler.execute(command)

      // Then: 食材が存在し、在庫情報も含まれている
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: result.getId().getValue() },
      })

      expect(dbIngredient).toBeDefined()
      expect(dbIngredient?.userId).toBe(command.userId)
      expect(dbIngredient?.quantity).toBe(command.quantity.amount)
      expect(dbIngredient?.unitId).toBe(command.quantity.unitId)
      expect(dbIngredient?.storageLocationType).toBe(command.storageLocation.type)
    })
  })

  describe('ビジネスルールの検証', () => {
    it('同名の食材を複数作成できる', async () => {
      // Given: 同じ名前の食材を作成
      const sameName = faker.food.ingredient()
      const testDataIds = getTestDataIds()
      const command1 = new CreateIngredientCommandBuilder()
        .withUserId('test-user-' + faker.string.uuid())
        .withName(sameName)
        .withCategoryId(testDataIds.categories.vegetable)
        .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
        .withStorageLocation({
          type: faker.helpers.arrayElement([
            StorageType.REFRIGERATED,
            StorageType.FROZEN,
            StorageType.ROOM_TEMPERATURE,
          ]),
        })
        .withPurchaseDate(new Date().toISOString())
        .build()
      const command2 = new CreateIngredientCommandBuilder()
        .withUserId('test-user-' + faker.string.uuid())
        .withName(sameName)
        .withCategoryId(testDataIds.categories.vegetable)
        .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
        .withStorageLocation({
          type: faker.helpers.arrayElement([
            StorageType.REFRIGERATED,
            StorageType.FROZEN,
            StorageType.ROOM_TEMPERATURE,
          ]),
        })
        .withPurchaseDate(new Date().toISOString())
        .build()

      // When: 両方を作成
      const result1 = await handler.execute(command1)
      const result2 = await handler.execute(command2)

      // Then: 異なるIDで作成される
      expect(result1.getId().getValue()).not.toBe(result2.getId().getValue())
      expect(result1.getName().getValue()).toBe(result2.getName().getValue())
    })

    it('価格の精度が保持される', async () => {
      // Given: 小数点を含む価格
      const testDataIds = getTestDataIds()
      const precisePrice = faker.number.float({ min: 100, max: 9999, fractionDigits: 2 })
      const command = new CreateIngredientCommandBuilder()
        .withUserId('test-user-' + faker.string.uuid())
        .withCategoryId(testDataIds.categories.vegetable)
        .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
        .withStorageLocation({
          type: faker.helpers.arrayElement([
            StorageType.REFRIGERATED,
            StorageType.FROZEN,
            StorageType.ROOM_TEMPERATURE,
          ]),
        })
        .withPurchaseDate(new Date().toISOString())
        .withPrice(precisePrice)
        .build()

      // When: ハンドラーを実行
      const result = await handler.execute(command)

      // Then: 価格の精度が保持される
      expect(result.getPrice()?.getValue()).toBe(precisePrice)
    })
  })
})
