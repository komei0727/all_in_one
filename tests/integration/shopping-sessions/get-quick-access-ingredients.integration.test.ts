import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/quick-access-ingredients/route'
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
 * GET /api/v1/shopping-sessions/quick-access-ingredients APIの統合テスト
 *
 * クイックアクセス食材取得機能の統合テスト
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('GET /api/v1/shopping-sessions/quick-access-ingredients Integration Tests', () => {
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
    describe('基本的なクイックアクセス食材取得', () => {
      it('TC001: デフォルトパラメータでの取得', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // テスト用データを作成
        const testDataIds = getTestDataIds()
        const now = new Date()

        // よくチェックされる食材を作成
        const frequentlyCheckedIngredients = []
        for (let i = 0; i < 3; i++) {
          const ingredient = await prisma.ingredient.create({
            data: {
              name: `頻繁食材${i + 1}`,
              categoryId: testDataIds.categories.vegetable,
              unitId: testDataIds.units.gram,
              quantity: 100,
              purchaseDate: new Date(),
              storageLocationType: 'REFRIGERATED',
              userId,
            },
          })
          frequentlyCheckedIngredients.push(ingredient)
        }

        // 過去によくチェックされていた食材（30日以上前のみ）
        const oldFrequentIngredients = []
        for (let i = 0; i < 2; i++) {
          const ingredient = await prisma.ingredient.create({
            data: {
              name: `過去頻繁食材${i + 1}`,
              categoryId: testDataIds.categories.meatFish,
              unitId: testDataIds.units.gram,
              quantity: 300,
              purchaseDate: new Date(),
              storageLocationType: 'FROZEN',
              userId,
            },
          })
          oldFrequentIngredients.push(ingredient)
        }

        // たまにチェックされる食材を作成
        const occasionalIngredients = []
        for (let i = 0; i < 2; i++) {
          const ingredient = await prisma.ingredient.create({
            data: {
              name: `たまに食材${i + 1}`,
              categoryId: testDataIds.categories.seasoning,
              unitId: testDataIds.units.milliliter,
              quantity: 500,
              purchaseDate: new Date(),
              storageLocationType: 'PANTRY',
              userId,
            },
          })
          occasionalIngredients.push(ingredient)
        }

        // ほとんどチェックされない食材を作成
        for (let i = 0; i < 1; i++) {
          await prisma.ingredient.create({
            data: {
              name: `レア食材${i + 1}`,
              categoryId: testDataIds.categories.meatFish,
              unitId: testDataIds.units.gram,
              quantity: 200,
              purchaseDate: new Date(),
              storageLocationType: 'FROZEN',
              userId,
            },
          })
        }

        // セッションを作成してチェック履歴を生成
        // 過去40日間に渡ってセッションを作成（30日以内と以前の両方）
        for (let i = 0; i < 10; i++) {
          const sessionId = faker.string.alphanumeric(20)
          const startedAt = new Date(now.getTime() - i * 4 * 24 * 60 * 60 * 1000) // 4日ずつ過去

          await prisma.shoppingSession.create({
            data: {
              id: sessionId,
              userId,
              status: 'COMPLETED',
              startedAt,
              completedAt: new Date(startedAt.getTime() + 60 * 60 * 1000),
            },
          })

          // 頻繁にチェックされる食材は毎回チェック
          for (let j = 0; j < Math.min(2, frequentlyCheckedIngredients.length); j++) {
            await prisma.shoppingSessionItem.create({
              data: {
                sessionId,
                ingredientId: frequentlyCheckedIngredients[j].id,
                ingredientName: frequentlyCheckedIngredients[j].name,
                checkedAt: new Date(startedAt.getTime() + j * 5 * 60 * 1000),
                stockStatus: faker.helpers.arrayElement(['IN_STOCK', 'OUT_OF_STOCK', 'LOW_STOCK']),
                expiryStatus: faker.helpers.arrayElement(['FRESH', 'NEAR_EXPIRY']),
              },
            })
          }

          // たまにチェックされる食材は3回に1回
          if (i % 3 === 0) {
            for (let j = 0; j < Math.min(2, occasionalIngredients.length); j++) {
              await prisma.shoppingSessionItem.create({
                data: {
                  sessionId,
                  ingredientId: occasionalIngredients[j].id,
                  ingredientName: occasionalIngredients[j].name,
                  checkedAt: new Date(startedAt.getTime() + (5 + j) * 5 * 60 * 1000),
                  stockStatus: 'IN_STOCK',
                  expiryStatus: 'FRESH',
                },
              })
            }
          }

          // 過去頻繁食材は30日より前（i >= 8）でのみチェック
          if (i >= 8) {
            for (let j = 0; j < oldFrequentIngredients.length; j++) {
              await prisma.shoppingSessionItem.create({
                data: {
                  sessionId,
                  ingredientId: oldFrequentIngredients[j].id,
                  ingredientName: oldFrequentIngredients[j].name,
                  checkedAt: new Date(startedAt.getTime() + (10 + j) * 5 * 60 * 1000),
                  stockStatus: 'IN_STOCK',
                  expiryStatus: 'FRESH',
                },
              })
            }
          }
        }

        // APIを呼び出し（デフォルトlimit=20）
        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients'
        )
        const response = await GET(request)
        const responseData = await response.json()

        // レスポンスの検証
        expect(response.status).toBe(200)
        expect(responseData.data).toBeDefined()
        expect(responseData.data.recentlyChecked).toBeDefined()
        expect(responseData.data.recentlyChecked).toBeInstanceOf(Array)
        expect(responseData.data.frequentlyChecked).toBeDefined()
        expect(responseData.data.frequentlyChecked).toBeInstanceOf(Array)

        // 最近チェックした食材の検証
        expect(responseData.data.recentlyChecked.length).toBeGreaterThan(0)
        expect(responseData.data.recentlyChecked.length).toBeLessThanOrEqual(20) // デフォルトlimit
        const topRecentIngredient = responseData.data.recentlyChecked[0]
        expect(topRecentIngredient.ingredientId).toBeDefined()
        expect(topRecentIngredient.name).toBeDefined()
        expect(topRecentIngredient.categoryId).toBeDefined()
        expect(topRecentIngredient.categoryName).toBeDefined()
        expect(topRecentIngredient.stockStatus).toBeDefined()
        expect(topRecentIngredient.lastCheckedAt).toBeDefined()

        // 頻繁にチェックされる食材の検証
        expect(responseData.data.frequentlyChecked.length).toBeGreaterThan(0)

        // 過去頻繁食材がfrequentlyCheckedに含まれることを確認
        const oldFrequentItem = responseData.data.frequentlyChecked.find((item: any) =>
          item.name.includes('過去頻繁食材')
        )
        expect(oldFrequentItem).toBeDefined()
        expect(oldFrequentItem.checkCount).toBe(2) // 過去2セッションでチェックされた
        expect(oldFrequentItem.categoryId).toBeDefined()
        expect(oldFrequentItem.categoryName).toBeDefined()

        // 頻繁にチェックされる食材はチェック頻度の降順でソートされていることを確認
        for (let i = 0; i < responseData.data.frequentlyChecked.length - 1; i++) {
          const current = responseData.data.frequentlyChecked[i]
          const next = responseData.data.frequentlyChecked[i + 1]
          expect(current.checkCount).toBeGreaterThanOrEqual(next.checkCount)
        }
      })

      it('TC002: カスタムlimitでの取得', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // テスト用データを作成
        const testDataIds = getTestDataIds()
        const now = new Date()

        // 10個の食材を作成
        const ingredients = []
        for (let i = 0; i < 10; i++) {
          const ingredient = await prisma.ingredient.create({
            data: {
              name: `テスト食材${i + 1}`,
              categoryId: testDataIds.categories.vegetable,
              unitId: testDataIds.units.gram,
              quantity: 100,
              purchaseDate: new Date(),
              storageLocationType: 'REFRIGERATED',
              userId,
            },
          })
          ingredients.push(ingredient)
        }

        // セッションを作成してチェック履歴を生成（各食材で異なる頻度）
        for (let sessionIndex = 0; sessionIndex < 5; sessionIndex++) {
          const sessionId = faker.string.alphanumeric(20)
          const startedAt = new Date(now.getTime() - sessionIndex * 24 * 60 * 60 * 1000)

          await prisma.shoppingSession.create({
            data: {
              id: sessionId,
              userId,
              status: 'COMPLETED',
              startedAt,
              completedAt: new Date(startedAt.getTime() + 30 * 60 * 1000),
            },
          })

          // 各食材を異なる頻度でチェック
          for (let i = 0; i < ingredients.length; i++) {
            if (sessionIndex < 10 - i) {
              // 食材1は10回、食材2は9回...
              await prisma.shoppingSessionItem.create({
                data: {
                  sessionId,
                  ingredientId: ingredients[i].id,
                  ingredientName: ingredients[i].name,
                  checkedAt: startedAt,
                  stockStatus: 'IN_STOCK',
                  expiryStatus: 'FRESH',
                },
              })
            }
          }
        }

        // limit=5での取得
        let request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients?limit=5'
        )
        let response = await GET(request)
        let responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.recentlyChecked).toBeDefined()
        expect(responseData.data.frequentlyChecked).toBeDefined()
        // 合計で最大5件（recentlyCheckedとfrequentlyCheckedがそれぞれ5件まで）
        expect(
          responseData.data.recentlyChecked.length + responseData.data.frequentlyChecked.length
        ).toBeLessThanOrEqual(10)

        // frequentlyCheckedの最初の食材を確認
        if (responseData.data.frequentlyChecked.length > 0) {
          expect(responseData.data.frequentlyChecked[0].name).toBe('テスト食材1')
          expect(responseData.data.frequentlyChecked[0].checkCount).toBe(5)
        }

        // limit=15での取得
        request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients?limit=15'
        )
        response = await GET(request)
        responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.recentlyChecked).toBeDefined()
        expect(responseData.data.frequentlyChecked).toBeDefined()

        // limit=30での取得（実際の食材数より多い）
        request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients?limit=30'
        )
        response = await GET(request)
        responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.recentlyChecked).toBeDefined()
        expect(responseData.data.frequentlyChecked).toBeDefined()
      })

      it('TC003: チェック履歴がない場合', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // 食材は作成するがチェック履歴なし
        const testDataIds = getTestDataIds()
        await prisma.ingredient.create({
          data: {
            name: 'チェックされていない食材',
            categoryId: testDataIds.categories.vegetable,
            unitId: testDataIds.units.gram,
            quantity: 100,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
            userId,
          },
        })

        // APIを呼び出し
        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients'
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.recentlyChecked).toHaveLength(0)
        expect(responseData.data.frequentlyChecked).toHaveLength(0)
      })
    })

    describe('期間でのフィルタリング', () => {
      it('TC004: 最近のチェック履歴のみを対象', async () => {
        // 認証ユーザーをモック
        const userId = mockAuthUser()

        // テスト用データを作成
        const testDataIds = getTestDataIds()
        const now = new Date()

        // 食材を作成
        const recentIngredient = await prisma.ingredient.create({
          data: {
            name: '最近の食材',
            categoryId: testDataIds.categories.vegetable,
            unitId: testDataIds.units.gram,
            quantity: 100,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
            userId,
          },
        })

        const oldIngredient = await prisma.ingredient.create({
          data: {
            name: '古い食材',
            categoryId: testDataIds.categories.vegetable,
            unitId: testDataIds.units.gram,
            quantity: 100,
            purchaseDate: new Date(),
            storageLocationType: 'REFRIGERATED',
            userId,
          },
        })

        // 最近のセッション（過去30日以内）
        for (let i = 0; i < 5; i++) {
          const sessionId = faker.string.alphanumeric(20)
          const startedAt = new Date(now.getTime() - i * 5 * 24 * 60 * 60 * 1000) // 5日ずつ過去

          await prisma.shoppingSession.create({
            data: {
              id: sessionId,
              userId,
              status: 'COMPLETED',
              startedAt,
              completedAt: new Date(startedAt.getTime() + 30 * 60 * 1000),
            },
          })

          await prisma.shoppingSessionItem.create({
            data: {
              sessionId,
              ingredientId: recentIngredient.id,
              ingredientName: recentIngredient.name,
              checkedAt: startedAt,
              stockStatus: 'IN_STOCK',
              expiryStatus: 'FRESH',
            },
          })
        }

        // 古いセッション（30日以上前）
        for (let i = 0; i < 10; i++) {
          const sessionId = faker.string.alphanumeric(20)
          const startedAt = new Date(now.getTime() - (40 + i) * 24 * 60 * 60 * 1000) // 40日以上前

          await prisma.shoppingSession.create({
            data: {
              id: sessionId,
              userId,
              status: 'COMPLETED',
              startedAt,
              completedAt: new Date(startedAt.getTime() + 30 * 60 * 1000),
            },
          })

          await prisma.shoppingSessionItem.create({
            data: {
              sessionId,
              ingredientId: oldIngredient.id,
              ingredientName: oldIngredient.name,
              checkedAt: startedAt,
              stockStatus: 'IN_STOCK',
              expiryStatus: 'FRESH',
            },
          })
        }

        // APIを呼び出し
        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients'
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)

        // recentlyCheckedには最近の食材のみが含まれる
        const recentItem = responseData.data.recentlyChecked.find(
          (i: any) => i.name === '最近の食材'
        )
        expect(recentItem).toBeDefined()

        // frequentlyCheckedには古い食材が含まれる（チェック回数が多いため）
        const oldItem = responseData.data.frequentlyChecked.find((i: any) => i.name === '古い食材')
        expect(oldItem).toBeDefined()
        expect(oldItem.checkCount).toBe(10)
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
          'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients?limit=0'
        )
        let response = await GET(request)
        let responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('VALIDATION_ERROR')

        // limit=51（最大値を超える）
        request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients?limit=51'
        )
        response = await GET(request)
        responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error.code).toBe('VALIDATION_ERROR')

        // limit=-1
        request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients?limit=-1'
        )
        response = await GET(request)
        responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error.code).toBe('VALIDATION_ERROR')
      })

      it('TC102: 数値以外のlimit（400エラー）', async () => {
        // 認証ユーザーをモック
        mockAuthUser()

        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients?limit=invalid'
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBeDefined()
        expect(responseData.error.code).toBe('VALIDATION_ERROR')
      })
    })

    describe('認証エラー', () => {
      it('TC201: 認証されていない場合（401エラー）', async () => {
        // 認証をモック（ユーザーなし）
        vi.mocked(auth).mockResolvedValue(null as any)

        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients'
        )
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
      it('TC301: 認証ユーザーのクイックアクセス食材のみ取得', async () => {
        const testDataIds = getTestDataIds()

        // ユーザー1の食材を作成
        const user1Id = testDataIds.users.defaultUser.domainUserId
        mockAuthUser({ domainUserId: user1Id })

        const user1Ingredient = await prisma.ingredient.create({
          data: {
            name: 'ユーザー1のクイック食材',
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
            name: 'ユーザー2のクイック食材',
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

        // ユーザー2は頻繁にチェック（複数セッションで）
        for (let i = 0; i < 10; i++) {
          const user2SessionIdForCheck = faker.string.alphanumeric(20)
          await prisma.shoppingSession.create({
            data: {
              id: user2SessionIdForCheck,
              userId: user2.domainUserId,
              status: 'COMPLETED',
              startedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
              completedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
            },
          })

          await prisma.shoppingSessionItem.create({
            data: {
              sessionId: user2SessionIdForCheck,
              ingredientId: user2Ingredient.id,
              ingredientName: user2Ingredient.name,
              checkedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
              stockStatus: 'IN_STOCK',
              expiryStatus: 'FRESH',
            },
          })
        }

        // ユーザー1として認証してAPIを呼び出し
        const request = new NextRequest(
          'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients'
        )
        const response = await GET(request)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        const allIngredients = [
          ...responseData.data.recentlyChecked,
          ...responseData.data.frequentlyChecked,
        ]
        expect(allIngredients).toHaveLength(1)
        expect(allIngredients[0].name).toBe('ユーザー1のクイック食材')
        // ユーザー2の食材は含まれない
        const user2Item = allIngredients.find((i: any) => i.name === 'ユーザー2のクイック食材')
        expect(user2Item).toBeUndefined()
      })
    })
  })
})
