import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/statistics/route'
import { auth } from '@/auth'
import type { ShoppingStatistics } from '@/modules/ingredients/server/application/query-services/shopping-query-service.interface'

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
const mockGetShoppingStatisticsApiHandler = {
  handle: vi.fn(),
}

vi.mock('@/modules/ingredients/server/infrastructure/composition-root', () => ({
  CompositionRoot: {
    getInstance: vi.fn(() => ({
      getGetShoppingStatisticsApiHandler: vi.fn(() => mockGetShoppingStatisticsApiHandler),
    })),
  },
}))

// authのモック
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

describe('GET /api/v1/shopping-sessions/statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('買い物統計を正常に取得できる（デフォルト期間）', async () => {
      // Given: 統計データのモック
      const userId = faker.string.uuid()
      const mockStatistics: ShoppingStatistics = {
        totalSessions: 25,
        totalCheckedIngredients: 157,
        averageSessionDurationMinutes: 22.5,
        topCheckedIngredients: [
          {
            ingredientId: faker.string.uuid(),
            ingredientName: '玉ねぎ',
            checkCount: 15,
            checkRatePercentage: 60,
          },
          {
            ingredientId: faker.string.uuid(),
            ingredientName: 'にんじん',
            checkCount: 12,
            checkRatePercentage: 48,
          },
        ],
        monthlySessionCounts: [
          { yearMonth: '2025-06', sessionCount: 12 },
          { yearMonth: '2025-07', sessionCount: 13 },
        ],
      }

      // authのモック設定
      ;(auth as any).mockResolvedValue({
        user: { domainUserId: userId },
      })

      // APIハンドラーのモック設定
      mockGetShoppingStatisticsApiHandler.handle.mockResolvedValue(
        new Response(
          JSON.stringify({
            statistics: mockStatistics,
          }),
          { status: 200 }
        )
      )

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/statistics',
        {
          method: 'GET',
        }
      )

      // When: 統計取得APIを実行
      const response = await GET(request as any)

      // Then: 正常なレスポンスが返される
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toEqual({
        statistics: {
          totalSessions: 25,
          totalCheckedIngredients: 157,
          averageSessionDurationMinutes: 22.5,
          topCheckedIngredients: [
            {
              ingredientId: mockStatistics.topCheckedIngredients[0].ingredientId,
              ingredientName: '玉ねぎ',
              checkCount: 15,
              checkRatePercentage: 60,
            },
            {
              ingredientId: mockStatistics.topCheckedIngredients[1].ingredientId,
              ingredientName: 'にんじん',
              checkCount: 12,
              checkRatePercentage: 48,
            },
          ],
          monthlySessionCounts: [
            { yearMonth: '2025-06', sessionCount: 12 },
            { yearMonth: '2025-07', sessionCount: 13 },
          ],
        },
      })

      // APIハンドラーが正しく呼び出される
      expect(mockGetShoppingStatisticsApiHandler.handle).toHaveBeenCalledWith(
        expect.anything(),
        userId
      )
    })

    it('カスタム期間で統計を取得できる', async () => {
      // Given: カスタム期間を指定
      const userId = faker.string.uuid()
      const periodDays = 90
      const mockStatistics: ShoppingStatistics = {
        totalSessions: 45,
        totalCheckedIngredients: 280,
        averageSessionDurationMinutes: 25.8,
        topCheckedIngredients: [],
        monthlySessionCounts: [],
      }

      // authのモック設定
      ;(auth as any).mockResolvedValue({
        user: { domainUserId: userId },
      })

      // APIハンドラーのモック設定
      mockGetShoppingStatisticsApiHandler.handle.mockResolvedValue(
        new Response(
          JSON.stringify({
            statistics: mockStatistics,
          }),
          { status: 200 }
        )
      )

      const request = new MockNextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/statistics?periodDays=${periodDays}`,
        {
          method: 'GET',
        }
      )

      // When: 統計取得APIを実行
      const response = await GET(request as any)

      // Then: 指定期間で呼び出される
      expect(response.status).toBe(200)
      expect(mockGetShoppingStatisticsApiHandler.handle).toHaveBeenCalledWith(
        expect.anything(),
        userId
      )

      const responseData = await response.json()
      expect(responseData.statistics.totalSessions).toBe(45)
    })

    it('統計が0件の場合でも正常なレスポンスを返す', async () => {
      // Given: 空の統計
      const userId = faker.string.uuid()
      const mockStatistics: ShoppingStatistics = {
        totalSessions: 0,
        totalCheckedIngredients: 0,
        averageSessionDurationMinutes: 0,
        topCheckedIngredients: [],
        monthlySessionCounts: [],
      }

      // authのモック設定
      ;(auth as any).mockResolvedValue({
        user: { domainUserId: userId },
      })

      // APIハンドラーのモック設定
      mockGetShoppingStatisticsApiHandler.handle.mockResolvedValue(
        new Response(
          JSON.stringify({
            statistics: mockStatistics,
          }),
          { status: 200 }
        )
      )

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/statistics',
        {
          method: 'GET',
        }
      )

      // When: 統計取得APIを実行
      const response = await GET(request as any)

      // Then: 0値で正常レスポンス
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.statistics.totalSessions).toBe(0)
      expect(responseData.statistics.topCheckedIngredients).toEqual([])
    })
  })

  describe('異常系', () => {
    it('User-IDヘッダーが存在しない場合は401エラーを返す', async () => {
      // Given: authが認証なしを返す
      ;(auth as any).mockResolvedValue(null)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/statistics',
        {
          method: 'GET',
        }
      )

      // When: 統計取得APIを実行
      const response = await GET(request as any)

      // Then: 401エラーが返される
      expect(response.status).toBe(401)

      const responseData = await response.json()
      expect(responseData).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      })
    })

    it('periodDaysパラメータが無効な場合は400エラーを返す', async () => {
      // Given: 無効なperiodDaysパラメータ
      const userId = faker.string.uuid()

      // authのモック設定
      ;(auth as any).mockResolvedValue({
        user: { domainUserId: userId },
      })

      // APIハンドラーのモック設定（バリデーションエラー）
      mockGetShoppingStatisticsApiHandler.handle.mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'Validation failed',
            errors: [
              {
                field: 'periodDays',
                message: 'periodDays must be a valid integer',
              },
            ],
          }),
          { status: 400 }
        )
      )

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/statistics?periodDays=invalid',
        {
          method: 'GET',
        }
      )

      // When: 統計取得APIを実行
      const response = await GET(request as any)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.code).toBe('VALIDATION_ERROR')
      expect(responseData.errors).toBeDefined()
    })

    it('periodDaysパラメータが範囲外の場合は400エラーを返す', async () => {
      // Given: 範囲外のperiodDaysパラメータ（上限超過）
      const userId = faker.string.uuid()

      // authのモック設定
      ;(auth as any).mockResolvedValue({
        user: { domainUserId: userId },
      })

      // APIハンドラーのモック設定（バリデーションエラー）
      mockGetShoppingStatisticsApiHandler.handle.mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'Validation failed',
            errors: [
              {
                field: 'periodDays',
                message: 'periodDays must be between 1 and 365',
              },
            ],
          }),
          { status: 400 }
        )
      )

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/statistics?periodDays=366',
        {
          method: 'GET',
        }
      )

      // When: 統計取得APIを実行
      const response = await GET(request as any)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.code).toBe('VALIDATION_ERROR')
      expect(responseData.message).toContain('Validation')
    })

    it('periodDaysパラメータが下限を下回る場合は400エラーを返す', async () => {
      // Given: 範囲外のperiodDaysパラメータ（下限未満）
      const userId = faker.string.uuid()

      // authのモック設定
      ;(auth as any).mockResolvedValue({
        user: { domainUserId: userId },
      })

      // APIハンドラーのモック設定（バリデーションエラー）
      mockGetShoppingStatisticsApiHandler.handle.mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'Validation failed',
            errors: [
              {
                field: 'periodDays',
                message: 'periodDays must be between 1 and 365',
              },
            ],
          }),
          { status: 400 }
        )
      )

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/statistics?periodDays=0',
        {
          method: 'GET',
        }
      )

      // When: 統計取得APIを実行
      const response = await GET(request as any)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.code).toBe('VALIDATION_ERROR')
    })

    it('サービスでエラーが発生した場合は500エラーを返す', async () => {
      // Given: サービスエラー
      const userId = faker.string.uuid()
      const serviceError = new Error('Database query failed')

      // authのモック設定
      ;(auth as any).mockResolvedValue({
        user: { domainUserId: userId },
      })

      // APIハンドラーのモック設定（エラーを発生させる）
      mockGetShoppingStatisticsApiHandler.handle.mockRejectedValue(serviceError)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/statistics',
        {
          method: 'GET',
        }
      )

      // When: 統計取得APIを実行
      const response = await GET(request as any)

      // Then: 500エラーが返される
      expect(response.status).toBe(500)

      const responseData = await response.json()
      expect(responseData).toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      })
    })
  })

  describe('型安全性', () => {
    it('レスポンスデータの型が正しい', async () => {
      // Given: 型安全なモックデータ
      const userId = faker.string.uuid()
      const mockStatistics: ShoppingStatistics = {
        totalSessions: 10,
        totalCheckedIngredients: 50,
        averageSessionDurationMinutes: 15.5,
        topCheckedIngredients: [
          {
            ingredientId: faker.string.uuid(),
            ingredientName: 'テスト食材',
            checkCount: 5,
            checkRatePercentage: 50,
          },
        ],
        monthlySessionCounts: [{ yearMonth: '2025-07', sessionCount: 10 }],
      }

      // authのモック設定
      ;(auth as any).mockResolvedValue({
        user: { domainUserId: userId },
      })

      // APIハンドラーのモック設定
      mockGetShoppingStatisticsApiHandler.handle.mockResolvedValue(
        new Response(
          JSON.stringify({
            statistics: mockStatistics,
          }),
          { status: 200 }
        )
      )

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/statistics',
        {
          method: 'GET',
        }
      )

      // When: 統計取得APIを実行
      const response = await GET(request as any)

      // Then: 正しい型でレスポンスが返される
      const responseData = await response.json()
      expect(typeof responseData.statistics.totalSessions).toBe('number')
      expect(typeof responseData.statistics.totalCheckedIngredients).toBe('number')
      expect(typeof responseData.statistics.averageSessionDurationMinutes).toBe('number')
      expect(Array.isArray(responseData.statistics.topCheckedIngredients)).toBe(true)
      expect(Array.isArray(responseData.statistics.monthlySessionCounts)).toBe(true)

      // 配列要素の型もチェック
      if (responseData.statistics.topCheckedIngredients.length > 0) {
        const topIngredient = responseData.statistics.topCheckedIngredients[0]
        expect(typeof topIngredient.ingredientId).toBe('string')
        expect(typeof topIngredient.ingredientName).toBe('string')
        expect(typeof topIngredient.checkCount).toBe('number')
        expect(typeof topIngredient.checkRatePercentage).toBe('number')
      }
    })
  })
})
