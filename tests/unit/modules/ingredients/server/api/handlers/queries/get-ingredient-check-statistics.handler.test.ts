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

        // When: ハンドラーを実行（ingredientId未指定）
        const response = await handler.handle({}, userId)

        // Then: 統計データが返される
        expect(response).toEqual({
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

        // When: ハンドラーを実行（ingredientId指定）
        const response = await handler.handle({ ingredientId }, userId)

        // Then: 統計データが返される
        expect(response).toEqual({
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

        // When: ハンドラーを実行（空のデータ）
        const response = await handler.handle({}, userId)

        // Then: 空の統計データが返される
        expect(response).toEqual({
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

        // When: ハンドラーを実行（空文字のingredientId）
        const response = await handler.handle({ ingredientId: '' }, userId)

        // Then: 統計データが返される（空文字はundefinedとして処理）
        expect(response).toEqual({
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
        // When & Then: バリデーションエラーが発生する
        await expect(handler.handle({ ingredientId: 'invalid-uuid' }, userId)).rejects.toThrow(
          'ingredientIdは有効なUUIDまたはプレフィックス付きIDである必要があります'
        )
      })

      it('予期しないエラーの場合、500エラーを返す', async () => {
        // Given: 予期しないエラー
        const userId = faker.string.uuid()
        const error = new Error('Database connection failed')
        vi.mocked(mockGetIngredientCheckStatisticsHandler.handle).mockRejectedValueOnce(error)

        // When & Then: APIエラーが発生する
        await expect(handler.handle({}, userId)).rejects.toThrow('An unexpected error occurred')
      })
    })
  })
})
