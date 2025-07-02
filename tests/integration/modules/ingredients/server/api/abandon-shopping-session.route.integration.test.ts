import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PrismaClient } from '@/generated/prisma-test'
import { AbandonShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/commands/abandon-shopping-session.handler'
import { AbandonShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/abandon-shopping-session.handler'
import { ShoppingSessionId } from '@/modules/ingredients/server/domain/value-objects'
import { PrismaShoppingSessionRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-shopping-session-repository'
import { ShoppingSessionBuilder } from '@tests/__fixtures__/builders/entities/shopping-session.builder'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

/**
 * AbandonShoppingSession API + Application層統合テスト
 * 実際のアプリケーション層ハンドラーとリポジトリを使用して統合動作を検証
 */
describe('AbandonShoppingSession API Integration', () => {
  let prisma: PrismaClient
  let apiHandler: AbandonShoppingSessionApiHandler
  let repository: PrismaShoppingSessionRepository
  let userId: string

  beforeEach(async () => {
    // SQLiteテスト用のPrismaクライアントを作成
    prisma = new PrismaClient()

    // データベースのクリーンアップ（外部キー制約の順序を考慮）
    await prisma.shoppingSessionItem.deleteMany()
    await prisma.shoppingSession.deleteMany()
    await prisma.ingredient.deleteMany()
    await prisma.category.deleteMany()
    await prisma.unit.deleteMany()
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()

    // テスト用のユーザーを作成
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        emailVerified: new Date(),
      },
    })

    const domainUser = await prisma.domainUser.create({
      data: {
        id: testDataHelpers.userId(),
        displayName: faker.person.fullName(),
        email: user.email,
        nextAuthUser: {
          connect: { id: user.id },
        },
      },
    })

    userId = domainUser.id

    // 実際の依存関係を構築
    repository = new PrismaShoppingSessionRepository(prisma as any)
    const commandHandler = new AbandonShoppingSessionHandler(repository)
    apiHandler = new AbandonShoppingSessionApiHandler(commandHandler)
  })

  afterEach(async () => {
    // テスト後のクリーンアップ（外部キー制約の順序を考慮）
    await prisma.shoppingSessionItem.deleteMany()
    await prisma.shoppingSession.deleteMany()
    await prisma.ingredient.deleteMany()
    await prisma.category.deleteMany()
    await prisma.unit.deleteMany()
    await prisma.domainUser.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  describe('正常系', () => {
    it('アクティブなセッションを中断できる', async () => {
      // Given: アクティブなセッション
      const session = new ShoppingSessionBuilder().withUserId(userId).withActiveStatus().build()

      await repository.save(session)
      const sessionId = session.getId().getValue()

      // When: APIハンドラーを通じてセッション中断
      const request = new Request('http://localhost', {
        method: 'DELETE',
      })

      const result = await apiHandler.handle(request, { sessionId }, userId)

      // Then: レスポンスが成功する
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data).toMatchObject({
        sessionId,
        userId,
        status: 'ABANDONED',
        startedAt: expect.any(String),
        completedAt: expect.any(String),
      })

      // データベースでも更新されている
      const updatedSession = await prisma.shoppingSession.findUnique({
        where: { id: sessionId },
      })
      expect(updatedSession?.status).toBe('ABANDONED')
      expect(updatedSession?.completedAt).toBeTruthy()
    })

    it('中断理由を指定してセッションを中断できる', async () => {
      // Given: アクティブなセッション
      const session = new ShoppingSessionBuilder().withUserId(userId).withActiveStatus().build()

      await repository.save(session)
      const sessionId = session.getId().getValue()

      const requestWithReason = new Request('http://localhost', {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'user-cancelled' }),
      })

      // When: 理由付きでセッション中断
      const result = await apiHandler.handle(requestWithReason, { sessionId }, userId)

      // Then: レスポンスが成功する
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data.status).toBe('ABANDONED')
    })
  })

  describe('異常系', () => {
    it('存在しないセッションを中断しようとするとエラーになる', async () => {
      // Given: 存在しないセッションID
      const nonExistentId = ShoppingSessionId.create().getValue()

      // When: APIハンドラーを通じてセッション中断を試みる
      const request = new Request('http://localhost', {
        method: 'DELETE',
      })

      const result = await apiHandler.handle(request, { sessionId: nonExistentId }, userId)

      // Then: 404エラーレスポンスが返される
      expect(result.status).toBe(404)
      const data = await result.json()
      expect(data.message).toContain('買い物セッション not found')
    })

    it('他のユーザーのセッションは中断できない', async () => {
      // Given: 他のユーザーのセッション
      const otherUser = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          emailVerified: new Date(),
        },
      })

      const otherDomainUser = await prisma.domainUser.create({
        data: {
          id: testDataHelpers.userId(),
          displayName: faker.person.fullName(),
          email: otherUser.email,
          nextAuthUser: {
            connect: { id: otherUser.id },
          },
        },
      })

      const session = new ShoppingSessionBuilder()
        .withUserId(otherDomainUser.id)
        .withActiveStatus()
        .build()

      await repository.save(session)
      const sessionId = session.getId().getValue()

      // When: 別のユーザーがセッション中断を試みる
      const result = await apiHandler.handle({} as Request, { sessionId }, userId)

      // Then: 404エラーレスポンスが返される（権限エラーを隠蔽）
      expect(result.status).toBe(404)
      const data = await result.json()
      expect(data.message).toContain('買い物セッション not found')
    })

    it('既に完了したセッションは中断できない', async () => {
      // Given: 完了済みのセッション
      const session = new ShoppingSessionBuilder().withUserId(userId).withCompletedStatus().build()

      await repository.save(session)
      const sessionId = session.getId().getValue()

      // When: セッション中断を試みる
      const result = await apiHandler.handle({} as Request, { sessionId }, userId)

      // Then: 409エラーレスポンスが返される
      expect(result.status).toBe(409)
      const data = await result.json()
      expect(data.message).toContain('アクティブでないセッション')
    })

    it('既に中断されたセッションは再度中断できない', async () => {
      // Given: 中断済みのセッション
      const session = new ShoppingSessionBuilder().withUserId(userId).withAbandonedStatus().build()

      await repository.save(session)
      const sessionId = session.getId().getValue()

      // When: 再度セッション中断を試みる
      const result = await apiHandler.handle({} as Request, { sessionId }, userId)

      // Then: 409エラーレスポンスが返される
      expect(result.status).toBe(409)
      const data = await result.json()
      expect(data.message).toContain('アクティブでないセッション')
    })

    it('無効なセッションID形式の場合はバリデーションエラーになる', async () => {
      // Given: 無効な形式のセッションID
      const invalidSessionId = 'invalid-session-id'

      // When: APIハンドラーを通じてセッション中断を試みる
      const result = await apiHandler.handle({} as Request, { sessionId: invalidSessionId }, userId)

      // Then: 400エラーレスポンスが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.message).toBe('Validation failed')
      expect(data.errors).toBeInstanceOf(Array)
      expect(data.errors[0]).toMatchObject({
        path: ['sessionId'],
        message: 'Invalid session ID format',
      })
    })
  })
})
