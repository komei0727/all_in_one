import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GetShoppingStatisticsApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-shopping-statistics.handler'
import { type GetShoppingStatisticsHandler } from '@/modules/ingredients/server/application/queries/get-shopping-statistics.handler'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

describe('GetShoppingStatisticsApiHandler', () => {
  let handler: GetShoppingStatisticsApiHandler
  let mockGetShoppingStatisticsHandler: Pick<GetShoppingStatisticsHandler, 'handle'>

  beforeEach(() => {
    // モックハンドラーの作成
    mockGetShoppingStatisticsHandler = {
      handle: vi.fn(),
    }

    // APIハンドラーのインスタンス化
    handler = new GetShoppingStatisticsApiHandler(
      mockGetShoppingStatisticsHandler as GetShoppingStatisticsHandler
    )
  })

  describe('handle', () => {
    describe('正常系', () => {
      it('デフォルト期間（30日）で統計情報を取得できる', async () => {
        // Given: 統計データ
        const userId = testDataHelpers.userId()
        const mockStatistics = {
          totalSessions: 5,
          totalCheckedIngredients: 42,
          averageSessionDurationMinutes: 25.5,
          topCheckedIngredients: [
            {
              ingredientId: testDataHelpers.ingredientId(),
              ingredientName: '牛乳',
              checkCount: 10,
              checkRatePercentage: 23.8,
            },
            {
              ingredientId: testDataHelpers.ingredientId(),
              ingredientName: '卵',
              checkCount: 8,
              checkRatePercentage: 19.0,
            },
          ],
          monthlySessionCounts: [
            { yearMonth: '2024-01', sessionCount: 3 },
            { yearMonth: '2024-02', sessionCount: 2 },
          ],
        }

        vi.mocked(mockGetShoppingStatisticsHandler.handle).mockResolvedValueOnce(mockStatistics)

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

        // デフォルト期間で呼ばれている
        expect(mockGetShoppingStatisticsHandler.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            periodDays: 30,
          })
        )
      })

      it('カスタム期間を指定して統計情報を取得できる', async () => {
        // Given: カスタム期間のリクエスト
        const userId = testDataHelpers.userId()
        const periodDays = 90
        const mockStatistics = {
          totalSessions: 15,
          totalCheckedIngredients: 120,
          averageSessionDurationMinutes: 30.2,
          topCheckedIngredients: [],
          monthlySessionCounts: [],
        }

        vi.mocked(mockGetShoppingStatisticsHandler.handle).mockResolvedValueOnce(mockStatistics)

        const request = new Request(`http://localhost?periodDays=${periodDays}`, {
          method: 'GET',
        })

        // When: ハンドラーを実行
        const response = await handler.handle(request, userId)

        // Then: 200レスポンスが返される
        expect(response.status).toBe(200)
        const responseData = await response.json()
        expect(responseData.statistics).toEqual(mockStatistics)

        // 指定期間で呼ばれている
        expect(mockGetShoppingStatisticsHandler.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            userId,
            periodDays,
          })
        )
      })
    })

    describe('異常系', () => {
      it('periodDaysが不正な形式の場合、バリデーションエラーを返す', async () => {
        // Given: 不正な期間パラメータ
        const userId = testDataHelpers.userId()
        const request = new Request('http://localhost?periodDays=invalid', {
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
            field: 'periodDays',
            message: 'periodDays must be a valid integer',
          })
        )
      })

      it('periodDaysが範囲外の場合、バリデーションエラーを返す', async () => {
        // Given: 範囲外の期間パラメータ
        const userId = testDataHelpers.userId()
        const request = new Request('http://localhost?periodDays=400', {
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
            field: 'periodDays',
            message: 'periodDays must be between 1 and 365',
          })
        )
      })

      it('予期しないエラーの場合、500エラーを返す', async () => {
        // Given: 予期しないエラー
        const userId = testDataHelpers.userId()
        const error = new Error('Database connection failed')
        vi.mocked(mockGetShoppingStatisticsHandler.handle).mockRejectedValueOnce(error)

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
