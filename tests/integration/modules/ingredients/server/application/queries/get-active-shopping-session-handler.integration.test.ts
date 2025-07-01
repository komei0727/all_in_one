import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PrismaClient } from '@/generated/prisma-test'
import { GetActiveShoppingSessionHandler } from '@/modules/ingredients/server/application/queries/get-active-shopping-session.handler'
import { GetActiveShoppingSessionQuery } from '@/modules/ingredients/server/application/queries/get-active-shopping-session.query'
import { SessionStatus } from '@/modules/ingredients/server/domain/value-objects'
import { PrismaShoppingSessionRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-shopping-session-repository'
import { ShoppingSessionBuilder } from '@tests/__fixtures__/builders'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('GetActiveShoppingSessionHandler Integration Tests', () => {
  let prisma: PrismaClient
  let handler: GetActiveShoppingSessionHandler
  let repository: PrismaShoppingSessionRepository
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

    // 実際のリポジトリを使用
    repository = new PrismaShoppingSessionRepository(prisma as any)
    handler = new GetActiveShoppingSessionHandler(repository)
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
    it('アクティブなセッションが存在する場合は取得できる', async () => {
      // Given: アクティブなセッションを作成
      const session = new ShoppingSessionBuilder()
        .withUserId(testUserId)
        .withStatus(SessionStatus.ACTIVE)
        .build()

      await repository.save(session)

      // When: クエリを実行
      const query = new GetActiveShoppingSessionQuery(testUserId)
      const result = await handler.handle(query)

      // Then: セッションのDTOが返される
      expect(result).toBeDefined()
      expect(result?.userId).toBe(testUserId)
      expect(result?.status).toBe('ACTIVE')
      expect(result?.sessionId).toBe(session.getId().getValue())
    })

    it('アクティブなセッションが存在しない場合はnullを返す', async () => {
      // Given: セッションなし

      // When: クエリを実行
      const query = new GetActiveShoppingSessionQuery(testUserId)
      const result = await handler.handle(query)

      // Then: nullが返される
      expect(result).toBeNull()
    })

    it('完了済みのセッションは取得されない', async () => {
      // Given: 完了済みのセッション
      const session = new ShoppingSessionBuilder()
        .withUserId(testUserId)
        .withStatus(SessionStatus.COMPLETED)
        .build()

      await repository.save(session)

      // When: クエリを実行
      const query = new GetActiveShoppingSessionQuery(testUserId)
      const result = await handler.handle(query)

      // Then: nullが返される
      expect(result).toBeNull()
    })

    it('他のユーザーのセッションは取得されない', async () => {
      // Given: 他のユーザーのアクティブなセッション
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

      // When: 元のユーザーでクエリを実行
      const query = new GetActiveShoppingSessionQuery(testUserId)
      const result = await handler.handle(query)

      // Then: nullが返される
      expect(result).toBeNull()
    })
  })
})
