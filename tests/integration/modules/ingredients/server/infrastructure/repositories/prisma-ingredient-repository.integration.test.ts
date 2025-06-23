/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'

import {
  IngredientId,
  IngredientName,
  StorageType,
} from '@/modules/ingredients/server/domain/value-objects'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'

import { IngredientBuilder, IngredientStockBuilder } from '../../../../../../__fixtures__/builders'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
} from '../../../../../../helpers/database.helper'

// テストデータ生成用のヘルパー関数
// 統合テストなので、実在するカテゴリーや単位IDをデフォルトで設定
const createIngredientForIntegrationTest = () => {
  return new IngredientBuilder()
    .withCategoryId('cat00001') // 実在するカテゴリーID
    .build()
}

const createStockForIntegrationTest = (overrides?: {
  storageType?: StorageType
  storageDetail?: string
  price?: number
  unitId?: string
}) => {
  const builder = new IngredientStockBuilder().withUnitId(overrides?.unitId || 'unit0001') // 実在する単位ID

  if (overrides?.storageType) {
    builder.withStorageType(overrides.storageType)
  }
  if (overrides?.storageDetail) {
    builder.withStorageDetail(overrides.storageDetail)
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
      const ingredient = createIngredientForIntegrationTest()
      const ingredientName = ingredient.getName().getValue()
      const memoText = ingredient.getMemo()?.getValue()

      // 在庫情報を設定
      const stock = createStockForIntegrationTest({
        storageType: StorageType.REFRIGERATED,
        storageDetail: '野菜室',
      })
      ingredient.setStock(stock)
      const stockQuantity = stock.getQuantity().getValue()
      const stockPrice = stock.getPrice()?.getValue()

      // When: 食材を保存
      const savedIngredient = await repository.save(ingredient)

      // Then: 保存された食材が正しい
      expect(savedIngredient.getId().getValue()).toBe(ingredient.getId().getValue())
      expect(savedIngredient.getName().getValue()).toBe(ingredientName)
      expect(savedIngredient.getCategoryId().getValue()).toBe('cat00001')
      expect(savedIngredient.getMemo()?.getValue()).toBe(memoText)

      // 在庫情報も正しく保存されている
      const savedStock = savedIngredient.getCurrentStock()
      expect(savedStock).toBeDefined()
      expect(savedStock?.getQuantity().getValue()).toBe(stockQuantity)
      expect(savedStock?.getUnitId().getValue()).toBe('unit0001')
      expect(savedStock?.getStorageLocation().getType()).toBe(StorageType.REFRIGERATED)
      expect(savedStock?.getStorageLocation().getDetail()).toBe('野菜室')
      expect(savedStock?.getPrice()?.getValue()).toBe(stockPrice)

      // データベースに実際に保存されていることを確認
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.getId().getValue() },
        include: { stocks: true },
      })
      expect(dbIngredient).toBeDefined()
      expect(dbIngredient?.stocks).toHaveLength(1)
    })

    it('既存の食材を更新できる', async () => {
      // Given: 既存の食材を作成
      const ingredientId = IngredientId.generate()
      const oldName = faker.food.ingredient()
      const oldMemo = faker.lorem.sentence()
      await prisma.ingredient.create({
        data: {
          id: ingredientId.getValue(),
          name: oldName,
          categoryId: 'cat00001',
          memo: oldMemo,
        },
      })

      // 更新用の食材エンティティ
      const newName = faker.food.ingredient()
      const newMemo = faker.lorem.sentence()
      const updatedIngredient = new IngredientBuilder()
        .withId(ingredientId)
        .withName(newName)
        .withCategoryId('cat00001')
        .withMemo(newMemo)
        .build()

      // When: 食材を更新
      const savedIngredient = await repository.save(updatedIngredient)

      // Then: 更新が反昘されている
      expect(savedIngredient.getName().getValue()).toBe(newName)
      expect(savedIngredient.getMemo()?.getValue()).toBe(newMemo)
    })

    it('トランザクション内で食材と在庫を同時に保存できる', async () => {
      // Given: 食材と在庫を準備
      const ingredient = createIngredientForIntegrationTest()
      const stock = createStockForIntegrationTest()
      ingredient.setStock(stock)
      const stockQuantity = stock.getQuantity().getValue()

      // When: 保存
      await repository.save(ingredient)

      // Then: 両方が保存されている
      const dbResult = await prisma.ingredient.findUnique({
        where: { id: ingredient.getId().getValue() },
        include: { stocks: true },
      })

      expect(dbResult).toBeDefined()
      expect(dbResult?.stocks).toHaveLength(1)
      expect(dbResult?.stocks[0].quantity).toBe(stockQuantity)
    })
  })

  describe('findById', () => {
    it('IDで食材を検索できる', async () => {
      // Given: テストデータを作成
      const ingredientId = faker.string.uuid()
      const ingredientName = faker.food.ingredient()
      const ingredientMemo = faker.lorem.sentence()
      const stockQuantity = faker.number.int({ min: 1, max: 20 })

      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          name: ingredientName,
          categoryId: 'cat00001',
          memo: ingredientMemo,
        },
      })

      await prisma.ingredientStock.create({
        data: {
          ingredientId,
          quantity: stockQuantity,
          unitId: 'unit0001',
          storageLocationType: faker.helpers.arrayElement([
            'REFRIGERATED',
            'FROZEN',
            'ROOM_TEMPERATURE',
          ]),
          purchaseDate: faker.date.recent({ days: 7 }),
          isActive: true,
        },
      })

      // When: IDで検索
      const found = await repository.findById(new IngredientId(ingredientId))

      // Then: 食材が見つかる
      expect(found).toBeDefined()
      expect(found?.getName().getValue()).toBe(ingredientName)
      expect(found?.getMemo()?.getValue()).toBe(ingredientMemo)
      expect(found?.getCurrentStock()?.getQuantity().getValue()).toBe(stockQuantity)
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
      const deletedIngredientName = faker.food.ingredient()
      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          name: deletedIngredientName,
          categoryId: 'cat00001',
          deletedAt: faker.date.past(),
        },
      })

      // When: 検索
      const found = await repository.findById(new IngredientId(ingredientId))

      // Then: 見つからない
      expect(found).toBeNull()
    })

    it('アクティブな最新の在庫のみを取得する', async () => {
      // Given: 複数の在庫がある食材
      const ingredientId = faker.string.uuid()
      const ingredientName = faker.food.ingredient()
      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          name: ingredientName,
          categoryId: 'cat00001',
        },
      })

      // 古い在庫（非アクティブ）
      const oldQuantity = faker.number.int({ min: 1, max: 10 })
      await prisma.ingredientStock.create({
        data: {
          ingredientId,
          quantity: oldQuantity,
          unitId: 'unit0001',
          storageLocationType: faker.helpers.arrayElement([
            'REFRIGERATED',
            'FROZEN',
            'ROOM_TEMPERATURE',
          ]),
          purchaseDate: faker.date.past({ years: 1 }),
          isActive: false,
        },
      })

      // 新しい在庫（アクティブ）
      const activeQuantity = faker.number.int({ min: 11, max: 20 })
      await prisma.ingredientStock.create({
        data: {
          ingredientId,
          quantity: activeQuantity,
          unitId: 'unit0001',
          storageLocationType: faker.helpers.arrayElement([
            'REFRIGERATED',
            'FROZEN',
            'ROOM_TEMPERATURE',
          ]),
          purchaseDate: faker.date.recent({ days: 7 }),
          isActive: true,
        },
      })

      // When: 検索
      const found = await repository.findById(new IngredientId(ingredientId))

      // Then: アクティブな最新の在庫のみ取得される
      expect(found?.getCurrentStock()?.getQuantity().getValue()).toBe(activeQuantity)
    })
  })

  describe('findByName', () => {
    it('名前で食材を検索できる', async () => {
      // Given: テストデータ
      const ingredientId = faker.string.uuid()
      const ingredientName = faker.food.ingredient()
      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          name: ingredientName,
          categoryId: 'cat00001',
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
      const id1 = faker.string.uuid()
      const id2 = faker.string.uuid()
      await prisma.ingredient.createMany({
        data: [
          { id: id1, name: duplicateName, categoryId: 'cat00001' },
          { id: id2, name: duplicateName, categoryId: 'cat00002' },
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
      const names = Array.from({ length: 3 }, () => faker.food.ingredient())
      await prisma.ingredient.createMany({
        data: [
          { id: faker.string.uuid(), name: names[0], categoryId: 'cat00001' },
          { id: faker.string.uuid(), name: names[1], categoryId: 'cat00002' },
          { id: faker.string.uuid(), name: names[2], categoryId: 'cat00003' },
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
      const activeName = faker.food.ingredient()
      const deletedName = faker.food.ingredient()
      await prisma.ingredient.createMany({
        data: [
          { id: faker.string.uuid(), name: activeName, categoryId: 'cat00001' },
          {
            id: faker.string.uuid(),
            name: deletedName,
            categoryId: 'cat00001',
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

  describe('delete', () => {
    it('食材を論理削除できる', async () => {
      // Given: 食材を作成
      const ingredientId = faker.string.uuid()
      const ingredientName = faker.food.ingredient()
      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          name: ingredientName,
          categoryId: 'cat00001',
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
      const ingredient = new IngredientBuilder().withCategoryId(nonExistentCategoryId).build()

      // When/Then: 保存時にエラー
      await expect(repository.save(ingredient)).rejects.toThrow()
    })

    it('存在しない単位IDで在庫を保存するとエラーになる', async () => {
      // Given: 存在しない単位IDを持つ在庫
      const ingredient = createIngredientForIntegrationTest()
      const nonExistentUnitId = faker.string.uuid()

      const stock = createStockForIntegrationTest({
        unitId: nonExistentUnitId,
      })
      ingredient.setStock(stock)

      // When/Then: 保存時にエラー
      await expect(repository.save(ingredient)).rejects.toThrow()
    })
  })

  describe('Decimal型（価格）の処理', () => {
    it('価格をDecimal型で正しく保存・取得できる', async () => {
      // Given: 小数点を含む価格を持つ食材
      const ingredient = createIngredientForIntegrationTest()

      // 小数点を含む価格を生成
      const precisePrice = faker.number.float({ min: 100, max: 9999, fractionDigits: 2 })
      const stock = createStockForIntegrationTest({
        price: precisePrice,
      })
      ingredient.setStock(stock)

      // When: 保存して取得
      await repository.save(ingredient)
      const found = await repository.findById(ingredient.getId())

      // Then: 価格が正確に保持されている
      expect(found?.getCurrentStock()?.getPrice()?.getValue()).toBe(precisePrice)
    })
  })
})
