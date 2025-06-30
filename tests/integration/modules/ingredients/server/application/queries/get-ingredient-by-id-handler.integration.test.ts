import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import { DeleteIngredientCommand } from '@/modules/ingredients/server/application/commands/delete-ingredient.command'
import { DeleteIngredientHandler } from '@/modules/ingredients/server/application/commands/delete-ingredient.handler'
import { GetIngredientByIdHandler } from '@/modules/ingredients/server/application/queries/get-ingredient-by-id.handler'
import { GetIngredientByIdQuery } from '@/modules/ingredients/server/application/queries/get-ingredient-by-id.query'
import { IngredientNotFoundException } from '@/modules/ingredients/server/domain/exceptions'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'
import { PrismaIngredientQueryService } from '@/modules/ingredients/server/infrastructure/query-services/prisma-ingredient-query-service'
import { PrismaCategoryRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-category-repository'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'
import { PrismaRepositoryFactory } from '@/modules/ingredients/server/infrastructure/repositories/prisma-repository-factory'
import { PrismaUnitRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-unit-repository'
import { PrismaTransactionManager } from '@/modules/ingredients/server/infrastructure/services/prisma-transaction-manager'
import { CreateIngredientCommandBuilder, testDataHelpers } from '@tests/__fixtures__/builders'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
} from '@tests/helpers/database.helper'

/**
 * GetIngredientByIdHandler統合テスト
 *
 * 食材詳細取得機能をデータベースとの統合で検証
 */
describe('GetIngredientByIdHandler Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>
  let handler: GetIngredientByIdHandler
  let createHandler: CreateIngredientHandler
  let deleteHandler: DeleteIngredientHandler
  let queryService: PrismaIngredientQueryService
  let ingredientRepository: PrismaIngredientRepository
  let categoryRepository: PrismaCategoryRepository
  let unitRepository: PrismaUnitRepository
  let repositoryFactory: PrismaRepositoryFactory
  let transactionManager: PrismaTransactionManager

  // テスト用の食材を作成するヘルパー関数
  const createTestIngredient = async (overrides?: {
    name?: string
    categoryId?: string
    memo?: string
    price?: number
  }) => {
    const testDataIds = getTestDataIds()
    const commandBuilder = new CreateIngredientCommandBuilder()
      .withUserId(testDataIds.users.defaultUser.domainUserId)
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

    // オーバーライドの適用
    if (overrides?.name) commandBuilder.withName(overrides.name)
    if (overrides?.categoryId) commandBuilder.withCategoryId(overrides.categoryId)
    if (overrides?.memo) commandBuilder.withMemo(overrides.memo)
    if (overrides?.price) commandBuilder.withPrice(overrides.price)

    const command = commandBuilder.build()
    return await createHandler.execute(command)
  }

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // リポジトリとサービスの初期化
    ingredientRepository = new PrismaIngredientRepository(prisma as any)
    categoryRepository = new PrismaCategoryRepository(prisma as any)
    unitRepository = new PrismaUnitRepository(prisma as any)
    repositoryFactory = new PrismaRepositoryFactory()
    transactionManager = new PrismaTransactionManager(prisma as any)
    queryService = new PrismaIngredientQueryService(prisma as any)

    // ダミーのEventBus実装
    const eventBus = {
      publish: vi.fn(),
      publishAll: vi.fn(),
    }

    // ハンドラーの初期化
    handler = new GetIngredientByIdHandler(queryService)
    createHandler = new CreateIngredientHandler(
      ingredientRepository,
      categoryRepository,
      unitRepository,
      repositoryFactory,
      transactionManager,
      eventBus
    )
    deleteHandler = new DeleteIngredientHandler(
      ingredientRepository,
      repositoryFactory,
      transactionManager
    )
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
    it('食材詳細を取得できる', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const query = new GetIngredientByIdQuery(
        testDataIds.users.defaultUser.domainUserId,
        ingredient.id
      )

      // When: ハンドラーを実行
      const result = await handler.execute(query)

      // Then: 詳細情報が正しく取得される
      expect(result.id).toBe(ingredient.id)
      expect(result.userId).toBe(testDataIds.users.defaultUser.domainUserId)
      expect(result.name).toBe(ingredient.name)
      expect(result.categoryId).toBe(ingredient.category?.id)
      expect(result.categoryName).toBe('野菜') // シードデータから
      expect(result.quantity).toBe(ingredient.stock?.quantity)
      expect(result.unitId).toBe(ingredient.stock?.unit?.id)
      expect(result.unitName).toBe('個') // シードデータから
      expect(result.unitSymbol).toBe('個') // シードデータから
      expect(result.storageType).toBe(ingredient.stock?.storageLocation.type)
      expect(result.purchaseDate).toBeDefined()
    })

    it('全フィールドが設定された食材の詳細を取得できる', async () => {
      // Given: 全フィールド設定した食材を作成
      const testDataIds = getTestDataIds()
      const ingredientData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataIds.categories.meatFish,
        memo: faker.lorem.sentence(),
        price: faker.number.float({ min: 100, max: 9999, fractionDigits: 2 }),
      }

      const bestBeforeDate = faker.date.future()
      const useByDate = faker.date.between({ from: new Date(), to: bestBeforeDate })
      const storageDetail = '冷蔵庫の野菜室'
      const threshold = faker.number.int({ min: 1, max: 10 })

      const ingredient = await createHandler.execute(
        new CreateIngredientCommandBuilder()
          .withUserId(testDataIds.users.defaultUser.domainUserId)
          .withName(ingredientData.name)
          .withCategoryId(ingredientData.categoryId)
          .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.gram)
          .withStorageLocation({
            type: StorageType.REFRIGERATED,
            detail: storageDetail,
          })
          .withPurchaseDate(new Date().toISOString())
          .withMemo(ingredientData.memo)
          .withPrice(ingredientData.price)
          .withExpiryInfo({
            bestBeforeDate: bestBeforeDate.toISOString().split('T')[0],
            useByDate: useByDate.toISOString().split('T')[0],
          })
          .withThreshold(threshold)
          .build()
      )

      // When: ハンドラーを実行
      const query = new GetIngredientByIdQuery(
        testDataIds.users.defaultUser.domainUserId,
        ingredient.id
      )
      const result = await handler.execute(query)

      // Then: 全フィールドが正しく取得される
      expect(result.name).toBe(ingredientData.name)
      expect(result.categoryId).toBe(ingredientData.categoryId)
      expect(result.categoryName).toBe('肉・魚')
      expect(result.memo).toBe(ingredientData.memo)
      expect(result.price).toBe(ingredientData.price)
      expect(result.bestBeforeDate).toBe(bestBeforeDate.toISOString().split('T')[0])
      expect(result.useByDate).toBe(useByDate.toISOString().split('T')[0])
      expect(result.unitName).toBe('グラム')
      expect(result.unitSymbol).toBe('g')
      expect(result.storageDetail).toBe(storageDetail)
      expect(result.threshold).toBe(threshold)
      expect(result.createdAt).toBeDefined()
      expect(result.updatedAt).toBeDefined()
    })

    it('オプショナルフィールドがnullの食材の詳細を取得できる', async () => {
      // Given: 最小限のフィールドで食材を作成
      const testDataIds = getTestDataIds()
      const ingredient = await createHandler.execute(
        new CreateIngredientCommandBuilder()
          .withUserId(testDataIds.users.defaultUser.domainUserId)
          .withCategoryId(testDataIds.categories.vegetable)
          .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
          .withStorageLocation({ type: StorageType.ROOM_TEMPERATURE })
          .withPurchaseDate(new Date().toISOString())
          .withMemo(undefined)
          .withPrice(undefined)
          .withExpiryInfo(null)
          .withThreshold(undefined)
          .build()
      )

      // When: ハンドラーを実行
      const query = new GetIngredientByIdQuery(
        testDataIds.users.defaultUser.domainUserId,
        ingredient.id
      )
      const result = await handler.execute(query)

      // Then: オプショナルフィールドがnullで取得される
      expect(result.memo).toBeNull()
      expect(result.price).toBeNull()
      expect(result.bestBeforeDate).toBeNull()
      expect(result.useByDate).toBeNull()
      expect(result.storageDetail).toBeNull()
      expect(result.threshold).toBeNull()
    })

    it('異なるカテゴリーの食材の詳細を取得できる', async () => {
      // Given: 異なるカテゴリーの食材を作成
      const testDataIds = getTestDataIds()
      const categories = [
        { id: testDataIds.categories.vegetable, name: '野菜' },
        { id: testDataIds.categories.meatFish, name: '肉・魚' },
        { id: testDataIds.categories.seasoning, name: '調味料' },
      ]

      for (const category of categories) {
        const ingredient = await createTestIngredient({ categoryId: category.id })

        // When: ハンドラーを実行
        const query = new GetIngredientByIdQuery(
          testDataIds.users.defaultUser.domainUserId,
          ingredient.id
        )
        const result = await handler.execute(query)

        // Then: 正しいカテゴリー情報が取得される
        expect(result.categoryId).toBe(category.id)
        expect(result.categoryName).toBe(category.name)
      }
    })

    it('異なる単位の食材の詳細を取得できる', async () => {
      // Given: 異なる単位の食材を作成
      const testDataIds = getTestDataIds()
      const units = [
        { id: testDataIds.units.piece, name: '個', symbol: '個' },
        { id: testDataIds.units.gram, name: 'グラム', symbol: 'g' },
        { id: testDataIds.units.milliliter, name: 'ミリリットル', symbol: 'ml' },
      ]

      for (const unit of units) {
        const ingredient = await createHandler.execute(
          new CreateIngredientCommandBuilder()
            .withUserId(testDataIds.users.defaultUser.domainUserId)
            .withName(`${unit.name}用食材_${faker.string.alphanumeric(5)}`)
            .withCategoryId(testDataIds.categories.vegetable)
            .withQuantity(faker.number.int({ min: 1, max: 20 }), unit.id)
            .withStorageLocation({ type: StorageType.REFRIGERATED })
            .withPurchaseDate(new Date().toISOString())
            .build()
        )

        // When: ハンドラーを実行
        const query = new GetIngredientByIdQuery(
          testDataIds.users.defaultUser.domainUserId,
          ingredient.id
        )
        const result = await handler.execute(query)

        // Then: 正しい単位情報が取得される
        expect(result.unitId).toBe(unit.id)
        expect(result.unitName).toBe(unit.name)
        expect(result.unitSymbol).toBe(unit.symbol)
      }
    })
  })

  describe('異常系', () => {
    it('存在しない食材を取得しようとするとエラーになる', async () => {
      // Given: 存在しない食材ID
      const nonExistentId = testDataHelpers.ingredientId()
      const testDataIds = getTestDataIds()
      const query = new GetIngredientByIdQuery(
        testDataIds.users.defaultUser.domainUserId,
        nonExistentId
      )

      // When/Then: IngredientNotFoundExceptionがスローされる
      await expect(handler.execute(query)).rejects.toThrow(IngredientNotFoundException)
    })

    it('他のユーザーの食材は取得できない', async () => {
      // Given: 食材を作成し、別のユーザーIDで取得を試みる
      const ingredient = await createTestIngredient()
      const otherUserId = testDataHelpers.userId()
      const query = new GetIngredientByIdQuery(otherUserId, ingredient.id)

      // When/Then: IngredientNotFoundExceptionがスローされる（他ユーザーの食材は見つからないため）
      await expect(handler.execute(query)).rejects.toThrow(IngredientNotFoundException)
    })

    it('削除済みの食材は取得できない', async () => {
      // Given: 食材を作成して削除
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      await deleteHandler.execute(
        new DeleteIngredientCommand(ingredient.id, testDataIds.users.defaultUser.domainUserId)
      )

      // When/Then: IngredientNotFoundExceptionがスローされる
      const query = new GetIngredientByIdQuery(
        testDataIds.users.defaultUser.domainUserId,
        ingredient.id
      )
      await expect(handler.execute(query)).rejects.toThrow(IngredientNotFoundException)
    })
  })

  describe('パフォーマンス', () => {
    it('大量の食材から特定の食材を高速に取得できる', async () => {
      // Given: 50個の食材を作成（パフォーマンス重視で数量削減）
      const testDataIds = getTestDataIds()
      const ingredients = []
      for (let i = 0; i < 50; i++) {
        const ingredient = await createTestIngredient({
          name: `パフォーマンステスト_${i}_${faker.string.alphanumeric(5)}`,
        })
        ingredients.push(ingredient)
      }

      // ランダムに1つ選択
      const targetIngredient = faker.helpers.arrayElement(ingredients)
      const query = new GetIngredientByIdQuery(
        testDataIds.users.defaultUser.domainUserId,
        targetIngredient.id
      )

      // When: 詳細を取得（時間計測）
      const startTime = performance.now()
      const result = await handler.execute(query)
      const endTime = performance.now()

      // Then: 高速に取得できる（200ms以内）
      expect(result.id).toBe(targetIngredient.id)
      expect(endTime - startTime).toBeLessThan(200)
    }, 60000) // タイムアウトを60秒に延長
  })

  describe('データ整合性', () => {
    it('並行してクエリを実行しても正しい結果を返す', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const query = new GetIngredientByIdQuery(
        testDataIds.users.defaultUser.domainUserId,
        ingredient.id
      )

      // When: 並行して複数回実行
      const promises = Array.from({ length: 5 }, () => handler.execute(query))
      const results = await Promise.all(promises)

      // Then: すべて同じ結果を返す
      expect(results).toHaveLength(5)
      const firstResult = results[0]
      results.forEach((result) => {
        expect(result).toEqual(firstResult)
      })
    })

    it('食材更新直後でも最新の情報を取得できる', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()

      // 食材を直接更新（実際にはUpdateHandlerを使うべきだが、テストのため直接更新）
      const newName = '更新後の名前'
      await prisma.ingredient.update({
        where: { id: ingredient.id },
        data: { name: newName },
      })

      // When: 詳細を取得
      const query = new GetIngredientByIdQuery(
        testDataIds.users.defaultUser.domainUserId,
        ingredient.id
      )
      const result = await handler.execute(query)

      // Then: 更新後の情報が取得される
      expect(result.name).toBe(newName)
    })
  })

  describe('日付フォーマット', () => {
    it('日付フィールドがYYYY-MM-DD形式で返される', async () => {
      // Given: 特定の日付で食材を作成
      const testDataIds = getTestDataIds()
      const purchaseDate = new Date('2024-01-15')
      const bestBeforeDate = new Date('2024-02-25')
      const useByDate = new Date('2024-02-20')

      const ingredient = await createHandler.execute(
        new CreateIngredientCommandBuilder()
          .withUserId(testDataIds.users.defaultUser.domainUserId)
          .withCategoryId(testDataIds.categories.vegetable)
          .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
          .withStorageLocation({ type: StorageType.REFRIGERATED })
          .withPurchaseDate(purchaseDate.toISOString())
          .withExpiryInfo({
            bestBeforeDate: bestBeforeDate.toISOString().split('T')[0],
            useByDate: useByDate.toISOString().split('T')[0],
          })
          .build()
      )

      // When: ハンドラーを実行
      const query = new GetIngredientByIdQuery(
        testDataIds.users.defaultUser.domainUserId,
        ingredient.id
      )
      const result = await handler.execute(query)

      // Then: 日付がYYYY-MM-DD形式で返される
      expect(result.purchaseDate).toBe('2024-01-15')
      expect(result.bestBeforeDate).toBe('2024-02-25')
      expect(result.useByDate).toBe('2024-02-20')
    })
  })
})
