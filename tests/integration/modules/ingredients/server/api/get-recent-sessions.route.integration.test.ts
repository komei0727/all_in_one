import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PrismaClient } from '@/generated/prisma-test'
import { GetRecentSessionsApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-recent-sessions.handler'
import { GetRecentSessionsHandler } from '@/modules/ingredients/server/application/queries/get-recent-sessions.handler'
import { PrismaShoppingQueryService } from '@/modules/ingredients/server/infrastructure/query-services/prisma-shopping-query-service'
import { PrismaShoppingSessionRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-shopping-session-repository'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'
import { shoppingSessionBuilder } from '@tests/__fixtures__/builders/shopping-session.builder'

/**
 * GetRecentSessions API + Application層統合テスト
 * 実際のアプリケーション層ハンドラーとクエリサービスを使用して統合動作を検証
 */
describe('GetRecentSessions API Integration', () => {
  let prisma: PrismaClient
  let apiHandler: GetRecentSessionsApiHandler
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
    const queryHandler = new GetRecentSessionsHandler(queryService)
    apiHandler = new GetRecentSessionsApiHandler(queryHandler)
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
    it('セッションがない場合、空の配列を返す', async () => {
      // Given: セッションがない

      // When: APIハンドラーを通じてセッション履歴取得
      const result = await apiHandler.handle(new Request('http://localhost'), userId)

      // Then: 空の配列が返される
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data.sessions).toEqual([])
    })

    it('複数のセッションがある場合、新しい順に返される', async () => {
      // Given: 複数のセッション（異なる開始時刻）
      const now = new Date()
      const session1 = shoppingSessionBuilder()
        .withUserId(userId)
        .withCompletedStatus()
        .withStartedAt(new Date(now.getTime() - 3600000)) // 1時間前
        .build()

      const session2 = shoppingSessionBuilder()
        .withUserId(userId)
        .withCompletedStatus()
        .withStartedAt(new Date(now.getTime() - 7200000)) // 2時間前
        .build()

      const session3 = shoppingSessionBuilder()
        .withUserId(userId)
        .withCompletedStatus()
        .withStartedAt(new Date(now.getTime() - 1800000)) // 30分前（最新）
        .build()

      await repository.save(session1)
      await repository.save(session2)
      await repository.save(session3)

      // When: デフォルト設定でセッション履歴取得
      const result = await apiHandler.handle(new Request('http://localhost'), userId)

      // Then: 新しい順にセッションが返される
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data.sessions).toHaveLength(3)
      // 最新のセッションが最初に来る
      expect(data.sessions[0].sessionId).toBe(session3.getId().getValue())
      expect(data.sessions[1].sessionId).toBe(session1.getId().getValue())
      expect(data.sessions[2].sessionId).toBe(session2.getId().getValue())
    })

    it('limitパラメータで取得件数を制限できる', async () => {
      // Given: 5つのセッション
      const sessions = Array.from({ length: 5 }, (_, i) =>
        shoppingSessionBuilder()
          .withUserId(userId)
          .withCompletedStatus()
          .withStartedAt(new Date(Date.now() - i * 3600000)) // i時間前
          .build()
      )

      for (const session of sessions) {
        await repository.save(session)
      }

      // When: limit=3で取得
      const result = await apiHandler.handle(new Request('http://localhost?limit=3'), userId)

      // Then: 3件のみ返される
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data.sessions).toHaveLength(3)
    })

    it('セッションの詳細情報が正しく返される', async () => {
      // Given: セッション
      const session = shoppingSessionBuilder()
        .withUserId(userId)
        .withCompletedStatus()
        .withDeviceType('MOBILE')
        .withLocation(35.6762, 139.6503) // 東京の座標
        .build()

      await repository.save(session)

      // When: セッション履歴取得
      const result = await apiHandler.handle(new Request('http://localhost'), userId)

      // Then: 詳細情報が含まれる
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data.sessions).toHaveLength(1)
      const sessionData = data.sessions[0]

      expect(sessionData).toMatchObject({
        sessionId: session.getId().getValue(),
        userId: session.getUserId(),
        status: session.getStatus().getValue(),
        startedAt: session.getStartedAt().toISOString(),
        completedAt: session.getCompletedAt()?.toISOString(),
        deviceType: session.getDeviceType()?.getValue() || null,
        location: session.getLocation()
          ? {
              latitude: session.getLocation()!.getLatitude(),
              longitude: session.getLocation()!.getLongitude(),
              // placeNameがundefinedの場合、JSONシリアライズで省略される
            }
          : null,
      })
    })
  })

  describe('異常系', () => {
    it('limitが無効な値の場合、バリデーションエラーを返す', async () => {
      // Given: 無効なlimit

      // When: APIハンドラーを通じてセッション履歴取得
      const result = await apiHandler.handle(new Request('http://localhost?limit=invalid'), userId)

      // Then: 400エラーレスポンスが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.message).toBe('Validation failed')
      expect(data.errors[0]).toMatchObject({
        field: 'limit',
        message: 'limit must be a valid integer',
      })
    })

    it('limitが範囲外の場合、バリデーションエラーを返す', async () => {
      // Given: 範囲外のlimit（101は上限100を超える）

      // When: APIハンドラーを通じてセッション履歴取得
      const result = await apiHandler.handle(new Request('http://localhost?limit=101'), userId)

      // Then: 400エラーレスポンスが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.message).toBe('Validation failed')
      expect(data.errors[0]).toMatchObject({
        field: 'limit',
        message: 'limit must be between 1 and 100',
      })
    })

    it('limitが0の場合、バリデーションエラーを返す', async () => {
      // Given: limit=0（下限1を下回る）

      // When: APIハンドラーを通じてセッション履歴取得
      const result = await apiHandler.handle(new Request('http://localhost?limit=0'), userId)

      // Then: 400エラーレスポンスが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.message).toBe('Validation failed')
      expect(data.errors[0]).toMatchObject({
        field: 'limit',
        message: 'limit must be between 1 and 100',
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

      const otherUserSession = shoppingSessionBuilder()
        .withUserId(otherDomainUser.id)
        .withCompletedStatus()
        .build()

      const mySession = shoppingSessionBuilder().withUserId(userId).withCompletedStatus().build()

      await repository.save(otherUserSession)
      await repository.save(mySession)

      // When: セッション履歴取得
      const result = await apiHandler.handle(new Request('http://localhost'), userId)

      // Then: 自分のセッションのみ返される
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data.sessions).toHaveLength(1)
      expect(data.sessions[0].sessionId).toBe(mySession.getId().getValue())
      expect(data.sessions[0].userId).toBe(userId)
    })

    it('limitデフォルト値（10件）が正しく動作する', async () => {
      // Given: 15件のセッション
      const sessions = Array.from({ length: 15 }, (_, i) =>
        shoppingSessionBuilder()
          .withUserId(userId)
          .withCompletedStatus()
          .withStartedAt(new Date(Date.now() - i * 3600000)) // i時間前
          .build()
      )

      for (const session of sessions) {
        await repository.save(session)
      }

      // When: limitパラメータなしで取得
      const result = await apiHandler.handle(new Request('http://localhost'), userId)

      // Then: デフォルトの10件が返される
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data.sessions).toHaveLength(10)
    })
  })
})
