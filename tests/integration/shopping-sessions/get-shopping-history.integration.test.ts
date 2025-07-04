import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/history/route'
import { auth } from '@/auth'
import { IngredientsApiCompositionRoot } from '@/modules/ingredients/server/composition-root'
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
 * GET /api/v1/shopping-sessions/history APIの統合テスト
 *
 * 買い物セッション履歴取得機能の統合テスト
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('GET /api/v1/shopping-sessions/history Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // IngredientsApiCompositionRootをリセットして、テスト用のPrismaクライアントを使用
    IngredientsApiCompositionRoot.resetInstance()
    IngredientsApiCompositionRoot.getInstance(prisma as any)

    vi.clearAllMocks()
  })

  afterEach(async () => {
    // 各テストの後にデータベースをクリーンアップ
    await cleanupIntegrationTest()

    // IngredientsApiCompositionRootをリセット
    IngredientsApiCompositionRoot.resetInstance()

    vi.clearAllMocks()
  })

  afterAll(async () => {
    // すべてのテスト完了後にPrismaクライアントをクリーンアップ
    await cleanupPrismaClient()
  })

  describe('正常系', () => {
    describe('基本的な履歴取得', () => {
      it('TC001: デフォルトパラメータでの履歴取得', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // テスト用セッションデータを作成（完了日時の降順になるように）
        const now = new Date()
        const sessions = []

        // 25件のセッションを作成（ページネーションテスト用）
        for (let i = 0; i < 25; i++) {
          const startedAt = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000) // 1日ずつ過去
          const status = i % 3 === 0 ? 'ABANDONED' : 'COMPLETED'
          const completedAt =
            status === 'COMPLETED'
              ? new Date(startedAt.getTime() + 60 * 60 * 1000) // 1時間後に完了
              : null

          const session = await prisma.shoppingSession.create({
            data: {
              id: faker.string.alphanumeric(20),
              userId,
              status,
              startedAt,
              completedAt,
            },
          })
          sessions.push(session)
        }

        // APIを呼び出し
        const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/history')
        const response = await GET(request)
        const responseData = await response.json()

        // レスポンスの検証
        expect(response.status).toBe(200)
        expect(responseData.data).toBeDefined()
        expect(responseData.data.data).toBeDefined()
        expect(responseData.data.data).toHaveLength(20) // デフォルトlimit=20
        expect(responseData.data.pagination).toBeDefined()
        expect(responseData.data.pagination.page).toBe(1)
        expect(responseData.data.pagination.limit).toBe(20)
        expect(responseData.data.pagination.total).toBe(25)
        expect(responseData.data.pagination.totalPages).toBe(2)
        expect(responseData.data.pagination.hasNext).toBe(true)
        expect(responseData.data.pagination.hasPrev).toBe(false)

        // 完了日時の降順でソートされていることを確認
        const sessionsData = responseData.data.data
        for (let i = 0; i < sessionsData.length - 1; i++) {
          const session1 = sessionsData[i]
          const session2 = sessionsData[i + 1]
          if (session1.completedAt && session2.completedAt) {
            expect(new Date(session1.completedAt).getTime()).toBeGreaterThanOrEqual(
              new Date(session2.completedAt).getTime()
            )
          }
        }
      })

      it('TC002: ページネーション', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // テスト用セッションデータを作成
        for (let i = 0; i < 35; i++) {
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

        // limit=10での取得（ページ1）
        let request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/history?limit=10&page=1'
        )
        let response = await GET(request)
        let responseData = await response.json()
        expect(response.status).toBe(200)
        expect(responseData.data.data).toHaveLength(10)
        expect(responseData.data.pagination.page).toBe(1)
        expect(responseData.data.pagination.hasNext).toBe(true)
        expect(responseData.data.pagination.hasPrev).toBe(false)

        // limit=10での取得（ページ2）
        request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/history?limit=10&page=2'
        )
        response = await GET(request)
        responseData = await response.json()
        expect(response.status).toBe(200)
        expect(responseData.data.data).toHaveLength(10)
        expect(responseData.data.pagination.page).toBe(2)
        expect(responseData.data.pagination.hasNext).toBe(true)
        expect(responseData.data.pagination.hasPrev).toBe(true)

        // limit=30での取得（ページ2、残り5件）
        request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/history?limit=30&page=2'
        )
        response = await GET(request)
        responseData = await response.json()
        expect(response.status).toBe(200)
        expect(responseData.data.data).toHaveLength(5)
        expect(responseData.data.pagination.page).toBe(2)
        expect(responseData.data.pagination.hasNext).toBe(false)
        expect(responseData.data.pagination.hasPrev).toBe(true)
      })
    })

    describe('フィルタリング', () => {
      it('TC003: 期間フィルター', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // 異なる期間のセッションを作成
        const now = new Date()
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        // 先週のセッション
        await prisma.shoppingSession.create({
          data: {
            id: faker.string.alphanumeric(20),
            userId,
            status: 'COMPLETED',
            startedAt: new Date(lastWeek.getTime() + 24 * 60 * 60 * 1000),
            completedAt: new Date(lastWeek.getTime() + 25 * 60 * 60 * 1000),
          },
        })

        // 先月のセッション
        await prisma.shoppingSession.create({
          data: {
            id: faker.string.alphanumeric(20),
            userId,
            status: 'COMPLETED',
            startedAt: lastMonth,
            completedAt: new Date(lastMonth.getTime() + 60 * 60 * 1000),
          },
        })

        // 今日のセッション
        await prisma.shoppingSession.create({
          data: {
            id: faker.string.alphanumeric(20),
            userId,
            status: 'COMPLETED',
            startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
            completedAt: new Date(now.getTime() - 60 * 60 * 1000),
          },
        })

        // 先週から今日までのフィルター
        const from = lastWeek.toISOString()
        const to = now.toISOString()
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/history?from=${from}&to=${to}`
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.data).toHaveLength(2) // 先週と今日のセッション

        // 期間内のセッションのみが含まれることを確認
        responseData.data.data.forEach((session: any) => {
          const startedAt = new Date(session.startedAt)
          expect(startedAt.getTime()).toBeGreaterThanOrEqual(lastWeek.getTime())
          expect(startedAt.getTime()).toBeLessThanOrEqual(now.getTime())
        })
      })

      it('TC004: ステータスフィルター', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // 異なるステータスのセッションを作成
        for (let i = 0; i < 5; i++) {
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

        for (let i = 0; i < 3; i++) {
          await prisma.shoppingSession.create({
            data: {
              id: faker.string.alphanumeric(20),
              userId,
              status: 'ABANDONED',
              startedAt: new Date(Date.now() - i * 60 * 60 * 1000),
              completedAt: null,
            },
          })
        }

        // COMPLETEDのみ取得
        let request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/history?status=COMPLETED'
        )
        let response = await GET(request)
        let responseData = await response.json()
        expect(response.status).toBe(200)
        expect(responseData.data.data).toHaveLength(5)
        responseData.data.data.forEach((session: any) => {
          expect(session.status).toBe('COMPLETED')
        })

        // ABANDONEDのみ取得
        request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/history?status=ABANDONED'
        )
        response = await GET(request)
        responseData = await response.json()
        expect(response.status).toBe(200)
        expect(responseData.data.data).toHaveLength(3)
        responseData.data.data.forEach((session: any) => {
          expect(session.status).toBe('ABANDONED')
        })
      })

      it('TC005: 期間とステータスの組み合わせ', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        const now = new Date()
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        // 先週のCOMPLETEDセッション
        await prisma.shoppingSession.create({
          data: {
            id: faker.string.alphanumeric(20),
            userId,
            status: 'COMPLETED',
            startedAt: new Date(lastWeek.getTime() + 24 * 60 * 60 * 1000),
            completedAt: new Date(lastWeek.getTime() + 25 * 60 * 60 * 1000),
          },
        })

        // 先週のABANDONEDセッション
        await prisma.shoppingSession.create({
          data: {
            id: faker.string.alphanumeric(20),
            userId,
            status: 'ABANDONED',
            startedAt: new Date(lastWeek.getTime() + 48 * 60 * 60 * 1000),
            completedAt: null,
          },
        })

        // 先月のCOMPLETEDセッション（フィルター対象外）
        await prisma.shoppingSession.create({
          data: {
            id: faker.string.alphanumeric(20),
            userId,
            status: 'COMPLETED',
            startedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            completedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          },
        })

        // 先週のCOMPLETEDセッションのみ
        const from = lastWeek.toISOString()
        const to = now.toISOString()
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/history?from=${from}&to=${to}&status=COMPLETED`
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.data).toHaveLength(1)
        expect(responseData.data.data[0].status).toBe('COMPLETED')
      })
    })
  })

  describe('異常系', () => {
    describe('パラメータエラー', () => {
      it('TC101: 不正な日付形式（400エラー）', async () => {
        // 認証ユーザーをモック
        mockAuthUser()

        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/history?from=invalid-date'
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('VALIDATION_ERROR')
        expect(responseData.error.message).toContain(
          'fromは有効なISO 8601形式の日付である必要があります'
        )
      })

      it('TC102: 不正なページネーション（400エラー）', async () => {
        // 認証ユーザーをモック
        mockAuthUser()

        // page=0
        let request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/history?page=0'
        )
        let response = await GET(request)
        let responseData = await response.json()
        expect(response.status).toBe(400)
        expect(responseData.error.message).toContain('pageは1以上である必要があります')

        // limit=101
        request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/history?limit=101'
        )
        response = await GET(request)
        responseData = await response.json()
        expect(response.status).toBe(400)
        expect(responseData.error.message).toContain('limitは1以上100以下である必要があります')
      })
    })

    describe('認証エラー', () => {
      it('TC201: 認証されていない場合（401エラー）', async () => {
        // 認証をモック（ユーザーなし）
        vi.mocked(auth).mockResolvedValue(null as any)

        const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/history')
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(401)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('UNAUTHORIZED')
        expect(responseData.error.message).toBe('認証が必要です')
      })
    })
  })

  describe('データ整合性', () => {
    describe('履歴データの完全性', () => {
      it('TC301: セッション詳細情報', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // セッションを作成
        const startedAt = new Date(Date.now() - 2 * 60 * 60 * 1000)
        const completedAt = new Date(Date.now() - 60 * 60 * 1000)
        const sessionId = faker.string.alphanumeric(20)

        await prisma.shoppingSession.create({
          data: {
            id: sessionId,
            userId,
            status: 'COMPLETED',
            startedAt,
            completedAt,
          },
        })

        // チェック履歴を追加
        const testDataIds = getTestDataIds()
        for (let i = 0; i < 3; i++) {
          const ingredient = await prisma.ingredient.create({
            data: {
              name: `食材${i + 1}`,
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
              ingredientId: ingredient.id,
              ingredientName: ingredient.name,
              checkedAt: new Date(startedAt.getTime() + i * 20 * 60 * 1000),
              stockStatus: 'IN_STOCK',
              expiryStatus: 'FRESH',
            },
          })
        }

        // APIを呼び出し
        const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/history')
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        const session = responseData.data.data[0]
        expect(session.sessionId).toBe(sessionId)
        expect(session.startedAt).toBeDefined()
        expect(session.completedAt).toBeDefined()
        expect(session.duration).toBe(3600) // 1時間 = 3600秒
        expect(session.checkedItemsCount).toBe(3)
      })
    })
  })
})
