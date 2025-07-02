import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GetIngredientCheckStatisticsApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-ingredient-check-statistics.handler'
import { type GetIngredientCheckStatisticsHandler } from '@/modules/ingredients/server/application/queries/get-ingredient-check-statistics.handler'

describe('GetIngredientCheckStatisticsApiHandler', () => {
  let handler: GetIngredientCheckStatisticsApiHandler
  let mockGetIngredientCheckStatisticsHandler: Pick<GetIngredientCheckStatisticsHandler, 'handle'>

  beforeEach(() => {
    // モックハンドラーの作成
    mockGetIngredientCheckStatisticsHandler = {
      handle: vi.fn(),
    }

    // APIハンドラーのインスタンス化
    handler = new GetIngredientCheckStatisticsApiHandler(
      mockGetIngredientCheckStatisticsHandler as GetIngredientCheckStatisticsHandler
    )
  })

  describe('handle', () => {
    describe('正常系', () => {
      it('全食材のチェック統計を取得できる（ingredientId指定なし）', async () => {
        // Given: 複数食材のチェック統計データ
        const userId = faker.string.uuid()
        const mockStatistics = [
          {
            ingredientId: faker.string.uuid(),
            ingredientName: faker.helpers.arrayElement(['トマト', 'きゅうり', 'にんじん']),
            totalCheckCount: faker.number.int({ min: 1, max: 100 }),
            firstCheckedAt: faker.date.past({ years: 1 }).toISOString(),
            lastCheckedAt: faker.date.recent({ days: 7 }).toISOString(),
            monthlyCheckCounts: [
              {
                yearMonth: '2024-01',
                checkCount: faker.number.int({ min: 0, max: 20 }),
              },
              {
                yearMonth: '2024-02',
                checkCount: faker.number.int({ min: 0, max: 20 }),
              },
            ],
            stockStatusBreakdown: {
              inStockChecks: faker.number.int({ min: 0, max: 50 }),
              lowStockChecks: faker.number.int({ min: 0, max: 30 }),
              outOfStockChecks: faker.number.int({ min: 0, max: 20 }),
            },
          },
          {
            ingredientId: faker.string.uuid(),
            ingredientName: faker.helpers.arrayElement(['牛乳', '卵', 'パン']),
            totalCheckCount: faker.number.int({ min: 1, max: 100 }),
            firstCheckedAt: faker.date.past({ years: 1 }).toISOString(),
            lastCheckedAt: faker.date.recent({ days: 7 }).toISOString(),
            monthlyCheckCounts: [
              {
                yearMonth: '2024-01',
                checkCount: faker.number.int({ min: 0, max: 20 }),
              },
              {
                yearMonth: '2024-02',
                checkCount: faker.number.int({ min: 0, max: 20 }),
              },
            ],
            stockStatusBreakdown: {
              inStockChecks: faker.number.int({ min: 0, max: 50 }),
              lowStockChecks: faker.number.int({ min: 0, max: 30 }),
              outOfStockChecks: faker.number.int({ min: 0, max: 20 }),
            },
          },
        ]

        vi.mocked(mockGetIngredientCheckStatisticsHandler.handle).mockResolvedValueOnce(
          mockStatistics
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
          statistics: mockStatistics,
        })

        // ingredientId未指定で呼ばれている
        expect(mockGetIngredientCheckStatisticsHandler.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            ingredientId: undefined,
          })
        )
      })

      it('特定食材のチェック統計を取得できる（ingredientId指定あり）', async () => {
        // Given: 特定食材のチェック統計データ
        const userId = faker.string.uuid()
        const ingredientId = faker.string.uuid()
        const mockStatistics = [
          {
            ingredientId,
            ingredientName: 'トマト',
            totalCheckCount: 25,
            firstCheckedAt: faker.date.past({ years: 1 }).toISOString(),
            lastCheckedAt: faker.date.recent({ days: 7 }).toISOString(),
            monthlyCheckCounts: [
              {
                yearMonth: '2024-01',
                checkCount: 5,
              },
              {
                yearMonth: '2024-02',
                checkCount: 8,
              },
              {
                yearMonth: '2024-03',
                checkCount: 12,
              },
            ],
            stockStatusBreakdown: {
              inStockChecks: 15,
              lowStockChecks: 7,
              outOfStockChecks: 3,
            },
          },
        ]

        vi.mocked(mockGetIngredientCheckStatisticsHandler.handle).mockResolvedValueOnce(
          mockStatistics
        )

        const request = new Request(`http://localhost?ingredientId=${ingredientId}`, {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

        // Then: 200レスポンスが返される
        expect(response.status).toBe(200)
        const responseData = await response.json()
        expect(responseData).toEqual({
          statistics: mockStatistics,
        })

        // 指定されたingredientIdで呼ばれている
        expect(mockGetIngredientCheckStatisticsHandler.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            ingredientId,
          })
        )
      })

      it('統計データが空の場合も正常にレスポンスを返す', async () => {
        // Given: 空の統計データ
        const userId = faker.string.uuid()
        vi.mocked(mockGetIngredientCheckStatisticsHandler.handle).mockResolvedValueOnce([])

        const request = new Request('http://localhost', {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

        // Then: 200レスポンスが返される
        expect(response.status).toBe(200)
        const responseData = await response.json()
        expect(responseData).toEqual({
          statistics: [],
        })
      })
    })

    describe('異常系', () => {
      it('ingredientIdが空文字の場合、undefinedとして処理される', async () => {
        // Given: 空文字のingredientId
        const userId = faker.string.uuid()
        const mockStatistics: any[] = []
        vi.mocked(mockGetIngredientCheckStatisticsHandler.handle).mockResolvedValueOnce(
          mockStatistics
        )

        const request = new Request('http://localhost?ingredientId=', {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

        // Then: 200レスポンスが返される（空文字はundefinedとして処理）
        expect(response.status).toBe(200)
        const responseData = await response.json()
        expect(responseData).toEqual({
          statistics: mockStatistics,
        })

        // ingredientIdがundefinedで呼ばれている
        expect(mockGetIngredientCheckStatisticsHandler.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            ingredientId: undefined,
          })
        )
      })

      it('ingredientIdが不正な形式の場合、バリデーションエラーを返す', async () => {
        // Given: 不正な形式のingredientId
        const userId = faker.string.uuid()
        const request = new Request('http://localhost?ingredientId=invalid-uuid', {
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
            field: 'ingredientId',
            message: expect.stringContaining('must be a valid UUID'),
          })
        )
      })

      it('予期しないエラーの場合、500エラーを返す', async () => {
        // Given: 予期しないエラー
        const userId = faker.string.uuid()
        const error = new Error('Database connection failed')
        vi.mocked(mockGetIngredientCheckStatisticsHandler.handle).mockRejectedValueOnce(error)

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
