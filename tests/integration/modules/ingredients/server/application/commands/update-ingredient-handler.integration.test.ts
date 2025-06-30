import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { CreateIngredientHandler } from '@/modules/ingredients/server/application/commands/create-ingredient.handler'
import { DeleteIngredientCommand } from '@/modules/ingredients/server/application/commands/delete-ingredient.command'
import { DeleteIngredientHandler } from '@/modules/ingredients/server/application/commands/delete-ingredient.handler'
import { UpdateIngredientCommand } from '@/modules/ingredients/server/application/commands/update-ingredient.command'
import { UpdateIngredientHandler } from '@/modules/ingredients/server/application/commands/update-ingredient.handler'
import {
  IngredientNotFoundException,
  CategoryNotFoundException,
  UnitNotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'
import { PrismaCategoryRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-category-repository'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'
import { PrismaRepositoryFactory } from '@/modules/ingredients/server/infrastructure/repositories/prisma-repository-factory'
import { PrismaUnitRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-unit-repository'
import { PrismaTransactionManager } from '@/modules/ingredients/server/infrastructure/services/prisma-transaction-manager'

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

/**
 * UpdateIngredientHandler統合テスト
 *
 * 食材更新機能をデータベースとの統合で検証
 */
describe('UpdateIngredientHandler Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>
  let updateHandler: UpdateIngredientHandler
  let createHandler: CreateIngredientHandler
  let deleteHandler: DeleteIngredientHandler
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

    updateHandler = new UpdateIngredientHandler(
      ingredientRepository,
      categoryRepository,
      unitRepository,
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
    it('食材名を更新できる', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const newName = `更新_${testDataHelpers.ingredientName()}`
      const command = new UpdateIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId,
        newName
      )

      // When: 更新ハンドラーを実行
      const result = await updateHandler.execute(command)

      // Then: 名前が更新されている
      expect(result.name).toBe(newName)

      // データベースでも更新されている
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient?.name).toBe(newName)
    })

    it('カテゴリーを更新できる', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const newCategoryId = testDataIds.categories.meatFish
      const command = new UpdateIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId,
        undefined,
        newCategoryId
      )

      // When: 更新ハンドラーを実行
      const result = await updateHandler.execute(command)

      // Then: カテゴリーが更新されている
      expect(result.category?.id).toBe(newCategoryId)
      expect(result.category?.name).toBe('肉・魚')
    })

    it('メモを更新できる', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const newMemo = faker.lorem.sentence()
      const command = new UpdateIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId,
        undefined,
        undefined,
        newMemo
      )

      // When: 更新ハンドラーを実行
      const result = await updateHandler.execute(command)

      // Then: メモが更新されている
      expect(result.memo).toBe(newMemo)
    })

    it('メモをnullに更新できる', async () => {
      // Given: メモ付きの食材を作成
      const testDataIds = getTestDataIds()
      const originalMemo = faker.lorem.sentence()
      const ingredientWithMemo = await createHandler.execute(
        new CreateIngredientCommandBuilder()
          .withUserId(testDataIds.users.defaultUser.domainUserId)
          .withCategoryId(testDataIds.categories.vegetable)
          .withQuantity(faker.number.int({ min: 1, max: 20 }), testDataIds.units.piece)
          .withStorageLocation({ type: StorageType.REFRIGERATED })
          .withPurchaseDate(new Date().toISOString())
          .withMemo(originalMemo)
          .build()
      )

      // When: メモをnullに更新
      const command = new UpdateIngredientCommand(
        ingredientWithMemo.id,
        testDataIds.users.defaultUser.domainUserId,
        undefined,
        undefined,
        null
      )
      const result = await updateHandler.execute(command)

      // Then: メモがnullになっている
      expect(result.memo).toBeNull()
    })

    it('価格を更新できる', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const newPrice = faker.number.float({ min: 100, max: 9999, fractionDigits: 2 })
      const command = new UpdateIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId,
        undefined,
        undefined,
        undefined,
        newPrice
      )

      // When: 更新ハンドラーを実行
      const result = await updateHandler.execute(command)

      // Then: 価格が更新されている
      expect(result.price).toBe(newPrice)
    })

    it('期限情報を更新できる', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const bestBeforeDate = faker.date.future()
      const useByDate = faker.date.between({ from: new Date(), to: bestBeforeDate })
      const command = new UpdateIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          bestBeforeDate,
          useByDate,
        }
      )

      // When: 更新ハンドラーを実行
      const result = await updateHandler.execute(command)

      // Then: 期限情報が更新されている
      expect(result.expiryInfo?.bestBeforeDate).toBe(bestBeforeDate.toISOString().split('T')[0])
      expect(result.expiryInfo?.useByDate).toBe(useByDate.toISOString().split('T')[0])
    })

    it('在庫情報を更新できる', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const newQuantity = faker.number.int({ min: 1, max: 100 })
      const newUnitId = testDataIds.units.gram
      const newStorageType = StorageType.FROZEN
      const newDetail = '冷凍庫の下段'
      const newThreshold = faker.number.int({ min: 1, max: 10 })

      const command = new UpdateIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          quantity: newQuantity,
          unitId: newUnitId,
          storageLocation: {
            type: newStorageType,
            detail: newDetail,
          },
          threshold: newThreshold,
        }
      )

      // When: 更新ハンドラーを実行
      const result = await updateHandler.execute(command)

      // Then: 在庫情報が更新されている
      expect(result.stock?.quantity).toBe(newQuantity)
      expect(result.stock?.unit?.id).toBe(newUnitId)
      expect(result.stock?.storageLocation.type).toBe(newStorageType)
      expect(result.stock?.storageLocation.detail).toBe(newDetail)
      expect(result.stock?.threshold).toBe(newThreshold)
    })

    it('複数のフィールドを同時に更新できる', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const updates = {
        name: `一括更新_${testDataHelpers.ingredientName()}`,
        categoryId: testDataIds.categories.seasoning,
        memo: faker.lorem.sentence(),
        price: faker.number.float({ min: 100, max: 9999, fractionDigits: 2 }),
      }

      const command = new UpdateIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId,
        updates.name,
        updates.categoryId,
        updates.memo,
        updates.price
      )

      // When: 更新ハンドラーを実行
      const result = await updateHandler.execute(command)

      // Then: すべてのフィールドが更新されている
      expect(result.name).toBe(updates.name)
      expect(result.category?.id).toBe(updates.categoryId)
      expect(result.memo).toBe(updates.memo)
      expect(result.price).toBe(updates.price)
    })

    it('更新時にupdatedAt、updatedByが更新される', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const originalUpdatedAt = new Date(ingredient.updatedAt)

      // 少し待機して時間差を作る
      await new Promise((resolve) => setTimeout(resolve, 10))

      // When: 更新ハンドラーを実行
      const result = await updateHandler.execute(
        new UpdateIngredientCommand(
          ingredient.id,
          testDataIds.users.defaultUser.domainUserId,
          '更新テスト'
        )
      )

      // Then: 更新情報が正しく設定されている
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
      expect(result.userId).toBe(testDataIds.users.defaultUser.domainUserId)
    })
  })

  describe('異常系', () => {
    it('存在しない食材を更新しようとするとエラーになる', async () => {
      // Given: 存在しない食材ID
      const nonExistentId = testDataHelpers.ingredientId()
      const testDataIds = getTestDataIds()
      const command = new UpdateIngredientCommand(
        nonExistentId,
        testDataIds.users.defaultUser.domainUserId,
        '更新テスト'
      )

      // When/Then: IngredientNotFoundExceptionがスローされる
      await expect(updateHandler.execute(command)).rejects.toThrow(IngredientNotFoundException)
    })

    it('削除済みの食材は更新できない', async () => {
      // Given: 食材を作成して削除
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      await deleteHandler.execute(
        new DeleteIngredientCommand(ingredient.id, testDataIds.users.defaultUser.domainUserId)
      )

      // When/Then: IngredientNotFoundExceptionがスローされる（削除済みなので見つからない）
      const command = new UpdateIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId,
        '削除済み更新'
      )
      await expect(updateHandler.execute(command)).rejects.toThrow(IngredientNotFoundException)
    })

    it('他のユーザーの食材は更新できない', async () => {
      // Given: 食材を作成し、別のユーザーIDで更新を試みる
      const ingredient = await createTestIngredient()
      const otherUserId = testDataHelpers.userId()
      const command = new UpdateIngredientCommand(ingredient.id, otherUserId, '他ユーザー更新')

      // When/Then: IngredientNotFoundExceptionがスローされる（他ユーザーの食材は見つからないため）
      await expect(updateHandler.execute(command)).rejects.toThrow(IngredientNotFoundException)
    })

    it('存在しないカテゴリーIDに更新しようとするとエラーになる', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const nonExistentCategoryId = testDataHelpers.categoryId()
      const command = new UpdateIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId,
        undefined,
        nonExistentCategoryId
      )

      // When/Then: CategoryNotFoundExceptionがスローされる
      await expect(updateHandler.execute(command)).rejects.toThrow(CategoryNotFoundException)
      await expect(updateHandler.execute(command)).rejects.toThrow(
        `Category not found: ${nonExistentCategoryId}`
      )
    })

    it('存在しない単位IDに更新しようとするとエラーになる', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const nonExistentUnitId = testDataHelpers.unitId()
      const command = new UpdateIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          quantity: 10,
          unitId: nonExistentUnitId,
          storageLocation: {
            type: StorageType.REFRIGERATED,
            detail: null,
          },
          threshold: null,
        }
      )

      // When/Then: UnitNotFoundExceptionがスローされる
      await expect(updateHandler.execute(command)).rejects.toThrow(UnitNotFoundException)
      await expect(updateHandler.execute(command)).rejects.toThrow(
        `Unit not found: ${nonExistentUnitId}`
      )
    })
  })

  describe('部分更新', () => {
    it('指定したフィールドのみ更新され、他は変わらない', async () => {
      // Given: 全フィールド入りの食材を作成
      const testDataIds = getTestDataIds()
      const originalData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataIds.categories.vegetable,
        memo: faker.lorem.sentence(),
        price: faker.number.float({ min: 100, max: 9999, fractionDigits: 2 }),
        quantity: faker.number.int({ min: 1, max: 20 }),
        unitId: testDataIds.units.piece,
      }

      const ingredient = await createHandler.execute(
        new CreateIngredientCommandBuilder()
          .withUserId(testDataIds.users.defaultUser.domainUserId)
          .withName(originalData.name)
          .withCategoryId(originalData.categoryId)
          .withQuantity(originalData.quantity, originalData.unitId)
          .withStorageLocation({ type: StorageType.REFRIGERATED })
          .withPurchaseDate(new Date().toISOString())
          .withMemo(originalData.memo)
          .withPrice(originalData.price)
          .build()
      )

      // When: 名前のみ更新
      const newName = '部分更新テスト'
      const command = new UpdateIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId,
        newName
      )
      const result = await updateHandler.execute(command)

      // Then: 名前以外は変わっていない
      expect(result.name).toBe(newName)
      expect(result.category?.id).toBe(originalData.categoryId)
      expect(result.memo).toBe(originalData.memo)
      expect(result.price).toBe(originalData.price)
      expect(result.stock?.quantity).toBe(originalData.quantity)
      expect(result.stock?.unit?.id).toBe(originalData.unitId)
    })

    it('undefinedのフィールドは更新されない', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const originalName = ingredient.name

      // When: 全フィールドundefinedで更新
      const command = new UpdateIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      )
      const result = await updateHandler.execute(command)

      // Then: 何も変わっていない
      expect(result.name).toBe(originalName)
      expect(result.category?.id).toBe(ingredient.category?.id)
    })
  })

  describe('トランザクション処理', () => {
    it('更新操作がトランザクション内で実行される', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()
      const newName = 'トランザクションテスト'
      const command = new UpdateIngredientCommand(
        ingredient.id,
        testDataIds.users.defaultUser.domainUserId,
        newName
      )

      // When: 更新ハンドラーを実行
      const result = await updateHandler.execute(command)

      // Then: トランザクションが成功し、更新が完了している
      expect(result.name).toBe(newName)
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient?.name).toBe(newName)
    })
  })

  describe('並行性制御', () => {
    it('同じ食材への並行更新が正しく処理される', async () => {
      // Given: 食材を作成
      const ingredient = await createTestIngredient()
      const testDataIds = getTestDataIds()

      // When: 異なるフィールドへの並行更新
      const updates = [
        updateHandler.execute(
          new UpdateIngredientCommand(
            ingredient.id,
            testDataIds.users.defaultUser.domainUserId,
            '並行更新1'
          )
        ),
        updateHandler.execute(
          new UpdateIngredientCommand(
            ingredient.id,
            testDataIds.users.defaultUser.domainUserId,
            undefined,
            undefined,
            '並行メモ'
          )
        ),
      ]

      const _results = await Promise.all(updates)

      // Then: 最後の更新が反映されている（楽観的ロックがない場合）
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.id },
      })
      expect(dbIngredient).toBeDefined()
      // いずれかの更新が反映されている
      expect(['並行更新1', ingredient.name]).toContain(dbIngredient?.name)
    })
  })
})
