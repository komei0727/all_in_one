import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/recent/route'
import { auth } from '@/auth'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
} from '@tests/helpers/database.helper'

// authモジュールをモック
vi.mock('@/auth')

/**
 * テスト用認証ユーザーのモックを設定
 */
function mockAuthUser(user?: { nextAuthId?: string; domainUserId?: string; email?: string }) {
  const testDataIds = getTestDataIds()
  const { defaultUser } = testDataIds.users

  vi.mocked(auth).mockResolvedValue({
    user: {
      id: user?.nextAuthId || defaultUser.nextAuthId,
      email: user?.email || defaultUser.email,
      domainUserId: user?.domainUserId || defaultUser.domainUserId,
    },
  } as any)

  return user?.domainUserId || defaultUser.domainUserId
}

/**
 * GET /api/v1/shopping-sessions/recent APIの統合テスト
 *
 * 最近の買い物セッション取得機能の統合テスト
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('GET /api/v1/shopping-sessions/recent Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // CompositionRootをリセットして、テスト用のPrismaクライアントを使用
    CompositionRoot.resetInstance()
    CompositionRoot.getInstance(prisma as any)

    vi.clearAllMocks()
  })

  afterEach(async () => {
    // 各テストの後にデータベースをクリーンアップ
    await cleanupIntegrationTest()

    // CompositionRootをリセット
    CompositionRoot.resetInstance()

    vi.clearAllMocks()
  })

  afterAll(async () => {
    // すべてのテスト完了後にPrismaクライアントをクリーンアップ
    await cleanupPrismaClient()
  })

  describe('正常系', () => {
    describe('基本的な最近のセッション取得', () => {
      it('TC001: デフォルトパラメータでの取得', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // テスト用セッションデータを作成（時系列順）
        const now = new Date()
        const sessions = []
        for (let i = 0; i < 15; i++) {
          const startedAt = new Date(now.getTime() - i * 60 * 60 * 1000) // 1時間ずつ過去
          const completedAt = new Date(startedAt.getTime() + 30 * 60 * 1000) // 30分後に完了
          const session = await prisma.shoppingSession.create({
            data: {
              id: faker.string.alphanumeric(20),
              userId,
              status: i % 3 === 0 ? 'ABANDONED' : 'COMPLETED',
              startedAt,
              completedAt: i % 3 === 0 ? null : completedAt,
            },
          })
          sessions.push(session)
        }

        // APIを呼び出し
        const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent')
        const response = await GET(request)
        const responseData = await response.json()

        // レスポンスの検証
        expect(response.status).toBe(200)
        expect(responseData.data).toBeDefined()
        expect(responseData.data.data).toBeDefined()
        expect(responseData.data.data).toHaveLength(10) // デフォルトlimit=10
        expect(responseData.data.meta).toBeDefined()
        expect(responseData.data.meta.timestamp).toBeDefined()
        expect(responseData.data.meta.version).toBeDefined()
        expect(responseData.data.pagination).toBeDefined()
        expect(responseData.data.pagination.page).toBe(1)
        expect(responseData.data.pagination.limit).toBe(10)
        expect(responseData.data.pagination.total).toBe(10) // 現在の実装では取得件数が総数となる
        expect(responseData.data.pagination.totalPages).toBe(1)
        expect(responseData.data.pagination.hasNext).toBe(false)
        expect(responseData.data.pagination.hasPrev).toBe(false)

        // 最新のセッションから順に取得されていることを確認
        for (let i = 0; i < 9; i++) {
          const session1 = responseData.data.data[i]
          const session2 = responseData.data.data[i + 1]
          expect(new Date(session1.startedAt).getTime()).toBeGreaterThan(
            new Date(session2.startedAt).getTime()
          )
        }
      })

      it('TC002: カスタムlimitでの取得', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // テスト用セッションデータを作成
        for (let i = 0; i < 30; i++) {
          await prisma.shoppingSession.create({
            data: {
              id: faker.string.alphanumeric(20),
              userId,
              status: 'COMPLETED',
              startedAt: new Date(Date.now() - i * 60 * 60 * 1000),
              completedAt: new Date(Date.now() - i * 60 * 60 * 1000 + 30 * 60 * 1000),
            },
          })
        }

        // limit=5での取得
        let request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/recent?limit=5'
        )
        let response = await GET(request)
        let responseData = await response.json()
        expect(response.status).toBe(200)
        expect(responseData.data.data).toHaveLength(5)
        expect(responseData.data.pagination.limit).toBe(5)

        // limit=20での取得
        request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent?limit=20')
        response = await GET(request)
        responseData = await response.json()
        expect(response.status).toBe(200)
        expect(responseData.data.data).toHaveLength(20)
        expect(responseData.data.pagination.limit).toBe(20)

        // limit=50での取得
        request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent?limit=50')
        response = await GET(request)
        responseData = await response.json()
        expect(response.status).toBe(200)
        expect(responseData.data.data).toHaveLength(30) // 実際のデータは30件のみ
        expect(responseData.data.pagination.limit).toBe(50)
      })

      it('TC003: 空の結果', async () => {
        // 認証ユーザーをモック
        mockAuthUser()

        // セッションデータなし
        const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent')
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data).toBeDefined()
        expect(responseData.data.data).toHaveLength(0)
        expect(responseData.data.pagination.total).toBe(0)
        expect(responseData.data.pagination.totalPages).toBe(0)
        expect(responseData.data.pagination.hasNext).toBe(false)
        expect(responseData.data.pagination.hasPrev).toBe(false)
      })
    })

    describe('セッションデータの検証', () => {
      it('TC004: セッション情報の完全性', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // 完全なセッションデータを作成
        const startedAt = new Date(Date.now() - 60 * 60 * 1000) // 1時間前
        const completedAt = new Date(Date.now() - 30 * 60 * 1000) // 30分前
        const sessionId = faker.string.alphanumeric(20)

        // セッションを作成
        await prisma.shoppingSession.create({
          data: {
            id: sessionId,
            userId,
            status: 'COMPLETED',
            startedAt,
            completedAt,
          },
        })

        // セッションにチェック履歴を追加
        const testDataIds = getTestDataIds()

        // テスト用の食材を作成
        const ingredient = await prisma.ingredient.create({
          data: {
            name: 'トマト',
            categoryId: testDataIds.categories.vegetable,
            unitId: testDataIds.units.gram,
            quantity: 500,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
            userId,
          },
        })

        for (let i = 0; i < 5; i++) {
          // 各チェックごとに異なる食材を作成
          const checkIngredient = await prisma.ingredient.create({
            data: {
              name: `${ingredient.name}${i + 1}`,
              categoryId: testDataIds.categories.vegetable,
              unitId: testDataIds.units.gram,
              quantity: 500,
              purchaseDate: new Date(),
              storageLocationType: 'REFRIGERATED',
              userId,
            },
          })

          await prisma.shoppingSessionItem.create({
            data: {
              sessionId,
              ingredientId: checkIngredient.id,
              ingredientName: checkIngredient.name,
              checkedAt: new Date(startedAt.getTime() + i * 10 * 60 * 1000), // 10分ごと
              stockStatus: 'IN_STOCK',
              expiryStatus: 'FRESH',
            },
          })
        }

        // APIを呼び出し
        const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent')
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        const session = responseData.data.data[0]
        expect(session.sessionId).toBe(sessionId)
        expect(session.status).toBe('COMPLETED')
        expect(session.startedAt).toBeDefined()
        expect(session.completedAt).toBeDefined()
        expect(session.duration).toBe(1800) // 30分 = 1800秒
        expect(session.checkedItemsCount).toBe(5)
        // totalSpent, deviceType, locationは現在の実装ではundefinedまたはnull
        expect(session.totalSpent).toBeUndefined()
        expect(session.deviceType).toBeNull()
        expect(session.location).toBeNull()
      })

      it('TC005: ステータス別の取得確認', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // 異なるステータスのセッションを作成
        await prisma.shoppingSession.create({
          data: {
            id: faker.string.alphanumeric(20),
            userId,
            status: 'COMPLETED',
            startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          },
        })

        await prisma.shoppingSession.create({
          data: {
            id: faker.string.alphanumeric(20),
            userId,
            status: 'ABANDONED',
            startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            completedAt: null,
          },
        })

        // APIを呼び出し
        const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent')
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.data).toHaveLength(2)

        // ステータスが正しく返されることを確認
        const statuses = responseData.data.data.map((s: any) => s.status)
        expect(statuses).toContain('COMPLETED')
        expect(statuses).toContain('ABANDONED')
      })
    })
  })

  describe('異常系', () => {
    describe('パラメータエラー', () => {
      it('TC101: 不正なlimit値（400エラー）', async () => {
        // 認証ユーザーをモック
        mockAuthUser()

        // limit=0
        let request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/recent?limit=0'
        )
        let response = await GET(request)
        let data = await response.json()
        expect(response.status).toBe(400)
        expect(data.error).toBeDefined()
        expect(data.error.message).toContain('limitは1以上50以下である必要があります')

        // limit=51
        request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent?limit=51')
        response = await GET(request)
        data = await response.json()
        expect(response.status).toBe(400)
        expect(data.error.message).toContain('limitは1以上50以下である必要があります')

        // limit=-1
        request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent?limit=-1')
        response = await GET(request)
        data = await response.json()
        expect(response.status).toBe(400)
      })
    })

    describe('認証エラー', () => {
      it('TC201: 認証されていない場合（401エラー）', async () => {
        // 認証をモック（ユーザーなし）
        vi.mocked(auth).mockResolvedValue(null as any)

        const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent')
        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBeDefined()
        expect(data.error.code).toBe('UNAUTHORIZED')
        expect(data.error.message).toBe('Authentication required')
      })
    })
  })

  describe('データ分離', () => {
    describe('ユーザー分離', () => {
      it('TC301: 認証ユーザーのセッションのみ取得', async () => {
        const testDataIds = getTestDataIds()

        // ユーザー1のセッションを作成
        const user1Id = testDataIds.users.defaultUser.domainUserId
        mockAuthUser({ domainUserId: user1Id })

        const user1Session = await prisma.shoppingSession.create({
          data: {
            id: faker.string.alphanumeric(20),
            userId: user1Id,
            status: 'COMPLETED',
            startedAt: new Date(),
            completedAt: new Date(),
          },
        })

        // ユーザー2を作成
        const user2NextAuthId = faker.string.uuid()
        const user2DomainUserId = faker.string.alphanumeric(20)
        const user2Email = faker.internet.email()

        await prisma.user.create({
          data: {
            id: user2NextAuthId,
            email: user2Email,
            emailVerified: new Date(),
          },
        })

        await prisma.domainUser.create({
          data: {
            id: user2DomainUserId,
            nextAuthId: user2NextAuthId,
            email: user2Email,
            displayName: 'Test User 2',
          },
        })

        // ユーザー2のセッションを作成
        const user2Id = user2DomainUserId
        const user2Session = await prisma.shoppingSession.create({
          data: {
            id: faker.string.alphanumeric(20),
            userId: user2Id,
            status: 'COMPLETED',
            startedAt: new Date(),
            completedAt: new Date(),
          },
        })

        // ユーザー1として認証してAPIを呼び出し
        const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent')
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.data).toHaveLength(1)
        expect(responseData.data.data[0].sessionId).toBe(user1Session.id)
        // ユーザー2のセッションは含まれない
        expect(
          responseData.data.data.find((s: any) => s.sessionId === user2Session.id)
        ).toBeUndefined()
      })
    })
  })
})
