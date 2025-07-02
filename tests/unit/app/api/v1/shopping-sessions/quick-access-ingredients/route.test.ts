import { faker } from '@faker-js/faker/locale/ja'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/quick-access-ingredients/route'
import { auth } from '@/auth'
import type { QuickAccessIngredient } from '@/modules/ingredients/server/application/query-services/shopping-query-service.interface'

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
      getGetQuickAccessIngredientsApiHandler: vi.fn(() => mockApiHandler),
    })),
  },
}))

describe('GET /api/v1/shopping-sessions/quick-access-ingredients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('クイックアクセス食材リストを正常に取得できる（デフォルト件数）', async () => {
      // Given: 認証済みユーザーとクイックアクセス食材のモックデータ
      const userId = faker.string.uuid()
      vi.mocked(auth).mockResolvedValue({
        user: {
          domainUserId: userId,
        },
      } as any)

      const mockIngredients: QuickAccessIngredient[] = [
        {
          ingredientId: faker.string.uuid(),
          ingredientName: 'トマト',
          checkCount: 25,
          lastCheckedAt: faker.date.recent().toISOString(),
          currentStockStatus: 'LOW_STOCK',
          currentExpiryStatus: 'FRESH',
        },
        {
          ingredientId: faker.string.uuid(),
          ingredientName: 'きゅうり',
          checkCount: 18,
          lastCheckedAt: faker.date.recent().toISOString(),
          currentStockStatus: 'IN_STOCK',
          currentExpiryStatus: 'NEAR_EXPIRY',
        },
        {
          ingredientId: faker.string.uuid(),
          ingredientName: '玉ねぎ',
          checkCount: 15,
          lastCheckedAt: faker.date.recent().toISOString(),
          currentStockStatus: 'OUT_OF_STOCK',
          currentExpiryStatus: 'FRESH',
        },
      ]

      const mockResponse = new Response(
        JSON.stringify({
          ingredients: mockIngredients,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )

      mockApiHandler.handle.mockResolvedValue(mockResponse)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients',
        {
          method: 'GET',
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
      const response = await GET(request)

      // Then: 正常なレスポンスが返される
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toEqual({
        ingredients: mockIngredients,
      })

      // APIハンドラーが正しいパラメータで呼ばれたことを確認
      expect(mockApiHandler.handle).toHaveBeenCalledWith(request, userId)
    })

    it('カスタム件数でクイックアクセス食材を取得できる', async () => {
      // Given: カスタム件数を指定
      const userId = faker.string.uuid()
      const limit = 5
      vi.mocked(auth).mockResolvedValue({
        user: {
          domainUserId: userId,
        },
      } as any)

      const mockIngredients: QuickAccessIngredient[] = []

      const mockResponse = new Response(
        JSON.stringify({
          ingredients: mockIngredients,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )

      mockApiHandler.handle.mockResolvedValue(mockResponse)

      const request = new MockNextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients?limit=${limit}`,
        {
          method: 'GET',
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
      const response = await GET(request)

      // Then: 正常なレスポンスが返される
      expect(response.status).toBe(200)
      expect(mockApiHandler.handle).toHaveBeenCalledWith(request, userId)
    })

    it('食材が0件の場合でも正常なレスポンスを返す', async () => {
      // Given: 空の食材リスト
      const userId = faker.string.uuid()
      vi.mocked(auth).mockResolvedValue({
        user: {
          domainUserId: userId,
        },
      } as any)

      const mockIngredients: QuickAccessIngredient[] = []

      const mockResponse = new Response(
        JSON.stringify({
          ingredients: mockIngredients,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )

      mockApiHandler.handle.mockResolvedValue(mockResponse)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients',
        {
          method: 'GET',
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
      const response = await GET(request)

      // Then: 空の配列で正常レスポンス
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.ingredients).toEqual([])
    })
  })

  describe('異常系', () => {
    it('認証されていない場合は401エラーを返す', async () => {
      // Given: 認証されていないユーザー
      vi.mocked(auth).mockResolvedValue(null as any)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients',
        {
          method: 'GET',
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
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

    it('limitパラメータが無効な場合は400エラーを返す', async () => {
      // Given: 無効なlimitパラメータ
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
              field: 'limit',
              message: 'limit must be a valid integer',
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
        'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients?limit=invalid',
        {
          method: 'GET',
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
      const response = await GET(request)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.code).toBe('VALIDATION_ERROR')
      expect(responseData.errors).toBeDefined()
    })

    it('limitパラメータが範囲外の場合は400エラーを返す', async () => {
      // Given: 範囲外のlimitパラメータ
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
              field: 'limit',
              message: 'limit must be between 1 and 100',
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
        'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients?limit=101',
        {
          method: 'GET',
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
      const response = await GET(request)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.code).toBe('VALIDATION_ERROR')
      expect(responseData.message).toBe('Validation failed')
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
        'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients',
        {
          method: 'GET',
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
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
