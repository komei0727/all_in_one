import { faker } from '@faker-js/faker/locale/ja'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/ingredient-check-statistics/route'
import { auth } from '@/auth'
import type { IngredientCheckStatistics } from '@/modules/ingredients/server/application/query-services/shopping-query-service.interface'

// auth関数のモック
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

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

// APIハンドラーのモック
const mockApiHandler = {
  handle: vi.fn(),
}

// CompositionRootのモック
vi.mock('@/modules/ingredients/server/infrastructure/composition-root', () => ({
  CompositionRoot: {
    getInstance: vi.fn(() => ({
      getGetIngredientCheckStatisticsApiHandler: vi.fn(() => mockApiHandler),
    })),
  },
}))

describe('GET /api/v1/shopping-sessions/ingredient-check-statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('全食材のチェック統計を取得できる（ingredientId指定なし）', async () => {
      // Given: 認証済みユーザーと食材チェック統計のモックデータ
      const userId = faker.string.uuid()
      vi.mocked(auth).mockResolvedValue({
        user: {
          domainUserId: userId,
        },
      } as any)

      const mockStatistics: IngredientCheckStatistics[] = [
        {
          ingredientId: faker.string.uuid(),
          ingredientName: 'トマト',
          totalCheckCount: 15,
          firstCheckedAt: faker.date.past({ years: 1 }).toISOString(),
          lastCheckedAt: faker.date.recent({ days: 7 }).toISOString(),
          monthlyCheckCounts: [
            { yearMonth: '2024-01', checkCount: 5 },
            { yearMonth: '2024-02', checkCount: 10 },
          ],
          stockStatusBreakdown: {
            inStockChecks: 8,
            lowStockChecks: 5,
            outOfStockChecks: 2,
          },
        },
        {
          ingredientId: faker.string.uuid(),
          ingredientName: 'きゅうり',
          totalCheckCount: 10,
          firstCheckedAt: faker.date.past({ years: 1 }).toISOString(),
          lastCheckedAt: faker.date.recent({ days: 7 }).toISOString(),
          monthlyCheckCounts: [
            { yearMonth: '2024-01', checkCount: 3 },
            { yearMonth: '2024-02', checkCount: 7 },
          ],
          stockStatusBreakdown: {
            inStockChecks: 6,
            lowStockChecks: 3,
            outOfStockChecks: 1,
          },
        },
      ]

      const mockResponse = new Response(
        JSON.stringify({
          statistics: mockStatistics,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )

      mockApiHandler.handle.mockResolvedValue(mockResponse)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/ingredient-check-statistics',
        {
          method: 'GET',
        }
      ) as any

      // When: 食材チェック統計取得APIを実行
      const response = await GET(request)

      // Then: 正常なレスポンスが返される
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toEqual({
        statistics: mockStatistics,
      })

      // APIハンドラーが正しいパラメータで呼ばれたことを確認
      expect(mockApiHandler.handle).toHaveBeenCalledWith(request, userId)
    })

    it('特定食材のチェック統計を取得できる（ingredientId指定あり）', async () => {
      // Given: 特定食材のIDを指定
      const userId = faker.string.uuid()
      const ingredientId = faker.string.uuid()
      vi.mocked(auth).mockResolvedValue({
        user: {
          domainUserId: userId,
        },
      } as any)

      const mockStatistics: IngredientCheckStatistics[] = [
        {
          ingredientId,
          ingredientName: 'トマト',
          totalCheckCount: 15,
          firstCheckedAt: faker.date.past({ years: 1 }).toISOString(),
          lastCheckedAt: faker.date.recent({ days: 7 }).toISOString(),
          monthlyCheckCounts: [
            { yearMonth: '2024-01', checkCount: 5 },
            { yearMonth: '2024-02', checkCount: 10 },
          ],
          stockStatusBreakdown: {
            inStockChecks: 8,
            lowStockChecks: 5,
            outOfStockChecks: 2,
          },
        },
      ]

      const mockResponse = new Response(
        JSON.stringify({
          statistics: mockStatistics,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )

      mockApiHandler.handle.mockResolvedValue(mockResponse)

      const request = new MockNextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/ingredient-check-statistics?ingredientId=${ingredientId}`,
        {
          method: 'GET',
        }
      ) as any

      // When: 食材チェック統計取得APIを実行
      const response = await GET(request)

      // Then: 正常なレスポンスが返される
      expect(response.status).toBe(200)
      expect(mockApiHandler.handle).toHaveBeenCalledWith(request, userId)
    })

    it('統計が0件の場合でも正常なレスポンスを返す', async () => {
      // Given: 空の統計リスト
      const userId = faker.string.uuid()
      vi.mocked(auth).mockResolvedValue({
        user: {
          domainUserId: userId,
        },
      } as any)

      const mockStatistics: IngredientCheckStatistics[] = []

      const mockResponse = new Response(
        JSON.stringify({
          statistics: mockStatistics,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )

      mockApiHandler.handle.mockResolvedValue(mockResponse)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/ingredient-check-statistics',
        {
          method: 'GET',
        }
      ) as any

      // When: 食材チェック統計取得APIを実行
      const response = await GET(request)

      // Then: 空の配列で正常レスポンス
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.statistics).toEqual([])
    })
  })

  describe('異常系', () => {
    it('認証されていない場合は401エラーを返す', async () => {
      // Given: 認証されていないユーザー
      vi.mocked(auth).mockResolvedValue(null as any)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/ingredient-check-statistics',
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
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: expect.any(String),
        path: request.url,
      })
    })

    it('ingredientIdパラメータが無効な場合は400エラーを返す', async () => {
      // Given: 無効なingredientIdパラメータ
      const userId = faker.string.uuid()
      vi.mocked(auth).mockResolvedValue({
        user: {
          domainUserId: userId,
        },
      } as any)

      const mockResponse = new Response(
        JSON.stringify({
          message: 'Validation failed',
          errors: [
            {
              field: 'ingredientId',
              message: 'ingredientId must be a valid UUID',
            },
          ],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )

      mockApiHandler.handle.mockResolvedValue(mockResponse)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/ingredient-check-statistics?ingredientId=invalid-uuid',
        {
          method: 'GET',
        }
      ) as any

      // When: 食材チェック統計取得APIを実行
      const response = await GET(request)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.code).toBe('VALIDATION_ERROR')
      expect(responseData.errors).toBeDefined()
    })

    it('サービスでエラーが発生した場合は500エラーを返す', async () => {
      // Given: サービスエラー
      const userId = faker.string.uuid()
      vi.mocked(auth).mockResolvedValue({
        user: {
          domainUserId: userId,
        },
      } as any)

      const serviceError = new Error('Database query failed')
      mockApiHandler.handle.mockRejectedValue(serviceError)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/ingredient-check-statistics',
        {
          method: 'GET',
        }
      ) as any

      // When: 食材チェック統計取得APIを実行
      const response = await GET(request)

      // Then: 500エラーが返される
      expect(response.status).toBe(500)

      const responseData = await response.json()
      expect(responseData).toEqual({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: expect.any(String),
        path: request.url,
      })
    })
  })
})
