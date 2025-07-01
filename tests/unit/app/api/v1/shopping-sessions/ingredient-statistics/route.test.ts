import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/ingredient-statistics/route'
import type { IngredientCheckStatistics } from '@/modules/ingredients/server/application/query-services/shopping-query-service.interface'

// NextRequestのモック
class MockNextRequest {
  public method: string
  public headers: Headers
  public url: string

  constructor(url: string, init?: RequestInit) {
    this.url = url
    this.method = init?.method || 'GET'
    this.headers = new Headers(init?.headers)
  }

  json() {
    return Promise.resolve({})
  }
}

// CompositionRootのモック
const mockGetIngredientCheckStatisticsHandler = {
  handle: vi.fn(),
}

vi.mock('@/modules/ingredients/server/infrastructure/composition-root', () => ({
  CompositionRoot: {
    getInstance: vi.fn(() => ({
      getGetIngredientCheckStatisticsHandler: vi.fn(() => mockGetIngredientCheckStatisticsHandler),
    })),
  },
}))

describe('GET /api/v1/shopping-sessions/ingredient-statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('全食材のチェック統計を正常に取得できる', async () => {
      // Given: 食材チェック統計のモックデータ
      const userId = faker.string.uuid()
      const mockStatistics: IngredientCheckStatistics[] = [
        {
          ingredientId: faker.string.uuid(),
          ingredientName: 'トマト',
          totalCheckCount: 25,
          firstCheckedAt: faker.date.past().toISOString(),
          lastCheckedAt: faker.date.recent().toISOString(),
          monthlyCheckCounts: [
            { yearMonth: '2025-06', checkCount: 12 },
            { yearMonth: '2025-07', checkCount: 13 },
          ],
          stockStatusBreakdown: {
            inStockChecks: 15,
            lowStockChecks: 8,
            outOfStockChecks: 2,
          },
        },
        {
          ingredientId: faker.string.uuid(),
          ingredientName: 'きゅうり',
          totalCheckCount: 18,
          firstCheckedAt: faker.date.past().toISOString(),
          lastCheckedAt: faker.date.recent().toISOString(),
          monthlyCheckCounts: [
            { yearMonth: '2025-06', checkCount: 8 },
            { yearMonth: '2025-07', checkCount: 10 },
          ],
          stockStatusBreakdown: {
            inStockChecks: 12,
            lowStockChecks: 4,
            outOfStockChecks: 2,
          },
        },
      ]

      mockGetIngredientCheckStatisticsHandler.handle.mockResolvedValue(mockStatistics)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/ingredient-statistics',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: 食材チェック統計取得APIを実行
      const response = await GET(request)

      // Then: 正常なレスポンスが返される
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toEqual({
        success: true,
        data: {
          statistics: [
            {
              ingredientId: mockStatistics[0].ingredientId,
              ingredientName: 'トマト',
              totalCheckCount: 25,
              firstCheckedAt: mockStatistics[0].firstCheckedAt,
              lastCheckedAt: mockStatistics[0].lastCheckedAt,
              monthlyCheckCounts: [
                { yearMonth: '2025-06', checkCount: 12 },
                { yearMonth: '2025-07', checkCount: 13 },
              ],
              stockStatusBreakdown: {
                inStockChecks: 15,
                lowStockChecks: 8,
                outOfStockChecks: 2,
              },
            },
            {
              ingredientId: mockStatistics[1].ingredientId,
              ingredientName: 'きゅうり',
              totalCheckCount: 18,
              firstCheckedAt: mockStatistics[1].firstCheckedAt,
              lastCheckedAt: mockStatistics[1].lastCheckedAt,
              monthlyCheckCounts: [
                { yearMonth: '2025-06', checkCount: 8 },
                { yearMonth: '2025-07', checkCount: 10 },
              ],
              stockStatusBreakdown: {
                inStockChecks: 12,
                lowStockChecks: 4,
                outOfStockChecks: 2,
              },
            },
          ],
        },
      })

      // 全食材（ingredientIdなし）で呼び出される
      expect(mockGetIngredientCheckStatisticsHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          ingredientId: undefined,
        })
      )
    })

    it('特定食材のチェック統計を正常に取得できる', async () => {
      // Given: 特定食材ID
      const userId = faker.string.uuid()
      const ingredientId = faker.string.uuid()
      const mockStatistics: IngredientCheckStatistics[] = [
        {
          ingredientId: ingredientId,
          ingredientName: '玉ねぎ',
          totalCheckCount: 15,
          firstCheckedAt: faker.date.past().toISOString(),
          lastCheckedAt: faker.date.recent().toISOString(),
          monthlyCheckCounts: [{ yearMonth: '2025-07', checkCount: 15 }],
          stockStatusBreakdown: {
            inStockChecks: 10,
            lowStockChecks: 3,
            outOfStockChecks: 2,
          },
        },
      ]

      mockGetIngredientCheckStatisticsHandler.handle.mockResolvedValue(mockStatistics)

      const request = new MockNextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/ingredient-statistics?ingredientId=${ingredientId}`,
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: 食材チェック統計取得APIを実行
      const response = await GET(request)

      // Then: 特定食材IDで呼び出される
      expect(response.status).toBe(200)
      expect(mockGetIngredientCheckStatisticsHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          ingredientId,
        })
      )

      const responseData = await response.json()
      expect(responseData.data.statistics).toHaveLength(1)
      expect(responseData.data.statistics[0].ingredientName).toBe('玉ねぎ')
    })

    it('統計が0件の場合でも正常なレスポンスを返す', async () => {
      // Given: 空の統計
      const userId = faker.string.uuid()
      const mockStatistics: IngredientCheckStatistics[] = []

      mockGetIngredientCheckStatisticsHandler.handle.mockResolvedValue(mockStatistics)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/ingredient-statistics',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: 食材チェック統計取得APIを実行
      const response = await GET(request)

      // Then: 空の配列で正常レスポンス
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data.statistics).toEqual([])
    })

    it('月別チェック数と在庫状態別チェック数が正しく取得できる', async () => {
      // Given: 詳細な統計データ
      const userId = faker.string.uuid()
      const mockStatistics: IngredientCheckStatistics[] = [
        {
          ingredientId: faker.string.uuid(),
          ingredientName: 'にんじん',
          totalCheckCount: 30,
          firstCheckedAt: '2025-01-01T00:00:00.000Z',
          lastCheckedAt: '2025-07-01T00:00:00.000Z',
          monthlyCheckCounts: [
            { yearMonth: '2025-01', checkCount: 5 },
            { yearMonth: '2025-02', checkCount: 8 },
            { yearMonth: '2025-03', checkCount: 7 },
            { yearMonth: '2025-04', checkCount: 4 },
            { yearMonth: '2025-05', checkCount: 3 },
            { yearMonth: '2025-06', checkCount: 2 },
            { yearMonth: '2025-07', checkCount: 1 },
          ],
          stockStatusBreakdown: {
            inStockChecks: 20,
            lowStockChecks: 7,
            outOfStockChecks: 3,
          },
        },
      ]

      mockGetIngredientCheckStatisticsHandler.handle.mockResolvedValue(mockStatistics)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/ingredient-statistics',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: 食材チェック統計取得APIを実行
      const response = await GET(request)

      // Then: 詳細な統計が正しく返される
      const responseData = await response.json()
      const statistic = responseData.data.statistics[0]

      expect(statistic.totalCheckCount).toBe(30)
      expect(statistic.monthlyCheckCounts).toHaveLength(7)
      expect(statistic.monthlyCheckCounts[0]).toEqual({ yearMonth: '2025-01', checkCount: 5 })
      expect(statistic.stockStatusBreakdown.inStockChecks).toBe(20)
      expect(statistic.stockStatusBreakdown.lowStockChecks).toBe(7)
      expect(statistic.stockStatusBreakdown.outOfStockChecks).toBe(3)
    })
  })

  describe('異常系', () => {
    it('User-IDヘッダーが存在しない場合は401エラーを返す', async () => {
      // Given: User-IDヘッダーなしのリクエスト
      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/ingredient-statistics',
        {
          method: 'GET',
        }
      ) as any

      // When: 食材チェック統計取得APIを実行
      const response = await GET(request)

      // Then: 401エラーが返される
      expect(response.status).toBe(401)

      const responseData = await response.json()
      expect(responseData).toEqual({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'ユーザー認証が必要です',
        },
      })
    })

    it('ingredientIdパラメータが無効な形式の場合は400エラーを返す', async () => {
      // Given: 無効なingredientIdパラメータ
      const userId = faker.string.uuid()
      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/ingredient-statistics?ingredientId=invalid-format',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: 食材チェック統計取得APIを実行
      const response = await GET(request)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
      expect(responseData.error.message).toContain('ingredientId')
    })

    it('空のingredientIdパラメータの場合は400エラーを返す', async () => {
      // Given: 空のingredientIdパラメータ
      const userId = faker.string.uuid()
      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/ingredient-statistics?ingredientId=',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: 食材チェック統計取得APIを実行
      const response = await GET(request)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
    })

    it('サービスでエラーが発生した場合は500エラーを返す', async () => {
      // Given: サービスエラー
      const userId = faker.string.uuid()
      const serviceError = new Error('Database query failed')
      mockGetIngredientCheckStatisticsHandler.handle.mockRejectedValue(serviceError)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/ingredient-statistics',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: 食材チェック統計取得APIを実行
      const response = await GET(request)

      // Then: 500エラーが返される
      expect(response.status).toBe(500)

      const responseData = await response.json()
      expect(responseData).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'サーバー内部エラーが発生しました',
        },
      })
    })
  })

  describe('型安全性', () => {
    it('レスポンスデータの型が正しい', async () => {
      // Given: 型安全なモックデータ
      const userId = faker.string.uuid()
      const mockStatistics: IngredientCheckStatistics[] = [
        {
          ingredientId: faker.string.uuid(),
          ingredientName: 'テスト食材',
          totalCheckCount: 10,
          firstCheckedAt: faker.date.past().toISOString(),
          lastCheckedAt: faker.date.recent().toISOString(),
          monthlyCheckCounts: [{ yearMonth: '2025-07', checkCount: 10 }],
          stockStatusBreakdown: {
            inStockChecks: 7,
            lowStockChecks: 2,
            outOfStockChecks: 1,
          },
        },
      ]

      mockGetIngredientCheckStatisticsHandler.handle.mockResolvedValue(mockStatistics)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/ingredient-statistics',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: 食材チェック統計取得APIを実行
      const response = await GET(request)

      // Then: 正しい型でレスポンスが返される
      const responseData = await response.json()
      expect(typeof responseData.success).toBe('boolean')
      expect(Array.isArray(responseData.data.statistics)).toBe(true)

      if (responseData.data.statistics.length > 0) {
        const statistic = responseData.data.statistics[0]
        expect(typeof statistic.ingredientId).toBe('string')
        expect(typeof statistic.ingredientName).toBe('string')
        expect(typeof statistic.totalCheckCount).toBe('number')
        expect(typeof statistic.firstCheckedAt).toBe('string')
        expect(typeof statistic.lastCheckedAt).toBe('string')
        expect(Array.isArray(statistic.monthlyCheckCounts)).toBe(true)
        expect(typeof statistic.stockStatusBreakdown).toBe('object')

        // 月別チェック数の型チェック
        if (statistic.monthlyCheckCounts.length > 0) {
          const monthlyCount = statistic.monthlyCheckCounts[0]
          expect(typeof monthlyCount.yearMonth).toBe('string')
          expect(typeof monthlyCount.checkCount).toBe('number')
        }

        // 在庫状態別チェック数の型チェック
        const breakdown = statistic.stockStatusBreakdown
        expect(typeof breakdown.inStockChecks).toBe('number')
        expect(typeof breakdown.lowStockChecks).toBe('number')
        expect(typeof breakdown.outOfStockChecks).toBe('number')
      }
    })
  })
})
