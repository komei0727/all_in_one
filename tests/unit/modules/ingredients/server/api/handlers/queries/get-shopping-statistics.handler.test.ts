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
        const data = {}
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
              lastCheckedAt: testDataHelpers.pastDate().toISOString(),
            },
            {
              ingredientId: testDataHelpers.ingredientId(),
              ingredientName: '卵',
              checkCount: 8,
              checkRatePercentage: 19.0,
              lastCheckedAt: testDataHelpers.pastDate().toISOString(),
            },
          ],
          monthlySessionCounts: [
            { yearMonth: '2024-01', sessionCount: 3 },
            { yearMonth: '2024-02', sessionCount: 2 },
          ],
        }

        vi.mocked(mockGetShoppingStatisticsHandler.handle).mockResolvedValueOnce(mockStatistics)

        // When: ハンドラーを実行
        const result = await handler.handle(data, userId)

        // Then: 統計データが返される
        expect(result).toEqual({
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
        // Given: カスタム期間のデータ
        const userId = testDataHelpers.userId()
        const periodDays = 90
        const data = { periodDays }
        const mockStatistics = {
          totalSessions: 15,
          totalCheckedIngredients: 120,
          averageSessionDurationMinutes: 30.2,
          topCheckedIngredients: [],
          monthlySessionCounts: [],
        }

        vi.mocked(mockGetShoppingStatisticsHandler.handle).mockResolvedValueOnce(mockStatistics)

        // When: ハンドラーを実行
        const result = await handler.handle(data, userId)

        // Then: 統計データが返される
        expect(result).toEqual({
          statistics: mockStatistics,
        })

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
      it('periodDaysが不正な形式の場合、バリデーションエラーを投げる', async () => {
        // Given: 不正な期間パラメータ
        const userId = testDataHelpers.userId()
        const data = { periodDays: 'invalid' }

        // When & Then: バリデーションエラーが投げられる
        await expect(handler.handle(data, userId)).rejects.toThrow(
          'periodDaysは有効な整数である必要があります'
        )
      })

      it('periodDaysが範囲外の場合、バリデーションエラーを投げる', async () => {
        // Given: 範囲外の期間パラメータ
        const userId = testDataHelpers.userId()
        const data = { periodDays: 400 }

        // When & Then: バリデーションエラーが投げられる
        await expect(handler.handle(data, userId)).rejects.toThrow(
          'periodDaysは1以上365以下である必要があります'
        )
      })

      it('予期しないエラーの場合、エラーを再投げする', async () => {
        // Given: 予期しないエラー
        const userId = testDataHelpers.userId()
        const data = {}
        const error = new Error('Database connection failed')
        vi.mocked(mockGetShoppingStatisticsHandler.handle).mockRejectedValueOnce(error)

        // When & Then: エラーが再投げされる
        await expect(handler.handle(data, userId)).rejects.toThrow('An unexpected error occurred')
      })
    })
  })
})
