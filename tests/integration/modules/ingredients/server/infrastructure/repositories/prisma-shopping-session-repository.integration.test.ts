import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PrismaClient } from '@/generated/prisma-test'
import {
  CheckedItem,
  ExpiryStatus,
  IngredientId,
  IngredientName,
  SessionStatus,
  ShoppingSessionId,
  StockStatus,
} from '@/modules/ingredients/server/domain/value-objects'
import { PrismaShoppingSessionRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-shopping-session-repository'
import { ShoppingSessionBuilder } from '@tests/__fixtures__/builders'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('PrismaShoppingSessionRepository Integration', () => {
  let prisma: PrismaClient
  let repository: PrismaShoppingSessionRepository
  let testUserId: string
  let testCategoryId: string
  let testUnitId: string

  beforeEach(async () => {
    // SQLiteテスト用のPrismaクライアントを作成
    prisma = new PrismaClient()
    repository = new PrismaShoppingSessionRepository(prisma as any) // SQLiteとPostgreSQLの型の違いを吸収

    // 既存のデータをクリーンアップ
    await prisma.shoppingSessionItem.deleteMany()
    await prisma.shoppingSession.deleteMany()
    await prisma.ingredient.deleteMany()
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.category.deleteMany()
    await prisma.unit.deleteMany()

    // テスト用のマスターデータを作成
    const category = await prisma.category.create({
      data: {
        id: testDataHelpers.categoryId(),
        name: testDataHelpers.categoryName(),
      },
    })
    testCategoryId = category.id

    const unit = await prisma.unit.create({
      data: {
        id: testDataHelpers.unitId(),
        name: testDataHelpers.unitName(),
        symbol: testDataHelpers.unitSymbol(),
        type: 'WEIGHT',
      },
    })
    testUnitId = unit.id

    // テスト用のユーザーを作成
    const nextAuthUser = await prisma.user.create({
      data: {
        id: testDataHelpers.cuid(),
        email: `test-${Date.now()}@example.com`,
      },
    })

    const domainUser = await prisma.domainUser.create({
      data: {
        id: testDataHelpers.userId(),
        nextAuthId: nextAuthUser.id,
        email: nextAuthUser.email,
      },
    })

    testUserId = domainUser.id
  })

  afterEach(async () => {
    // テスト後のクリーンアップ
    await prisma.shoppingSessionItem.deleteMany()
    await prisma.shoppingSession.deleteMany()
    await prisma.ingredient.deleteMany()
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  describe('save', () => {
    it('新しいセッションをデータベースに保存できる', async () => {
      // Arrange
      const session = new ShoppingSessionBuilder()
        .withUserId(testUserId)
        .withStatus(SessionStatus.ACTIVE)
        .withCheckedItems([])
        .build()

      // Act
      const savedSession = await repository.save(session)

      // Assert
      expect(savedSession.getId().getValue()).toBe(session.getId().getValue())
      expect(savedSession.getUserId()).toBe(session.getUserId())
      expect(savedSession.getStatus().getValue()).toBe('ACTIVE')

      // データベースから直接確認
      const dbSession = await prisma.shoppingSession.findUnique({
        where: { id: session.getId().getValue() },
      })
      expect(dbSession).not.toBeNull()
      expect(dbSession?.userId).toBe(session.getUserId())
      expect(dbSession?.status).toBe('ACTIVE')
    })

    it('確認済みアイテムを含むセッションを保存できる', async () => {
      // Arrange
      // テスト用の食材を作成
      const ingredientId = testDataHelpers.ingredientId()
      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          userId: testUserId,
          name: testDataHelpers.ingredientName(),
          categoryId: testCategoryId,
          quantity: 1,
          unitId: testUnitId,
          purchaseDate: new Date(),
          storageLocationType: 'REFRIGERATOR',
        },
      })

      const checkedItem = CheckedItem.create({
        ingredientId: new IngredientId(ingredientId),
        ingredientName: new IngredientName(testDataHelpers.ingredientName()),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      const session = new ShoppingSessionBuilder()
        .withUserId(testUserId)
        .withStatus(SessionStatus.ACTIVE)
        .withCheckedItems([checkedItem])
        .build()

      // Act
      const savedSession = await repository.save(session)

      // Assert
      expect(savedSession.getCheckedItems()).toHaveLength(1)

      // データベースから直接確認
      const dbItems = await prisma.shoppingSessionItem.findMany({
        where: { sessionId: session.getId().getValue() },
      })
      expect(dbItems).toHaveLength(1)
      expect(dbItems[0].ingredientId).toBe(checkedItem.getIngredientId().getValue())
      expect(dbItems[0].stockStatus).toBe('IN_STOCK')
      expect(dbItems[0].expiryStatus).toBe('FRESH')
    })
  })

  describe('findById', () => {
    it('保存されたセッションをIDで取得できる', async () => {
      // Arrange
      const session = new ShoppingSessionBuilder().withUserId(testUserId).build()
      await repository.save(session)

      // Act
      const foundSession = await repository.findById(session.getId())

      // Assert
      expect(foundSession).not.toBeNull()
      expect(foundSession?.getId().getValue()).toBe(session.getId().getValue())
      expect(foundSession?.getUserId()).toBe(session.getUserId())
    })

    it('存在しないIDの場合はnullを返す', async () => {
      // Arrange
      const nonExistentId = new ShoppingSessionId(testDataHelpers.shoppingSessionId())

      // Act
      const result = await repository.findById(nonExistentId)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('findActiveByUserId', () => {
    it('ユーザーのアクティブなセッションを取得できる', async () => {
      // Arrange
      const activeSession = new ShoppingSessionBuilder()
        .withUserId(testUserId)
        .withStatus(SessionStatus.ACTIVE)
        .build()
      await repository.save(activeSession)

      // 完了したセッションも作成（取得されないはず）
      const completedSession = new ShoppingSessionBuilder()
        .withUserId(testUserId)
        .withStatus(SessionStatus.COMPLETED)
        .withCompletedAt(new Date())
        .build()
      await repository.save(completedSession)

      // Act
      const result = await repository.findActiveByUserId(testUserId)

      // Assert
      expect(result).not.toBeNull()
      expect(result?.getId().getValue()).toBe(activeSession.getId().getValue())
      expect(result?.getStatus().getValue()).toBe('ACTIVE')
    })

    it('アクティブなセッションがない場合はnullを返す', async () => {
      // Act
      const result = await repository.findActiveByUserId(testUserId)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('update', () => {
    it('セッションのステータスを更新できる', async () => {
      // Arrange
      const session = new ShoppingSessionBuilder()
        .withUserId(testUserId)
        .withStatus(SessionStatus.ACTIVE)
        .build()
      await repository.save(session)

      // セッションを完了させる
      session.complete()

      // Act
      const updatedSession = await repository.update(session)

      // Assert
      expect(updatedSession.getStatus().getValue()).toBe('COMPLETED')
      expect(updatedSession.getCompletedAt()).not.toBeNull()

      // データベースから直接確認
      const dbSession = await prisma.shoppingSession.findUnique({
        where: { id: session.getId().getValue() },
      })
      expect(dbSession?.status).toBe('COMPLETED')
      expect(dbSession?.completedAt).not.toBeNull()
    })

    it('確認済みアイテムを追加・更新できる', async () => {
      // Arrange
      const session = new ShoppingSessionBuilder()
        .withUserId(testUserId)
        .withStatus(SessionStatus.ACTIVE)
        .withCheckedItems([])
        .build()
      await repository.save(session)

      // テスト用の食材を作成
      const ingredientId = testDataHelpers.ingredientId()
      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          userId: testUserId,
          name: testDataHelpers.ingredientName(),
          categoryId: testCategoryId,
          quantity: 1,
          unitId: testUnitId,
          purchaseDate: new Date(),
          storageLocationType: 'REFRIGERATOR',
        },
      })

      // 新しいアイテムを確認
      const ingredientIdVO = new IngredientId(ingredientId)
      session.checkItem({
        ingredientId: ingredientIdVO,
        ingredientName: new IngredientName(testDataHelpers.ingredientName()),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      // Act
      const updatedSession = await repository.update(session)

      // Assert
      expect(updatedSession.getCheckedItems()).toHaveLength(1)

      // データベースから直接確認
      const dbItems = await prisma.shoppingSessionItem.findMany({
        where: { sessionId: session.getId().getValue() },
      })
      expect(dbItems).toHaveLength(1)
      expect(dbItems[0].ingredientId).toBe(ingredientIdVO.getValue())
    })

    it('既存の確認済みアイテムを更新できる', async () => {
      // Arrange
      // テスト用の食材を作成
      const ingredientIdValue = testDataHelpers.ingredientId()
      await prisma.ingredient.create({
        data: {
          id: ingredientIdValue,
          userId: testUserId,
          name: testDataHelpers.ingredientName(),
          categoryId: testCategoryId,
          quantity: 1,
          unitId: testUnitId,
          purchaseDate: new Date(),
          storageLocationType: 'REFRIGERATOR',
        },
      })

      const ingredientId = new IngredientId(ingredientIdValue)
      const checkedItem = CheckedItem.create({
        ingredientId,
        ingredientName: new IngredientName(testDataHelpers.ingredientName()),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      const session = new ShoppingSessionBuilder()
        .withUserId(testUserId)
        .withStatus(SessionStatus.ACTIVE)
        .withCheckedItems([checkedItem])
        .build()
      await repository.save(session)

      // 同じ食材を別のステータスで再確認
      session.checkItem({
        ingredientId,
        ingredientName: new IngredientName(testDataHelpers.ingredientName()),
        stockStatus: StockStatus.OUT_OF_STOCK,
        expiryStatus: ExpiryStatus.EXPIRED,
      })

      // Act
      const updatedSession = await repository.update(session)

      // Assert
      expect(updatedSession.getCheckedItems()).toHaveLength(1)
      const updatedItem = updatedSession.getCheckedItems()[0]
      expect(updatedItem.getStockStatus().getValue()).toBe('OUT_OF_STOCK')
      expect(updatedItem.getExpiryStatus().getValue()).toBe('EXPIRED')

      // データベースから直接確認
      const dbItems = await prisma.shoppingSessionItem.findMany({
        where: { sessionId: session.getId().getValue() },
      })
      expect(dbItems).toHaveLength(1)
      expect(dbItems[0].stockStatus).toBe('OUT_OF_STOCK')
      expect(dbItems[0].expiryStatus).toBe('EXPIRED')
    })
  })

  describe('トランザクション性', () => {
    it('セッション保存時にアイテム保存が失敗した場合、ロールバックされる', async () => {
      // Arrange
      // 存在しない食材IDを持つチェックアイテムを作成（外部キー制約違反）
      const nonExistentIngredientId = testDataHelpers.ingredientId()
      const checkedItem = CheckedItem.create({
        ingredientId: new IngredientId(nonExistentIngredientId),
        ingredientName: new IngredientName(testDataHelpers.ingredientName()),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
      })

      const session = new ShoppingSessionBuilder()
        .withUserId(testUserId)
        .withCheckedItems([checkedItem])
        .build()

      // Act & Assert
      await expect(repository.save(session)).rejects.toThrow()

      // セッションが保存されていないことを確認
      const dbSession = await prisma.shoppingSession.findUnique({
        where: { id: session.getId().getValue() },
      })
      expect(dbSession).toBeNull()
    })
  })
})
