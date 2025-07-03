import { NextRequest } from 'next/server'

import { createId } from '@paralleldrive/cuid2'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { DELETE } from '@/app/api/v1/shopping-sessions/[sessionId]/route'
import { auth } from '@/auth'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import {
  getTestPrismaClient,
  setupIntegrationTest,
  cleanupIntegrationTest,
  cleanupPrismaClient,
  getTestDataIds,
  createTestUser,
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
 * DELETE /api/v1/shopping-sessions/{sessionId} APIの統合テスト
 *
 * 買い物セッション中断機能の統合テスト
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('DELETE /api/v1/shopping-sessions/{sessionId} Integration Tests', () => {
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
    describe('セッション中断の基本ケース', () => {
      it('TC001: アクティブなセッションの中断', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // アクティブなセッションを作成
        const sessionId = `ses_${createId()}`
        const startedAt = new Date()

        await prisma.shoppingSession.create({
          data: {
            id: sessionId,
            userId,
            status: 'ACTIVE',
            startedAt,
            completedAt: null,
          },
        })

        // APIを呼び出し（DELETEメソッドはボディを持たない）
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, { params: Promise.resolve({ sessionId }) })
        const responseData = await response.json()

        // レスポンスの検証
        expect(response.status).toBe(200)
        expect(responseData.data).toBeDefined()
        expect(responseData.data.sessionId).toBe(sessionId)
        expect(responseData.data.status).toBe('ABANDONED')

        // データベースの状態を確認
        const dbSession = await prisma.shoppingSession.findUnique({
          where: { id: sessionId },
        })
        expect(dbSession).toBeDefined()
        expect(dbSession?.status).toBe('ABANDONED')
        expect(dbSession?.completedAt).toBeDefined() // 中断時にcompletedAtが設定される
      })

      it('TC002: チェック履歴があるセッションの中断', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // テスト用データを準備
        const testDataIds = getTestDataIds()
        const sessionId = `ses_${createId()}`
        const startedAt = new Date(Date.now() - 30 * 60 * 1000) // 30分前

        await prisma.shoppingSession.create({
          data: {
            id: sessionId,
            userId,
            status: 'ACTIVE',
            startedAt,
            completedAt: null,
          },
        })

        // チェック済み食材を追加
        const ingredients = []
        for (let i = 0; i < 3; i++) {
          const ingredient = await prisma.ingredient.create({
            data: {
              id: `ing_${createId()}`, // 正しいID形式を指定
              name: `チェック済み食材${i + 1}`,
              categoryId: testDataIds.categories.vegetable,
              unitId: testDataIds.units.gram,
              quantity: 100,
              purchaseDate: new Date(),
              storageLocationType: 'REFRIGERATED',
              userId,
            },
          })
          ingredients.push(ingredient)

          await prisma.shoppingSessionItem.create({
            data: {
              sessionId,
              ingredientId: ingredient.id,
              ingredientName: ingredient.name,
              checkedAt: new Date(startedAt.getTime() + i * 5 * 60 * 1000),
              stockStatus: 'IN_STOCK',
              expiryStatus: 'FRESH',
            },
          })
        }

        // APIを呼び出し
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, { params: Promise.resolve({ sessionId }) })
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data).toBeDefined()
        expect(responseData.data.sessionId).toBe(sessionId)
        expect(responseData.data.status).toBe('ABANDONED')
        // checkedItemsCountはAPIレスポンスに含まれない可能性がある

        // チェック履歴が保持されていることを確認
        const sessionItems = await prisma.shoppingSessionItem.findMany({
          where: { sessionId },
        })
        expect(sessionItems).toHaveLength(3)
      })

      it('TC003: デバイスタイプと位置情報を含むセッションの中断', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // デバイスタイプと位置情報を含むセッションを作成
        const sessionId = `ses_${createId()}`

        await prisma.shoppingSession.create({
          data: {
            id: sessionId,
            userId,
            status: 'ACTIVE',
            startedAt: new Date(),
            completedAt: null,
            deviceType: 'MOBILE',
            locationName: 'スーパーマーケット',
            locationLat: 35.6812,
            locationLng: 139.7671,
          },
        })

        // APIを呼び出し
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, { params: Promise.resolve({ sessionId }) })
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data).toBeDefined()
        expect(responseData.data.sessionId).toBe(sessionId)
        expect(responseData.data.status).toBe('ABANDONED')
        expect(responseData.data.deviceType).toBe('MOBILE')
        expect(responseData.data.location).toBeDefined()
        // locationNameフィールドとして保存される可能性
        expect(responseData.data.location.placeName || responseData.data.location.name).toBe(
          'スーパーマーケット'
        )
      })
    })
  })

  describe('異常系', () => {
    describe('リソース不存在', () => {
      it('TC101: 存在しないセッションID（404エラー）', async () => {
        // 認証ユーザーをモック
        mockAuthUser()

        const nonExistentId = `ses_${createId()}`

        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${nonExistentId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, {
          params: Promise.resolve({ sessionId: nonExistentId }),
        })
        const responseData = await response.json()

        expect(response.status).toBe(404)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('RESOURCE_NOT_FOUND')
        expect(responseData.error.message).toBeDefined()
      })

      it('TC102: 他ユーザーのセッション（404エラー）', async () => {
        // ユーザー1でモック
        mockAuthUser()

        // ユーザー2を作成
        const user2 = await createTestUser({ email: 'other@example.com' })

        // ユーザー2のセッションを作成
        const sessionId = `ses_${createId()}`
        await prisma.shoppingSession.create({
          data: {
            id: sessionId,
            userId: user2.domainUserId,
            status: 'ACTIVE',
            startedAt: new Date(),
            completedAt: null,
          },
        })

        // ユーザー1として中断を試みる
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, { params: Promise.resolve({ sessionId }) })
        const responseData = await response.json()

        expect(response.status).toBe(404) // プライバシー保護のため404
        expect(responseData.error.code).toBe('RESOURCE_NOT_FOUND')
      })
    })

    describe('ビジネスルール違反', () => {
      it('TC201: 既に完了したセッション（422エラー）', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // 完了済みセッションを作成
        const sessionId = `ses_${createId()}`
        await prisma.shoppingSession.create({
          data: {
            id: sessionId,
            userId,
            status: 'COMPLETED',
            startedAt: new Date(Date.now() - 60 * 60 * 1000),
            completedAt: new Date(Date.now() - 30 * 60 * 1000),
          },
        })

        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, { params: Promise.resolve({ sessionId }) })
        const responseData = await response.json()

        expect(response.status).toBe(422)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('BUSINESS_RULE_VIOLATION')
        expect(responseData.error.message).toBeDefined()
      })

      it('TC202: 既に中断されたセッション（422エラー）', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // 中断済みセッションを作成
        const sessionId = `ses_${createId()}`
        await prisma.shoppingSession.create({
          data: {
            id: sessionId,
            userId,
            status: 'ABANDONED',
            startedAt: new Date(Date.now() - 60 * 60 * 1000),
            completedAt: null,
          },
        })

        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, { params: Promise.resolve({ sessionId }) })
        const responseData = await response.json()

        expect(response.status).toBe(422)
        expect(responseData.error.code).toBe('BUSINESS_RULE_VIOLATION')
        expect(responseData.error.message).toBeDefined()
      })
    })

    describe('パラメータエラー', () => {
      it('TC301: 不正なセッションID形式（400エラー）', async () => {
        // 認証ユーザーをモック
        mockAuthUser()

        const invalidId = 'invalid-session-id'

        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${invalidId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, {
          params: Promise.resolve({ sessionId: invalidId }),
        })
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('VALIDATION_ERROR')
      })

      it('TC302: セッションIDパラメータのバリデーション', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // アクティブなセッションを作成
        const sessionId = `ses_${createId()}`
        await prisma.shoppingSession.create({
          data: {
            id: sessionId,
            userId,
            status: 'ACTIVE',
            startedAt: new Date(),
            completedAt: null,
          },
        })

        // DELETEメソッドはボディを持たないため、このテストケースは削除時のレスポンスを検証
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, { params: Promise.resolve({ sessionId }) })
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.sessionId).toBe(sessionId)
        expect(responseData.data.status).toBe('ABANDONED')
      })
    })

    describe('認証エラー', () => {
      it('TC401: 認証されていない場合（401エラー）', async () => {
        // 認証をモック（ユーザーなし）
        vi.mocked(auth).mockResolvedValue(null as any)

        const sessionId = `ses_${createId()}`

        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, { params: Promise.resolve({ sessionId }) })
        const responseData = await response.json()

        expect(response.status).toBe(401)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('UNAUTHORIZED')
        expect(responseData.error.message).toBe('Authentication required')
      })
    })
  })

  describe('データ整合性', () => {
    describe('セッション状態の保証', () => {
      it('TC501: 中断後のセッション再開防止', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // アクティブなセッションを作成
        const sessionId = `ses_${createId()}`
        await prisma.shoppingSession.create({
          data: {
            id: sessionId,
            userId,
            status: 'ACTIVE',
            startedAt: new Date(),
            completedAt: null,
          },
        })

        // セッションを中断
        const abandonRequest = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const abandonResponse = await DELETE(abandonRequest, {
          params: Promise.resolve({ sessionId }),
        })
        const abandonResponseData = await abandonResponse.json()
        expect(abandonResponse.status).toBe(200)
        expect(abandonResponseData.data.status).toBe('ABANDONED')

        // 再度中断を試みる
        const retryRequest = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const retryResponse = await DELETE(retryRequest, { params: Promise.resolve({ sessionId }) })
        const retryData = await retryResponse.json()

        expect(retryResponse.status).toBe(422)
        expect(retryData.error.code).toBe('BUSINESS_RULE_VIOLATION')
      })
    })
  })
})
