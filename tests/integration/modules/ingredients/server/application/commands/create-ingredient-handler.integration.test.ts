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

import { CreateIngredientCommandBuilder } from '../../../../../../__fixtures__/builders'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
} from '../../../../../../helpers/database.helper'

// テストデータ生成用のヘルパー関数
const createTestCommand = () => {
  return new CreateIngredientCommandBuilder()
    .withCategoryId('cat00001') // 統合テストなので実在するカテゴリーID
    .withQuantity(faker.number.int({ min: 1, max: 20 }), 'unit0001') // 統合テストなので実在する単位ID
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
      if (command.memo) {
        expect(result.getMemo()?.getValue()).toBe(command.memo)
      } else {
        expect(result.getMemo()).toBeNull()
      }

      // 在庫情報も正しく設定されている（統合されたエンティティ）
      expect(result.getQuantity().getValue()).toBe(command.quantity.amount)
      expect(result.getUnitId().getValue()).toBe(command.quantity.unitId)
      expect(result.getStorageLocation().getType()).toBe(command.storageLocation.type)
      if (command.storageLocation.detail) {
        expect(result.getStorageLocation().getDetail()).toBe(command.storageLocation.detail)
      } else {
        // StorageLocationは未定義の場合は空文字列を返す
        expect(result.getStorageLocation().getDetail()).toBe('')
      }

      // データベースに実際に保存されていることを確認
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: result.getId().getValue() },
      })
      expect(dbIngredient).toBeDefined()
      expect(dbIngredient?.name).toBe(command.name)
      expect(dbIngredient?.quantity).toBe(command.quantity.amount)
    })

    it('メモなしで食材を作成できる', async () => {
      // Given: メモなしのコマンド
      const command = new CreateIngredientCommandBuilder()
        .withCategoryId('cat00001')
        .withQuantity(faker.number.int({ min: 1, max: 20 }), 'unit0001')
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
      const command = new CreateIngredientCommandBuilder()
        .withCategoryId('cat00001')
        .withQuantity(faker.number.int({ min: 1, max: 20 }), 'unit0001')
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
      const command = new CreateIngredientCommandBuilder()
        .withCategoryId('cat00001')
        .withQuantity(faker.number.int({ min: 1, max: 20 }), 'unit0001')
        .withStorageLocation({ type: StorageType.REFRIGERATED })
        .withPurchaseDate(new Date().toISOString())
        .withExpiryInfo(null)
        .build()

      // When: ハンドラーを実行
      const result = await handler.execute(command)

      // Then: 期限がnullで作成される
      expect(result.getExpiryInfo().getBestBeforeDate()).toBeNull()
      expect(result.getExpiryInfo().getUseByDate()).toBeNull()
    })

    it('全ての保管場所タイプで食材を作成できる', async () => {
      // Given: 各保管場所タイプのコマンド
      const storageTypes = [
        StorageType.REFRIGERATED,
        StorageType.FROZEN,
        StorageType.ROOM_TEMPERATURE,
      ]

      for (const storageType of storageTypes) {
        const command = new CreateIngredientCommandBuilder()
          .withName(`${faker.food.ingredient()}_${storageType}`)
          .withCategoryId('cat00001')
          .withQuantity(faker.number.int({ min: 1, max: 20 }), 'unit0001')
          .withStorageLocation({ type: storageType })
          .withPurchaseDate(new Date().toISOString())
          .build()

        // When: ハンドラーを実行
        const result = await handler.execute(command)

        // Then: 正しい保管場所タイプで作成される
        expect(result.getStorageLocation().getType()).toBe(storageType)
      }
    })

    it('複数の異なるカテゴリーで食材を作成できる', async () => {
      // Given: 異なるカテゴリーのコマンド
      const categories = ['cat00001', 'cat00002', 'cat00003']

      for (const categoryId of categories) {
        const command = new CreateIngredientCommandBuilder()
          .withName(`${faker.food.ingredient()}_${categoryId}`)
          .withCategoryId(categoryId)
          .withQuantity(faker.number.int({ min: 1, max: 20 }), 'unit0001')
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
      const units = ['unit0001', 'unit0002', 'unit0003']

      for (const unitId of units) {
        const command = new CreateIngredientCommandBuilder()
          .withName(`${faker.food.ingredient()}_${unitId}`)
          .withCategoryId('cat00001')
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
        expect(result.getUnitId().getValue()).toBe(unitId)
      }
    })
  })

  describe('異常系', () => {
    it('存在しないカテゴリーIDの場合エラーになる', async () => {
      // Given: 存在しないカテゴリーIDを持つコマンド
      const nonExistentCategoryId = faker.string.uuid()
      const command = new CreateIngredientCommandBuilder()
        .withCategoryId(nonExistentCategoryId)
        .withQuantity(faker.number.int({ min: 1, max: 20 }), 'unit0001')
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
      const nonExistentUnitId = faker.string.uuid()
      const command = new CreateIngredientCommandBuilder()
        .withCategoryId('cat00001')
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
    it('食材情報が正しく保存される', async () => {
      // Given: 有効なコマンド
      const command = createTestCommand()

      // When: ハンドラーを実行
      const result = await handler.execute(command)

      // Then: 食材が存在し、在庫情報も含まれている
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: result.getId().getValue() },
      })

      expect(dbIngredient).toBeDefined()
      expect(dbIngredient?.quantity).toBe(command.quantity.amount)
      expect(dbIngredient?.unitId).toBe(command.quantity.unitId)
      expect(dbIngredient?.storageLocationType).toBe(command.storageLocation.type)
    })
  })

  describe('ビジネスルールの検証', () => {
    it('同名の食材を複数作成できる', async () => {
      // Given: 同じ名前の食材を作成
      const sameName = faker.food.ingredient()
      const command1 = new CreateIngredientCommandBuilder()
        .withName(sameName)
        .withCategoryId('cat00001')
        .withQuantity(faker.number.int({ min: 1, max: 20 }), 'unit0001')
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
        .withName(sameName)
        .withCategoryId('cat00001')
        .withQuantity(faker.number.int({ min: 1, max: 20 }), 'unit0001')
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
      const precisePrice = faker.number.float({ min: 100, max: 9999, fractionDigits: 2 })
      const command = new CreateIngredientCommandBuilder()
        .withCategoryId('cat00001')
        .withQuantity(faker.number.int({ min: 1, max: 20 }), 'unit0001')
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

      // Then: 価格の精度が保持される（統合されたエンティティ）
      expect(result.getPrice()?.getValue()).toBe(precisePrice)
    })
  })
})
