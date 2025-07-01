import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PrismaClient } from '@/generated/prisma-test'
import { CompleteShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/commands/complete-shopping-session.handler'
import { CompleteShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/complete-shopping-session.handler'
import { ShoppingSessionId } from '@/modules/ingredients/server/domain/value-objects'
import { PrismaShoppingSessionRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-shopping-session-repository'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'
import { shoppingSessionBuilder } from '@tests/__fixtures__/builders/shopping-session.builder'

/**
 * CompleteShoppingSession API + Application層統合テスト
 * 実際のアプリケーション層ハンドラーとリポジトリを使用して統合動作を検証
 */
describe('CompleteShoppingSession API Integration', () => {
  let prisma: PrismaClient
  let apiHandler: CompleteShoppingSessionApiHandler
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
    repository = new PrismaShoppingSessionRepository(prisma as any) // SQLiteとPostgreSQLの型の違いを吸収
    const commandHandler = new CompleteShoppingSessionHandler(repository)
    apiHandler = new CompleteShoppingSessionApiHandler(commandHandler)
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
    it('アクティブなセッションを完了できる', async () => {
      // Given: アクティブなセッション
      const session = shoppingSessionBuilder().withUserId(userId).withActiveStatus().build()

      await repository.save(session)
      const sessionId = session.getId().getValue()

      // When: APIハンドラーを通じてセッション完了
      const result = await apiHandler.handle(
        {} as Request, // RequestはAPIハンドラー内で使用されない
        { sessionId },
        userId
      )

      // Then: レスポンスが成功する
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data).toMatchObject({
        sessionId,
        userId,
        status: 'COMPLETED',
        startedAt: expect.any(String),
        completedAt: expect.any(String),
        deviceType: null,
        location: null,
      })

      // データベースでも更新されている
      const updatedSession = await prisma.shoppingSession.findUnique({
        where: { id: sessionId },
      })
      expect(updatedSession?.status).toBe('COMPLETED')
      expect(updatedSession?.completedAt).toBeTruthy()
    })

    it('デバイスタイプと位置情報が保持される', async () => {
      // Given: デバイスタイプと位置情報を持つアクティブなセッション
      const session = shoppingSessionBuilder()
        .withUserId(userId)
        .withActiveStatus()
        .withDeviceType('MOBILE')
        .withLocation(35.6762, 139.6503)
        .build()

      await repository.save(session)
      const sessionId = session.getId().getValue()

      // When: セッション完了
      const result = await apiHandler.handle({} as Request, { sessionId }, userId)

      // Then: デバイスタイプと位置情報が保持される
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data.deviceType).toBe('MOBILE')
      // locationが空オブジェクトで返されることを確認（locationは存在するがplaceNameがない場合）
      expect(data.location).toEqual({})
    })
  })

  describe('異常系', () => {
    it('存在しないセッションを完了しようとするとエラーになる', async () => {
      // Given: 存在しないセッションID
      const nonExistentId = ShoppingSessionId.create().getValue()

      // When: APIハンドラーを通じてセッション完了を試みる
      const result = await apiHandler.handle({} as Request, { sessionId: nonExistentId }, userId)

      // Then: 404エラーレスポンスが返される
      expect(result.status).toBe(404)
      const data = await result.json()
      expect(data.message).toContain('買い物セッション not found')
    })

    it('他のユーザーのセッションは完了できない', async () => {
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

      const session = shoppingSessionBuilder()
        .withUserId(otherDomainUser.id)
        .withActiveStatus()
        .build()

      await repository.save(session)
      const sessionId = session.getId().getValue()

      // When: 別のユーザーがセッション完了を試みる
      const result = await apiHandler.handle({} as Request, { sessionId }, userId)

      // Then: 403エラーレスポンスが返される
      expect(result.status).toBe(403)
      const data = await result.json()
      expect(data.message).toContain('権限がありません')
    })

    it('既に完了したセッションは再度完了できない', async () => {
      // Given: 完了済みのセッション
      const session = shoppingSessionBuilder().withUserId(userId).withCompletedStatus().build()

      await repository.save(session)
      const sessionId = session.getId().getValue()

      // When: 再度セッション完了を試みる
      const result = await apiHandler.handle({} as Request, { sessionId }, userId)

      // Then: 409エラーレスポンスが返される
      expect(result.status).toBe(409)
      const data = await result.json()
      expect(data.message).toContain('アクティブでないセッション')
    })

    it('無効なセッションID形式の場合はバリデーションエラーになる', async () => {
      // Given: 無効な形式のセッションID
      const invalidSessionId = 'invalid-session-id'

      // When: APIハンドラーを通じてセッション完了を試みる
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

  describe('トランザクション処理', () => {
    it('セッション完了時にcompletedAtが正しく設定される', async () => {
      // Given: アクティブなセッション
      const session = shoppingSessionBuilder().withUserId(userId).withActiveStatus().build()

      await repository.save(session)
      const sessionId = session.getId().getValue()

      const beforeComplete = new Date()

      // When: セッション完了
      await apiHandler.handle({} as Request, { sessionId }, userId)

      const afterComplete = new Date()

      // Then: completedAtが適切な時刻に設定される
      const updatedSession = await prisma.shoppingSession.findUnique({
        where: { id: sessionId },
      })

      expect(updatedSession?.completedAt).toBeTruthy()
      const completedAt = new Date(updatedSession!.completedAt!)
      expect(completedAt.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime())
      expect(completedAt.getTime()).toBeLessThanOrEqual(afterComplete.getTime())
    })
  })

  describe('データ整合性', () => {
    it('チェック済みアイテムが完了後も保持される', async () => {
      // Given: チェック済みアイテムを持つセッション
      // 先にカテゴリと単位を作成
      await prisma.category.create({
        data: {
          id: 'cat1',
          name: '野菜',
          displayOrder: 1,
        },
      })
      await prisma.unit.create({
        data: {
          id: 'unit1',
          name: '個',
          symbol: '個',
          type: 'COUNT',
          displayOrder: 1,
        },
      })

      // 食材を作成
      const ingredient = await prisma.ingredient.create({
        data: {
          id: testDataHelpers.ingredientId(),
          userId,
          name: faker.commerce.productName(),
          categoryId: 'cat1',
          quantity: 1,
          unitId: 'unit1',
          purchaseDate: new Date(),
          storageLocationType: 'REFRIGERATED',
        },
      })

      // セッションを作成
      const sessionId = ShoppingSessionId.create().getValue()
      await prisma.shoppingSession.create({
        data: {
          id: sessionId,
          status: 'ACTIVE',
          startedAt: new Date(),
          user: {
            connect: { id: userId },
          },
        },
      })

      // チェック済みアイテムを作成
      await prisma.shoppingSessionItem.create({
        data: {
          sessionId,
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          stockStatus: 'IN_STOCK',
          expiryStatus: 'FRESH',
          checkedAt: new Date(),
        },
      })

      // When: セッション完了
      await apiHandler.handle({} as Request, { sessionId }, userId)

      // Then: チェック済みアイテムが保持される
      const items = await prisma.shoppingSessionItem.findMany({
        where: { sessionId },
      })
      expect(items).toHaveLength(1)
      expect(items[0].ingredientId).toBe(ingredient.id)
    })
  })
})
