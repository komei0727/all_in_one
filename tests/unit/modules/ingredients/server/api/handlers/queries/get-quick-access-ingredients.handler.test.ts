import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GetQuickAccessIngredientsApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-quick-access-ingredients.handler'
import { type GetQuickAccessIngredientsHandler } from '@/modules/ingredients/server/application/queries/get-quick-access-ingredients.handler'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('GetQuickAccessIngredientsApiHandler', () => {
  let handler: GetQuickAccessIngredientsApiHandler
  let mockGetQuickAccessIngredientsHandler: Pick<GetQuickAccessIngredientsHandler, 'handle'>

  beforeEach(() => {
    // モックハンドラーの作成
    mockGetQuickAccessIngredientsHandler = {
      handle: vi.fn(),
    }

    // APIハンドラーのインスタンス化
    handler = new GetQuickAccessIngredientsApiHandler(
      mockGetQuickAccessIngredientsHandler as GetQuickAccessIngredientsHandler
    )
  })

  describe('handle', () => {
    describe('正常系', () => {
      it('デフォルトリミット（10件）でクイックアクセス食材を取得できる', async () => {
        // Given: クイックアクセス食材データ
        const userId = testDataHelpers.userId()
        const mockIngredients = [
          {
            ingredientId: testDataHelpers.ingredientId(),
            ingredientName: faker.helpers.arrayElement(['牛乳', '卵', 'トマト', 'きゅうり']),
            checkCount: faker.number.int({ min: 1, max: 50 }),
            lastCheckedAt: faker.date.recent({ days: 7 }).toISOString(),
            currentStockStatus: faker.helpers.arrayElement([
              'IN_STOCK',
              'LOW_STOCK',
              'OUT_OF_STOCK',
            ]),
            currentExpiryStatus: faker.helpers.arrayElement(['FRESH', 'EXPIRING_SOON', 'EXPIRED']),
          },
          {
            ingredientId: testDataHelpers.ingredientId(),
            ingredientName: faker.helpers.arrayElement(['にんじん', '玉ねぎ', 'じゃがいも']),
            checkCount: faker.number.int({ min: 1, max: 50 }),
            lastCheckedAt: faker.date.recent({ days: 7 }).toISOString(),
            currentStockStatus: faker.helpers.arrayElement([
              'IN_STOCK',
              'LOW_STOCK',
              'OUT_OF_STOCK',
            ]),
            currentExpiryStatus: faker.helpers.arrayElement(['FRESH', 'EXPIRING_SOON', 'EXPIRED']),
          },
        ]

        vi.mocked(mockGetQuickAccessIngredientsHandler.handle).mockResolvedValueOnce(
          mockIngredients
        )

        const request = new Request('http://localhost', {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

        // Then: 200レスポンスが返される
        expect(response.status).toBe(200)
        const responseData = await response.json()
        expect(responseData).toEqual({
          ingredients: mockIngredients,
        })

        // デフォルトリミットで呼ばれている
        expect(mockGetQuickAccessIngredientsHandler.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            limit: 10,
          })
        )
      })

      it('カスタムリミットを指定してクイックアクセス食材を取得できる', async () => {
        // Given: カスタムリミットのリクエスト
        const userId = testDataHelpers.userId()
        const limit = 20
        const mockIngredients = Array.from({ length: limit }, () => ({
          ingredientId: testDataHelpers.ingredientId(),
          ingredientName: faker.helpers.arrayElement([
            '牛乳',
            '卵',
            'トマト',
            'きゅうり',
            'にんじん',
          ]),
          checkCount: faker.number.int({ min: 1, max: 50 }),
          lastCheckedAt: faker.date.recent({ days: 7 }).toISOString(),
          currentStockStatus: faker.helpers.arrayElement(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']),
          currentExpiryStatus: faker.helpers.arrayElement(['FRESH', 'EXPIRING_SOON', 'EXPIRED']),
        }))

        vi.mocked(mockGetQuickAccessIngredientsHandler.handle).mockResolvedValueOnce(
          mockIngredients
        )

        const request = new Request(`http://localhost?limit=${limit}`, {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

        // Then: 200レスポンスが返される
        expect(response.status).toBe(200)
        const responseData = await response.json()
        expect(responseData.ingredients).toHaveLength(limit)

        // 指定リミットで呼ばれている
        expect(mockGetQuickAccessIngredientsHandler.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            limit,
          })
        )
      })

      it('空の結果が返された場合も正常にレスポンスを返す', async () => {
        // Given: 空の結果
        const userId = testDataHelpers.userId()
        vi.mocked(mockGetQuickAccessIngredientsHandler.handle).mockResolvedValueOnce([])

        const request = new Request('http://localhost', {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

        // Then: 200レスポンスが返される
        expect(response.status).toBe(200)
        const responseData = await response.json()
        expect(responseData).toEqual({
          ingredients: [],
        })
      })
    })

    describe('異常系', () => {
      it('limitが不正な形式の場合、バリデーションエラーを返す', async () => {
        // Given: 不正なリミットパラメータ
        const userId = testDataHelpers.userId()
        const request = new Request('http://localhost?limit=invalid', {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

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

      it('limitが範囲外（0以下）の場合、バリデーションエラーを返す', async () => {
        // Given: 範囲外のリミットパラメータ
        const userId = testDataHelpers.userId()
        const request = new Request('http://localhost?limit=0', {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

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

      it('limitが範囲外（100超）の場合、バリデーションエラーを返す', async () => {
        // Given: 範囲外のリミットパラメータ
        const userId = testDataHelpers.userId()
        const request = new Request('http://localhost?limit=101', {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

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

      it('予期しないエラーの場合、500エラーを返す', async () => {
        // Given: 予期しないエラー
        const userId = testDataHelpers.userId()
        const error = new Error('Database connection failed')
        vi.mocked(mockGetQuickAccessIngredientsHandler.handle).mockRejectedValueOnce(error)

        const request = new Request('http://localhost', {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

        // Then: 500エラーが返される
        expect(response.status).toBe(500)
        const responseData = await response.json()
        expect(responseData.message).toBe('Internal server error')
      })
    })
  })
})
