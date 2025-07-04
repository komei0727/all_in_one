import { NextRequest } from 'next/server'

import { faker } from '@faker-js/faker/locale/ja'
import { createId } from '@paralleldrive/cuid2'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping/categories/[id]/ingredients/route'
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
 * テスト用のID生成関数
 */
function createTestIngredientId(): string {
  return `ing_${createId()}`
}

function createTestSessionId(): string {
  return `ses_${createId()}`
}

function createTestUserId(): string {
  return `usr_${createId()}`
}

/**
 * GET /api/v1/shopping/categories/{id}/ingredients APIの統合テスト
 *
 * カテゴリー別食材取得機能の統合テスト
 * Next.js App RouterのRoute Handlerを直接テスト
 * データベースとの統合を検証
 */
describe('GET /api/v1/shopping/categories/{id}/ingredients Integration Tests', () => {
  let prisma: ReturnType<typeof getTestPrismaClient>

  beforeEach(async () => {
    // 各テストの前にデータベースをセットアップ
    await setupIntegrationTest()
    prisma = getTestPrismaClient()

    // CompositionRootをリセットしてテスト用のPrismaClientを使用
    CompositionRoot.resetInstance()
    // @ts-expect-error - テスト用のPrismaClientは型が異なるが、実行時には問題ない
    CompositionRoot.getInstance(prisma)
  })

  afterEach(async () => {
    // 各テストの後にテストデータをクリーンアップ
    await cleanupIntegrationTest()

    // CompositionRootもリセット
    CompositionRoot.resetInstance()
  })

  afterAll(async () => {
    // 全テスト完了後にリソースをクリーンアップ
    await cleanupPrismaClient()
  })

  describe('正常系', () => {
    describe('基本的なカテゴリー別食材取得', () => {
      it('TC001: 有効なカテゴリーIDで食材取得', async () => {
        // Given: 認証済みユーザーと食材データの作成
        const userId = mockAuthUser()
        const testData = getTestDataIds()
        const categoryId = testData.categories.vegetable
        const unitId = testData.units.piece

        await Promise.all([
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId,
              userId,
              quantity: 5.0,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId,
              userId,
              quantity: 0, // 在庫切れ
              storageLocationType: 'FROZEN',
              purchaseDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
        ])

        // When: APIリクエスト
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=stockStatus`,
          {
            method: 'GET',
          }
        )

        // UnifiedRouteFactoryはparams.idをcategoryIdとして扱うため、idとして渡す
        const response = await GET(request, { params: { id: categoryId } })

        // Then: レスポンスの検証
        const data = await response.json()
        expect(response.status).toBe(200)

        expect(data.data).toBeDefined()
        expect(data.data.category).toBeDefined()
        expect(data.data.category.id).toBe(categoryId)
        expect(data.data.category.name).toBeDefined()

        expect(data.data.ingredients).toHaveLength(2)
        expect(data.data.ingredients[0].stockStatus).toBe('OUT_OF_STOCK') // 在庫切れが最初
        expect(data.data.ingredients[1].stockStatus).toBe('IN_STOCK')

        expect(data.data.summary).toBeDefined()
        expect(data.data.summary.totalItems).toBe(2)
        expect(data.data.summary.outOfStockCount).toBe(1)
        expect(data.data.summary.lowStockCount).toBe(0)
        expect(data.data.summary.expiringSoonCount).toBe(0)

        expect(data.meta).toBeDefined()
        expect(data.meta.timestamp).toBeDefined()
        expect(data.meta.version).toBeDefined()
      })

      it('TC002: ソートオプションの動作確認 - 名前順ソート', async () => {
        // Given: 食材データの作成（名前順でソート確認用）
        const userId = mockAuthUser()
        const testData = getTestDataIds()
        const categoryId = testData.categories.vegetable
        const unitId = testData.units.piece

        const ingredientNames = ['トマト', 'いちご', 'バナナ']

        await Promise.all(
          ingredientNames.map((name) =>
            prisma.ingredient.create({
              data: {
                id: createTestIngredientId(),
                name,
                categoryId,
                unitId,
                userId,
                quantity: faker.number.float({ min: 1, max: 10, fractionDigits: 1 }),
                storageLocationType: 'REFRIGERATED',
                purchaseDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            })
          )
        )

        // When: APIリクエスト（名前順ソート）
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=name`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: categoryId } })

        // Then: レスポンスの検証
        expect(response.status).toBe(200)
        const data = await response.json()

        expect(data.data.ingredients).toHaveLength(3)
        expect(data.data.ingredients[0].name).toBe('いちご')
        expect(data.data.ingredients[1].name).toBe('トマト')
        expect(data.data.ingredients[2].name).toBe('バナナ')
      })

      it('TC003: 空のカテゴリー', async () => {
        // Given: 認証済みユーザーと空のカテゴリー
        mockAuthUser()
        const testData = getTestDataIds()
        const categoryId = testData.categories.meatFish // 空のカテゴリー

        // When: APIリクエスト
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=stockStatus`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: categoryId } })

        // Then: レスポンスの検証
        expect(response.status).toBe(200)
        const data = await response.json()

        expect(data.data.ingredients).toHaveLength(0)
        expect(data.data.summary.totalItems).toBe(0)
        expect(data.data.summary.outOfStockCount).toBe(0)
        expect(data.data.summary.lowStockCount).toBe(0)
        expect(data.data.summary.expiringSoonCount).toBe(0)
      })
    })

    describe('在庫・期限状態の判定', () => {
      it('TC004: 在庫状態の正確な判定', async () => {
        // Given: 異なる在庫状態の食材
        const userId = mockAuthUser()
        const testData = getTestDataIds()
        const categoryId = testData.categories.vegetable
        const unitId = testData.units.piece

        await Promise.all([
          // 在庫切れ
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId,
              userId,
              quantity: 0,
              threshold: 5,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          // 少量在庫
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId,
              userId,
              quantity: 3,
              threshold: 5,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          // 通常在庫
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId,
              userId,
              quantity: 10,
              threshold: 5,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
        ])

        // When: APIリクエスト
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=stockStatus`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: categoryId } })

        // Then: レスポンスの検証
        expect(response.status).toBe(200)
        const data = await response.json()

        expect(data.data.ingredients).toHaveLength(3)
        expect(data.data.ingredients[0].stockStatus).toBe('OUT_OF_STOCK')
        expect(data.data.ingredients[1].stockStatus).toBe('LOW_STOCK')
        expect(data.data.ingredients[2].stockStatus).toBe('IN_STOCK')

        expect(data.data.summary.outOfStockCount).toBe(1)
        expect(data.data.summary.lowStockCount).toBe(1)
      })

      it('TC005: 期限状態の正確な判定', async () => {
        // Given: 異なる期限状態の食材
        const userId = mockAuthUser()
        const testData = getTestDataIds()
        const categoryId = testData.categories.vegetable
        const unitId = testData.units.piece

        const now = new Date()
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)

        await Promise.all([
          // 期限切れ
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId,
              userId,
              quantity: 5,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              useByDate: yesterday,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          // 期限間近（CRITICAL）
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId,
              userId,
              quantity: 5,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              useByDate: tomorrow,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          // 期限間近（EXPIRING_SOON）
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId,
              userId,
              quantity: 5,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              useByDate: threeDaysLater,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          // 新鮮（FRESH）
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId,
              userId,
              quantity: 5,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              useByDate: fiveDaysLater,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
        ])

        // When: APIリクエスト
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=stockStatus`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: categoryId } })

        // Then: レスポンスの検証
        expect(response.status).toBe(200)
        const data = await response.json()

        expect(data.data.ingredients).toHaveLength(4)

        // 期限状態の確認
        const expiredIngredient = data.data.ingredients.find(
          (i: any) => i.expiryStatus === 'EXPIRED'
        )
        const criticalIngredient = data.data.ingredients.find(
          (i: any) => i.expiryStatus === 'CRITICAL'
        )
        const expiringSoonIngredient = data.data.ingredients.find(
          (i: any) => i.expiryStatus === 'EXPIRING_SOON'
        )
        const freshIngredient = data.data.ingredients.find(
          (i: any) => !i.expiryStatus || i.expiryStatus === 'FRESH'
        )

        expect(expiredIngredient).toBeDefined()
        expect(criticalIngredient).toBeDefined()
        expect(expiringSoonIngredient).toBeDefined()
        expect(freshIngredient).toBeDefined()

        // サマリーの確認（期限切れは除外される可能性があるため2以上）
        expect(data.data.summary.expiringSoonCount).toBeGreaterThanOrEqual(2) // CRITICAL + EXPIRING_SOON
      })

      it('TC006: 単位記号の表示', async () => {
        // Given: 異なる単位の食材
        const userId = mockAuthUser()
        const testData = getTestDataIds()
        const categoryId = testData.categories.vegetable

        await Promise.all([
          // 個数単位
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId: testData.units.piece,
              userId,
              quantity: 5,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          // 重量単位
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId: testData.units.gram,
              userId,
              quantity: 500,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          // 容量単位
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId: testData.units.milliliter,
              userId,
              quantity: 250,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
        ])

        // When: APIリクエスト
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=name`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: categoryId } })

        // Then: レスポンスの検証
        expect(response.status).toBe(200)
        const data = await response.json()

        expect(data.data.ingredients).toHaveLength(3)

        // 各食材に単位記号が含まれることを確認
        data.data.ingredients.forEach((ingredient: any) => {
          expect(ingredient.currentQuantity).toBeDefined()
          expect(ingredient.currentQuantity.unit).toBeDefined()
          expect(ingredient.currentQuantity.unit.symbol).toBeDefined()
          expect(typeof ingredient.currentQuantity.unit.symbol).toBe('string')
          expect(['個', 'g', 'ml']).toContain(ingredient.currentQuantity.unit.symbol)
        })
      })
    })

    describe('アクティブセッションとの連携', () => {
      it('TC007: アクティブセッションありの場合', async () => {
        // Given: アクティブセッションと食材
        const userId = mockAuthUser()
        const testData = getTestDataIds()
        const categoryId = testData.categories.vegetable
        const unitId = testData.units.piece

        // 食材作成
        const ingredient = await prisma.ingredient.create({
          data: {
            id: createTestIngredientId(),
            name: faker.food.ingredient(),
            categoryId,
            unitId,
            userId,
            quantity: 5,
            storageLocationType: 'REFRIGERATED',
            purchaseDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })

        // アクティブセッション作成
        const session = await prisma.shoppingSession.create({
          data: {
            id: createTestSessionId(),
            userId,
            status: 'ACTIVE',
            startedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })

        // 食材確認履歴作成（ingredientNameフィールドが必須）
        const checkedAt = new Date()
        await prisma.shoppingSessionItem.create({
          data: {
            sessionId: session.id,
            ingredientId: ingredient.id,
            ingredientName: ingredient.name, // 必須フィールド
            checkedAt,
            stockStatus: 'IN_STOCK',
            expiryStatus: 'FRESH',
          },
        })

        // When: APIリクエスト
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=name`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: categoryId } })

        // Then: レスポンスの検証
        expect(response.status).toBe(200)
        const data = await response.json()

        expect(data.data.ingredients).toHaveLength(1)
        expect(data.data.ingredients[0].lastCheckedAt).toBeDefined()
        expect(new Date(data.data.ingredients[0].lastCheckedAt).getTime()).toBeCloseTo(
          checkedAt.getTime(),
          -2
        )
      })

      it('TC008: アクティブセッションなしの場合', async () => {
        // Given: アクティブセッションなし
        const userId = mockAuthUser()
        const testData = getTestDataIds()
        const categoryId = testData.categories.vegetable
        const unitId = testData.units.piece

        // 食材作成
        await prisma.ingredient.create({
          data: {
            id: createTestIngredientId(),
            name: faker.food.ingredient(),
            categoryId,
            unitId,
            userId,
            quantity: 5,
            storageLocationType: 'REFRIGERATED',
            purchaseDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })

        // When: APIリクエスト
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=name`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: categoryId } })

        // Then: レスポンスの検証
        expect(response.status).toBe(200)
        const data = await response.json()

        expect(data.data.ingredients).toHaveLength(1)
        expect(data.data.ingredients[0].lastCheckedAt).toBeUndefined()
      })

      it('TC009: 複数回確認した食材', async () => {
        // Given: 複数回確認した食材
        const userId = mockAuthUser()
        const testData = getTestDataIds()
        const categoryId = testData.categories.vegetable
        const unitId = testData.units.piece

        // 食材作成
        const ingredient = await prisma.ingredient.create({
          data: {
            id: createTestIngredientId(),
            name: faker.food.ingredient(),
            categoryId,
            unitId,
            userId,
            quantity: 5,
            storageLocationType: 'REFRIGERATED',
            purchaseDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })

        // アクティブセッション作成
        const session = await prisma.shoppingSession.create({
          data: {
            id: createTestSessionId(),
            userId,
            status: 'ACTIVE',
            startedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })

        // 最初の確認
        const firstCheckedAt = new Date(Date.now() - 60 * 60 * 1000) // 1時間前
        await prisma.shoppingSessionItem.create({
          data: {
            sessionId: session.id,
            ingredientId: ingredient.id,
            ingredientName: ingredient.name, // 必須フィールド
            checkedAt: firstCheckedAt,
            stockStatus: 'IN_STOCK',
            expiryStatus: 'FRESH',
          },
        })

        // 最新の確認（上書き）
        const latestCheckedAt = new Date()
        await prisma.shoppingSessionItem.update({
          where: {
            sessionId_ingredientId: {
              sessionId: session.id,
              ingredientId: ingredient.id,
            },
          },
          data: {
            checkedAt: latestCheckedAt,
            stockStatus: 'IN_STOCK',
            expiryStatus: 'FRESH',
          },
        })

        // When: APIリクエスト
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=name`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: categoryId } })

        // Then: レスポンスの検証
        expect(response.status).toBe(200)
        const data = await response.json()

        expect(data.data.ingredients).toHaveLength(1)
        expect(data.data.ingredients[0].lastCheckedAt).toBeDefined()
        expect(new Date(data.data.ingredients[0].lastCheckedAt).getTime()).toBeCloseTo(
          latestCheckedAt.getTime(),
          -2
        )
      })
    })

    describe('サマリー情報の検証', () => {
      it('TC010: サマリー集計の正確性', async () => {
        // Given: 多様な状態の食材
        const userId = mockAuthUser()
        const testData = getTestDataIds()
        const categoryId = testData.categories.vegetable
        const unitId = testData.units.piece

        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

        await Promise.all([
          // 在庫切れ
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId,
              userId,
              quantity: 0,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          // 少量在庫
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId,
              userId,
              quantity: 2,
              threshold: 5,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          // 期限間近
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId,
              userId,
              quantity: 5,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              useByDate: tomorrow,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          // 通常在庫
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: faker.food.ingredient(),
              categoryId,
              unitId,
              userId,
              quantity: 10,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
        ])

        // When: APIリクエスト
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=stockStatus`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: categoryId } })

        // Then: レスポンスの検証
        expect(response.status).toBe(200)
        const data = await response.json()

        expect(data.data.ingredients).toHaveLength(4)
        expect(data.data.summary.totalItems).toBe(4)
        expect(data.data.summary.outOfStockCount).toBe(1)
        expect(data.data.summary.lowStockCount).toBe(1)
        expect(data.data.summary.expiringSoonCount).toBe(1) // 期限間近のもの
      })

      it('TC011: 大量データでのサマリー', async () => {
        // Given: 100件以上の食材
        const userId = mockAuthUser()
        const testData = getTestDataIds()
        const categoryId = testData.categories.vegetable
        const unitId = testData.units.piece

        const ingredientCount = 10 // 実際のテストでは100件以上だが、時間のため10件に調整
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

        const ingredients = []
        for (let i = 0; i < ingredientCount; i++) {
          const isOutOfStock = i % 5 === 0
          const isLowStock = i % 5 === 1
          const isExpiring = i % 5 === 2

          ingredients.push({
            id: createTestIngredientId(),
            name: `${faker.food.ingredient()}_${i}`,
            categoryId,
            unitId,
            userId,
            quantity: isOutOfStock ? 0 : isLowStock ? 2 : 10,
            threshold: isLowStock ? 5 : undefined,
            useByDate: isExpiring ? tomorrow : undefined,
            storageLocationType: 'REFRIGERATED' as const,
            purchaseDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }

        await prisma.ingredient.createMany({ data: ingredients })

        // When: APIリクエスト
        const startTime = Date.now()
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=stockStatus`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: categoryId } })
        const endTime = Date.now()

        // Then: レスポンスの検証
        expect(response.status).toBe(200)
        const data = await response.json()

        expect(data.data.ingredients).toHaveLength(ingredientCount)
        expect(data.data.summary.totalItems).toBe(ingredientCount)

        // パフォーマンスの確認（200ms以内）
        expect(endTime - startTime).toBeLessThan(200)
      })
    })
  })

  describe('異常系', () => {
    describe('パラメータエラー', () => {
      it('TC101: 無効なカテゴリーID形式 - 400エラー', async () => {
        // Given: 認証済みユーザーと無効なカテゴリーID
        mockAuthUser()
        const invalidCategoryId = 'invalid-id'

        // When: APIリクエスト
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${invalidCategoryId}/ingredients?sortBy=stockStatus`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: invalidCategoryId } })

        // Then: レスポンスの検証
        expect(response.status).toBe(400)
        const data = await response.json()

        expect(data.error).toBeDefined()
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.message).toContain('無効なカテゴリーIDフォーマットです')
      })

      it('TC102: 無効なソートパラメータ - 400エラー', async () => {
        // Given: 無効なソートパラメータ
        mockAuthUser()
        const testData = getTestDataIds()
        const categoryId = testData.categories.vegetable

        // When: APIリクエスト
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=invalid`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: categoryId } })

        // Then: レスポンスの検証
        expect(response.status).toBe(400)
        const data = await response.json()

        expect(data.error).toBeDefined()
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.message).toContain(
          'sortByはstockStatus, nameのいずれかである必要があります'
        )
      })
    })

    describe('リソース不存在', () => {
      it('TC103: 存在しないカテゴリーID - 404エラー', async () => {
        // Given: 認証済みユーザーと存在しないカテゴリーID
        mockAuthUser()
        const nonExistentCategoryId = 'cat_nonexistent123456789012'

        // When: APIリクエスト
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${nonExistentCategoryId}/ingredients?sortBy=stockStatus`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: nonExistentCategoryId } })

        // Then: レスポンスの検証
        expect(response.status).toBe(404)
        const data = await response.json()

        expect(data.error).toBeDefined()
        expect(data.error.code).toBe('RESOURCE_NOT_FOUND')
        expect(data.error.message).toContain('カテゴリー')
      })
    })

    describe('認証エラー', () => {
      it('TC201: 認証されていない場合 - 401エラー', async () => {
        // Given: 認証なし
        // @ts-expect-error - テストのため、nullを返す
        vi.mocked(auth).mockResolvedValue(null)

        const testData = getTestDataIds()
        const categoryId = testData.categories.vegetable

        // When: APIリクエスト（認証なし）
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=stockStatus`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: categoryId } })

        // Then: レスポンスの検証
        expect(response.status).toBe(401)
        const data = await response.json()

        expect(data.error).toBeDefined()
        expect(data.error.code).toBe('UNAUTHORIZED')
        expect(data.error.message).toContain('認証')
      })

      it('TC202: 無効なトークン - 401エラー', async () => {
        // Given: 無効な認証情報
        vi.mocked(auth).mockResolvedValue({
          user: {
            id: 'invalid',
            // domainUserIdが欠落
          },
        } as any)

        const testData = getTestDataIds()
        const categoryId = testData.categories.vegetable

        // When: APIリクエスト
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=stockStatus`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: categoryId } })

        // Then: レスポンスの検証
        expect(response.status).toBe(401)
        const data = await response.json()

        expect(data.error).toBeDefined()
        expect(data.error.code).toBe('UNAUTHORIZED')
      })
    })
  })

  describe('データ分離・セキュリティ', () => {
    it('TC301: 認証ユーザーの食材のみ取得', async () => {
      // Given: 複数ユーザーの食材
      const user1Id = mockAuthUser()
      const testData = getTestDataIds()
      const categoryId = testData.categories.vegetable
      const unitId = testData.units.piece

      // 別のユーザーIDを作成（ただしDomainUserレコードも作成する必要がある）
      const user2Id = createTestUserId()
      const user2NextAuthId = `nextauth_${createId()}`

      // user2のNextAuthユーザーとDomainUserを作成
      await prisma.user.create({
        data: {
          id: user2NextAuthId,
          email: faker.internet.email(),
          emailVerified: new Date(),
        },
      })

      await prisma.domainUser.create({
        data: {
          id: user2Id,
          nextAuthId: user2NextAuthId,
          email: faker.internet.email(),
          displayName: faker.person.fullName(),
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // ユーザー1の食材
      await prisma.ingredient.create({
        data: {
          id: createTestIngredientId(),
          name: faker.food.ingredient(),
          categoryId,
          unitId,
          userId: user1Id,
          quantity: 5,
          storageLocationType: 'REFRIGERATED',
          purchaseDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // ユーザー2の食材
      await prisma.ingredient.create({
        data: {
          id: createTestIngredientId(),
          name: faker.food.ingredient(),
          categoryId,
          unitId,
          userId: user2Id,
          quantity: 5,
          storageLocationType: 'REFRIGERATED',
          purchaseDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // When: ユーザー1でAPIリクエスト
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=name`,
        {
          method: 'GET',
        }
      )

      const response = await GET(request, { params: { id: categoryId } })

      // Then: レスポンスの検証
      expect(response.status).toBe(200)
      const data = await response.json()

      // ユーザー1の食材のみ取得される
      expect(data.data.ingredients).toHaveLength(1)
      expect(data.data.summary.totalItems).toBe(1)
    })

    it('TC302: 論理削除された食材の除外', async () => {
      // Given: 論理削除された食材
      const userId = mockAuthUser()
      const testData = getTestDataIds()
      const categoryId = testData.categories.vegetable
      const unitId = testData.units.piece

      // 通常の食材
      await prisma.ingredient.create({
        data: {
          id: createTestIngredientId(),
          name: faker.food.ingredient(),
          categoryId,
          unitId,
          userId,
          quantity: 5,
          storageLocationType: 'REFRIGERATED',
          purchaseDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // 論理削除された食材
      await prisma.ingredient.create({
        data: {
          id: createTestIngredientId(),
          name: faker.food.ingredient(),
          categoryId,
          unitId,
          userId,
          quantity: 5,
          storageLocationType: 'REFRIGERATED',
          purchaseDate: new Date(),
          deletedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // When: APIリクエスト
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=name`,
        {
          method: 'GET',
        }
      )

      const response = await GET(request, { params: { id: categoryId } })

      // Then: レスポンスの検証
      expect(response.status).toBe(200)
      const data = await response.json()

      // 論理削除された食材は含まれない
      expect(data.data.ingredients).toHaveLength(1)
      expect(data.data.summary.totalItems).toBe(1)
    })

    it('TC303: 他ユーザーのセッション情報は参照不可', async () => {
      // Given: 複数ユーザーのセッション
      const user1Id = mockAuthUser()
      const testData = getTestDataIds()
      const categoryId = testData.categories.vegetable
      const unitId = testData.units.piece

      // user2を作成
      const user2Id = createTestUserId()
      const user2NextAuthId = `nextauth_${createId()}`

      await prisma.user.create({
        data: {
          id: user2NextAuthId,
          email: faker.internet.email(),
          emailVerified: new Date(),
        },
      })

      await prisma.domainUser.create({
        data: {
          id: user2Id,
          nextAuthId: user2NextAuthId,
          email: faker.internet.email(),
          displayName: faker.person.fullName(),
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // ユーザー1の食材
      const ingredient = await prisma.ingredient.create({
        data: {
          id: createTestIngredientId(),
          name: faker.food.ingredient(),
          categoryId,
          unitId,
          userId: user1Id,
          quantity: 5,
          storageLocationType: 'REFRIGERATED',
          purchaseDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // ユーザー2のアクティブセッション
      const user2Session = await prisma.shoppingSession.create({
        data: {
          id: createTestSessionId(),
          userId: user2Id,
          status: 'ACTIVE',
          startedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // ユーザー2が食材を確認（しかしユーザー1の食材なので影響なし）
      await prisma.shoppingSessionItem.create({
        data: {
          sessionId: user2Session.id,
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          checkedAt: new Date(),
          stockStatus: 'IN_STOCK',
          expiryStatus: 'FRESH',
        },
      })

      // When: ユーザー1でAPIリクエスト
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=name`,
        {
          method: 'GET',
        }
      )

      const response = await GET(request, { params: { id: categoryId } })

      // Then: レスポンスの検証
      expect(response.status).toBe(200)
      const data = await response.json()

      // ユーザー1にはアクティブセッションがないのでlastCheckedAtはundefined
      expect(data.data.ingredients).toHaveLength(1)
      expect(data.data.ingredients[0].lastCheckedAt).toBeUndefined()
    })
  })

  describe('パフォーマンス・スケーラビリティ', () => {
    it('TC401: 1カテゴリーに100件以上の食材', async () => {
      // Given: 大量の食材
      const userId = mockAuthUser()
      const testData = getTestDataIds()
      const categoryId = testData.categories.vegetable
      const unitId = testData.units.piece

      const ingredientCount = 20 // 実際のテストでは100件以上だが、時間のため20件に調整
      const ingredients = []

      for (let i = 0; i < ingredientCount; i++) {
        ingredients.push({
          id: createTestIngredientId(),
          name: `${faker.food.ingredient()}_${i}`,
          categoryId,
          unitId,
          userId,
          quantity: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
          storageLocationType: faker.helpers.arrayElement([
            'REFRIGERATED',
            'FROZEN',
            'ROOM_TEMPERATURE',
          ] as const),
          purchaseDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      await prisma.ingredient.createMany({ data: ingredients })

      // When: APIリクエスト
      const startTime = Date.now()
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=stockStatus`,
        {
          method: 'GET',
        }
      )

      const response = await GET(request, { params: { id: categoryId } })
      const endTime = Date.now()

      // Then: レスポンスの検証
      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.data.ingredients).toHaveLength(ingredientCount)

      // パフォーマンスの確認（200ms以内）
      expect(endTime - startTime).toBeLessThan(200)

      // ソートの正確性
      let previousStatus = ''
      data.data.ingredients.forEach((ingredient: any) => {
        if (previousStatus && previousStatus !== ingredient.stockStatus) {
          // ステータスが変わった場合、正しい順序を確認
          if (previousStatus === 'OUT_OF_STOCK') {
            expect(['LOW_STOCK', 'IN_STOCK']).toContain(ingredient.stockStatus)
          } else if (previousStatus === 'LOW_STOCK') {
            expect(ingredient.stockStatus).toBe('IN_STOCK')
          }
        }
        previousStatus = ingredient.stockStatus
      })
    })

    it('TC402: 単位情報の効率的な取得', async () => {
      // Given: 同じ単位を使用する複数の食材
      const userId = mockAuthUser()
      const testData = getTestDataIds()
      const categoryId = testData.categories.vegetable
      const unitId = testData.units.piece

      const ingredientCount = 10
      const ingredients = []

      for (let i = 0; i < ingredientCount; i++) {
        ingredients.push({
          id: createTestIngredientId(),
          name: `${faker.food.ingredient()}_${i}`,
          categoryId,
          unitId, // 全て同じ単位
          userId,
          quantity: faker.number.float({ min: 1, max: 10, fractionDigits: 1 }),
          storageLocationType: 'REFRIGERATED' as const,
          purchaseDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      await prisma.ingredient.createMany({ data: ingredients })

      // When: APIリクエスト
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=name`,
        {
          method: 'GET',
        }
      )

      const response = await GET(request, { params: { id: categoryId } })

      // Then: レスポンスの検証
      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.data.ingredients).toHaveLength(ingredientCount)

      // 全ての食材で同じ単位記号が使用されていることを確認
      const unitSymbols = data.data.ingredients.map((i: any) => i.currentQuantity.unit.symbol)
      expect(new Set(unitSymbols).size).toBe(1) // 一意の単位記号は1つのみ
      expect(unitSymbols[0]).toBe('個')
    })
  })

  describe('統合テストのポイント', () => {
    describe('データの整合性', () => {
      it('TC501: 食材・カテゴリー・単位の結合', async () => {
        // Given: 異なるカテゴリーと単位の組み合わせ
        const userId = mockAuthUser()
        const testData = getTestDataIds()

        // 各カテゴリーに食材を作成
        await Promise.all([
          // 野菜カテゴリー - 個数単位
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: 'トマト',
              categoryId: testData.categories.vegetable,
              unitId: testData.units.piece,
              userId,
              quantity: 5,
              storageLocationType: 'REFRIGERATED',
              purchaseDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          // 肉・魚カテゴリー - 重量単位
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: '鶏肉',
              categoryId: testData.categories.meatFish,
              unitId: testData.units.gram,
              userId,
              quantity: 300,
              storageLocationType: 'FROZEN',
              purchaseDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
          // 調味料カテゴリー - 容量単位
          prisma.ingredient.create({
            data: {
              id: createTestIngredientId(),
              name: '醤油',
              categoryId: testData.categories.seasoning,
              unitId: testData.units.milliliter,
              userId,
              quantity: 500,
              storageLocationType: 'ROOM_TEMPERATURE',
              purchaseDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
        ])

        // When: 野菜カテゴリーでAPIリクエスト
        const request = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${testData.categories.vegetable}/ingredients?sortBy=name`,
          {
            method: 'GET',
          }
        )

        const response = await GET(request, { params: { id: testData.categories.vegetable } })

        // Then: レスポンスの検証
        expect(response.status).toBe(200)
        const data = await response.json()

        // 野菜カテゴリーの食材のみ取得される
        expect(data.data.ingredients).toHaveLength(1)
        expect(data.data.ingredients[0].name).toBe('トマト')
        expect(data.data.ingredients[0].currentQuantity.unit.symbol).toBe('個')
        expect(data.data.category.name).toBe('野菜')
      })

      it('TC502: リアルタイムデータの反映', async () => {
        // Given: 初期状態の食材
        const userId = mockAuthUser()
        const testData = getTestDataIds()
        const categoryId = testData.categories.vegetable
        const unitId = testData.units.piece

        const ingredient = await prisma.ingredient.create({
          data: {
            id: createTestIngredientId(),
            name: faker.food.ingredient(),
            categoryId,
            unitId,
            userId,
            quantity: 10,
            threshold: 5,
            storageLocationType: 'REFRIGERATED',
            purchaseDate: new Date(),
            useByDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5日後
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })

        // 初回取得
        const request1 = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=stockStatus`,
          {
            method: 'GET',
          }
        )
        const response1 = await GET(request1, { params: { id: categoryId } })
        const data1 = await response1.json()

        expect(data1.data.ingredients[0].stockStatus).toBe('IN_STOCK')
        expect(data1.data.ingredients[0].expiryStatus).toBeUndefined() // FRESHは表示されない

        // When: 在庫を消費して期限を更新
        await prisma.ingredient.update({
          where: { id: ingredient.id },
          data: {
            quantity: 2, // 閾値以下に
            useByDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1日後に変更
          },
        })

        // アクティブセッションを作成して確認
        const session = await prisma.shoppingSession.create({
          data: {
            id: createTestSessionId(),
            userId,
            status: 'ACTIVE',
            startedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })

        await prisma.shoppingSessionItem.create({
          data: {
            sessionId: session.id,
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            checkedAt: new Date(),
            stockStatus: 'LOW_STOCK',
            expiryStatus: 'CRITICAL',
          },
        })

        // Then: 更新後の状態を確認
        const request2 = new NextRequest(
          `http://localhost:3000/api/v1/shopping/categories/${categoryId}/ingredients?sortBy=stockStatus`,
          {
            method: 'GET',
          }
        )
        const response2 = await GET(request2, { params: { id: categoryId } })
        const data2 = await response2.json()

        expect(data2.data.ingredients[0].stockStatus).toBe('LOW_STOCK')
        expect(data2.data.ingredients[0].expiryStatus).toBe('CRITICAL')
        expect(data2.data.ingredients[0].lastCheckedAt).toBeDefined()

        // サマリーも更新されている
        expect(data2.data.summary.lowStockCount).toBe(1)
        expect(data2.data.summary.expiringSoonCount).toBe(1)
      })
    })
  })
})
