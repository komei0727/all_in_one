import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PrismaClient } from '@/generated/prisma-test'
import { StartShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/start-shopping-session.command'
import { StartShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/start-shopping-session.handler'
import { ShoppingSessionFactory } from '@/modules/ingredients/server/domain/factories/shopping-session.factory'
import { PrismaShoppingSessionRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-shopping-session-repository'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('StartShoppingSessionHandler Integration Tests', () => {
  let prisma: PrismaClient
  let handler: StartShoppingSessionHandler
  let repository: PrismaShoppingSessionRepository
  let factory: ShoppingSessionFactory
  let testUserId: string

  beforeEach(async () => {
    // SQLiteテスト用のPrismaクライアントを作成
    prisma = new PrismaClient()

    // 既存のデータをクリーンアップ
    await prisma.shoppingSessionItem.deleteMany()
    await prisma.shoppingSession.deleteMany()
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()

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

    // 実際のリポジトリとファクトリを使用
    repository = new PrismaShoppingSessionRepository(prisma as any)
    factory = new ShoppingSessionFactory(repository)
    handler = new StartShoppingSessionHandler(factory, repository)
  })

  afterEach(async () => {
    // データベースをクリーンアップ
    await prisma.shoppingSessionItem.deleteMany()
    await prisma.shoppingSession.deleteMany()
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  describe('handle', () => {
    it('新しいショッピングセッションを開始してデータベースに保存できる', async () => {
      // Given: コマンド
      const command = new StartShoppingSessionCommand(testUserId)

      // When: ハンドラーを実行
      const result = await handler.handle(command)

      // Then: DTOが返される
      expect(result).toBeDefined()
      expect(result.userId).toBe(testUserId)
      expect(result.status).toBe('ACTIVE')
      expect(result.startedAt).toBeDefined()
      expect(result.completedAt).toBeNull()

      // データベースに保存されている
      const savedSession = await prisma.shoppingSession.findUnique({
        where: { id: result.sessionId },
      })
      expect(savedSession).toBeDefined()
      expect(savedSession?.userId).toBe(testUserId)
      expect(savedSession?.status).toBe('ACTIVE')
    })

    it('同じユーザーで複数のアクティブセッションを作成できない', async () => {
      // Given: 既にアクティブなセッションが存在
      const firstCommand = new StartShoppingSessionCommand(testUserId)
      await handler.handle(firstCommand)

      // When: 2つ目のセッションを作成しようとする
      const secondCommand = new StartShoppingSessionCommand(testUserId)

      // Then: エラーが発生する
      await expect(handler.handle(secondCommand)).rejects.toThrow(
        '同一ユーザーで同時にアクティブなセッションは1つのみです'
      )

      // データベースにはセッションが1つのみ
      const sessions = await prisma.shoppingSession.findMany({
        where: { userId: testUserId },
      })
      expect(sessions).toHaveLength(1)
    })

    it('異なるユーザーは同時にセッションを持てる', async () => {
      // Given: 別のユーザー
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

      // When: 両方のユーザーがセッションを開始
      const command1 = new StartShoppingSessionCommand(testUserId)
      const command2 = new StartShoppingSessionCommand(otherUserId)

      const result1 = await handler.handle(command1)
      const result2 = await handler.handle(command2)

      // Then: 両方とも成功
      expect(result1.userId).toBe(testUserId)
      expect(result2.userId).toBe(otherUserId)

      // データベースに2つのセッションが存在
      const sessions = await prisma.shoppingSession.findMany()
      expect(sessions).toHaveLength(2)
    })
  })
})
