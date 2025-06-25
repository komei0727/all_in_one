/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'

import {
  IngredientId,
  IngredientName,
  StorageType,
  StorageLocation,
  UnitId,
  IngredientStock,
  Price,
  ExpiryInfo,
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
const createIngredientForIntegrationTest = () => {
  const stock = new IngredientStock({
    quantity: faker.number.float({ min: 1, max: 100, fractionDigits: 2 }),
    unitId: new UnitId('unit0001'), // 実在する単位ID
    storageLocation: new StorageLocation(
      faker.helpers.arrayElement([
        StorageType.REFRIGERATED,
        StorageType.FROZEN,
        StorageType.ROOM_TEMPERATURE,
      ]),
      faker.helpers.maybe(() => faker.lorem.word())
    ),
    threshold: faker.helpers.maybe(() =>
      faker.number.float({ min: 0, max: 10, fractionDigits: 2 })
    ),
  })

  return new IngredientBuilder()
    .withUserId('test-user-' + faker.string.uuid())
    .withCategoryId('cat00001') // 実在するカテゴリーID
    .withIngredientStock(stock)
    .withPrice(
      faker.helpers.maybe(
        () => new Price(faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }))
      ) ?? null
    )
    .withExpiryInfo(
      faker.helpers.maybe(
        () =>
          new ExpiryInfo({
            bestBeforeDate: faker.date.future(),
            useByDate: faker.helpers.maybe(() => faker.date.future()) ?? null,
          })
      ) ?? null
    )
    .build()
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
    it('新しい食材を保存できる', async () => {
      // Given: 食材エンティティを作成
      const ingredient = createIngredientForIntegrationTest()
      const ingredientName = ingredient.getName().getValue()
      const memoText = ingredient.getMemo()?.getValue()
      const userId = ingredient.getUserId()
      const price = ingredient.getPrice()?.getValue()
      const purchaseDate = ingredient.getPurchaseDate()
      const stock = ingredient.getIngredientStock()
      const expiryInfo = ingredient.getExpiryInfo()

      // When: 食材を保存
      const savedIngredient = await repository.save(ingredient)

      // Then: 保存された食材が正しい
      expect(savedIngredient.getId().getValue()).toBe(ingredient.getId().getValue())
      expect(savedIngredient.getName().getValue()).toBe(ingredientName)
      expect(savedIngredient.getCategoryId().getValue()).toBe('cat00001')
      expect(savedIngredient.getMemo()?.getValue()).toBe(memoText)
      expect(savedIngredient.getUserId()).toBe(userId)
      expect(savedIngredient.getPrice()?.getValue()).toBe(price)
      expect(savedIngredient.getPurchaseDate()).toEqual(purchaseDate)

      // 在庫情報も正しく保存されている
      const savedStock = savedIngredient.getIngredientStock()
      expect(savedStock).toBeDefined()
      expect(savedStock.getQuantity()).toBe(stock.getQuantity())
      expect(savedStock.getUnitId().getValue()).toBe('unit0001')
      expect(savedStock.getStorageLocation().getType()).toBe(stock.getStorageLocation().getType())
      expect(savedStock.getStorageLocation().getDetail()).toBe(
        stock.getStorageLocation().getDetail()
      )
      expect(savedStock.getThreshold()).toBe(stock.getThreshold())

      // 期限情報も正しく保存されている
      if (expiryInfo) {
        expect(savedIngredient.getExpiryInfo()?.getBestBeforeDate()).toEqual(
          expiryInfo.getBestBeforeDate()
        )
        expect(savedIngredient.getExpiryInfo()?.getUseByDate()).toEqual(expiryInfo.getUseByDate())
      }

      // データベースに実際に保存されていることを確認
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.getId().getValue() },
      })
      expect(dbIngredient).toBeDefined()
      expect(dbIngredient?.userId).toBe(userId)
      expect(dbIngredient?.quantity).toBe(stock.getQuantity())
    })

    it('既存の食材を更新できる', async () => {
      // Given: 既存の食材を作成
      const ingredientId = IngredientId.generate()
      const userId = 'test-user-123'
      const oldName = faker.food.ingredient()
      const oldMemo = faker.lorem.sentence()
      await prisma.ingredient.create({
        data: {
          id: ingredientId.getValue(),
          userId,
          name: oldName,
          categoryId: 'cat00001',
          memo: oldMemo,
          purchaseDate: new Date(),
          quantity: 10,
          unitId: 'unit0001',
          storageLocationType: 'REFRIGERATED',
        },
      })

      // 更新用の食材エンティティ
      const newName = faker.food.ingredient()
      const newMemo = faker.lorem.sentence()
      const newStock = new IngredientStock({
        quantity: 20,
        unitId: new UnitId('unit0001'),
        storageLocation: new StorageLocation(StorageType.FROZEN, '冷凍庫'),
        threshold: 5,
      })

      const updatedIngredient = new IngredientBuilder()
        .withId(ingredientId)
        .withUserId(userId)
        .withName(newName)
        .withCategoryId('cat00001')
        .withMemo(newMemo)
        .withIngredientStock(newStock)
        .build()

      // When: 食材を更新
      const savedIngredient = await repository.save(updatedIngredient)

      // Then: 更新が反映されている
      expect(savedIngredient.getName().getValue()).toBe(newName)
      expect(savedIngredient.getMemo()?.getValue()).toBe(newMemo)
      expect(savedIngredient.getIngredientStock().getQuantity()).toBe(20)
      expect(savedIngredient.getIngredientStock().getStorageLocation().getType()).toBe(
        StorageType.FROZEN
      )
    })
  })

  describe('findById', () => {
    it('IDで食材を検索できる', async () => {
      // Given: テストデータを作成
      const ingredientId = faker.string.uuid()
      const userId = 'test-user-123'
      const ingredientName = faker.food.ingredient()
      const ingredientMemo = faker.lorem.sentence()
      const stockQuantity = faker.number.float({ min: 1, max: 20, fractionDigits: 2 })
      const price = faker.number.float({ min: 100, max: 1000, fractionDigits: 2 })
      const purchaseDate = faker.date.recent({ days: 7 })

      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          userId,
          name: ingredientName,
          categoryId: 'cat00001',
          memo: ingredientMemo,
          price,
          purchaseDate,
          quantity: stockQuantity,
          unitId: 'unit0001',
          threshold: 5,
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: '野菜室',
          bestBeforeDate: faker.date.future(),
        },
      })

      // When: IDで検索
      const found = await repository.findById(new IngredientId(ingredientId))

      // Then: 食材が見つかる
      expect(found).toBeDefined()
      expect(found?.getName().getValue()).toBe(ingredientName)
      expect(found?.getMemo()?.getValue()).toBe(ingredientMemo)
      expect(found?.getUserId()).toBe(userId)
      expect(found?.getPrice()?.getValue()).toBe(price)
      expect(found?.getPurchaseDate()).toEqual(purchaseDate)
      expect(found?.getIngredientStock().getQuantity()).toBe(stockQuantity)
      expect(found?.getIngredientStock().getThreshold()).toBe(5)
    })

    it('存在しないIDの場合nullを返す', async () => {
      // When: 存在しないIDで検索
      const nonExistentId = faker.string.uuid()
      const found = await repository.findById(new IngredientId(nonExistentId))

      // Then: nullが返される
      expect(found).toBeNull()
    })

    it('論理削除された食材は検索されない', async () => {
      // Given: 論理削除された食材
      const ingredientId = faker.string.uuid()
      const userId = 'test-user-123'
      const deletedIngredientName = faker.food.ingredient()
      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          userId,
          name: deletedIngredientName,
          categoryId: 'cat00001',
          purchaseDate: new Date(),
          quantity: 10,
          unitId: 'unit0001',
          storageLocationType: 'REFRIGERATED',
          deletedAt: faker.date.past(),
        },
      })

      // When: 検索
      const found = await repository.findById(new IngredientId(ingredientId))

      // Then: 見つからない
      expect(found).toBeNull()
    })
  })

  describe('findByName', () => {
    it('名前で食材を検索できる', async () => {
      // Given: テストデータ
      const ingredientId = faker.string.uuid()
      const userId = 'test-user-123'
      const ingredientName = faker.food.ingredient()
      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          userId,
          name: ingredientName,
          categoryId: 'cat00001',
          purchaseDate: new Date(),
          quantity: 10,
          unitId: 'unit0001',
          storageLocationType: 'REFRIGERATED',
        },
      })

      // When: 名前で検索
      const found = await repository.findByName(new IngredientName(ingredientName))

      // Then: 食材が見つかる
      expect(found).toBeDefined()
      expect(found?.getId().getValue()).toBe(ingredientId)
    })

    it('同名の食材が複数ある場合は最初の1件を返す', async () => {
      // Given: 同名の食材を複数作成
      const duplicateName = faker.food.ingredient()
      const userId = 'test-user-123'
      const id1 = faker.string.uuid()
      const id2 = faker.string.uuid()
      await prisma.ingredient.createMany({
        data: [
          {
            id: id1,
            userId,
            name: duplicateName,
            categoryId: 'cat00001',
            purchaseDate: new Date(),
            quantity: 10,
            unitId: 'unit0001',
            storageLocationType: 'REFRIGERATED',
          },
          {
            id: id2,
            userId: 'test-user-456',
            name: duplicateName,
            categoryId: 'cat00002',
            purchaseDate: new Date(),
            quantity: 20,
            unitId: 'unit0001',
            storageLocationType: 'FROZEN',
          },
        ],
      })

      // When: 名前で検索
      const found = await repository.findByName(new IngredientName(duplicateName))

      // Then: 1件のみ返される
      expect(found).toBeDefined()
      expect([id1, id2]).toContain(found?.getId().getValue())
    })
  })

  describe('findAll', () => {
    it('すべての食材を取得できる', async () => {
      // Given: 複数の食材を作成
      const userId = 'test-user-123'
      const names = Array.from({ length: 3 }, () => faker.food.ingredient())
      await prisma.ingredient.createMany({
        data: [
          {
            id: faker.string.uuid(),
            userId,
            name: names[0],
            categoryId: 'cat00001',
            purchaseDate: new Date(),
            quantity: 10,
            unitId: 'unit0001',
            storageLocationType: 'REFRIGERATED',
          },
          {
            id: faker.string.uuid(),
            userId,
            name: names[1],
            categoryId: 'cat00002',
            purchaseDate: new Date(),
            quantity: 20,
            unitId: 'unit0001',
            storageLocationType: 'FROZEN',
          },
          {
            id: faker.string.uuid(),
            userId: 'test-user-456',
            name: names[2],
            categoryId: 'cat00003',
            purchaseDate: new Date(),
            quantity: 30,
            unitId: 'unit0001',
            storageLocationType: 'ROOM_TEMPERATURE',
          },
        ],
      })

      // When: すべて取得
      const ingredients = await repository.findAll()

      // Then: 3件取得される
      expect(ingredients).toHaveLength(3)
      const foundNames = ingredients.map((i) => i.getName().getValue())
      names.forEach((name) => {
        expect(foundNames).toContain(name)
      })
    })

    it('論理削除された食材は含まれない', async () => {
      // Given: 削除済みと通常の食材
      const userId = 'test-user-123'
      const activeName = faker.food.ingredient()
      const deletedName = faker.food.ingredient()
      await prisma.ingredient.createMany({
        data: [
          {
            id: faker.string.uuid(),
            userId,
            name: activeName,
            categoryId: 'cat00001',
            purchaseDate: new Date(),
            quantity: 10,
            unitId: 'unit0001',
            storageLocationType: 'REFRIGERATED',
          },
          {
            id: faker.string.uuid(),
            userId,
            name: deletedName,
            categoryId: 'cat00001',
            purchaseDate: new Date(),
            quantity: 20,
            unitId: 'unit0001',
            storageLocationType: 'FROZEN',
            deletedAt: faker.date.past(),
          },
        ],
      })

      // When: すべて取得
      const ingredients = await repository.findAll()

      // Then: アクティブな食材のみ
      expect(ingredients).toHaveLength(1)
      expect(ingredients[0].getName().getValue()).toBe(activeName)
    })
  })

  describe('findByUserId', () => {
    it('ユーザーIDで食材を検索できる', async () => {
      // Given: 複数ユーザーの食材
      const userId1 = 'test-user-123'
      const userId2 = 'test-user-456'
      const name1 = faker.food.ingredient()
      const name2 = faker.food.ingredient()
      const name3 = faker.food.ingredient()

      await prisma.ingredient.createMany({
        data: [
          {
            id: faker.string.uuid(),
            userId: userId1,
            name: name1,
            categoryId: 'cat00001',
            purchaseDate: new Date(),
            quantity: 10,
            unitId: 'unit0001',
            storageLocationType: 'REFRIGERATED',
          },
          {
            id: faker.string.uuid(),
            userId: userId1,
            name: name2,
            categoryId: 'cat00002',
            purchaseDate: new Date(),
            quantity: 20,
            unitId: 'unit0001',
            storageLocationType: 'FROZEN',
          },
          {
            id: faker.string.uuid(),
            userId: userId2,
            name: name3,
            categoryId: 'cat00001',
            purchaseDate: new Date(),
            quantity: 30,
            unitId: 'unit0001',
            storageLocationType: 'ROOM_TEMPERATURE',
          },
        ],
      })

      // When: ユーザー1の食材を検索
      const user1Ingredients = await repository.findByUserId(userId1)

      // Then: ユーザー1の食材のみ取得される
      expect(user1Ingredients).toHaveLength(2)
      const foundNames = user1Ingredients.map((i) => i.getName().getValue())
      expect(foundNames).toContain(name1)
      expect(foundNames).toContain(name2)
      expect(foundNames).not.toContain(name3)
    })
  })

  describe('delete', () => {
    it('食材を論理削除できる', async () => {
      // Given: 食材を作成
      const ingredientId = faker.string.uuid()
      const userId = 'test-user-123'
      const ingredientName = faker.food.ingredient()
      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          userId,
          name: ingredientName,
          categoryId: 'cat00001',
          purchaseDate: new Date(),
          quantity: 10,
          unitId: 'unit0001',
          storageLocationType: 'REFRIGERATED',
        },
      })

      // When: 削除
      await repository.delete(new IngredientId(ingredientId))

      // Then: 論理削除されている
      const deleted = await prisma.ingredient.findUnique({
        where: { id: ingredientId },
      })
      expect(deleted?.deletedAt).toBeDefined()
      expect(deleted?.deletedAt).toBeInstanceOf(Date)

      // 検索では見つからない
      const found = await repository.findById(new IngredientId(ingredientId))
      expect(found).toBeNull()
    })
  })

  describe('外部キー制約のテスト', () => {
    it('存在しないカテゴリーIDで保存するとエラーになる', async () => {
      // Given: 存在しないカテゴリーIDを持つ食材
      const nonExistentCategoryId = faker.string.uuid()
      const stock = new IngredientStock({
        quantity: 10,
        unitId: new UnitId('unit0001'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const ingredient = new IngredientBuilder()
        .withUserId('test-user-123')
        .withCategoryId(nonExistentCategoryId)
        .withIngredientStock(stock)
        .build()

      // When/Then: 保存時にエラー
      await expect(repository.save(ingredient)).rejects.toThrow()
    })

    it('存在しない単位IDで保存するとエラーになる', async () => {
      // Given: 存在しない単位IDを持つ在庫
      const nonExistentUnitId = faker.string.uuid()
      const stock = new IngredientStock({
        quantity: 10,
        unitId: new UnitId(nonExistentUnitId),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const ingredient = new IngredientBuilder()
        .withUserId('test-user-123')
        .withCategoryId('cat00001')
        .withIngredientStock(stock)
        .build()

      // When/Then: 保存時にエラー
      await expect(repository.save(ingredient)).rejects.toThrow()
    })
  })

  describe('Decimal型（価格）の処理', () => {
    it('価格をDecimal型で正しく保存・取得できる', async () => {
      // Given: 小数点を含む価格を持つ食材
      const precisePrice = faker.number.float({ min: 100, max: 9999, fractionDigits: 2 })
      const stock = new IngredientStock({
        quantity: 10,
        unitId: new UnitId('unit0001'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const ingredient = new IngredientBuilder()
        .withUserId('test-user-123')
        .withCategoryId('cat00001')
        .withIngredientStock(stock)
        .withPrice(new Price(precisePrice))
        .build()

      // When: 保存して取得
      await repository.save(ingredient)
      const found = await repository.findById(ingredient.getId())

      // Then: 価格が正確に保持されている
      expect(found?.getPrice()?.getValue()).toBe(precisePrice)
    })
  })
})
