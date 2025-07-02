import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PrismaClient } from '@/generated/prisma-test'
import { GetQuickAccessIngredientsApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-quick-access-ingredients.handler'
import { GetQuickAccessIngredientsHandler } from '@/modules/ingredients/server/application/queries/get-quick-access-ingredients.handler'
import { PrismaShoppingQueryService } from '@/modules/ingredients/server/infrastructure/query-services/prisma-shopping-query-service'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

/**
 * GetQuickAccessIngredients API + Application層統合テスト
 * 実際のアプリケーション層ハンドラーとクエリサービスを使用して統合動作を検証
 */
describe('GetQuickAccessIngredients API Integration', () => {
  let prisma: PrismaClient
  let apiHandler: GetQuickAccessIngredientsApiHandler
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

    // 依存関係を構築
    queryService = new PrismaShoppingQueryService(prisma as any)
    const applicationHandler = new GetQuickAccessIngredientsHandler(queryService)
    apiHandler = new GetQuickAccessIngredientsApiHandler(applicationHandler)
  })

  afterEach(async () => {
    await prisma.$disconnect()
  })

  describe('正常系', () => {
    it('買い物セッションでチェックされた食材がクイックアクセス順に取得できる', async () => {
      // Given: カテゴリとユニットを作成
      const category = await prisma.category.create({
        data: {
          id: 'cat1',
          name: '野菜',
          displayOrder: 1,
        },
      })
      const unit = await prisma.unit.create({
        data: {
          id: 'unit1',
          name: '個',
          symbol: '個',
          type: 'COUNT',
          displayOrder: 1,
        },
      })

      // 複数の食材を作成
      const ingredients = await Promise.all(
        Array.from({ length: 5 }, () =>
          prisma.ingredient.create({
            data: {
              id: testDataHelpers.ingredientId(),
              userId,
              name: faker.commerce.productName(),
              categoryId: category.id,
              quantity: faker.number.int({ min: 1, max: 10 }),
              unitId: unit.id,
              purchaseDate: faker.date.recent({ days: 30 }),
              storageLocationType: 'REFRIGERATOR',
            },
          })
        )
      )

      // 買い物セッションを作成してチェック回数を設定
      // 食材1: 5回チェック（最多）
      // 食材2: 3回チェック
      // 食材3: 1回チェック
      // 食材4,5: チェックなし
      const checkCounts = [5, 3, 1, 0, 0]

      for (let i = 0; i < checkCounts.length; i++) {
        for (let j = 0; j < checkCounts[i]; j++) {
          const session = await prisma.shoppingSession.create({
            data: {
              id: testDataHelpers.shoppingSessionId(),
              userId,
              startedAt: faker.date.recent({ days: 7 }),
              completedAt: faker.date.recent({ days: 6 }),
              deviceType: 'MOBILE',
              status: 'COMPLETED',
            },
          })

          await prisma.shoppingSessionItem.create({
            data: {
              sessionId: session.id,
              ingredientId: ingredients[i].id,
              ingredientName: ingredients[i].name,
              checkedAt: faker.date.recent({ days: 5 }),
              stockStatus: 'IN_STOCK', // 在庫あり
            },
          })
        }
      }

      const request = new Request('http://localhost?limit=3', {
        method: 'GET',
      })

      // When: APIハンドラーを実行
      const response = await apiHandler.handle(request, userId)

      // Then: チェック回数の多い順に3件取得される
      if (response.status !== 200) {
        const errorData = await response.json()
        console.error('Error response:', errorData)
      }
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData.ingredients).toHaveLength(3)

      // チェック回数順に並んでいることを確認
      expect(responseData.ingredients[0].ingredientId).toBe(ingredients[0].id)
      expect(responseData.ingredients[0].checkCount).toBe(5)
      expect(responseData.ingredients[1].ingredientId).toBe(ingredients[1].id)
      expect(responseData.ingredients[1].checkCount).toBe(3)
      expect(responseData.ingredients[2].ingredientId).toBe(ingredients[2].id)
      expect(responseData.ingredients[2].checkCount).toBe(1)
    })

    it('買い物セッションが存在しない場合、空の配列が返される', async () => {
      // Given: 買い物セッションがない状態
      const request = new Request('http://localhost', {
        method: 'GET',
      })

      // When: APIハンドラーを実行
      const response = await apiHandler.handle(request, userId)

      // Then: 空の配列が返される
      if (response.status !== 200) {
        const errorData = await response.json()
        console.error('Error response:', errorData)
      }
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData.ingredients).toEqual([])
    })

    it('デフォルトのlimit（10件）が適用される', async () => {
      // Given: カテゴリとユニットを作成
      const category = await prisma.category.create({
        data: {
          id: 'cat2',
          name: '果物',
          displayOrder: 2,
        },
      })
      const unit = await prisma.unit.create({
        data: {
          id: 'unit2',
          name: 'パック',
          symbol: 'パック',
          type: 'COUNT',
          displayOrder: 2,
        },
      })

      // 15個の食材を作成してチェック
      const ingredients = await Promise.all(
        Array.from({ length: 15 }, () =>
          prisma.ingredient.create({
            data: {
              id: testDataHelpers.ingredientId(),
              userId,
              name: faker.commerce.productName(),
              categoryId: category.id,
              quantity: faker.number.int({ min: 1, max: 10 }),
              unitId: unit.id,
              purchaseDate: faker.date.recent({ days: 30 }),
              storageLocationType: 'REFRIGERATOR',
            },
          })
        )
      )

      // 各食材を1回ずつチェック
      for (const ingredient of ingredients) {
        const session = await prisma.shoppingSession.create({
          data: {
            id: testDataHelpers.shoppingSessionId(),
            userId,
            startedAt: faker.date.recent({ days: 7 }),
            completedAt: faker.date.recent({ days: 6 }),
            deviceType: 'MOBILE',
            status: 'COMPLETED',
          },
        })

        await prisma.shoppingSessionItem.create({
          data: {
            sessionId: session.id,
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            checkedAt: faker.date.recent({ days: 5 }),
            stockStatus: 'IN_STOCK',
          },
        })
      }

      const request = new Request('http://localhost', {
        method: 'GET',
      })

      // When: limitを指定せずにAPIハンドラーを実行
      const response = await apiHandler.handle(request, userId)

      // Then: デフォルトの10件が返される
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData.ingredients).toHaveLength(10)
    })
  })

  describe('異常系', () => {
    it('limitが不正な値の場合、バリデーションエラーが返される', async () => {
      // Given: 不正なlimitパラメータ
      const request = new Request('http://localhost?limit=invalid', {
        method: 'GET',
      })

      // When: APIハンドラーを実行
      const response = await apiHandler.handle(request, userId)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.message).toBe('Validation failed')
      expect(responseData.errors).toContainEqual(
        expect.objectContaining({
          field: 'limit',
          message: 'limit must be a valid integer',
        })
      )
    })

    it('limitが範囲外の場合、バリデーションエラーが返される', async () => {
      // Given: 範囲外のlimitパラメータ
      const request = new Request('http://localhost?limit=200', {
        method: 'GET',
      })

      // When: APIハンドラーを実行
      const response = await apiHandler.handle(request, userId)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.message).toBe('Validation failed')
      expect(responseData.errors).toContainEqual(
        expect.objectContaining({
          field: 'limit',
          message: 'limit must be between 1 and 100',
        })
      )
    })
  })
})
