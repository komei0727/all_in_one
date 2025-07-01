import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/quick-access-ingredients/route'
import type { QuickAccessIngredient } from '@/modules/ingredients/server/application/query-services/shopping-query-service.interface'

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
const mockGetQuickAccessIngredientsHandler = {
  handle: vi.fn(),
}

vi.mock('@/modules/ingredients/server/infrastructure/composition-root', () => ({
  CompositionRoot: {
    getInstance: vi.fn(() => ({
      getGetQuickAccessIngredientsHandler: vi.fn(() => mockGetQuickAccessIngredientsHandler),
    })),
  },
}))

describe('GET /api/v1/shopping-sessions/quick-access-ingredients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('クイックアクセス食材リストを正常に取得できる（デフォルト件数）', async () => {
      // Given: クイックアクセス食材のモックデータ
      const userId = faker.string.uuid()
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

      mockGetQuickAccessIngredientsHandler.handle.mockResolvedValue(mockIngredients)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
      const response = await GET(request)

      // Then: 正常なレスポンスが返される
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toEqual({
        success: true,
        data: {
          ingredients: [
            {
              ingredientId: mockIngredients[0].ingredientId,
              ingredientName: 'トマト',
              checkCount: 25,
              lastCheckedAt: mockIngredients[0].lastCheckedAt,
              currentStockStatus: 'LOW_STOCK',
              currentExpiryStatus: 'FRESH',
            },
            {
              ingredientId: mockIngredients[1].ingredientId,
              ingredientName: 'きゅうり',
              checkCount: 18,
              lastCheckedAt: mockIngredients[1].lastCheckedAt,
              currentStockStatus: 'IN_STOCK',
              currentExpiryStatus: 'NEAR_EXPIRY',
            },
            {
              ingredientId: mockIngredients[2].ingredientId,
              ingredientName: '玉ねぎ',
              checkCount: 15,
              lastCheckedAt: mockIngredients[2].lastCheckedAt,
              currentStockStatus: 'OUT_OF_STOCK',
              currentExpiryStatus: 'FRESH',
            },
          ],
        },
      })

      // デフォルト件数（10件）で呼び出される
      expect(mockGetQuickAccessIngredientsHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          limit: 10,
        })
      )
    })

    it('カスタム件数でクイックアクセス食材を取得できる', async () => {
      // Given: カスタム件数を指定
      const userId = faker.string.uuid()
      const limit = 5
      const mockIngredients: QuickAccessIngredient[] = []

      mockGetQuickAccessIngredientsHandler.handle.mockResolvedValue(mockIngredients)

      const request = new MockNextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
      const response = await GET(request)

      // Then: 指定件数で呼び出される
      expect(response.status).toBe(200)
      expect(mockGetQuickAccessIngredientsHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          limit,
        })
      )
    })

    it('食材が0件の場合でも正常なレスポンスを返す', async () => {
      // Given: 空の食材リスト
      const userId = faker.string.uuid()
      const mockIngredients: QuickAccessIngredient[] = []

      mockGetQuickAccessIngredientsHandler.handle.mockResolvedValue(mockIngredients)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
      const response = await GET(request)

      // Then: 空の配列で正常レスポンス
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data.ingredients).toEqual([])
    })

    it('各在庫状態・期限状態の食材が正しく取得できる', async () => {
      // Given: 様々な状態の食材
      const userId = faker.string.uuid()
      const mockIngredients: QuickAccessIngredient[] = [
        {
          ingredientId: faker.string.uuid(),
          ingredientName: '新鮮な食材',
          checkCount: 10,
          lastCheckedAt: faker.date.recent().toISOString(),
          currentStockStatus: 'IN_STOCK',
          currentExpiryStatus: 'FRESH',
        },
        {
          ingredientId: faker.string.uuid(),
          ingredientName: '期限切れ食材',
          checkCount: 5,
          lastCheckedAt: faker.date.recent().toISOString(),
          currentStockStatus: 'OUT_OF_STOCK',
          currentExpiryStatus: 'EXPIRED',
        },
        {
          ingredientId: faker.string.uuid(),
          ingredientName: '危険期限食材',
          checkCount: 8,
          lastCheckedAt: faker.date.recent().toISOString(),
          currentStockStatus: 'LOW_STOCK',
          currentExpiryStatus: 'CRITICAL',
        },
      ]

      mockGetQuickAccessIngredientsHandler.handle.mockResolvedValue(mockIngredients)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
      const response = await GET(request)

      // Then: 各状態の食材が正しく返される
      const responseData = await response.json()
      expect(responseData.data.ingredients).toHaveLength(3)

      // 新鮮な食材
      expect(responseData.data.ingredients[0].currentStockStatus).toBe('IN_STOCK')
      expect(responseData.data.ingredients[0].currentExpiryStatus).toBe('FRESH')

      // 期限切れ食材
      expect(responseData.data.ingredients[1].currentStockStatus).toBe('OUT_OF_STOCK')
      expect(responseData.data.ingredients[1].currentExpiryStatus).toBe('EXPIRED')

      // 危険期限食材
      expect(responseData.data.ingredients[2].currentStockStatus).toBe('LOW_STOCK')
      expect(responseData.data.ingredients[2].currentExpiryStatus).toBe('CRITICAL')
    })
  })

  describe('異常系', () => {
    it('User-IDヘッダーが存在しない場合は401エラーを返す', async () => {
      // Given: User-IDヘッダーなしのリクエスト
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
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'ユーザー認証が必要です',
        },
      })
    })

    it('limitパラメータが無効な場合は400エラーを返す', async () => {
      // Given: 無効なlimitパラメータ
      const userId = faker.string.uuid()
      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients?limit=invalid',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
      const response = await GET(request)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
    })

    it('limitパラメータが範囲外の場合は400エラーを返す', async () => {
      // Given: 範囲外のlimitパラメータ
      const userId = faker.string.uuid()
      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients?limit=101',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
      const response = await GET(request)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
      expect(responseData.error.message).toContain('limit')
    })

    it('サービスでエラーが発生した場合は500エラーを返す', async () => {
      // Given: サービスエラー
      const userId = faker.string.uuid()
      const serviceError = new Error('Database query failed')
      mockGetQuickAccessIngredientsHandler.handle.mockRejectedValue(serviceError)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
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
      const mockIngredients: QuickAccessIngredient[] = [
        {
          ingredientId: faker.string.uuid(),
          ingredientName: 'テスト食材',
          checkCount: 5,
          lastCheckedAt: faker.date.recent().toISOString(),
          currentStockStatus: 'IN_STOCK',
          currentExpiryStatus: 'FRESH',
        },
      ]

      mockGetQuickAccessIngredientsHandler.handle.mockResolvedValue(mockIngredients)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/quick-access-ingredients',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: クイックアクセス食材取得APIを実行
      const response = await GET(request)

      // Then: 正しい型でレスポンスが返される
      const responseData = await response.json()
      expect(typeof responseData.success).toBe('boolean')
      expect(Array.isArray(responseData.data.ingredients)).toBe(true)

      if (responseData.data.ingredients.length > 0) {
        const ingredient = responseData.data.ingredients[0]
        expect(typeof ingredient.ingredientId).toBe('string')
        expect(typeof ingredient.ingredientName).toBe('string')
        expect(typeof ingredient.checkCount).toBe('number')
        expect(typeof ingredient.lastCheckedAt).toBe('string')
        expect(typeof ingredient.currentStockStatus).toBe('string')
        expect(typeof ingredient.currentExpiryStatus).toBe('string')

        // 列挙型の値が正しいかチェック
        expect(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).toContain(ingredient.currentStockStatus)
        expect(['FRESH', 'NEAR_EXPIRY', 'EXPIRING_SOON', 'CRITICAL', 'EXPIRED']).toContain(
          ingredient.currentExpiryStatus
        )
      }
    })
  })
})
