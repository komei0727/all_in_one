import { NextRequest } from 'next/server'

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/recent/route'
import { auth } from '@/auth'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

// モックの設定
vi.mock('@/auth')
vi.mock('@/modules/ingredients/server/infrastructure/composition-root')

describe('GET /api/v1/shopping-sessions/recent', () => {
  let mockAuth: Mock
  let mockGetInstance: Mock
  let mockCompositionRoot: {
    getGetRecentSessionsApiHandler: Mock
  }
  let mockApiHandler: {
    handle: Mock
  }

  beforeEach(() => {
    // auth関数のモック
    mockAuth = auth as Mock
    mockAuth.mockResolvedValue({
      user: {
        domainUserId: 'test-user-id',
      },
    })

    // APIハンドラーのモック
    mockApiHandler = {
      handle: vi.fn(),
    }

    // CompositionRootのモック
    mockCompositionRoot = {
      getGetRecentSessionsApiHandler: vi.fn().mockReturnValue(mockApiHandler),
    }

    mockGetInstance = CompositionRoot.getInstance as Mock
    mockGetInstance.mockReturnValue(mockCompositionRoot)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('認証チェック', () => {
    it('認証されていない場合は401エラーを返す', async () => {
      // 認証失敗をシミュレート
      mockAuth.mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toEqual({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: expect.any(String),
        path: 'http://localhost:3000/api/v1/shopping-sessions/recent',
      })
    })

    it('domainUserIdがない場合は401エラーを返す', async () => {
      // domainUserIdなしの認証情報
      mockAuth.mockResolvedValueOnce({
        user: {},
      })

      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.code).toBe('UNAUTHORIZED')
    })
  })

  describe('正常系', () => {
    it('最近のセッション一覧を正常に取得できる', async () => {
      // 成功レスポンスのモック
      const mockResponseData = {
        sessions: [
          {
            sessionId: 'session-1',
            userId: 'test-user-id',
            status: 'COMPLETED',
            startedAt: '2024-01-01T00:00:00Z',
            completedAt: '2024-01-01T01:00:00Z',
          },
        ],
      }

      mockApiHandler.handle.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponseData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockResponseData)

      // ハンドラーが正しく呼ばれたことを確認
      expect(mockApiHandler.handle).toHaveBeenCalledWith(request, 'test-user-id')
    })

    it('クエリパラメータ付きのリクエストを正しく処理する', async () => {
      const mockResponseData = {
        sessions: [],
      }

      mockApiHandler.handle.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponseData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const request = new NextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/recent?limit=5'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockApiHandler.handle).toHaveBeenCalledWith(request, 'test-user-id')
    })
  })

  describe('エラーハンドリング', () => {
    it('バリデーションエラーを適切に処理する', async () => {
      // バリデーションエラーのモック
      const mockErrorResponse = {
        message: 'Validation failed',
        errors: [
          {
            field: 'limit',
            message: 'limit must be between 1 and 100',
          },
        ],
      }

      mockApiHandler.handle.mockResolvedValueOnce(
        new Response(JSON.stringify(mockErrorResponse), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const request = new NextRequest(
        'http://localhost:3000/api/v1/shopping-sessions/recent?limit=200'
      )
      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: mockErrorResponse.errors,
        timestamp: expect.any(String),
        path: 'http://localhost:3000/api/v1/shopping-sessions/recent?limit=200',
      })
    })

    it('予期しないエラーを適切に処理する', async () => {
      // ハンドラーでエラーをスロー
      mockApiHandler.handle.mockRejectedValueOnce(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toEqual({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: expect.any(String),
        path: 'http://localhost:3000/api/v1/shopping-sessions/recent',
      })
    })

    it('ハンドラーから500エラーが返された場合を処理する', async () => {
      mockApiHandler.handle.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: 'Internal server error',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )

      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/recent')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toEqual({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        timestamp: expect.any(String),
        path: 'http://localhost:3000/api/v1/shopping-sessions/recent',
      })
    })
  })
})
