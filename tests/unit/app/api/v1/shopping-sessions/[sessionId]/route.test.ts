import { NextRequest } from 'next/server'

import { describe, expect, it, vi, beforeEach } from 'vitest'

import { DELETE } from '@/app/api/v1/shopping-sessions/[sessionId]/route'
import { auth } from '@/auth'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

// auth モジュールをモック
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// CompositionRoot をモック
vi.mock('@/modules/ingredients/server/infrastructure/composition-root', () => ({
  CompositionRoot: {
    getInstance: vi.fn(),
  },
}))

/**
 * DELETE /api/v1/shopping-sessions/[sessionId] エンドポイントの単体テスト
 * セッション中断APIのルートハンドラーの動作を検証
 */
describe('DELETE /api/v1/shopping-sessions/[sessionId]', () => {
  const mockAuth = vi.mocked(auth)
  const mockGetInstance = vi.mocked(CompositionRoot.getInstance)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('認証済みユーザーがセッションを中断できる', async () => {
      // Given: 認証済みユーザー
      mockAuth.mockResolvedValueOnce({
        user: { domainUserId: 'user123' },
      } as any)

      // APIハンドラーのモック
      const mockApiHandler = {
        handle: vi
          .fn()
          .mockResolvedValue(new Response(JSON.stringify({ data: 'success' }), { status: 200 })),
      }

      mockGetInstance.mockReturnValue({
        getAbandonShoppingSessionApiHandler: () => mockApiHandler,
      } as any)

      const request = new NextRequest('http://localhost/api/v1/shopping-sessions/ses_123', {
        method: 'DELETE',
      })

      // When: DELETE リクエストを実行
      const response = await DELETE(request, { params: Promise.resolve({ sessionId: 'ses_123' }) })

      // Then: APIハンドラーが正しく呼ばれる
      expect(mockApiHandler.handle).toHaveBeenCalledWith(
        request,
        { sessionId: 'ses_123' },
        'user123'
      )

      // レスポンスが正しく返される
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({ data: 'success' })
    })

    it('エラーレスポンスを標準フォーマットに変換する', async () => {
      // Given: 認証済みユーザー
      mockAuth.mockResolvedValueOnce({
        user: { domainUserId: 'user123' },
      } as any)

      // エラーレスポンスを返すAPIハンドラー
      const mockApiHandler = {
        handle: vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ message: 'Session not found' }), { status: 404 })
          ),
      }

      mockGetInstance.mockReturnValue({
        getAbandonShoppingSessionApiHandler: () => mockApiHandler,
      } as any)

      const request = new NextRequest('http://localhost/api/v1/shopping-sessions/ses_123', {
        method: 'DELETE',
      })

      // When: DELETE リクエストを実行
      const response = await DELETE(request, { params: Promise.resolve({ sessionId: 'ses_123' }) })

      // Then: エラーレスポンスが標準フォーマットに変換される
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Session not found',
        timestamp: expect.any(String),
        path: request.url,
      })
    })
  })

  describe('異常系', () => {
    it('未認証の場合は401エラーを返す', async () => {
      // Given: 未認証
      mockAuth.mockResolvedValueOnce(null as any)

      const request = new NextRequest('http://localhost/api/v1/shopping-sessions/ses_123', {
        method: 'DELETE',
      })

      // When: DELETE リクエストを実行
      const response = await DELETE(request, { params: Promise.resolve({ sessionId: 'ses_123' }) })

      // Then: 401エラーが返される
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      })
    })

    it('ドメインユーザーIDが無い場合は401エラーを返す', async () => {
      // Given: ドメインユーザーIDが無い
      mockAuth.mockResolvedValueOnce({
        user: { id: 'auth123' }, // domainUserIdが無い
      } as any)

      const request = new NextRequest('http://localhost/api/v1/shopping-sessions/ses_123', {
        method: 'DELETE',
      })

      // When: DELETE リクエストを実行
      const response = await DELETE(request, { params: Promise.resolve({ sessionId: 'ses_123' }) })

      // Then: 401エラーが返される
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      })
    })

    it('予期しないエラーの場合は500エラーを返す', async () => {
      // Given: 認証済みユーザー
      mockAuth.mockResolvedValueOnce({
        user: { domainUserId: 'user123' },
      } as any)

      // エラーをスローするAPIハンドラー
      mockGetInstance.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const request = new NextRequest('http://localhost/api/v1/shopping-sessions/ses_123', {
        method: 'DELETE',
      })

      // When: DELETE リクエストを実行
      const response = await DELETE(request, { params: Promise.resolve({ sessionId: 'ses_123' }) })

      // Then: 500エラーが返される
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      })
    })
  })

  describe('エラーコード変換', () => {
    it.each([
      [400, 'VALIDATION_ERROR'],
      [403, 'FORBIDDEN'],
      [409, 'SESSION_ALREADY_COMPLETED'],
      [500, 'INTERNAL_SERVER_ERROR'],
    ])('HTTPステータス%sを%sに変換する', async (status, expectedCode) => {
      // Given: 認証済みユーザー
      mockAuth.mockResolvedValueOnce({
        user: { domainUserId: 'user123' },
      } as any)

      // 特定のステータスコードを返すAPIハンドラー
      const mockApiHandler = {
        handle: vi
          .fn()
          .mockResolvedValue(new Response(JSON.stringify({ message: 'Test error' }), { status })),
      }

      mockGetInstance.mockReturnValue({
        getAbandonShoppingSessionApiHandler: () => mockApiHandler,
      } as any)

      const request = new NextRequest('http://localhost/api/v1/shopping-sessions/ses_123', {
        method: 'DELETE',
      })

      // When: DELETE リクエストを実行
      const response = await DELETE(request, { params: Promise.resolve({ sessionId: 'ses_123' }) })

      // Then: 正しいエラーコードに変換される
      expect(response.status).toBe(status)
      const data = await response.json()
      expect(data.code).toBe(expectedCode)
    })
  })
})
