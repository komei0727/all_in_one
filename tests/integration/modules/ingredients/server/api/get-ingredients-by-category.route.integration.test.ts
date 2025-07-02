import { faker } from '@faker-js/faker'
import { createId } from '@paralleldrive/cuid2'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PrismaClient } from '@/generated/prisma-test'
import { GetIngredientsByCategoryApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-ingredients-by-category.handler'
import { GetIngredientsByCategoryHandler } from '@/modules/ingredients/server/application/queries/get-ingredients-by-category.handler'
import { PrismaCategoryRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-category-repository'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

/**
 * GetIngredientsByCategory API + Application層統合テスト
 * カテゴリー別食材取得APIの統合動作を検証
 */
describe('GetIngredientsByCategory API Integration', () => {
  let prisma: PrismaClient
  let apiHandler: GetIngredientsByCategoryApiHandler
  let categoryRepository: PrismaCategoryRepository
  let ingredientRepository: PrismaIngredientRepository
  let userId: string
  let authUser: any
  let domainUser: any

  beforeEach(async () => {
    prisma = new PrismaClient()

    // ユーザーを作成
    authUser = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        emailVerified: new Date(),
      },
    })

    domainUser = await prisma.domainUser.create({
      data: {
        id: testDataHelpers.userId(),
        displayName: faker.person.fullName(),
        email: authUser.email,
        nextAuthUser: {
          connect: { id: authUser.id },
        },
      },
    })

    userId = domainUser.id

    // リポジトリとハンドラーを初期化
    categoryRepository = new PrismaCategoryRepository(prisma as any)
    ingredientRepository = new PrismaIngredientRepository(prisma as any)

    const queryHandler = new GetIngredientsByCategoryHandler(
      categoryRepository,
      ingredientRepository
    )

    apiHandler = new GetIngredientsByCategoryApiHandler(queryHandler)
  })

  afterEach(async () => {
    // 外部キー制約の順序を考慮して削除
    await prisma.ingredient.deleteMany({ where: { userId } })
    await prisma.domainUser.delete({ where: { id: userId } })
    await prisma.user.delete({ where: { id: authUser.id } })
    await prisma.$disconnect()
  })

  describe('正常系', () => {
    it.only('カテゴリーに属する食材を取得できる', async () => {
      // Given: カテゴリーを作成
      const category = await prisma.category.create({
        data: {
          id: 'cat_' + createId(),
          name: faker.commerce.department() + '_' + faker.string.alphanumeric(8),
          description: faker.lorem.sentence(),
          displayOrder: 1,
          isActive: true,
        },
      })

      // 単位を作成（テスト用）
      const unit = await prisma.unit.create({
        data: {
          id: 'unt_' + createId(),
          name: 'グラム',
          symbol: faker.string.alphanumeric(3),
          type: 'WEIGHT',
          displayOrder: 1,
        },
      })

      // 食材を作成（在庫状態を分ける）
      await Promise.all([
        prisma.ingredient.create({
          data: {
            id: 'ing_' + createId(),
            name: faker.food.ingredient(),
            unitId: unit.id,
            categoryId: category.id,
            userId,
            quantity: 100, // 在庫あり
            purchaseDate: faker.date.recent(),
            bestBeforeDate: faker.date.future(),
            storageLocationType: 'REFRIGERATED',
            updatedAt: new Date(),
          },
        }),
        prisma.ingredient.create({
          data: {
            id: 'ing_' + createId(),
            name: faker.food.ingredient(),
            unitId: unit.id,
            categoryId: category.id,
            userId,
            quantity: 5, // 在庫少
            threshold: 10, // 閾値を設定（5 <= 10なのでLOW_STOCK）
            purchaseDate: faker.date.recent(),
            bestBeforeDate: faker.date.future(),
            storageLocationType: 'REFRIGERATED',
            updatedAt: new Date(),
          },
        }),
        prisma.ingredient.create({
          data: {
            id: 'ing_' + createId(),
            name: faker.food.ingredient(),
            unitId: unit.id,
            categoryId: category.id,
            userId,
            quantity: 0, // 在庫なし
            purchaseDate: faker.date.recent(),
            bestBeforeDate: faker.date.future(),
            storageLocationType: 'REFRIGERATED',
            updatedAt: new Date(),
          },
        }),
      ])

      // When: APIハンドラーを通じてカテゴリー別食材を取得
      const request = new Request('http://localhost', {
        method: 'GET',
      })

      // エラーをキャッチしてログ出力
      try {
        const result = await apiHandler.handle(
          request,
          { categoryId: category.id, sortBy: 'stockStatus' },
          userId
        )

        // エラーレスポンスの場合、内容を出力
        if (result.status !== 200) {
          const errorData = await result.json()
          console.log('Error response status:', result.status)
          console.log('Error response data:', JSON.stringify(errorData, null, 2))
        }

        // Then: レスポンスが成功する
        expect(result.status).toBe(200)
        const data = await result.json()

        expect(data).toMatchObject({
          data: {
            category: {
              id: category.id,
              name: category.name,
            },
            ingredients: expect.arrayContaining([
              expect.objectContaining({
                stockStatus: 'OUT_OF_STOCK',
              }),
              expect.objectContaining({
                stockStatus: 'LOW_STOCK',
              }),
              expect.objectContaining({
                stockStatus: 'IN_STOCK',
              }),
            ]),
            summary: {
              totalItems: 3,
              outOfStockCount: 1,
              lowStockCount: 1,
              expiringSoonCount: expect.any(Number),
            },
          },
          meta: {
            timestamp: expect.any(String),
            version: '1.0.0',
          },
        })

        // 在庫ステータス順にソートされている
        expect(data.data.ingredients[0].stockStatus).toBe('OUT_OF_STOCK')
        expect(data.data.ingredients[1].stockStatus).toBe('LOW_STOCK')
        expect(data.data.ingredients[2].stockStatus).toBe('IN_STOCK')
      } catch (error) {
        console.error('Test error:', error)
        throw error
      }
    })

    it('名前順でソートできる', async () => {
      // Given: カテゴリーを作成
      const category = await prisma.category.create({
        data: {
          id: 'cat_' + createId(),
          name: faker.commerce.department() + '_' + faker.string.alphanumeric(8),
          description: faker.lorem.sentence(),
          displayOrder: 1,
          isActive: true,
        },
      })

      // 単位を作成
      const unit = await prisma.unit.create({
        data: {
          id: 'unt_' + createId(),
          name: 'グラム',
          symbol: faker.string.alphanumeric(3),
          type: 'WEIGHT',
          displayOrder: 1,
        },
      })

      // 食材を作成（名前順を明確にするため、特定の名前を使用）
      const names = ['トマト', 'キャベツ', 'レタス']
      for (const name of names) {
        await prisma.ingredient.create({
          data: {
            id: 'ing_' + createId(),
            name,
            unitId: unit.id,
            categoryId: category.id,
            userId,
            quantity: 10,
            purchaseDate: faker.date.recent(),
            bestBeforeDate: faker.date.future(),
            storageLocationType: 'REFRIGERATED',
            updatedAt: new Date(),
          },
        })
      }

      // When: 名前順でソート
      const request = new Request('http://localhost', {
        method: 'GET',
      })

      const result = await apiHandler.handle(
        request,
        { categoryId: category.id, sortBy: 'name' },
        userId
      )

      // Then: 名前順にソートされている
      expect(result.status).toBe(200)
      const data = await result.json()

      const ingredientNames = data.data.ingredients.map((i: any) => i.name)
      expect(ingredientNames).toEqual(['キャベツ', 'トマト', 'レタス'])
    })

    it('他のユーザーの食材は取得されない', async () => {
      // Given: 他のユーザーの食材が存在する
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

      // カテゴリーと単位を作成
      const category = await prisma.category.create({
        data: {
          id: 'cat_' + createId(),
          name: faker.commerce.department() + '_' + faker.string.alphanumeric(8),
          description: faker.lorem.sentence(),
          displayOrder: 1,
          isActive: true,
        },
      })

      const unit = await prisma.unit.create({
        data: {
          id: 'unt_' + createId(),
          name: 'グラム',
          symbol: faker.string.alphanumeric(3),
          type: 'WEIGHT',
          displayOrder: 1,
        },
      })

      // 他のユーザーの食材を作成
      await prisma.ingredient.create({
        data: {
          id: 'ing_' + createId(),
          name: faker.food.ingredient(),
          unitId: unit.id,
          categoryId: category.id,
          userId: otherDomainUser.id,
          quantity: 10,
          purchaseDate: faker.date.recent(),
          bestBeforeDate: faker.date.future(),
          storageLocationType: 'REFRIGERATED',
          updatedAt: new Date(),
        },
      })

      // 自分の食材を作成
      await prisma.ingredient.create({
        data: {
          id: 'ing_' + createId(),
          name: faker.food.ingredient(),
          unitId: unit.id,
          categoryId: category.id,
          userId,
          quantity: 10,
          purchaseDate: faker.date.recent(),
          bestBeforeDate: faker.date.future(),
          storageLocationType: 'REFRIGERATED',
          updatedAt: new Date(),
        },
      })

      // When: カテゴリー別食材を取得
      const request = new Request('http://localhost', {
        method: 'GET',
      })

      const result = await apiHandler.handle(
        request,
        { categoryId: category.id, sortBy: 'name' },
        userId
      )

      // Then: 自分の食材のみ取得される
      expect(result.status).toBe(200)
      const data = await result.json()
      expect(data.data.ingredients).toHaveLength(1)
      expect(data.data.ingredients).toHaveLength(1)

      // クリーンアップ
      await prisma.domainUser.delete({ where: { id: otherDomainUser.id } })
      await prisma.user.delete({ where: { id: otherUser.id } })
    })
  })

  describe('異常系', () => {
    it('存在しないカテゴリーの場合は404エラーを返す', async () => {
      // Given: 存在しないカテゴリーID
      const nonExistentCategoryId = 'cat_' + createId()

      // When: APIハンドラーを通じて取得を試みる
      const request = new Request('http://localhost', {
        method: 'GET',
      })

      const result = await apiHandler.handle(
        request,
        { categoryId: nonExistentCategoryId, sortBy: 'stockStatus' },
        userId
      )

      // Then: 404エラーが返される
      const data = await result.json()
      // デバッグ用ログは削除
      expect(result.status).toBe(404)
      expect(data.message).toContain('カテゴリー not found')
    })

    it('無効なカテゴリーID形式の場合は400エラーを返す', async () => {
      // Given: 無効なカテゴリーID
      const invalidCategoryId = 'invalid-category-id'

      // When: APIハンドラーを通じて取得を試みる
      const request = new Request('http://localhost', {
        method: 'GET',
      })

      const result = await apiHandler.handle(
        request,
        { categoryId: invalidCategoryId, sortBy: 'stockStatus' },
        userId
      )

      // Then: 400エラーが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.message).toBe('Validation failed')
      expect(data.errors).toContainEqual({
        path: ['categoryId'],
        message: 'Invalid category ID format',
      })
    })

    it('無効なソート項目の場合は400エラーを返す', async () => {
      // Given: 有効なカテゴリーと無効なソート項目
      const category = await prisma.category.create({
        data: {
          id: 'cat_' + createId(),
          name: faker.commerce.department() + '_' + faker.string.alphanumeric(8),
          description: faker.lorem.sentence(),
          displayOrder: 1,
          isActive: true,
        },
      })

      // When: 無効なソート項目で取得を試みる
      const request = new Request('http://localhost', {
        method: 'GET',
      })

      const result = await apiHandler.handle(
        request,
        { categoryId: category.id, sortBy: 'invalid' },
        userId
      )

      // Then: 400エラーが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.message).toBe('Validation failed')
      expect(data.errors).toContainEqual({
        path: ['sortBy'],
        message: 'Invalid sort option. Must be one of: stockStatus, name',
      })
    })
  })
})
