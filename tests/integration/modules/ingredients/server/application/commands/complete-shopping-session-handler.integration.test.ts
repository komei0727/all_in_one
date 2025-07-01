import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PrismaClient } from '@/generated/prisma-test'
import { CompleteShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/complete-shopping-session.command'
import { CompleteShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/complete-shopping-session.handler'
import {
  SessionStatus,
  CheckedItem,
  IngredientId,
  IngredientName,
  StockStatus,
  ExpiryStatus,
  ShoppingSessionId,
} from '@/modules/ingredients/server/domain/value-objects'
import { PrismaShoppingSessionRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-shopping-session-repository'
import { ShoppingSessionBuilder } from '@tests/__fixtures__/builders'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('CompleteShoppingSessionHandler Integration Tests', () => {
  let prisma: PrismaClient
  let handler: CompleteShoppingSessionHandler
  let repository: PrismaShoppingSessionRepository
  let testUserId: string

  beforeEach(async () => {
    // SQLiteテスト用のPrismaクライアントを作成
    prisma = new PrismaClient()

    // 既存のデータをクリーンアップ
    await prisma.shoppingSessionItem.deleteMany()
    await prisma.shoppingSession.deleteMany()
    await prisma.ingredient.deleteMany()
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.category.deleteMany()
    await prisma.unit.deleteMany()

    // テストユーザーを作成
    testUserId = testDataHelpers.userId()
    const nextAuthUserId = faker.string.uuid()
    const email = faker.internet.email()

    // NextAuthユーザーを作成
    await prisma.user.create({
      data: {
        id: nextAuthUserId,
        email: email,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // ドメインユーザーを作成
    await prisma.domainUser.create({
      data: {
        id: testUserId,
        nextAuthId: nextAuthUserId,
        email: email,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // 実際のリポジトリを使用
    repository = new PrismaShoppingSessionRepository(prisma as any)
    handler = new CompleteShoppingSessionHandler(repository)
  })

  afterEach(async () => {
    // データベースをクリーンアップ
    await prisma.shoppingSessionItem.deleteMany()
    await prisma.shoppingSession.deleteMany()
    await prisma.ingredient.deleteMany()
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.category.deleteMany()
    await prisma.unit.deleteMany()
    await prisma.$disconnect()
  })

  describe('handle', () => {
    it('アクティブなセッションを完了できる', async () => {
      // Given: アクティブなセッション
      const session = new ShoppingSessionBuilder()
        .withUserId(testUserId)
        .withStatus(SessionStatus.ACTIVE)
        .build()

      await repository.save(session)
      const sessionId = session.getId().getValue()

      // When: コマンドを実行
      const command = new CompleteShoppingSessionCommand(sessionId, testUserId)
      const result = await handler.handle(command)

      // Then: 完了したセッションのDTOが返される
      expect(result).toBeDefined()
      expect(result.sessionId).toBe(sessionId)
      expect(result.status).toBe('COMPLETED')
      expect(result.completedAt).toBeDefined()

      // データベースでも更新されている
      const updatedSession = await prisma.shoppingSession.findUnique({
        where: { id: sessionId },
      })
      expect(updatedSession?.status).toBe('COMPLETED')
      expect(updatedSession?.completedAt).toBeDefined()
    })

    it('存在しないセッションを完了しようとするとエラー', async () => {
      // Given: 存在しないセッションID
      const nonExistentId = ShoppingSessionId.create().getValue()

      // When/Then: エラーが発生
      const command = new CompleteShoppingSessionCommand(nonExistentId, testUserId)
      await expect(handler.handle(command)).rejects.toThrow('買い物セッション not found')
    })

    it('他のユーザーのセッションは完了できない', async () => {
      // Given: 他のユーザーのセッション
      const otherUserId = testDataHelpers.userId()
      const otherNextAuthUserId = faker.string.uuid()
      const otherEmail = faker.internet.email()

      await prisma.user.create({
        data: {
          id: otherNextAuthUserId,
          email: otherEmail,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      await prisma.domainUser.create({
        data: {
          id: otherUserId,
          nextAuthId: otherNextAuthUserId,
          email: otherEmail,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const session = new ShoppingSessionBuilder()
        .withUserId(otherUserId)
        .withStatus(SessionStatus.ACTIVE)
        .build()

      await repository.save(session)
      const sessionId = session.getId().getValue()

      // When/Then: 権限エラーが発生
      const command = new CompleteShoppingSessionCommand(sessionId, testUserId)
      await expect(handler.handle(command)).rejects.toThrow('権限がありません')
    })

    it('既に完了したセッションは再度完了できない', async () => {
      // Given: 完了済みのセッション
      const session = new ShoppingSessionBuilder()
        .withUserId(testUserId)
        .withStatus(SessionStatus.COMPLETED)
        .build()

      await repository.save(session)
      const sessionId = session.getId().getValue()

      // When/Then: エラーが発生
      const command = new CompleteShoppingSessionCommand(sessionId, testUserId)
      await expect(handler.handle(command)).rejects.toThrow(
        'アクティブでないセッションは完了できません'
      )
    })

    it('チェック済みアイテムも含めて正しく保存される', async () => {
      // Given: テスト用の食材を作成
      // まずカテゴリと単位を作成
      const categoryId = 'cat1'
      const unitId = 'unit1'
      await prisma.category.create({
        data: {
          id: categoryId,
          name: '野菜',
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
      await prisma.unit.create({
        data: {
          id: unitId,
          name: '個',
          symbol: '個',
          type: 'COUNT',
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // 食材を作成
      const ingredientId = testDataHelpers.ingredientId()
      const ingredientName = faker.commerce.productName()
      await prisma.ingredient.create({
        data: {
          id: ingredientId,
          userId: testUserId,
          name: ingredientName,
          categoryId: categoryId,
          quantity: 1,
          unitId: unitId,
          purchaseDate: new Date(),
          storageLocationType: 'REFRIGERATED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // チェック済みアイテムを作成
      const checkedItem = CheckedItem.create({
        ingredientId: new IngredientId(ingredientId),
        ingredientName: new IngredientName(ingredientName),
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
        checkedAt: new Date(),
      })

      const session = new ShoppingSessionBuilder()
        .withUserId(testUserId)
        .withStatus(SessionStatus.ACTIVE)
        .withCheckedItems([checkedItem])
        .build()

      await repository.save(session)
      const sessionId = session.getId().getValue()

      // When: セッションを完了
      const command = new CompleteShoppingSessionCommand(sessionId, testUserId)
      const result = await handler.handle(command)

      // Then: 完了したセッションが返される
      expect(result.status).toBe('COMPLETED')

      // チェック済みアイテムも保持されている
      const savedItems = await prisma.shoppingSessionItem.findMany({
        where: { sessionId },
      })
      expect(savedItems).toHaveLength(1)
    })
  })
})
