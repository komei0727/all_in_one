import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/statistics/route'
import { auth } from '@/auth'
import { IngredientsApiCompositionRoot } from '@/modules/ingredients/server/composition-root'
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
 * GET /api/v1/shopping-sessions/statistics APIの統合テスト
 *
 * 買い物統計取得機能の統合テスト
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('GET /api/v1/shopping-sessions/statistics Integration Tests', () => {
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
    describe('基本的な統計取得', () => {
      it('TC001: デフォルトパラメータでの統計取得', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // テスト用セッションデータを作成（過去30日間のデータ）
        const now = new Date()

        // 完了したセッション
        for (let i = 0; i < 5; i++) {
          const daysAgo = faker.number.int({ min: 0, max: 29 })
          const startedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
          const completedAt = new Date(
            startedAt.getTime() + faker.number.int({ min: 30, max: 120 }) * 60 * 1000
          )

          const sessionId = faker.string.alphanumeric(20)
          await prisma.shoppingSession.create({
            data: {
              id: sessionId,
              userId,
              status: 'COMPLETED',
              startedAt,
              completedAt,
              // totalSpentは削除（スキーマに存在しない）
            },
          })

          // 各セッションにチェック済み食材を追加
          const testDataIds = getTestDataIds()
          const itemCount = 2 // テストを高速化するため固定
          for (let j = 0; j < itemCount; j++) {
            const ingredient = await prisma.ingredient.create({
              data: {
                name: faker.food.ingredient(),
                categoryId: testDataIds.categories.vegetable,
                unitId: testDataIds.units.gram,
                quantity: faker.number.int({ min: 100, max: 500 }),
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
                checkedAt: new Date(startedAt.getTime() + j * 5 * 60 * 1000),
                stockStatus: faker.helpers.arrayElement(['IN_STOCK', 'OUT_OF_STOCK', 'LOW_STOCK']),
                expiryStatus: faker.helpers.arrayElement(['FRESH', 'NEAR_EXPIRY', 'EXPIRED']),
              },
            })
          }
        }

        // 放棄されたセッション
        for (let i = 0; i < 2; i++) {
          const daysAgo = faker.number.int({ min: 0, max: 29 })
          const startedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

          await prisma.shoppingSession.create({
            data: {
              id: faker.string.alphanumeric(20),
              userId,
              status: 'ABANDONED',
              startedAt,
              completedAt: null,
            },
          })
        }

        // APIを呼び出し（デフォルトperiodDays=30）
        const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/statistics')
        const response = await GET(request)
        const responseData = await response.json()

        // レスポンスの検証
        expect(response.status).toBe(200)
        expect(responseData.data).toBeDefined()
        expect(responseData.data.statistics).toBeDefined()
        expect(responseData.data.statistics.totalSessions).toBe(7) // 5 + 2
        expect(responseData.data.statistics.totalCheckedIngredients).toBe(10) // 5 * 2
        expect(responseData.data.statistics.averageSessionDurationMinutes).toBeGreaterThan(0)
        expect(responseData.data.statistics.topCheckedIngredients).toBeDefined()
        expect(responseData.data.statistics.topCheckedIngredients).toBeInstanceOf(Array)
        expect(responseData.data.statistics.monthlySessionCounts).toBeDefined()
        expect(responseData.data.statistics.monthlySessionCounts).toBeInstanceOf(Array)
      })

      it('TC002: カスタム期間での統計取得', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // 指定期間内外のセッションを作成
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

        // 1週間以内のセッション（対象）
        for (let i = 0; i < 7; i++) {
          const startedAt = new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000)
          const sessionId = faker.string.alphanumeric(20)

          await prisma.shoppingSession.create({
            data: {
              id: sessionId,
              userId,
              status: 'COMPLETED',
              startedAt,
              completedAt: new Date(startedAt.getTime() + 60 * 60 * 1000),
              // totalSpentはスキーマに存在しない
            },
          })

          // 各セッションに1つずつ食材チェックを追加
          const testDataIds = getTestDataIds()
          const ingredient = await prisma.ingredient.create({
            data: {
              name: faker.food.ingredient(),
              categoryId: testDataIds.categories.vegetable,
              unitId: testDataIds.units.gram,
              quantity: 100,
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
              checkedAt: startedAt,
              stockStatus: 'IN_STOCK',
              expiryStatus: 'FRESH',
            },
          })
        }

        // 2週間前のセッション（対象外）
        await prisma.shoppingSession.create({
          data: {
            id: faker.string.alphanumeric(20),
            userId,
            status: 'COMPLETED',
            startedAt: twoWeeksAgo,
            completedAt: new Date(twoWeeksAgo.getTime() + 60 * 60 * 1000),
          },
        })

        // periodDays=7でAPIを呼び出し
        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/statistics?periodDays=7'
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        // periodDays=7の場合、過去7日間のセッションが取得される
        // 作成したセッションの日数に応じて検証
        expect(responseData.data.statistics.totalSessions).toBeGreaterThanOrEqual(6)
        expect(responseData.data.statistics.totalSessions).toBeLessThanOrEqual(7)
        expect(responseData.data.statistics.totalCheckedIngredients).toBeGreaterThanOrEqual(6)
        expect(responseData.data.statistics.totalCheckedIngredients).toBeLessThanOrEqual(7)
        expect(responseData.data.statistics.averageSessionDurationMinutes).toBe(60) // 1時間 = 60分
      })

      it('TC003: データがない期間の統計', async () => {
        // 認証ユーザーをモック
        mockAuthUser()

        // セッションデータなしで統計取得
        const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/statistics')
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.statistics.totalSessions).toBe(0)
        expect(responseData.data.statistics.totalCheckedIngredients).toBe(0)
        expect(responseData.data.statistics.averageSessionDurationMinutes).toBe(0)
        expect(responseData.data.statistics.topCheckedIngredients).toHaveLength(0)
        expect(responseData.data.statistics.monthlySessionCounts).toHaveLength(0)
      })
    })

    describe('トップ食材の検証', () => {
      it('TC004: トップチェック食材の正確性', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // 3日分のデータを作成
        const now = new Date()
        const dates = [
          new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2日前
          new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1日前
          now, // 今日
        ]

        for (let i = 0; i < dates.length; i++) {
          const date = dates[i]
          const sessionsPerDay = i + 1 // 日ごとに増やす

          for (let j = 0; j < sessionsPerDay; j++) {
            const sessionId = faker.string.alphanumeric(20)
            const startedAt = new Date(date)
            startedAt.setHours(10 + j, 0, 0, 0)

            await prisma.shoppingSession.create({
              data: {
                id: sessionId,
                userId,
                status: j === 0 && i === 0 ? 'ABANDONED' : 'COMPLETED', // 最初の1件だけ放棄
                startedAt,
                completedAt:
                  j === 0 && i === 0 ? null : new Date(startedAt.getTime() + 45 * 60 * 1000),
                // totalSpentはスキーマに存在しない
              },
            })

            // チェック済み食材を追加
            if (!(j === 0 && i === 0)) {
              const testDataIds = getTestDataIds()
              const itemCount = 2 // 各セッション2アイテム

              for (let k = 0; k < itemCount; k++) {
                const ingredient = await prisma.ingredient.create({
                  data: {
                    name: `${faker.food.ingredient()}_${i}_${j}_${k}`,
                    categoryId: testDataIds.categories.vegetable,
                    unitId: testDataIds.units.gram,
                    quantity: 100,
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
                    checkedAt: new Date(startedAt.getTime() + k * 10 * 60 * 1000),
                    stockStatus: 'IN_STOCK',
                    expiryStatus: 'FRESH',
                  },
                })
              }
            }
          }
        }

        // APIを呼び出し（periodDays=3）
        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/statistics?periodDays=3'
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.statistics.totalSessions).toBe(6) // 1 + 2 + 3 = 6
        expect(responseData.data.statistics.totalCheckedIngredients).toBe(10) // 0 + 4 + 6 = 10

        // トップチェック食材の検証
        const topIngredients = responseData.data.statistics.topCheckedIngredients
        expect(topIngredients).toBeDefined()
        expect(topIngredients.length).toBeGreaterThan(0)

        // トップ食材のフィールド検証
        const topIngredient = topIngredients[0]
        expect(topIngredient.ingredientId).toBeDefined()
        expect(topIngredient.ingredientName).toBeDefined()
        expect(topIngredient.checkCount).toBeGreaterThan(0)
        expect(topIngredient.checkRatePercentage).toBeGreaterThan(0)
        expect(topIngredient.lastCheckedAt).toBeDefined()

        // 月別セッション数の検証
        const monthlyCounts = responseData.data.statistics.monthlySessionCounts
        expect(monthlyCounts).toBeDefined()
        expect(monthlyCounts.length).toBeGreaterThan(0)
      })
    })
  })

  describe('異常系', () => {
    describe('パラメータエラー', () => {
      it('TC101: 不正なperiodDays（400エラー）', async () => {
        // 認証ユーザーをモック
        mockAuthUser()

        // periodDaysが範囲外
        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/statistics?periodDays=400'
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('VALIDATION_ERROR')
        expect(responseData.error.message).toContain('periodDaysは1以上365以下である必要があります')
      })

      it('TC102: 数値以外のperiodDays（400エラー）', async () => {
        // 認証ユーザーをモック
        mockAuthUser()

        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/statistics?periodDays=invalid'
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('VALIDATION_ERROR')
        expect(responseData.error.message).toContain('periodDaysは有効な整数である必要があります')
      })
    })

    describe('認証エラー', () => {
      it('TC201: 認証されていない場合（401エラー）', async () => {
        // 認証をモック（ユーザーなし）
        vi.mocked(auth).mockResolvedValue(null as any)

        const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/statistics')
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(401)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('UNAUTHORIZED')
        expect(responseData.error.message).toBe('認証が必要です')
      })
    })
  })

  describe('データ分離', () => {
    describe('ユーザー分離', () => {
      it('TC301: 認証ユーザーの統計のみ取得', async () => {
        const testDataIds = getTestDataIds()

        // ユーザー1のセッションを作成
        const user1Id = testDataIds.users.defaultUser.domainUserId
        mockAuthUser({ domainUserId: user1Id })

        for (let i = 0; i < 3; i++) {
          await prisma.shoppingSession.create({
            data: {
              id: faker.string.alphanumeric(20),
              userId: user1Id,
              status: 'COMPLETED',
              startedAt: new Date(),
              completedAt: new Date(),
            },
          })
        }

        // ユーザー2を作成してセッションを追加
        const user2 = await createTestUser({ email: 'other@example.com' })

        for (let i = 0; i < 5; i++) {
          await prisma.shoppingSession.create({
            data: {
              id: faker.string.alphanumeric(20),
              userId: user2.domainUserId,
              status: 'COMPLETED',
              startedAt: new Date(),
              completedAt: new Date(),
            },
          })
        }

        // ユーザー1として認証してAPIを呼び出し
        const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/statistics')
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.statistics.totalSessions).toBe(3) // ユーザー1のセッションのみ
        expect(responseData.data.statistics.totalCheckedIngredients).toBe(0) // チェック済み食材なし
      })
    })
  })
})
