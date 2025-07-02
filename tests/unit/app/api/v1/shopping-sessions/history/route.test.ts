import { type NextRequest } from 'next/server'

import { describe, it, expect, beforeEach, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/history/route'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

// authのモック
const mockAuth = vi.fn()
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

// GetSessionHistoryApiHandlerのモック
const mockGetSessionHistoryApiHandler = {
  handle: vi.fn(),
}

// CompositionRootのモック
vi.mock('@/modules/ingredients/server/infrastructure/composition-root', () => ({
  CompositionRoot: {
    getInstance: vi.fn(() => ({
      getGetSessionHistoryApiHandler: vi.fn(() => mockGetSessionHistoryApiHandler),
    })),
  },
}))

describe('GET /api/v1/shopping-sessions/history', () => {
  let userId: string

  beforeEach(() => {
    vi.clearAllMocks()
    userId = testDataHelpers.userId()
  })

  describe('正常系', () => {
    it('買い物セッション履歴を正常に取得できる（デフォルト件数）', async () => {
      // Given: 認証済みユーザーとAPIレスポンス
      const mockApiResponse = new Response(
        JSON.stringify({
          data: [
            {
              sessionId: 'ses_test123',
              status: 'COMPLETED',
              startedAt: '2025-07-01T10:00:00.000Z',
              completedAt: '2025-07-01T10:30:00.000Z',
              duration: 1800,
              checkedItemsCount: 1,
              totalSpent: undefined,
              deviceType: 'MOBILE',
              location: {
                name: 'イオン',
                latitude: 35.6762,
                longitude: 139.6503,
              },
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )

      mockAuth.mockResolvedValue({
        user: {
          id: 'auth_user_123',
          name: 'Test User',
          email: 'test@example.com',
          domainUserId: userId,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      mockGetSessionHistoryApiHandler.handle.mockResolvedValue(mockApiResponse)

      const request = {
        url: 'http://localhost:3000/api/v1/shopping-sessions/history',
      } as NextRequest

      // When: 履歴取得APIを実行
      const response = await GET(request)

      // Then: 正常なレスポンスが返される
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.data).toHaveLength(1)
      expect(responseData.data[0].sessionId).toBe('ses_test123')
      expect(responseData.pagination).toBeDefined()
      expect(responseData.meta).toBeDefined()

      // APIハンドラーが正しく呼び出される
      expect(mockGetSessionHistoryApiHandler.handle).toHaveBeenCalledWith(request, userId)
    })

    it('カスタム件数でセッション履歴を取得できる', async () => {
      // Given: 認証済みユーザーとカスタム件数
      const mockApiResponse = new Response(
        JSON.stringify({
          data: [],
          pagination: {
            page: 1,
            limit: 5,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )

      mockAuth.mockResolvedValue({
        user: {
          id: 'auth_user_123',
          name: 'Test User',
          email: 'test@example.com',
          domainUserId: userId,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      mockGetSessionHistoryApiHandler.handle.mockResolvedValue(mockApiResponse)

      const request = {
        url: `http://localhost:3000/api/v1/shopping-sessions/history?limit=5`,
      } as NextRequest

      // When: 履歴取得APIを実行
      const response = await GET(request)

      // Then: 正常レスポンスが返される
      expect(response.status).toBe(200)

      // APIハンドラーが正しく呼び出される
      expect(mockGetSessionHistoryApiHandler.handle).toHaveBeenCalledWith(request, userId)
    })

    it('件数が0件の場合でも正常なレスポンスを返す', async () => {
      // Given: 認証済みユーザーと空の履歴
      const mockApiResponse = new Response(
        JSON.stringify({
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )

      mockAuth.mockResolvedValue({
        user: {
          id: 'auth_user_123',
          name: 'Test User',
          email: 'test@example.com',
          domainUserId: userId,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      mockGetSessionHistoryApiHandler.handle.mockResolvedValue(mockApiResponse)

      const request = {
        url: 'http://localhost:3000/api/v1/shopping-sessions/history',
      } as NextRequest

      // When: 履歴取得APIを実行
      const response = await GET(request)

      // Then: 空の配列で正常レスポンス
      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.data).toEqual([])
    })
  })

  describe('異常系', () => {
    it('認証されていない場合は401エラーを返す', async () => {
      // Given: 認証なしのリクエスト
      mockAuth.mockResolvedValue(null)

      const request = {
        url: 'http://localhost:3000/api/v1/shopping-sessions/history',
      } as NextRequest

      // When: 履歴取得APIを実行
      const response = await GET(request)

      // Then: 401エラーが返される
      expect(response.status).toBe(401)

      const responseData = await response.json()
      expect(responseData.code).toBe('UNAUTHORIZED')
      expect(responseData.message).toBe('Authentication required')
    })

    it('APIハンドラーがバリデーションエラーを返した場合、エラーレスポンスを返す', async () => {
      // Given: 認証済みユーザーとバリデーションエラー
      const mockApiResponse = new Response(
        JSON.stringify({
          message: 'Validation failed',
          errors: [{ field: 'limit', message: 'limit must be a valid integer' }],
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )

      mockAuth.mockResolvedValue({
        user: {
          id: 'auth_user_123',
          name: 'Test User',
          email: 'test@example.com',
          domainUserId: userId,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      mockGetSessionHistoryApiHandler.handle.mockResolvedValue(mockApiResponse)

      const request = {
        url: 'http://localhost:3000/api/v1/shopping-sessions/history?limit=invalid',
      } as NextRequest

      // When: 履歴取得APIを実行
      const response = await GET(request)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.code).toBe('VALIDATION_ERROR')
      expect(responseData.message).toBe('Validation failed')
    })

    it('APIハンドラーで予期しないエラーが発生した場合、500エラーを返す', async () => {
      // Given: 認証済みユーザーと予期しないエラー
      mockAuth.mockResolvedValue({
        user: {
          id: 'auth_user_123',
          name: 'Test User',
          email: 'test@example.com',
          domainUserId: userId,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      mockGetSessionHistoryApiHandler.handle.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = {
        url: 'http://localhost:3000/api/v1/shopping-sessions/history',
      } as NextRequest

      // When: 履歴取得APIを実行
      const response = await GET(request)

      // Then: 500エラーが返される
      expect(response.status).toBe(500)

      const responseData = await response.json()
      expect(responseData.code).toBe('INTERNAL_SERVER_ERROR')
      expect(responseData.message).toBe('An unexpected error occurred')
    })
  })
})
