/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'

import {
  IngredientId,
  IngredientName,
  StorageType,
} from '@/modules/ingredients/server/domain/value-objects'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'

import { IngredientBuilder } from '../../../../../../__fixtures__/builders'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
} from '../../../../../../helpers/database.helper'

// テストデータ生成用のヘルパー関数
// 統合テストなので、実在するカテゴリーや単位IDをデフォルトで設定
const createIngredientForIntegrationTest = (overrides?: {
  storageType?: StorageType
  storageDetail?: string
  price?: number
  unitId?: string
  userId?: string
}) => {
  const builder = new IngredientBuilder()
    .withCategoryId('cat00001') // 実在するカテゴリーID
    .withUnitId(overrides?.unitId || 'unit0001') // 実在する単位ID
    .withUserId(overrides?.userId || 'test-user-id')

  if (overrides?.storageType) {
    builder.withStorageLocationDetails(overrides.storageType, overrides.storageDetail)
  }
  if (overrides?.price !== undefined) {
    builder.withPrice(overrides.price)
  }

  return builder.build()
}

describe('PrismaIngredientRepository Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>
  let repository: PrismaIngredientRepository

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()
    repository = new PrismaIngredientRepository(prisma as any)
  })

  afterEach(async () => {
    // 各テストの後にデータベースをクリーンアップ
    await cleanupIntegrationTest()
  })

  afterAll(async () => {
    // 全テスト終了後にPrismaクライアントを切断
    await cleanupPrismaClient()
  })

  describe('save', () => {
    it('新しい食材と在庫を保存できる', async () => {
      // Given: 食材エンティティを作成
      const ingredient = createIngredientForIntegrationTest({
        storageType: StorageType.REFRIGERATED,
        storageDetail: '野菜室',
      })
      const ingredientName = ingredient.getName().getValue()
      const memoText = ingredient.getMemo()?.getValue()
      const stockQuantity = ingredient.getQuantity().getValue()
      const stockPrice = ingredient.getPrice()?.getValue()

      // When: 食材を保存
      const savedIngredient = await repository.save(ingredient)

      // Then: 保存された食材が正しい
      expect(savedIngredient.getId().getValue()).toBe(ingredient.getId().getValue())
      expect(savedIngredient.getName().getValue()).toBe(ingredientName)
      expect(savedIngredient.getCategoryId().getValue()).toBe('cat00001')
      expect(savedIngredient.getMemo()?.getValue()).toBe(memoText)

      // 在庫情報も正しく保存されている（統合されたエンティティ）
      expect(savedIngredient.getQuantity().getValue()).toBe(stockQuantity)
      expect(savedIngredient.getUnitId().getValue()).toBe('unit0001')
      expect(savedIngredient.getStorageLocation().getType()).toBe(StorageType.REFRIGERATED)
      expect(savedIngredient.getStorageLocation().getDetail()).toBe('野菜室')
      expect(savedIngredient.getPrice()?.getValue()).toBe(stockPrice)

      // データベースを直接確認
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.getId().getValue() },
      })
      expect(dbIngredient).toBeDefined()
      expect(dbIngredient?.quantity).toBe(stockQuantity)
    })

    it('既存の食材を更新できる', async () => {
      // Given: 既存の食材を作成
      const ingredientId = IngredientId.generate()
      const oldName = faker.food.ingredient()
      const oldMemo = faker.lorem.sentence()
      const oldQuantity = faker.number.int({ min: 1, max: 10 })
      await prisma.ingredient.create({
        data: {
          id: ingredientId.getValue(),
          userId: 'test-user-id',
          name: oldName,
          categoryId: 'cat00001',
          memo: oldMemo,
          quantity: oldQuantity,
          unitId: 'unit0001',
          storageLocationType: 'REFRIGERATED',
          purchaseDate: new Date(),
        },
      })

      // 更新用の食材エンティティ
      const newName = faker.food.ingredient()
      const newMemo = faker.lorem.sentence()
      const newQuantity = faker.number.int({ min: 11, max: 20 })
      const updatedIngredient = new IngredientBuilder()
        .withId(ingredientId)
        .withUserId('test-user-id')
        .withName(newName)
        .withCategoryId('cat00001')
        .withMemo(newMemo)
        .withQuantity(newQuantity)
        .withUnitId('unit0001')
        .build()

      // When: 食材を更新
      const savedIngredient = await repository.save(updatedIngredient)

      // Then: 更新が反映されている
      expect(savedIngredient.getName().getValue()).toBe(newName)
      expect(savedIngredient.getMemo()?.getValue()).toBe(newMemo)
      expect(savedIngredient.getQuantity().getValue()).toBe(newQuantity)
    })

    it('トランザクション内で食材と在庫を同時に保存できる', async () => {
      // Given: 食材を準備（在庫情報は統合済み）
      const ingredient = createIngredientForIntegrationTest({
        storageType: StorageType.FROZEN,
        storageDetail: '冷凍庫',
      })
      const stockQuantity = ingredient.getQuantity().getValue()

      // When: 保存
      await repository.save(ingredient)

      // Then: 食材と在庫情報が一緒に保存されている
      const dbResult = await prisma.ingredient.findUnique({
        where: { id: ingredient.getId().getValue() },
      })

      expect(dbResult).toBeDefined()
      expect(dbResult?.quantity).toBe(stockQuantity)
      expect(dbResult?.storageLocationType).toBe('FROZEN')
      expect(dbResult?.storageLocationDetail).toBe('冷凍庫')
    })
  })

  describe('findById', () => {
    it('IDで食材を検索できる', async () => {
      // Given: テストデータを作成
      const ingredientId = IngredientId.generate().getValue()
      const ingredientName = faker.food.ingredient()
      const ingredientMemo = faker.lorem.sentence()
      const stockQuantity = faker.number.int({ min: 1, max: 20 })

      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          userId: 'test-user-id',
          name: ingredientName,
          categoryId: 'cat00001',
          unitId: 'unit0001',
          memo: ingredientMemo,
          quantity: stockQuantity,
          storageLocationType: 'REFRIGERATED',
          purchaseDate: faker.date.recent({ days: 7 }),
        },
      })

      // When: IDで検索
      const found = await repository.findById(new IngredientId(ingredientId))

      // Then: 食材が見つかる
      expect(found).toBeDefined()
      expect(found?.getName().getValue()).toBe(ingredientName)
      expect(found?.getMemo()?.getValue()).toBe(ingredientMemo)
      expect(found?.getQuantity().getValue()).toBe(stockQuantity)
    })

    it('存在しないIDの場合nullを返す', async () => {
      // When: 存在しないIDで検索
      const nonExistentId = IngredientId.generate()
      const found = await repository.findById(nonExistentId)

      // Then: nullが返される
      expect(found).toBeNull()
    })

    it('論理削除された食材は検索されない', async () => {
      // Given: 論理削除された食材
      const ingredientId = IngredientId.generate().getValue()
      const deletedIngredientName = faker.food.ingredient()
      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          userId: 'test-user-id',
          name: deletedIngredientName,
          categoryId: 'cat00001',
          unitId: 'unit0001',
          quantity: 1,
          storageLocationType: 'ROOM_TEMPERATURE',
          purchaseDate: new Date(),
          deletedAt: faker.date.past(),
        },
      })

      // When: 検索
      const found = await repository.findById(new IngredientId(ingredientId))

      // Then: 見つからない
      expect(found).toBeNull()
    })

    it('アクティブな最新の在庫のみを取得する', async () => {
      // Given: 食材を作成
      const ingredientId = IngredientId.generate().getValue()
      const ingredientName = faker.food.ingredient()
      const currentQuantity = faker.number.int({ min: 10, max: 20 })

      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          userId: 'test-user-id',
          name: ingredientName,
          categoryId: 'cat00001',
          unitId: 'unit0001',
          quantity: currentQuantity,
          storageLocationType: 'REFRIGERATED',
          purchaseDate: new Date(),
        },
      })

      // When: 検索
      const found = await repository.findById(new IngredientId(ingredientId))

      // Then: 最新の在庫情報が取得される
      expect(found).toBeDefined()
      expect(found?.getQuantity().getValue()).toBe(currentQuantity)
    })
  })

  describe('findByUserIdAndName', () => {
    it('ユーザーIDと名前で食材を検索できる', async () => {
      // Given: 食材を作成
      const ingredientName = faker.food.ingredient()
      const userId = 'test-user-id'
      await prisma.ingredient.create({
        data: {
          id: IngredientId.generate().getValue(),
          userId: userId,
          name: ingredientName,
          categoryId: 'cat00001',
          unitId: 'unit0001',
          quantity: 5,
          storageLocationType: 'REFRIGERATED',
          purchaseDate: new Date(),
        },
      })

      // When: ユーザーIDと名前で検索
      const found = await repository.findByUserIdAndName(userId, new IngredientName(ingredientName))

      // Then: 食材が見つかる
      expect(found).toBeDefined()
      expect(found?.getName().getValue()).toBe(ingredientName)
    })

    it('同名の食材が複数ある場合は最初の1件を返す', async () => {
      // Given: 同名の食材を複数作成
      const ingredientName = faker.food.ingredient()
      const userId = 'test-user-id'
      const id1 = IngredientId.generate().getValue()
      const id2 = IngredientId.generate().getValue()

      await prisma.ingredient.createMany({
        data: [
          {
            id: id1,
            userId: userId,
            name: ingredientName,
            categoryId: 'cat00001',
            unitId: 'unit0001',
            quantity: 5,
            storageLocationType: 'REFRIGERATED',
            purchaseDate: new Date(),
          },
          {
            id: id2,
            userId: userId,
            name: ingredientName,
            categoryId: 'cat00002',
            unitId: 'unit0002',
            quantity: 10,
            storageLocationType: 'FROZEN',
            purchaseDate: new Date(),
          },
        ],
      })

      // When: ユーザーIDと名前で検索
      const found = await repository.findByUserIdAndName(userId, new IngredientName(ingredientName))

      // Then: 1件のみ返される
      expect(found).toBeDefined()
      expect(found?.getName().getValue()).toBe(ingredientName)
    })

    it('異なるユーザーの同名食材は検索されない', async () => {
      // Given: 異なるユーザーで同名の食材を作成
      const ingredientName = faker.food.ingredient()
      const userId1 = 'test-user-id-1'
      const userId2 = 'test-user-id-2'

      await prisma.ingredient.create({
        data: {
          id: IngredientId.generate().getValue(),
          userId: userId1,
          name: ingredientName,
          categoryId: 'cat00001',
          unitId: 'unit0001',
          quantity: 5,
          storageLocationType: 'REFRIGERATED',
          purchaseDate: new Date(),
        },
      })

      // When: 別のユーザーIDで検索
      const found = await repository.findByUserIdAndName(
        userId2,
        new IngredientName(ingredientName)
      )

      // Then: 見つからない
      expect(found).toBeNull()
    })
  })

  describe('findAll', () => {
    it('すべての食材を取得できる', async () => {
      // Given: 複数の食材を作成
      const names = [faker.food.ingredient(), faker.food.ingredient(), faker.food.ingredient()]
      for (const name of names) {
        await prisma.ingredient.create({
          data: {
            id: IngredientId.generate().getValue(),
            userId: 'test-user-id',
            name,
            categoryId: 'cat00001',
            unitId: 'unit0001',
            quantity: faker.number.int({ min: 1, max: 20 }),
            storageLocationType: 'REFRIGERATED',
            purchaseDate: new Date(),
          },
        })
      }

      // When: すべて取得
      const ingredients = await repository.findAll()

      // Then: すべての食材が取得される
      expect(ingredients.length).toBeGreaterThanOrEqual(3)
      const foundNames = ingredients.map((i) => i.getName().getValue())
      names.forEach((name) => {
        expect(foundNames).toContain(name)
      })
    })

    it('論理削除された食材は含まれない', async () => {
      // Given: アクティブと削除済みの食材を作成
      const activeName = faker.food.ingredient()
      const deletedName = faker.food.ingredient()

      await prisma.ingredient.create({
        data: {
          id: IngredientId.generate().getValue(),
          userId: 'test-user-id',
          name: activeName,
          categoryId: 'cat00001',
          unitId: 'unit0001',
          quantity: 5,
          storageLocationType: 'REFRIGERATED',
          purchaseDate: new Date(),
        },
      })

      await prisma.ingredient.create({
        data: {
          id: IngredientId.generate().getValue(),
          userId: 'test-user-id',
          name: deletedName,
          categoryId: 'cat00001',
          unitId: 'unit0001',
          quantity: 5,
          storageLocationType: 'REFRIGERATED',
          purchaseDate: new Date(),
          deletedAt: new Date(),
        },
      })

      // When: すべて取得
      const ingredients = await repository.findAll()

      // Then: アクティブな食材のみ取得される
      const names = ingredients.map((i) => i.getName().getValue())
      expect(names).toContain(activeName)
      expect(names).not.toContain(deletedName)
    })
  })

  describe('delete', () => {
    it('食材を論理削除できる', async () => {
      // Given: 食材を作成
      const ingredient = createIngredientForIntegrationTest()
      await repository.save(ingredient)

      // When: 削除
      await repository.delete(ingredient.getId())

      // Then: 論理削除されている
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.getId().getValue() },
      })
      expect(dbIngredient?.deletedAt).toBeDefined()

      // 検索されない
      const found = await repository.findById(ingredient.getId())
      expect(found).toBeNull()
    })
  })

  describe('外部キー制約のテスト', () => {
    it('存在しないカテゴリーIDで保存するとエラーになる', async () => {
      // Given: 存在しないカテゴリーIDを持つ食材
      const ingredient = new IngredientBuilder()
        .withCategoryId('non-existent-category')
        .withUnitId('unit0001')
        .withUserId('test-user-id')
        .build()

      // When & Then: エラーが発生
      await expect(repository.save(ingredient)).rejects.toThrow()
    })

    it('存在しない単位IDで在庫を保存するとエラーになる', async () => {
      // Given: 存在しない単位IDを持つ食材
      const ingredient = new IngredientBuilder()
        .withCategoryId('cat00001')
        .withUnitId('non-existent-unit')
        .withUserId('test-user-id')
        .build()

      // When & Then: エラーが発生
      await expect(repository.save(ingredient)).rejects.toThrow()
    })
  })

  describe('Decimal型（価格）の処理', () => {
    it('価格をDecimal型で正しく保存・取得できる', async () => {
      // Given: 価格を持つ食材
      const price = 123.45
      const ingredient = createIngredientForIntegrationTest({ price })

      // When: 保存して取得
      await repository.save(ingredient)
      const found = await repository.findById(ingredient.getId())

      // Then: 価格が正しく保存・取得される
      expect(found?.getPrice()?.getValue()).toBe(price)
    })
  })
})
