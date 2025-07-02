import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PrismaClient } from '@/generated/prisma-test'
import { GetShoppingStatisticsApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-shopping-statistics.handler'
import { GetShoppingStatisticsHandler } from '@/modules/ingredients/server/application/queries/get-shopping-statistics.handler'
import { PrismaShoppingQueryService } from '@/modules/ingredients/server/infrastructure/query-services/prisma-shopping-query-service'
import { PrismaShoppingSessionRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-shopping-session-repository'
import { ShoppingSessionBuilder } from '@tests/__fixtures__/builders/entities/shopping-session.builder'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

/**
 * GetShoppingStatistics API + Application層統合テスト
 * 実際のアプリケーション層ハンドラーとクエリサービスを使用して統合動作を検証
 */
describe('GetShoppingStatistics API Integration', () => {
  let prisma: PrismaClient
  let apiHandler: GetShoppingStatisticsApiHandler
  let repository: PrismaShoppingSessionRepository
  let queryService: PrismaShoppingQueryService
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
    queryService = new PrismaShoppingQueryService(prisma as any)
    const queryHandler = new GetShoppingStatisticsHandler(queryService)
    apiHandler = new GetShoppingStatisticsApiHandler(queryHandler)
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
    it('セッションがない場合、空の統計情報を返す', async () => {
      // Given: セッションがない

      // When: APIハンドラーを通じて統計取得
      const result = await apiHandler.handle(new Request('http://localhost'), userId)

      // Then: 空の統計情報が返される
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data.statistics).toMatchObject({
        totalSessions: 0,
        totalCheckedIngredients: 0,
        averageSessionDurationMinutes: 0,
        topCheckedIngredients: [],
        monthlySessionCounts: [],
      })
    })

    it('複数のセッションがある場合、正しく集計される', async () => {
      // Given: 複数のセッション
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const fiftyDaysAgo = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000)

      // 30日以内のセッション
      const recentSession1 = new ShoppingSessionBuilder()
        .withUserId(userId)
        .withCompletedStatus()
        .withStartedAt(new Date(thirtyDaysAgo.getTime() + 5 * 24 * 60 * 60 * 1000))
        .build()

      const recentSession2 = new ShoppingSessionBuilder()
        .withUserId(userId)
        .withCompletedStatus()
        .withStartedAt(new Date(thirtyDaysAgo.getTime() + 10 * 24 * 60 * 60 * 1000))
        .build()

      // 30日より前のセッション（カウントされない）
      const oldSession = new ShoppingSessionBuilder()
        .withUserId(userId)
        .withCompletedStatus()
        .withStartedAt(fiftyDaysAgo)
        .build()

      await repository.save(recentSession1)
      await repository.save(recentSession2)
      await repository.save(oldSession)

      // When: デフォルト期間（30日）で統計取得
      const result = await apiHandler.handle(new Request('http://localhost'), userId)

      // Then: 30日以内のセッションのみカウントされる
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data.statistics).toMatchObject({
        totalSessions: 2, // 30日以内の2つのみ
        totalCheckedIngredients: 0, // チェック済みアイテムなし
        averageSessionDurationMinutes: expect.any(Number),
      })
    })

    it('カスタム期間を指定できる', async () => {
      // Given: 90日前のセッション
      const ninetyDaysAgo = new Date(new Date().getTime() - 90 * 24 * 60 * 60 * 1000)
      const session = new ShoppingSessionBuilder()
        .withUserId(userId)
        .withCompletedStatus()
        .withStartedAt(new Date(ninetyDaysAgo.getTime() + 10 * 24 * 60 * 60 * 1000))
        .build()

      await repository.save(session)

      // When: 100日間の統計を取得
      const result = await apiHandler.handle(new Request('http://localhost?periodDays=100'), userId)

      // Then: 90日前のセッションが含まれる
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data.statistics.totalSessions).toBe(1)
    })
  })

  describe('異常系', () => {
    it('periodDaysが無効な値の場合、バリデーションエラーを返す', async () => {
      // Given: 無効なperiodDays

      // When: APIハンドラーを通じて統計取得
      const result = await apiHandler.handle(
        new Request('http://localhost?periodDays=invalid'),
        userId
      )

      // Then: 400エラーレスポンスが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.message).toBe('Validation failed')
      expect(data.errors[0]).toMatchObject({
        field: 'periodDays',
        message: 'periodDays must be a valid integer',
      })
    })

    it('periodDaysが範囲外の場合、バリデーションエラーを返す', async () => {
      // Given: 範囲外のperiodDays

      // When: APIハンドラーを通じて統計取得
      const result = await apiHandler.handle(new Request('http://localhost?periodDays=500'), userId)

      // Then: 400エラーレスポンスが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.message).toBe('Validation failed')
      expect(data.errors[0]).toMatchObject({
        field: 'periodDays',
        message: 'periodDays must be between 1 and 365',
      })
    })
  })

  describe('データ整合性', () => {
    it('他のユーザーのセッションは含まれない', async () => {
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

      const otherUserSession = new ShoppingSessionBuilder()
        .withUserId(otherDomainUser.id)
        .withCompletedStatus()
        .build()

      const mySession = new ShoppingSessionBuilder()
        .withUserId(userId)
        .withCompletedStatus()
        .build()

      await repository.save(otherUserSession)
      await repository.save(mySession)

      // When: 統計取得
      const result = await apiHandler.handle(new Request('http://localhost'), userId)

      // Then: 自分のセッションのみカウントされる
      expect(result.status).toBe(200)
      const data = await result.json()
      expect(data.statistics.totalSessions).toBe(1)
    })
  })
})
