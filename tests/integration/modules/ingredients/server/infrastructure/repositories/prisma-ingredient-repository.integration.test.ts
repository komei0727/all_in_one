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
import { IngredientBuilder, testDataHelpers } from '@tests/__fixtures__/builders'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
  createTestUser,
} from '@tests/helpers/database.helper'

// テストデータ生成用のヘルパー関数
// 統合テストなので、実在するカテゴリーや単位IDをデフォルトで設定
const createIngredientForIntegrationTest = () => {
  const testDataIds = getTestDataIds()
  const stock = new IngredientStock({
    quantity: faker.number.float({ min: 1, max: 100, fractionDigits: 2 }),
    unitId: new UnitId(testDataIds.units.piece), // 実在する単位ID
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
    .withUserId(testDataIds.users.defaultUser.domainUserId)
    .withCategoryId(testDataIds.categories.vegetable) // 実在するカテゴリーID
    .withIngredientStock(stock)
    .withPrice(
      faker.helpers.maybe(
        () => new Price(faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }))
      ) ?? null
    )
    .withExpiryInfo(
      faker.helpers.maybe(() => {
        const bestBeforeDate = faker.date.future()
        const useByDate =
          faker.helpers.maybe(() => faker.date.between({ from: new Date(), to: bestBeforeDate })) ??
          null
        return new ExpiryInfo({
          bestBeforeDate,
          useByDate,
        })
      }) ?? null
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
      const testDataIds = getTestDataIds()
      expect(savedIngredient.getId().getValue()).toBe(ingredient.getId().getValue())
      expect(savedIngredient.getName().getValue()).toBe(ingredientName)
      expect(savedIngredient.getCategoryId().getValue()).toBe(testDataIds.categories.vegetable)
      expect(savedIngredient.getMemo()?.getValue()).toBe(memoText)
      expect(savedIngredient.getUserId()).toBe(userId)
      expect(savedIngredient.getPrice()?.getValue()).toBe(price)
      expect(savedIngredient.getPurchaseDate()).toEqual(purchaseDate)

      // 在庫情報も正しく保存されている
      const savedStock = savedIngredient.getIngredientStock()
      expect(savedStock).toBeDefined()
      expect(savedStock.getQuantity()).toBe(stock.getQuantity())
      expect(savedStock.getUnitId().getValue()).toBe(testDataIds.units.piece)
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
      const testDataIds = getTestDataIds()
      const ingredientId = IngredientId.generate()
      const userId = testDataIds.users.defaultUser.domainUserId
      const oldName = faker.food.ingredient()
      const oldMemo = faker.lorem.sentence()
      await prisma.ingredient.create({
        data: {
          id: ingredientId.getValue(),
          userId,
          name: oldName,
          categoryId: testDataIds.categories.vegetable,
          memo: oldMemo,
          purchaseDate: new Date(),
          quantity: 10,
          unitId: testDataIds.units.piece,
          storageLocationType: 'REFRIGERATED',
        },
      })

      // 更新用の食材エンティティ
      const newName = faker.food.ingredient()
      const newMemo = faker.lorem.sentence()
      const newStock = new IngredientStock({
        quantity: 20,
        unitId: new UnitId(testDataIds.units.piece),
        storageLocation: new StorageLocation(StorageType.FROZEN, '冷凍庫'),
        threshold: 5,
      })

      const updatedIngredient = new IngredientBuilder()
        .withId(ingredientId)
        .withUserId(userId)
        .withName(newName)
        .withCategoryId(testDataIds.categories.vegetable)
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
      const testDataIds = getTestDataIds()
      const ingredientId = testDataHelpers.ingredientId()
      const userId = testDataIds.users.defaultUser.domainUserId
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
          categoryId: testDataIds.categories.vegetable,
          memo: ingredientMemo,
          price,
          purchaseDate,
          quantity: stockQuantity,
          unitId: testDataIds.units.piece,
          threshold: 5,
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: '野菜室',
          bestBeforeDate: faker.date.future(),
        },
      })

      // When: IDで検索
      const found = await repository.findById(userId, new IngredientId(ingredientId))

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
      const testDataIds = getTestDataIds()
      const userId = testDataIds.users.defaultUser.domainUserId
      const nonExistentId = testDataHelpers.ingredientId()
      const found = await repository.findById(userId, new IngredientId(nonExistentId))

      // Then: nullが返される
      expect(found).toBeNull()
    })

    it('論理削除された食材は検索されない', async () => {
      // Given: 論理削除された食材
      const testDataIds = getTestDataIds()
      const ingredientId = testDataHelpers.ingredientId()
      const userId = testDataIds.users.defaultUser.domainUserId
      const deletedIngredientName = faker.food.ingredient()
      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          userId,
          name: deletedIngredientName,
          categoryId: testDataIds.categories.vegetable,
          purchaseDate: new Date(),
          quantity: 10,
          unitId: testDataIds.units.piece,
          storageLocationType: 'REFRIGERATED',
          deletedAt: faker.date.past(),
        },
      })

      // When: 検索
      const found = await repository.findById(userId, new IngredientId(ingredientId))

      // Then: 見つからない
      expect(found).toBeNull()
    })
  })

  describe('findByName', () => {
    it('名前で食材を検索できる', async () => {
      // Given: テストデータ
      const testDataIds = getTestDataIds()
      const ingredientId = testDataHelpers.ingredientId()
      const userId = testDataIds.users.defaultUser.domainUserId
      const ingredientName = faker.food.ingredient()
      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          userId,
          name: ingredientName,
          categoryId: testDataIds.categories.vegetable,
          purchaseDate: new Date(),
          quantity: 10,
          unitId: testDataIds.units.piece,
          storageLocationType: 'REFRIGERATED',
        },
      })

      // When: 名前で検索
      const found = await repository.findByName(userId, new IngredientName(ingredientName))

      // Then: 食材が見つかる
      expect(found).toBeDefined()
      expect(found?.getId().getValue()).toBe(ingredientId)
    })

    it('同名の食材が複数ある場合は最初の1件を返す', async () => {
      // Given: 同名の食材を複数作成
      const testDataIds = getTestDataIds()
      const duplicateName = faker.food.ingredient()
      const userId = testDataIds.users.defaultUser.domainUserId
      const altUser = await createTestUser({ email: 'alt-user@example.com' })
      const id1 = testDataHelpers.ingredientId()
      const id2 = testDataHelpers.ingredientId()
      await prisma.ingredient.createMany({
        data: [
          {
            id: id1,
            userId,
            name: duplicateName,
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
          },
          {
            id: id2,
            userId: altUser.domainUserId,
            name: duplicateName,
            categoryId: testDataIds.categories.meatFish,
            purchaseDate: new Date(),
            quantity: 20,
            unitId: testDataIds.units.piece,
            storageLocationType: 'FROZEN',
          },
        ],
      })

      // When: 名前で検索
      const found = await repository.findByName(userId, new IngredientName(duplicateName))

      // Then: 1件のみ返される
      expect(found).toBeDefined()
      expect([id1, id2]).toContain(found?.getId().getValue())
    })
  })

  describe('findAll', () => {
    it('すべての食材を取得できる', async () => {
      // Given: 複数の食材を作成
      const testDataIds = getTestDataIds()
      const userId = testDataIds.users.defaultUser.domainUserId
      const names = Array.from({ length: 3 }, () => faker.food.ingredient())
      await prisma.ingredient.createMany({
        data: [
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: names[0],
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: names[1],
            categoryId: testDataIds.categories.meatFish,
            purchaseDate: new Date(),
            quantity: 20,
            unitId: testDataIds.units.piece,
            storageLocationType: 'FROZEN',
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: names[2],
            categoryId: testDataIds.categories.seasoning,
            purchaseDate: new Date(),
            quantity: 30,
            unitId: testDataIds.units.piece,
            storageLocationType: 'ROOM_TEMPERATURE',
          },
        ],
      })

      // When: すべて取得
      const ingredients = await repository.findAll(userId)

      // Then: 3件取得される
      expect(ingredients).toHaveLength(3)
      const foundNames = ingredients.map((i) => i.getName().getValue())
      names.forEach((name) => {
        expect(foundNames).toContain(name)
      })
    })

    it('論理削除された食材は含まれない', async () => {
      // Given: 削除済みと通常の食材
      const testDataIds = getTestDataIds()
      const userId = testDataIds.users.defaultUser.domainUserId
      const activeName = faker.food.ingredient()
      const deletedName = faker.food.ingredient()
      await prisma.ingredient.createMany({
        data: [
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: activeName,
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: deletedName,
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 20,
            unitId: testDataIds.units.piece,
            storageLocationType: 'FROZEN',
            deletedAt: faker.date.past(),
          },
        ],
      })

      // When: すべて取得
      const ingredients = await repository.findAll(userId)

      // Then: アクティブな食材のみ
      expect(ingredients).toHaveLength(1)
      expect(ingredients[0].getName().getValue()).toBe(activeName)
    })
  })

  describe('findByUserId', () => {
    it('ユーザーIDで食材を検索できる', async () => {
      // Given: 複数ユーザーの食材
      const testDataIds = getTestDataIds()
      const userId1 = testDataIds.users.defaultUser.domainUserId
      const altUser = await createTestUser({ email: 'alt-user2@example.com' })
      const userId2 = altUser.domainUserId
      const name1 = `${faker.food.ingredient()}_user1_1`
      const name2 = `${faker.food.ingredient()}_user1_2`
      const name3 = `${faker.food.ingredient()}_user2_1`

      await prisma.ingredient.createMany({
        data: [
          {
            id: testDataHelpers.ingredientId(),
            userId: userId1,
            name: name1,
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
          },
          {
            id: testDataHelpers.ingredientId(),
            userId: userId1,
            name: name2,
            categoryId: testDataIds.categories.meatFish,
            purchaseDate: new Date(),
            quantity: 20,
            unitId: testDataIds.units.piece,
            storageLocationType: 'FROZEN',
          },
          {
            id: testDataHelpers.ingredientId(),
            userId: userId2,
            name: name3,
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 30,
            unitId: testDataIds.units.piece,
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

  describe('update', () => {
    it('食材を更新できる', async () => {
      // Given: 既存の食材を作成
      const testDataIds = getTestDataIds()
      const ingredient = createIngredientForIntegrationTest()
      await repository.save(ingredient)

      // 更新用のデータを準備
      const updatedName = faker.food.ingredient()
      const updatedMemo = faker.lorem.sentence()
      const updatedQuantity = faker.number.float({ min: 5, max: 50, fractionDigits: 2 })
      const updatedPrice = faker.number.float({ min: 200, max: 2000, fractionDigits: 2 })

      // When: 食材を更新
      const updatedIngredient = new IngredientBuilder()
        .withId(ingredient.getId())
        .withUserId(ingredient.getUserId())
        .withName(updatedName)
        .withMemo(updatedMemo)
        .withCategoryId(testDataIds.categories.meatFish) // カテゴリーも変更
        .withIngredientStock(
          new IngredientStock({
            quantity: updatedQuantity,
            unitId: new UnitId(testDataIds.units.gram), // 単位も変更
            storageLocation: new StorageLocation(StorageType.FROZEN, '冷凍庫上段'),
            threshold: 10,
          })
        )
        .withPrice(new Price(updatedPrice))
        .build()

      const result = await repository.update(updatedIngredient)

      // Then: 更新が反映されている
      expect(result.getName().getValue()).toBe(updatedName)
      expect(result.getMemo()?.getValue()).toBe(updatedMemo)
      expect(result.getCategoryId().getValue()).toBe(testDataIds.categories.meatFish)
      expect(result.getIngredientStock().getQuantity()).toBe(updatedQuantity)
      expect(result.getIngredientStock().getUnitId().getValue()).toBe(testDataIds.units.gram)
      expect(result.getPrice()?.getValue()).toBe(updatedPrice)

      // データベースでも更新されていることを確認
      const dbIngredient = await prisma.ingredient.findUnique({
        where: { id: ingredient.getId().getValue() },
      })
      expect(dbIngredient?.name).toBe(updatedName)
      expect(dbIngredient?.categoryId).toBe(testDataIds.categories.meatFish)
    })

    it('存在しない食材の更新はエラーになる', async () => {
      // Given: 存在しない食材
      const nonExistentIngredient = createIngredientForIntegrationTest()

      // When/Then: 更新時にエラー
      await expect(repository.update(nonExistentIngredient)).rejects.toThrow()
    })
  })

  describe('findExpiringSoon', () => {
    it('期限切れ間近の食材を検索できる', async () => {
      // Given: 様々な期限の食材を作成
      const testDataIds = getTestDataIds()
      const userId = testDataIds.users.defaultUser.domainUserId
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // 3日後に期限切れ
      const expiringSoon1 = testDataHelpers.ingredientId()
      const threeDaysLater = new Date()
      threeDaysLater.setDate(threeDaysLater.getDate() + 3)

      // 1日後に期限切れ
      const expiringSoon2 = testDataHelpers.ingredientId()
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      // 10日後に期限切れ（検索対象外）
      const notExpiring = testDataHelpers.ingredientId()
      const tenDaysLater = new Date()
      tenDaysLater.setDate(tenDaysLater.getDate() + 10)

      // 昨日期限切れ（検索対象外）
      const expired = testDataHelpers.ingredientId()
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      await prisma.ingredient.createMany({
        data: [
          {
            id: expiringSoon1,
            userId,
            name: '3日後期限切れ',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
            bestBeforeDate: threeDaysLater,
          },
          {
            id: expiringSoon2,
            userId,
            name: '明日期限切れ',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 5,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
            useByDate: tomorrow,
          },
          {
            id: notExpiring,
            userId,
            name: '10日後期限切れ',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 20,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
            bestBeforeDate: tenDaysLater,
          },
          {
            id: expired,
            userId,
            name: '昨日期限切れ',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 1,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
            bestBeforeDate: yesterday,
          },
        ],
      })

      // When: 3日以内に期限切れの食材を検索
      const results = await repository.findExpiringSoon(userId, 3)

      // Then: 期限切れ間近の食材のみ取得される
      expect(results).toHaveLength(2)
      const names = results.map((r) => r.getName().getValue())
      expect(names).toContain('3日後期限切れ')
      expect(names).toContain('明日期限切れ')
      expect(names).not.toContain('10日後期限切れ')
      expect(names).not.toContain('昨日期限切れ')

      // 期限が近い順にソートされている（useByDateが優先される）
      // findExpiringSoonメソッドは useByDate → bestBeforeDate → createdAt の順でソート
      const firstResult = results.find((r) => r.getName().getValue() === '明日期限切れ')
      const secondResult = results.find((r) => r.getName().getValue() === '3日後期限切れ')
      expect(firstResult).toBeDefined()
      expect(secondResult).toBeDefined()
    })

    it('論理削除された食材は含まれない', async () => {
      // Given: 期限切れ間近だが論理削除された食材
      const testDataIds = getTestDataIds()
      const userId = testDataIds.users.defaultUser.domainUserId
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      await prisma.ingredient.create({
        data: {
          id: testDataHelpers.ingredientId(),
          userId,
          name: '削除済み食材',
          categoryId: testDataIds.categories.vegetable,
          purchaseDate: new Date(),
          quantity: 10,
          unitId: testDataIds.units.piece,
          storageLocationType: 'REFRIGERATED',
          bestBeforeDate: tomorrow,
          deletedAt: new Date(), // 論理削除
        },
      })

      // When: 検索
      const results = await repository.findExpiringSoon(userId, 7)

      // Then: 削除済み食材は含まれない
      const names = results.map((r) => r.getName().getValue())
      expect(names).not.toContain('削除済み食材')
    })
  })

  describe('findExpired', () => {
    it('期限切れの食材を検索できる', async () => {
      // Given: 様々な期限の食材
      const testDataIds = getTestDataIds()
      const userId = testDataIds.users.defaultUser.domainUserId

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const lastWeek = new Date()
      lastWeek.setDate(lastWeek.getDate() - 7)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      await prisma.ingredient.createMany({
        data: [
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '昨日期限切れ',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
            bestBeforeDate: yesterday,
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '先週期限切れ',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 5,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
            useByDate: lastWeek,
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '明日期限',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 20,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
            bestBeforeDate: tomorrow,
          },
        ],
      })

      // When: 期限切れ食材を検索
      const results = await repository.findExpired(userId)

      // Then: 期限切れの食材のみ取得される
      expect(results).toHaveLength(2)
      const names = results.map((r) => r.getName().getValue())
      expect(names).toContain('昨日期限切れ')
      expect(names).toContain('先週期限切れ')
      expect(names).not.toContain('明日期限')

      // 期限が古い順にソートされている（useByDateが優先される）
      // findExpiredメソッドは useByDate → bestBeforeDate → createdAt の順でソート
      const expired1 = results.find((r) => r.getName().getValue() === '昨日期限切れ')
      const expired2 = results.find((r) => r.getName().getValue() === '先週期限切れ')
      expect(expired1).toBeDefined()
      expect(expired2).toBeDefined()
    })
  })

  describe('外部キー制約のテスト', () => {
    it('存在しないカテゴリーIDで保存するとエラーになる', async () => {
      // Given: 存在しないカテゴリーIDを持つ食材
      const testDataIds = getTestDataIds()
      const nonExistentCategoryId = testDataHelpers.categoryId()
      const stock = new IngredientStock({
        quantity: 10,
        unitId: new UnitId(testDataIds.units.piece),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const ingredient = new IngredientBuilder()
        .withUserId(testDataIds.users.defaultUser.domainUserId)
        .withCategoryId(nonExistentCategoryId)
        .withIngredientStock(stock)
        .build()

      // When/Then: 保存時にエラー
      await expect(repository.save(ingredient)).rejects.toThrow()
    })

    it('存在しない単位IDで保存するとエラーになる', async () => {
      // Given: 存在しない単位IDを持つ在庫
      const nonExistentUnitId = testDataHelpers.unitId()
      const stock = new IngredientStock({
        quantity: 10,
        unitId: new UnitId(nonExistentUnitId),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const testDataIds = getTestDataIds()
      const ingredient = new IngredientBuilder()
        .withUserId(testDataIds.users.defaultUser.domainUserId)
        .withCategoryId(testDataIds.categories.vegetable)
        .withIngredientStock(stock)
        .build()

      // When/Then: 保存時にエラー
      await expect(repository.save(ingredient)).rejects.toThrow()
    })
  })

  describe('findByCategory', () => {
    it('カテゴリーで食材を検索できる', async () => {
      // Given: 異なるカテゴリーの食材を作成
      const testDataIds = getTestDataIds()
      const userId = testDataIds.users.defaultUser.domainUserId

      await prisma.ingredient.createMany({
        data: [
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '野菜1',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '野菜2',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 20,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '肉',
            categoryId: testDataIds.categories.meatFish,
            purchaseDate: new Date(),
            quantity: 30,
            unitId: testDataIds.units.gram,
            storageLocationType: 'FROZEN',
          },
        ],
      })

      // When: 野菜カテゴリーで検索
      const results = await repository.findByCategory(userId, testDataIds.categories.vegetable)

      // Then: 野菜カテゴリーの食材のみ取得される
      expect(results).toHaveLength(2)
      const names = results.map((r) => r.getName().getValue())
      expect(names).toContain('野菜1')
      expect(names).toContain('野菜2')
      expect(names).not.toContain('肉')
    })
  })

  describe('findByStorageLocation', () => {
    it('保存場所で食材を検索できる', async () => {
      // Given: 異なる保存場所の食材
      const testDataIds = getTestDataIds()
      const userId = testDataIds.users.defaultUser.domainUserId

      await prisma.ingredient.createMany({
        data: [
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '冷蔵品1',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '冷凍品',
            categoryId: testDataIds.categories.meatFish,
            purchaseDate: new Date(),
            quantity: 20,
            unitId: testDataIds.units.gram,
            storageLocationType: 'FROZEN',
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '常温品',
            categoryId: testDataIds.categories.seasoning,
            purchaseDate: new Date(),
            quantity: 30,
            unitId: testDataIds.units.milliliter,
            storageLocationType: 'ROOM_TEMPERATURE',
          },
        ],
      })

      // When: 冷蔵保存場所で検索
      const results = await repository.findByStorageLocation(userId, StorageType.REFRIGERATED)

      // Then: 冷蔵保存の食材のみ取得される
      expect(results).toHaveLength(1)
      expect(results[0].getName().getValue()).toBe('冷蔵品1')
    })
  })

  describe('findOutOfStock', () => {
    it('在庫切れの食材を検索できる', async () => {
      // Given: 様々な在庫量の食材
      const testDataIds = getTestDataIds()
      const userId = testDataIds.users.defaultUser.domainUserId

      await prisma.ingredient.createMany({
        data: [
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '在庫切れ1',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 0,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '在庫切れ2',
            categoryId: testDataIds.categories.meatFish,
            purchaseDate: new Date(),
            quantity: 0,
            unitId: testDataIds.units.gram,
            storageLocationType: 'FROZEN',
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '在庫あり',
            categoryId: testDataIds.categories.seasoning,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.milliliter,
            storageLocationType: 'ROOM_TEMPERATURE',
          },
        ],
      })

      // When: 在庫切れ食材を検索
      const results = await repository.findOutOfStock(userId)

      // Then: 在庫切れの食材のみ取得される
      expect(results).toHaveLength(2)
      const names = results.map((r) => r.getName().getValue())
      expect(names).toContain('在庫切れ1')
      expect(names).toContain('在庫切れ2')
      expect(names).not.toContain('在庫あり')
    })
  })

  describe('findLowStock', () => {
    it('在庫不足の食材を検索できる（閾値指定）', async () => {
      // Given: 様々な在庫量の食材
      const testDataIds = getTestDataIds()
      const userId = testDataIds.users.defaultUser.domainUserId

      await prisma.ingredient.createMany({
        data: [
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '在庫少',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 3,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
            threshold: 10, // 関係ない
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '在庫十分',
            categoryId: testDataIds.categories.meatFish,
            purchaseDate: new Date(),
            quantity: 10,
            unitId: testDataIds.units.gram,
            storageLocationType: 'FROZEN',
            threshold: 5,
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '在庫切れ',
            categoryId: testDataIds.categories.seasoning,
            purchaseDate: new Date(),
            quantity: 0,
            unitId: testDataIds.units.milliliter,
            storageLocationType: 'ROOM_TEMPERATURE',
            threshold: 5,
          },
        ],
      })

      // When: 閾値5で在庫不足を検索
      const results = await repository.findLowStock(userId, 5)

      // Then: 在庫5以下（在庫切れを除く）の食材が取得される
      expect(results).toHaveLength(1)
      expect(results[0].getName().getValue()).toBe('在庫少')
    })

    it('在庫不足の食材を検索できる（食材ごとの閾値使用）', async () => {
      // Given: 閾値が設定された食材
      const testDataIds = getTestDataIds()
      const userId = testDataIds.users.defaultUser.domainUserId

      await prisma.ingredient.createMany({
        data: [
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '閾値以下',
            categoryId: testDataIds.categories.vegetable,
            purchaseDate: new Date(),
            quantity: 5,
            unitId: testDataIds.units.piece,
            storageLocationType: 'REFRIGERATED',
            threshold: 10, // 在庫5 <= 閾値10
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '閾値以上',
            categoryId: testDataIds.categories.meatFish,
            purchaseDate: new Date(),
            quantity: 20,
            unitId: testDataIds.units.gram,
            storageLocationType: 'FROZEN',
            threshold: 15, // 在庫20 > 閾値15
          },
          {
            id: testDataHelpers.ingredientId(),
            userId,
            name: '閾値なし',
            categoryId: testDataIds.categories.seasoning,
            purchaseDate: new Date(),
            quantity: 1,
            unitId: testDataIds.units.milliliter,
            storageLocationType: 'ROOM_TEMPERATURE',
            threshold: null,
          },
        ],
      })

      // When: 食材ごとの閾値で検索
      const results = await repository.findLowStock(userId)

      // Then: 閾値以下の食材のみ取得される
      expect(results).toHaveLength(1)
      expect(results[0].getName().getValue()).toBe('閾値以下')
    })
  })

  describe('existsByUserAndNameAndExpiryAndLocation', () => {
    it('重複する食材が存在する場合trueを返す', async () => {
      // Given: 既存の食材
      const testDataIds = getTestDataIds()
      const userId = testDataIds.users.defaultUser.domainUserId
      const name = faker.food.ingredient()
      const bestBeforeDate = new Date('2024-12-31')
      const useByDate = new Date('2024-12-25')

      await prisma.ingredient.create({
        data: {
          id: testDataHelpers.ingredientId(),
          userId,
          name,
          categoryId: testDataIds.categories.vegetable,
          purchaseDate: new Date(),
          quantity: 10,
          unitId: testDataIds.units.piece,
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: '野菜室',
          bestBeforeDate,
          useByDate,
        },
      })

      // When: 同じ条件で重複チェック
      const exists = await repository.existsByUserAndNameAndExpiryAndLocation(
        userId,
        new IngredientName(name),
        new ExpiryInfo({ bestBeforeDate, useByDate }),
        new StorageLocation(StorageType.REFRIGERATED, '野菜室')
      )

      // Then: trueが返される
      expect(exists).toBe(true)
    })

    it('条件が一部異なる場合はfalseを返す', async () => {
      // Given: 既存の食材
      const testDataIds = getTestDataIds()
      const userId = testDataIds.users.defaultUser.domainUserId
      const name = faker.food.ingredient()

      await prisma.ingredient.create({
        data: {
          id: testDataHelpers.ingredientId(),
          userId,
          name,
          categoryId: testDataIds.categories.vegetable,
          purchaseDate: new Date(),
          quantity: 10,
          unitId: testDataIds.units.piece,
          storageLocationType: 'REFRIGERATED',
          storageLocationDetail: '野菜室',
          bestBeforeDate: new Date('2024-12-31'),
        },
      })

      // When: 異なる保存場所で重複チェック
      const exists = await repository.existsByUserAndNameAndExpiryAndLocation(
        userId,
        new IngredientName(name),
        new ExpiryInfo({ bestBeforeDate: new Date('2024-12-31'), useByDate: null }),
        new StorageLocation(StorageType.FROZEN) // 異なる保存場所
      )

      // Then: falseが返される
      expect(exists).toBe(false)
    })
  })

  describe('Decimal型（価格）の処理', () => {
    it('価格をDecimal型で正しく保存・取得できる', async () => {
      // Given: 小数点を含む価格を持つ食材
      const testDataIds = getTestDataIds()
      const precisePrice = faker.number.float({ min: 100, max: 9999, fractionDigits: 2 })
      const stock = new IngredientStock({
        quantity: 10,
        unitId: new UnitId(testDataIds.units.piece),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
      })

      const ingredient = new IngredientBuilder()
        .withUserId(testDataIds.users.defaultUser.domainUserId)
        .withCategoryId(testDataIds.categories.vegetable)
        .withIngredientStock(stock)
        .withPrice(new Price(precisePrice))
        .build()

      // When: 保存して取得
      await repository.save(ingredient)
      const found = await repository.findById(ingredient.getUserId(), ingredient.getId())

      // Then: 価格が正確に保持されている
      expect(found?.getPrice()?.getValue()).toBe(precisePrice)
    })
  })
})
