import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/history/route'
import { CheckedItemDto } from '@/modules/ingredients/server/application/dtos/checked-item.dto'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'

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
const mockGetRecentSessionsHandler = {
  handle: vi.fn(),
}

vi.mock('@/modules/ingredients/server/infrastructure/composition-root', () => ({
  CompositionRoot: {
    getInstance: vi.fn(() => ({
      getGetRecentSessionsHandler: vi.fn(() => mockGetRecentSessionsHandler),
    })),
  },
}))

describe('GET /api/v1/shopping-sessions/history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('買い物セッション履歴を正常に取得できる（デフォルト件数）', async () => {
      // Given: セッション履歴のモックデータ
      const userId = faker.string.uuid()
      const mockSessions = [
        new ShoppingSessionDto(
          faker.string.uuid(),
          userId,
          'COMPLETED',
          faker.date.past().toISOString(),
          faker.date.recent().toISOString(),
          null,
          null,
          [
            new CheckedItemDto(
              faker.string.uuid(),
              'トマト',
              'IN_STOCK',
              'FRESH',
              faker.date.recent().toISOString()
            ),
          ]
        ),
        new ShoppingSessionDto(
          faker.string.uuid(),
          userId,
          'ACTIVE',
          faker.date.recent().toISOString(),
          null,
          null,
          null
        ),
      ]

      mockGetRecentSessionsHandler.handle.mockResolvedValue(mockSessions)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/history',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: 履歴取得APIを実行
      const response = await GET(request)

      // Then: 正常なレスポンスが返される
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData).toEqual({
        success: true,
        data: {
          sessions: mockSessions.map((session) => ({
            sessionId: session.sessionId,
            userId: session.userId,
            status: session.status,
            startedAt: session.startedAt,
            completedAt: session.completedAt,
            deviceType: session.deviceType,
            location: session.location,
            checkedItems: session.checkedItems?.map((item) => ({
              ingredientId: item.ingredientId,
              ingredientName: item.ingredientName,
              stockStatus: item.stockStatus,
              expiryStatus: item.expiryStatus,
              checkedAt: item.checkedAt,
            })),
          })),
        },
      })

      // デフォルト件数で呼び出される
      expect(mockGetRecentSessionsHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          limit: 10,
        })
      )
    })

    it('カスタム件数でセッション履歴を取得できる', async () => {
      // Given: カスタム件数を指定
      const userId = faker.string.uuid()
      const limit = 20
      mockGetRecentSessionsHandler.handle.mockResolvedValue([])

      const request = new MockNextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/history?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any as any

      // When: 履歴取得APIを実行
      const response = await GET(request)

      // Then: 指定件数で呼び出される
      expect(response.status).toBe(200)
      expect(mockGetRecentSessionsHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          limit,
        })
      )
    })

    it('件数が0件の場合でも正常なレスポンスを返す', async () => {
      // Given: 空の履歴
      const userId = faker.string.uuid()
      mockGetRecentSessionsHandler.handle.mockResolvedValue([])

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/history',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: 履歴取得APIを実行
      const response = await GET(request)

      // Then: 空の配列で正常レスポンス
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data.sessions).toEqual([])
    })
  })

  describe('異常系', () => {
    it('User-IDヘッダーが存在しない場合は401エラーを返す', async () => {
      // Given: User-IDヘッダーなしのリクエスト
      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/history',
        {
          method: 'GET',
        }
      ) as any

      // When: 履歴取得APIを実行
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
        'http://localhost:3000/api/v1/shopping-sessions/history?limit=invalid',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: 履歴取得APIを実行
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
        'http://localhost:3000/api/v1/shopping-sessions/history?limit=101',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: 履歴取得APIを実行
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
      const serviceError = new Error('Database connection failed')
      mockGetRecentSessionsHandler.handle.mockRejectedValue(serviceError)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/history',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: 履歴取得APIを実行
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
      const mockSessions = [
        new ShoppingSessionDto(
          faker.string.uuid(),
          userId,
          'COMPLETED',
          faker.date.past().toISOString(),
          faker.date.recent().toISOString(),
          null,
          null
        ),
      ]

      mockGetRecentSessionsHandler.handle.mockResolvedValue(mockSessions)

      const request = new MockNextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/history',
        {
          method: 'GET',
          headers: {
            'x-user-id': userId,
          },
        }
      ) as any

      // When: 履歴取得APIを実行
      const response = await GET(request)

      // Then: 正しい型でレスポンスが返される
      const responseData = await response.json()
      expect(typeof responseData.success).toBe('boolean')
      expect(Array.isArray(responseData.data.sessions)).toBe(true)

      if (responseData.data.sessions.length > 0) {
        const session = responseData.data.sessions[0]
        expect(typeof session.sessionId).toBe('string')
        expect(typeof session.userId).toBe('string')
        expect(typeof session.status).toBe('string')
        expect(typeof session.startedAt).toBe('string')
      }
    })
  })
})
