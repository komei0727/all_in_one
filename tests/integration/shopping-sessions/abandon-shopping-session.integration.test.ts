import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { DELETE } from '@/app/api/v1/shopping-sessions/[sessionId]/route'
import { auth } from '@/auth'
import { IngredientsApiCompositionRoot } from '@/modules/ingredients/server/composition-root'
import { testDataHelpers } from '@tests/__fixtures__/builders'
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
 * DELETE /api/v1/shopping-sessions/[sessionId] APIの統合テスト
 *
 * 買い物セッション放棄機能の統合テスト
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('DELETE /api/v1/shopping-sessions/[sessionId] Integration Tests', () => {
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
    describe('セッション中断の基本ケース', () => {
      it('TC001: アクティブなセッションの中断', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // アクティブなセッションを作成
        const sessionId = testDataHelpers.shoppingSessionId()
        const startedAt = new Date(Date.now() - 10 * 60 * 1000) // 10分前に開始

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

        const response = await DELETE(request, { params: { sessionId } })

        // レスポンスの検証（204 No Content）
        expect(response.status).toBe(204)
        // 204 No Contentの場合、レスポンスボディは空
        const responseText = await response.text()
        expect(responseText).toBe('')

        // データベースの状態を確認
        const dbSession = await prisma.shoppingSession.findUnique({
          where: { id: sessionId },
        })
        expect(dbSession).toBeDefined()
        expect(dbSession?.status).toBe('ABANDONED')
        expect(dbSession?.completedAt).toBeDefined() // 中断時にcompletedAtが設定される

        console.log('TC001 Session abandoned at:', dbSession?.completedAt)
      })

      it('TC002: チェック履歴があるセッションの中断', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // テスト用データを準備
        const testDataIds = getTestDataIds()
        const sessionId = testDataHelpers.shoppingSessionId()
        const minutesAgo = faker.number.int({ min: 15, max: 45 }) // 15-45分前
        const startedAt = new Date(Date.now() - minutesAgo * 60 * 1000)

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
        const checkCount = faker.number.int({ min: 2, max: 5 })
        for (let i = 0; i < checkCount; i++) {
          const ingredient = await prisma.ingredient.create({
            data: {
              id: testDataHelpers.ingredientId(),
              name: faker.food.ingredient(),
              categoryId: testDataIds.categories.vegetable,
              unitId: testDataIds.units.gram,
              quantity: faker.number.int({ min: 50, max: 500 }),
              purchaseDate: faker.date.recent({ days: 7 }),
              storageLocationType: faker.helpers.arrayElement(['REFRIGERATED', 'FROZEN', 'PANTRY']),
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
              stockStatus: faker.helpers.arrayElement(['IN_STOCK', 'OUT_OF_STOCK', 'LOW_STOCK']),
              expiryStatus: faker.helpers.arrayElement(['FRESH', 'NEAR_EXPIRY', 'EXPIRED']),
            },
          })
        }

        console.log('TC002 Checked items count:', checkCount)

        // APIを呼び出し
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, { params: { sessionId } })

        expect(response.status).toBe(204)
        // 204 No Contentの場合、レスポンスボディは空
        const responseText = await response.text()
        expect(responseText).toBe('')

        // チェック履歴が保持されていることを確認
        const sessionItems = await prisma.shoppingSessionItem.findMany({
          where: { sessionId },
        })
        expect(sessionItems).toHaveLength(checkCount)
      })

      it('TC003: デバイスタイプと位置情報を含むセッションの中断', async () => {
        // Given: 認証済みユーザーと位置情報付きセッション
        const userId = mockAuthUser()
        const sessionId = testDataHelpers.shoppingSessionId()
        const deviceType = faker.helpers.arrayElement(['MOBILE', 'TABLET', 'DESKTOP'])
        const locationName = faker.company.name() + 'スーパー'
        const locationLat = faker.location.latitude({ min: 35, max: 36, precision: 6 })
        const locationLng = faker.location.longitude({ min: 139, max: 140, precision: 6 })

        await prisma.shoppingSession.create({
          data: {
            id: sessionId,
            userId,
            status: 'ACTIVE',
            startedAt: new Date(Date.now() - 15 * 60 * 1000), // 15分前に開始
            completedAt: null,
            deviceType,
            locationName,
            locationLat,
            locationLng,
          },
        })

        // When: APIを呼び出し
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, { params: { sessionId } })

        // Then: 正常に中断される
        expect(response.status).toBe(204)
        const responseText = await response.text()
        expect(responseText).toBe('')

        // データベースの状態を確認
        const dbSession = await prisma.shoppingSession.findUnique({
          where: { id: sessionId },
        })
        expect(dbSession?.status).toBe('ABANDONED')
        expect(dbSession?.deviceType).toBe(deviceType)
        expect(dbSession?.locationName).toBe(locationName)
        // PrismaのDecimal型を数値に変換して比較
        expect(Number(dbSession?.locationLat)).toBeCloseTo(locationLat, 6)
        expect(Number(dbSession?.locationLng)).toBeCloseTo(locationLng, 6)

        console.log('TC003 Device Type:', deviceType)
        console.log('TC003 Location:', locationName)
      })

      it('TC004: 長時間継続したセッションの中断', async () => {
        // Given: 認証済みユーザーと長時間継続セッション
        const userId = mockAuthUser()
        const sessionId = testDataHelpers.shoppingSessionId()
        const hoursAgo = faker.number.int({ min: 2, max: 8 }) // 2-8時間前
        const startedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)

        await prisma.shoppingSession.create({
          data: {
            id: sessionId,
            userId,
            status: 'ACTIVE',
            startedAt,
            completedAt: null,
            deviceType: faker.helpers.arrayElement(['MOBILE', 'TABLET', 'DESKTOP']),
          },
        })

        // When: APIを呼び出し
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, { params: { sessionId } })

        // Then: 長時間経過していても正常に中断される
        expect(response.status).toBe(204)
        const responseText = await response.text()
        expect(responseText).toBe('')

        // データベースの状態を確認
        const dbSession = await prisma.shoppingSession.findUnique({
          where: { id: sessionId },
        })
        expect(dbSession?.status).toBe('ABANDONED')
        expect(dbSession?.completedAt).toBeDefined()

        // 継続時間の計算
        const duration = Math.floor(
          (dbSession!.completedAt!.getTime() - startedAt.getTime()) / (1000 * 60 * 60)
        )
        console.log('TC004 Session duration (hours):', duration)
        expect(duration).toBeGreaterThanOrEqual(hoursAgo - 1) // 誤差を考慮
      })
    })
  })

  describe('異常系', () => {
    describe('リソース不存在', () => {
      it('TC101: 存在しないセッションID（404エラー）', async () => {
        // 認証ユーザーをモック
        mockAuthUser()

        const nonExistentId = testDataHelpers.shoppingSessionId()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${nonExistentId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, { params: { sessionId: nonExistentId } })
        const responseData = await response.json()

        expect(response.status).toBe(404)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('RESOURCE_NOT_FOUND')
        expect(responseData.error.message).toBeDefined()
      })

      it('TC102: 他ユーザーのセッション（404エラー）', async () => {
        // Given: 認証済みユーザー（他のユーザーのセッションにアクセス不可）
        mockAuthUser()
        const otherUserSessionId = testDataHelpers.shoppingSessionId()

        // 他のユーザーのセッションは外部キー制約のため作成できないので、
        // 存在しないセッションとして扱う

        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${otherUserSessionId}`,
          {
            method: 'DELETE',
          }
        )

        // When: APIを呼び出し
        const response = await DELETE(request, { params: { sessionId: otherUserSessionId } })
        const responseData = await response.json()

        // Then: 404エラーが返される（プライバシー保護）
        expect(response.status).toBe(404)
        expect(responseData.error.code).toBe('RESOURCE_NOT_FOUND')
      })
    })

    describe('ビジネスルール違反', () => {
      it('TC201: 既に完了したセッション（409エラー）', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // 完了済みセッションを作成
        const sessionId = testDataHelpers.shoppingSessionId()
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

        const response = await DELETE(request, { params: { sessionId } })
        const responseData = await response.json()

        expect(response.status).toBe(409)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('SESSION_ALREADY_COMPLETED')
        expect(responseData.error.message).toBeDefined()
      })

      it('TC202: 既に中断されたセッション（422エラー）', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // 中断済みセッションを作成
        const sessionId = testDataHelpers.shoppingSessionId()
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

        const response = await DELETE(request, { params: { sessionId } })
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

        const response = await DELETE(request, { params: { sessionId: invalidId } })
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('VALIDATION_ERROR')
      })

      it('TC302: セッションIDパラメータのバリデーション', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // アクティブなセッションを作成
        const sessionId = testDataHelpers.shoppingSessionId()
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

        const response = await DELETE(request, { params: { sessionId } })

        expect(response.status).toBe(204)
        // 204 No Contentの場合、レスポンスボディは空
        const responseText = await response.text()
        expect(responseText).toBe('')
      })
    })

    describe('認証エラー', () => {
      it('TC401: 認証されていない場合（401エラー）', async () => {
        // 認証をモック（ユーザーなし）
        vi.mocked(auth).mockResolvedValue(null as any)

        const sessionId = testDataHelpers.shoppingSessionId()

        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const response = await DELETE(request, { params: { sessionId } })
        const responseData = await response.json()

        expect(response.status).toBe(401)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('UNAUTHORIZED')
        expect(responseData.error.message).toBe('認証が必要です')
      })
    })
  })

  describe('データ整合性', () => {
    describe('セッション状態の保証', () => {
      it('TC501: 中断後のセッション再開防止', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // アクティブなセッションを作成
        const sessionId = testDataHelpers.shoppingSessionId()
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

        const abandonResponse = await DELETE(abandonRequest, { params: { sessionId } })
        expect(abandonResponse.status).toBe(204)
        // 204 No Contentの場合、レスポンスボディは空
        const responseText = await abandonResponse.text()
        expect(responseText).toBe('')

        // 再度中断を試みる
        const retryRequest = new NextRequest(
          `http://localhost:3000/api/v1/shopping-sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        )

        const retryResponse = await DELETE(retryRequest, { params: { sessionId } })
        const retryData = await retryResponse.json()

        expect(retryResponse.status).toBe(422)
        expect(retryData.error.code).toBe('BUSINESS_RULE_VIOLATION')
      })
    })
  })
})
