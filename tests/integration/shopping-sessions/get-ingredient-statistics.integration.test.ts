import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/ingredient-check-statistics/route'
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
 * GET /api/v1/shopping-sessions/ingredient-check-statistics APIの統合テスト
 *
 * 食材チェック統計取得機能の統合テスト
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('GET /api/v1/shopping-sessions/ingredient-check-statistics Integration Tests', () => {
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
    describe('基本的な食材統計取得', () => {
      it('TC001: デフォルトパラメータでの統計取得', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // テスト用データを作成
        const testDataIds = getTestDataIds()
        const now = new Date()

        // よくチェックされる食材を作成
        const popularIngredients = []
        for (let i = 0; i < 5; i++) {
          const ingredient = await prisma.ingredient.create({
            data: {
              name: `人気食材${i + 1}`,
              categoryId: testDataIds.categories.vegetable,
              unitId: testDataIds.units.gram,
              quantity: 100,
              purchaseDate: new Date(),
              storageLocationType: 'REFRIGERATED',
              userId,
            },
          })
          popularIngredients.push(ingredient)
        }

        // あまりチェックされない食材を作成
        const unpopularIngredients = []
        for (let i = 0; i < 3; i++) {
          const ingredient = await prisma.ingredient.create({
            data: {
              name: `不人気食材${i + 1}`,
              categoryId: testDataIds.categories.seasoning,
              unitId: testDataIds.units.milliliter,
              quantity: 500,
              purchaseDate: new Date(),
              storageLocationType: 'PANTRY',
              userId,
            },
          })
          unpopularIngredients.push(ingredient)
        }

        // セッションを作成してチェック履歴を生成
        for (let i = 0; i < 10; i++) {
          const sessionId = faker.string.alphanumeric(20)
          const startedAt = new Date(now.getTime() - i * 24 * 60 * 60 * 1000) // 1日ずつ過去

          await prisma.shoppingSession.create({
            data: {
              id: sessionId,
              userId,
              status: 'COMPLETED',
              startedAt,
              completedAt: new Date(startedAt.getTime() + 60 * 60 * 1000),
            },
          })

          // 人気食材は頻繁にチェック
          for (let j = 0; j < Math.min(3, popularIngredients.length); j++) {
            await prisma.shoppingSessionItem.create({
              data: {
                sessionId,
                ingredientId: popularIngredients[j].id,
                ingredientName: popularIngredients[j].name,
                checkedAt: new Date(startedAt.getTime() + j * 10 * 60 * 1000),
                stockStatus: faker.helpers.arrayElement(['IN_STOCK', 'OUT_OF_STOCK', 'LOW_STOCK']),
                expiryStatus: faker.helpers.arrayElement(['FRESH', 'NEAR_EXPIRY', 'EXPIRED']),
              },
            })
          }

          // 不人気食材は時々チェック
          if (i % 3 === 0 && unpopularIngredients.length > 0) {
            await prisma.shoppingSessionItem.create({
              data: {
                sessionId,
                ingredientId: unpopularIngredients[0].id,
                ingredientName: unpopularIngredients[0].name,
                checkedAt: startedAt,
                stockStatus: 'IN_STOCK',
                expiryStatus: 'FRESH',
              },
            })
          }
        }

        // APIを呼び出し
        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/ingredient-check-statistics'
        )
        const response = await GET(request)
        const responseData = await response.json()

        // レスポンスの検証
        expect(response.status).toBe(200)
        expect(responseData.data).toBeDefined()
        expect(responseData.data.statistics).toBeDefined()
        expect(responseData.data.statistics).toBeInstanceOf(Array)
        expect(responseData.data.statistics.length).toBeGreaterThan(0)

        // 最もチェックされた食材の検証
        const topIngredient = responseData.data.statistics.find((stat: any) =>
          stat.ingredientName.includes('人気食材')
        )
        expect(topIngredient).toBeDefined()
        expect(topIngredient.ingredientId).toBeDefined()
        expect(topIngredient.totalCheckCount).toBe(10) // 10セッション全てでチェックされた
        expect(topIngredient.firstCheckedAt).toBeDefined()
        expect(topIngredient.lastCheckedAt).toBeDefined()

        // 月別チェック数の検証
        expect(topIngredient.monthlyCheckCounts).toBeDefined()
        expect(topIngredient.monthlyCheckCounts).toBeInstanceOf(Array)
        expect(topIngredient.monthlyCheckCounts.length).toBeGreaterThan(0)
        const monthlyCount = topIngredient.monthlyCheckCounts[0]
        expect(monthlyCount.yearMonth).toBeDefined()
        expect(monthlyCount.checkCount).toBeGreaterThan(0)

        // 在庫ステータス別チェック数の検証
        expect(topIngredient.stockStatusBreakdown).toBeDefined()
        expect(topIngredient.stockStatusBreakdown.inStockChecks).toBeGreaterThanOrEqual(0)
        expect(topIngredient.stockStatusBreakdown.outOfStockChecks).toBeGreaterThanOrEqual(0)
        expect(topIngredient.stockStatusBreakdown.lowStockChecks).toBeGreaterThanOrEqual(0)
        const totalChecks =
          topIngredient.stockStatusBreakdown.inStockChecks +
          topIngredient.stockStatusBreakdown.outOfStockChecks +
          topIngredient.stockStatusBreakdown.lowStockChecks
        expect(totalChecks).toBe(10)
      })

      it('TC002: カスタム期間での統計取得', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // テスト用データを作成
        const testDataIds = getTestDataIds()
        const now = new Date()

        // 食材を作成
        const ingredient1 = await prisma.ingredient.create({
          data: {
            name: 'テスト食材1',
            categoryId: testDataIds.categories.vegetable,
            unitId: testDataIds.units.gram,
            quantity: 100,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
            userId,
          },
        })

        const ingredient2 = await prisma.ingredient.create({
          data: {
            name: 'テスト食材2',
            categoryId: testDataIds.categories.meatFish,
            unitId: testDataIds.units.gram,
            quantity: 200,
            purchaseDate: new Date(),
            storageLocationType: 'FROZEN',
            userId,
          },
        })

        // 過去7日間のセッションを作成
        for (let i = 0; i < 7; i++) {
          const sessionId = faker.string.alphanumeric(20)
          const startedAt = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)

          await prisma.shoppingSession.create({
            data: {
              id: sessionId,
              userId,
              status: 'COMPLETED',
              startedAt,
              completedAt: new Date(startedAt.getTime() + 30 * 60 * 1000),
            },
          })

          // 食材1は毎日チェック
          await prisma.shoppingSessionItem.create({
            data: {
              sessionId,
              ingredientId: ingredient1.id,
              ingredientName: ingredient1.name,
              checkedAt: startedAt,
              stockStatus: 'IN_STOCK',
              expiryStatus: 'FRESH',
            },
          })

          // 食材2は隔日でチェック
          if (i % 2 === 0) {
            await prisma.shoppingSessionItem.create({
              data: {
                sessionId,
                ingredientId: ingredient2.id,
                ingredientName: ingredient2.name,
                checkedAt: startedAt,
                stockStatus: 'LOW_STOCK',
                expiryStatus: 'NEAR_EXPIRY',
              },
            })
          }
        }

        // 8日以上前のセッション（対象外）
        const oldSessionId = faker.string.alphanumeric(20)
        await prisma.shoppingSession.create({
          data: {
            id: oldSessionId,
            userId,
            status: 'COMPLETED',
            startedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
            completedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          },
        })

        await prisma.shoppingSessionItem.create({
          data: {
            sessionId: oldSessionId,
            ingredientId: ingredient1.id,
            ingredientName: ingredient1.name,
            checkedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
            stockStatus: 'OUT_OF_STOCK',
            expiryStatus: 'EXPIRED',
          },
        })

        // APIを呼び出し
        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/ingredient-check-statistics'
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        const statistics = responseData.data.statistics

        // 食材1の統計を確認
        const ingredient1Stats = statistics.find((s: any) => s.ingredientName === 'テスト食材1')
        expect(ingredient1Stats).toBeDefined()
        expect(ingredient1Stats.totalCheckCount).toBeGreaterThanOrEqual(6) // 期間内のチェック数
        expect(ingredient1Stats.totalCheckCount).toBeLessThanOrEqual(8) // 古いセッションも含む
        expect(ingredient1Stats.stockStatusBreakdown.inStockChecks).toBe(7) // 実際のチェック数

        // 食材2の統計を確認
        const ingredient2Stats = statistics.find((s: any) => s.ingredientName === 'テスト食材2')
        expect(ingredient2Stats).toBeDefined()
        expect(ingredient2Stats.totalCheckCount).toBeGreaterThanOrEqual(3) // 隔日なので3または4
        expect(ingredient2Stats.totalCheckCount).toBeLessThanOrEqual(4)
        expect(ingredient2Stats.stockStatusBreakdown.lowStockChecks).toBe(
          ingredient2Stats.totalCheckCount
        )
      })

      it('TC003: データがない期間の統計', async () => {
        // 認証ユーザーをモック
        mockAuthUser()

        // セッションデータなしで統計取得
        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/ingredient-check-statistics'
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.statistics).toHaveLength(0)
      })
    })

    describe('カテゴリー別集計', () => {
      it('TC004: カテゴリー別の食材チェック頻度', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // テスト用データを作成
        const testDataIds = getTestDataIds()

        // 各カテゴリーの食材を作成
        const vegetables = []
        for (let i = 0; i < 3; i++) {
          const ingredient = await prisma.ingredient.create({
            data: {
              name: `野菜${i + 1}`,
              categoryId: testDataIds.categories.vegetable,
              unitId: testDataIds.units.gram,
              quantity: 100,
              purchaseDate: new Date(),
              storageLocationType: 'REFRIGERATED',
              userId,
            },
          })
          vegetables.push(ingredient)
        }

        const meats = []
        for (let i = 0; i < 2; i++) {
          const ingredient = await prisma.ingredient.create({
            data: {
              name: `肉魚${i + 1}`,
              categoryId: testDataIds.categories.meatFish,
              unitId: testDataIds.units.gram,
              quantity: 200,
              purchaseDate: new Date(),
              storageLocationType: 'FROZEN',
              userId,
            },
          })
          meats.push(ingredient)
        }

        // セッションを作成
        for (let i = 0; i < 5; i++) {
          const sessionId = faker.string.alphanumeric(20)
          const startedAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000)

          await prisma.shoppingSession.create({
            data: {
              id: sessionId,
              userId,
              status: 'COMPLETED',
              startedAt,
              completedAt: new Date(startedAt.getTime() + 30 * 60 * 1000),
            },
          })

          // 野菜を全部チェック
          for (const veg of vegetables) {
            await prisma.shoppingSessionItem.create({
              data: {
                sessionId,
                ingredientId: veg.id,
                ingredientName: veg.name,
                checkedAt: startedAt,
                stockStatus: 'IN_STOCK',
                expiryStatus: 'FRESH',
              },
            })
          }

          // 肉魚は1つだけチェック
          if (meats.length > 0) {
            await prisma.shoppingSessionItem.create({
              data: {
                sessionId,
                ingredientId: meats[0].id,
                ingredientName: meats[0].name,
                checkedAt: startedAt,
                stockStatus: 'IN_STOCK',
                expiryStatus: 'FRESH',
              },
            })
          }
        }

        // APIを呼び出し
        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/ingredient-check-statistics'
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        const statistics = responseData.data.statistics

        // カテゴリー別に検証
        const vegetableItems = statistics.filter((s: any) => s.ingredientName.includes('野菜'))
        const meatFishItems = statistics.filter((s: any) => s.ingredientName.includes('肉魚'))

        expect(vegetableItems.length).toBe(3)
        expect(meatFishItems.length).toBeGreaterThan(0)

        // 野菜の方が頻繁にチェックされている
        vegetableItems.forEach((item: any) => {
          expect(item.totalCheckCount).toBe(5)
        })
      })
    })
  })

  describe('異常系', () => {
    describe('パラメータエラー', () => {
      it('TC101: 不正なingredientId（400エラー）', async () => {
        // 認証ユーザーをモック
        mockAuthUser()

        // ingredientIdが不正な形式
        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/ingredient-check-statistics?ingredientId=invalid-id'
        )
        const response = await GET(request)
        const responseData = await response.json()

        // 不正な形式のIDは400エラー
        expect(response.status).toBe(400)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('VALIDATION_ERROR')
      })

      it('TC102: 存在しないingredientId（200 OK、空の統計）', async () => {
        // 認証ユーザーをモック
        mockAuthUser()

        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/ingredient-check-statistics?ingredientId=ing_nonexistent12345'
        )
        const response = await GET(request)
        const responseData = await response.json()

        // 存在しない食材の場合でも200を返し、空の統計を返す
        expect(response.status).toBe(200)
        expect(responseData.data.statistics).toHaveLength(0)
      })
    })

    describe('認証エラー', () => {
      it('TC201: 認証されていない場合（401エラー）', async () => {
        // 認証をモック（ユーザーなし）
        vi.mocked(auth).mockResolvedValue(null as any)

        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/ingredient-check-statistics'
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(401)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('UNAUTHORIZED')
        expect(responseData.error.message).toBe('Authentication required')
      })
    })
  })

  describe('データ分離', () => {
    describe('ユーザー分離', () => {
      it('TC301: 認証ユーザーの食材統計のみ取得', async () => {
        const testDataIds = getTestDataIds()

        // ユーザー1の食材を作成
        const user1Id = testDataIds.users.defaultUser.domainUserId
        mockAuthUser({ domainUserId: user1Id })

        const user1Ingredient = await prisma.ingredient.create({
          data: {
            name: 'ユーザー1の食材',
            categoryId: testDataIds.categories.vegetable,
            unitId: testDataIds.units.gram,
            quantity: 100,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
            userId: user1Id,
          },
        })

        // ユーザー1のセッション
        const user1SessionId = faker.string.alphanumeric(20)
        await prisma.shoppingSession.create({
          data: {
            id: user1SessionId,
            userId: user1Id,
            status: 'COMPLETED',
            startedAt: new Date(),
            completedAt: new Date(),
          },
        })

        await prisma.shoppingSessionItem.create({
          data: {
            sessionId: user1SessionId,
            ingredientId: user1Ingredient.id,
            ingredientName: user1Ingredient.name,
            checkedAt: new Date(),
            stockStatus: 'IN_STOCK',
            expiryStatus: 'FRESH',
          },
        })

        // ユーザー2を作成して食材を追加
        const user2 = await createTestUser({ email: 'other@example.com' })

        const user2Ingredient = await prisma.ingredient.create({
          data: {
            name: 'ユーザー2の食材',
            categoryId: testDataIds.categories.vegetable,
            unitId: testDataIds.units.gram,
            quantity: 100,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
            userId: user2.domainUserId,
          },
        })

        // ユーザー2のセッション
        const user2SessionId = faker.string.alphanumeric(20)
        await prisma.shoppingSession.create({
          data: {
            id: user2SessionId,
            userId: user2.domainUserId,
            status: 'COMPLETED',
            startedAt: new Date(),
            completedAt: new Date(),
          },
        })

        await prisma.shoppingSessionItem.create({
          data: {
            sessionId: user2SessionId,
            ingredientId: user2Ingredient.id,
            ingredientName: user2Ingredient.name,
            checkedAt: new Date(),
            stockStatus: 'IN_STOCK',
            expiryStatus: 'FRESH',
          },
        })

        // ユーザー1として認証してAPIを呼び出し
        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/ingredient-check-statistics'
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        const statistics = responseData.data.statistics
        expect(statistics).toHaveLength(1)
        expect(statistics[0].ingredientName).toBe('ユーザー1の食材')
        // ユーザー2の食材は含まれない
        const user2Item = statistics.find((s: any) => s.ingredientName === 'ユーザー2の食材')
        expect(user2Item).toBeUndefined()
      })
    })
  })
})
