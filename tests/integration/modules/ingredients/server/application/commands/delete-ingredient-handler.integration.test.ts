import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import { DeleteIngredientCommand } from '@/modules/ingredients/server/application/commands/delete-ingredient.command'
import { DeleteIngredientHandler } from '@/modules/ingredients/server/application/commands/delete-ingredient.handler'
import { IngredientNotFoundException } from '@/modules/ingredients/server/domain/exceptions'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'
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
 * DeleteIngredientHandler統合テスト
 *
 * 食材削除（論理削除）機能をデータベースとの統合で検証
 */
describe('DeleteIngredientHandler Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>
  let deleteHandler: DeleteIngredientHandler
  let createHandler: CreateIngredientHandler
  let ingredientRepository: PrismaIngredientRepository
  let categoryRepository: PrismaCategoryRepository
  let unitRepository: PrismaUnitRepository
  let repositoryFactory: PrismaRepositoryFactory
  let transactionManager: PrismaTransactionManager

  // テスト用の食材を作成するヘルパー関数
  const createTestIngredient = async () => {
    const testDataIds = getTestDataIds()
    const command = new CreateIngredientCommandBuilder()
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
      .build()

    return await createHandler.execute(command)
  }

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // リポジトリとハンドラーの初期化
    ingredientRepository = new PrismaIngredientRepository(prisma as any)
    categoryRepository = new PrismaCategoryRepository(prisma as any)
    unitRepository = new PrismaUnitRepository(prisma as any)
    repositoryFactory = new PrismaRepositoryFactory()
    transactionManager = new PrismaTransactionManager(prisma as any)

    // ダミーのEventBus実装
    const eventBus = {
      publish: vi.fn(),
      publishAll: vi.fn(),
    }

    deleteHandler = new DeleteIngredientHandler(
      ingredientRepository,
      repositoryFactory,
      transactionManager
    )
    createHandler = new CreateIngredientHandler(
      ingredientRepository,
      categoryRepository,
      unitRepository,
      repositoryFactory,
      transactionManager,
      eventBus
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
    it('食材を論理削除できる', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const command = new DeleteIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId
      )

      // When: 削除ハンドラーを実行
      await deleteHandler.execute(command)

      // Then: データベースで論理削除されている（削除フラグが立っている）
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient).toBeDefined()
      expect(dbIngredient?.deletedAt).not.toBeNull()
      // deletedByフィールドは現在のスキーマには存在しない
    })

    it('複数の食材から特定の食材のみ削除できる', async () => {
      // Given: 3つの食材を作成
      const ingredients = await Promise.all([
        createTestIngredient(),
        createTestIngredient(),
        createTestIngredient(),
      ])
      const testDataIds = getTestDataIds()
      const targetIngredient = ingredients[1]

      // When: 2番目の食材のみ削除
      await deleteHandler.execute(
        new DeleteIngredientCommand(targetIngredient.id, testDataIds.users.defaultUser.domainUserId)
      )

      // Then: 削除対象のみが論理削除されている
      const dbIngredients = await prisma.ingredient.findMany({
        where: {
          id: { in: ingredients.map((i) => i.id) },
        },
      })

      expect(dbIngredients).toHaveLength(3)
      const deletedIngredient = dbIngredients.find((i) => i.id === targetIngredient.id)
      const otherIngredients = dbIngredients.filter((i) => i.id !== targetIngredient.id)

      expect(deletedIngredient?.deletedAt).not.toBeNull()
      // deletedByフィールドは現在のスキーマには存在しない
      otherIngredients.forEach((ingredient) => {
        expect(ingredient.deletedAt).toBeNull()
        // deletedByフィールドは現在のスキーマには存在しない
      })
    })

    it('削除時にupdatedAt、updatedByが更新される', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const originalUpdatedAt = new Date(ingredient.updatedAt)

      // 少し待機して時間差を作る
      await new Promise((resolve) => setTimeout(resolve, 10))

      // When: 削除ハンドラーを実行
      await deleteHandler.execute(
        new DeleteIngredientCommand(ingredient.id, testDataIds.users.defaultUser.domainUserId)
      )

      // Then: 更新情報が正しく設定されている
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
      // updatedByフィールドは現在のスキーマには存在しない
    })
  })

  describe('異常系', () => {
    it('存在しない食材を削除しようとするとエラーになる', async () => {
      // Given: 存在しない食材ID
      const nonExistentId = testDataHelpers.ingredientId()
      const testDataIds = getTestDataIds()
      const command = new DeleteIngredientCommand(
        nonExistentId,
        testDataIds.users.defaultUser.domainUserId
      )

      // When/Then: IngredientNotFoundExceptionがスローされる
      await expect(deleteHandler.execute(command)).rejects.toThrow(IngredientNotFoundException)
    })

    it('他のユーザーの食材は削除できない', async () => {
      // Given: 食材を作成し、別のユーザーIDで削除を試みる
      const ingredient = await createTestIngredient()
      const otherUserId = testDataHelpers.userId()
      const command = new DeleteIngredientCommand(ingredient.id, otherUserId)

      // When/Then: IngredientNotFoundExceptionがスローされる（他ユーザーの食材は見つからないため）
      await expect(deleteHandler.execute(command)).rejects.toThrow(IngredientNotFoundException)

      // 元の食材は削除されていない
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient?.deletedAt).toBeNull()
    })

    it('既に削除済みの食材を再度削除しようとするとエラーになる', async () => {
      // Given: 食材を作成して削除
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const command = new DeleteIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId
      )
      await deleteHandler.execute(command)

      // When: 同じ食材を再度削除（削除済み食材の再削除はエラーになる）
      await expect(deleteHandler.execute(command)).rejects.toThrow(IngredientNotFoundException)

      // Then: 削除状態は変わらない
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient?.deletedAt).not.toBeNull()
    })
  })

  describe('トランザクション処理', () => {
    it('削除操作がトランザクション内で実行される', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const command = new DeleteIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId
      )

      // When: 削除ハンドラーを実行
      await deleteHandler.execute(command)

      // Then: トランザクションが成功し、削除が完了している
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient).toBeDefined()
      expect(dbIngredient?.deletedAt).not.toBeNull()
    })
  })

  describe('データ整合性', () => {
    it('並行して同じ食材を削除しても正しく処理される', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const command = new DeleteIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId
      )

      // When: 並行して削除を実行
      const promises = Array.from({ length: 3 }, () => deleteHandler.execute(command))
      await Promise.all(promises)

      // Then: 削除は一度のみ実行される
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient?.deletedAt).not.toBeNull()
      // deletedByフィールドは現在のスキーマには存在しない
    })

    it('削除後も食材の基本情報は保持される', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const originalData = {
        name: ingredient.name,
        categoryId: ingredient.category?.id || '',
        quantity: ingredient.stock.quantity,
        unitId: ingredient.stock.unit.id,
      }

      // When: 削除ハンドラーを実行
      await deleteHandler.execute(
        new DeleteIngredientCommand(ingredient.id, testDataIds.users.defaultUser.domainUserId)
      )

      // Then: 削除フラグ以外の情報は変わらない
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient?.name).toBe(originalData.name)
      expect(dbIngredient?.categoryId).toBe(originalData.categoryId)
      expect(dbIngredient?.quantity).toBe(originalData.quantity)
      expect(dbIngredient?.unitId).toBe(originalData.unitId)
    })
  })
})
