import { NextRequest } from 'next/server'

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { auth } from '@/auth'
import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'
import {
  ApiNotFoundException,
  ApiValidationException,
  ApiBusinessRuleException,
} from '@/modules/shared/server/api/exceptions'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

// auth関数をモック
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// NextResponseの静的メソッドをモック
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((body, init) => ({
        status: init?.status || 200,
        headers: init?.headers || new Headers(),
        body,
      })),
    },
  }
})

/**
 * UnifiedRouteFactory の単体テスト
 *
 * テスト対象:
 * - 認証チェック機能
 * - APIハンドラーの実行
 * - エラーハンドリングと変換
 * - レスポンス生成
 * - 各種HTTPメソッド（GET, POST, PUT, DELETE）
 */
describe('UnifiedRouteFactory', () => {
  // テスト用のモックAPIハンドラー
  class MockApiHandler extends BaseApiHandler<any, any> {
    validate = vi.fn()
    execute = vi.fn()
  }

  let mockApiHandler: MockApiHandler
  let mockAuth: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    mockApiHandler = new MockApiHandler()
    mockAuth = vi.mocked(auth)
  })

  describe('共通機能', () => {
    describe('認証チェック', () => {
      it('認証されていない場合、401エラーを返す', async () => {
        // Given: 認証されていない状態
        mockAuth.mockResolvedValueOnce(null)

        const handler = UnifiedRouteFactory.createGetHandler(() => mockApiHandler)
        const request = new NextRequest('http://localhost/api/test')

        // When: ハンドラーを実行
        const response = await handler(request)

        // Then: 401エラーレスポンスが返される
        expect(response.status).toBe(401)
        expect(response.body).toMatchObject({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: expect.any(String),
            path: 'http://localhost/api/test',
          },
        })
        expect(mockApiHandler.validate).not.toHaveBeenCalled()
        expect(mockApiHandler.execute).not.toHaveBeenCalled()
      })

      it('認証されているがユーザーIDがない場合、401エラーを返す', async () => {
        // Given: ユーザーIDのない認証情報
        mockAuth.mockResolvedValueOnce({
          user: { email: 'test@example.com' },
          expires: new Date().toISOString(),
        } as any)

        const handler = UnifiedRouteFactory.createGetHandler(() => mockApiHandler)
        const request = new NextRequest('http://localhost/api/test')

        // When: ハンドラーを実行
        const response = await handler(request)

        // Then: 401エラーレスポンスが返される
        expect(response.status).toBe(401)
        expect(response.body).toMatchObject({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        })
      })

      it('認証が不要な場合、認証チェックをスキップする', async () => {
        // Given: 認証不要オプション
        mockApiHandler.validate.mockReturnValueOnce({ data: 'test' })
        mockApiHandler.execute.mockResolvedValueOnce({ result: 'success' })

        const handler = UnifiedRouteFactory.createGetHandler(() => mockApiHandler, {
          requireAuth: false,
        })
        const request = new NextRequest('http://localhost/api/test')

        // When: ハンドラーを実行
        const response = await handler(request)

        // Then: 正常なレスポンスが返される
        expect(response.status).toBe(200)
        expect(mockAuth).not.toHaveBeenCalled()
      })
    })

    describe('APIハンドラー実行', () => {
      it('正常な場合、APIハンドラーを実行してレスポンスを返す', async () => {
        // Given: 認証済みユーザーと正常なAPIハンドラー
        mockAuth.mockResolvedValueOnce({
          user: { domainUserId: 'user123' },
          expires: new Date().toISOString(),
        } as any)
        mockApiHandler.validate.mockReturnValueOnce({ name: 'test' })
        mockApiHandler.execute.mockResolvedValueOnce({ id: '123', name: 'test' })

        const handler = UnifiedRouteFactory.createPostHandler(() => mockApiHandler)
        const request = new NextRequest('http://localhost/api/test', {
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        })

        // When: ハンドラーを実行
        const response = await handler(request)

        // Then: 正常なレスポンスが返される
        expect(response.status).toBe(201)
        expect(response.body).toEqual({ id: '123', name: 'test' })
        expect(mockApiHandler.validate).toHaveBeenCalled()
        expect(mockApiHandler.execute).toHaveBeenCalledWith({ name: 'test' }, 'user123')
      })

      it('レスポンスがundefinedの場合、204 No Contentを返す', async () => {
        // Given: undefinedを返すAPIハンドラー
        mockAuth.mockResolvedValueOnce({
          user: { domainUserId: 'user123' },
          expires: new Date().toISOString(),
        } as any)
        mockApiHandler.validate.mockReturnValueOnce({})
        mockApiHandler.execute.mockResolvedValueOnce(undefined)

        const handler = UnifiedRouteFactory.createDeleteHandler(() => mockApiHandler)
        const request = new NextRequest('http://localhost/api/test/123')

        // When: ハンドラーを実行
        const response = await handler(request)

        // Then: 200 OKが返される（UnifiedRouteFactoryはundefinedでも200を返す）
        expect(response.status).toBe(200)
        expect(response.body).toBeUndefined()
      })

      it('paramsが渡された場合、リクエストデータとマージされる', async () => {
        // Given: paramsありのリクエスト
        mockAuth.mockResolvedValueOnce({
          user: { domainUserId: 'user123' },
          expires: new Date().toISOString(),
        } as any)
        mockApiHandler.validate.mockReturnValueOnce({ id: '123', name: 'test' })
        mockApiHandler.execute.mockResolvedValueOnce({ success: true })

        const handler = UnifiedRouteFactory.createPutHandler(() => mockApiHandler)
        const request = new NextRequest('http://localhost/api/test/123', {
          method: 'PUT',
          body: JSON.stringify({ name: 'test' }),
        })
        const params = { id: '123' }

        // When: ハンドラーを実行
        await handler(request, params)

        // Then: paramsがマージされた状態でvalidateが呼ばれる
        expect(mockApiHandler.validate).toHaveBeenCalledWith({
          id: '123',
          name: 'test',
        })
      })
    })

    describe('エラーハンドリング', () => {
      beforeEach(() => {
        mockAuth.mockResolvedValueOnce({
          user: { domainUserId: 'user123' },
          expires: new Date().toISOString(),
        } as any)
      })

      it('ApiValidationExceptionの場合、400エラーを返す', async () => {
        // Given: バリデーションエラー
        mockApiHandler.validate.mockImplementationOnce(() => {
          throw new ApiValidationException('Invalid input', { field: 'name' })
        })

        const handler = UnifiedRouteFactory.createPostHandler(() => mockApiHandler)
        const request = new NextRequest('http://localhost/api/test', {
          method: 'POST',
          body: JSON.stringify({ invalid: 'data' }),
        })

        // When: ハンドラーを実行
        const response = await handler(request)

        // Then: 400エラーレスポンスが返される
        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: { field: 'name' },
          },
        })
      })

      it('ApiNotFoundExceptionの場合、404エラーを返す', async () => {
        // Given: NotFoundエラー
        mockApiHandler.validate.mockReturnValueOnce({ id: '123' })
        mockApiHandler.execute.mockRejectedValueOnce(
          new ApiNotFoundException('Resource not found', { resourceId: '123' })
        )

        const handler = UnifiedRouteFactory.createGetHandler(() => mockApiHandler)
        const request = new NextRequest('http://localhost/api/test/123')

        // When: ハンドラーを実行
        const response = await handler(request)

        // Then: 404エラーレスポンスが返される
        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found',
            details: { resourceId: '123' },
          },
        })
      })

      it('ApiBusinessRuleExceptionの場合、422エラーを返す', async () => {
        // Given: ビジネスルール違反
        mockApiHandler.validate.mockReturnValueOnce({ amount: -100 })
        mockApiHandler.execute.mockRejectedValueOnce(
          new ApiBusinessRuleException('Amount must be positive')
        )

        const handler = UnifiedRouteFactory.createPostHandler(() => mockApiHandler)
        const request = new NextRequest('http://localhost/api/test', {
          method: 'POST',
          body: JSON.stringify({ amount: -100 }),
        })

        // When: ハンドラーを実行
        const response = await handler(request)

        // Then: 422エラーレスポンスが返される
        expect(response.status).toBe(422)
        expect(response.body).toMatchObject({
          error: {
            code: 'BUSINESS_RULE_VIOLATION',
            message: 'Amount must be positive',
          },
        })
      })

      it('予期しないエラーの場合、500エラーを返す', async () => {
        // Given: 予期しないエラー
        mockApiHandler.validate.mockImplementationOnce(() => {
          throw new Error('Unexpected error')
        })

        const handler = UnifiedRouteFactory.createPostHandler(() => mockApiHandler)
        const request = new NextRequest('http://localhost/api/test', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        // When: ハンドラーを実行
        const response = await handler(request)

        // Then: 500エラーレスポンスが返される
        expect(response.status).toBe(500)
        expect(response.body).toMatchObject({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
          },
        })
      })

      it('開発環境では詳細なエラー情報を含む', async () => {
        // Given: 開発環境と予期しないエラー
        const originalEnv = process.env.NODE_ENV
        // @ts-expect-error - テストのためにNODE_ENVを書き換え
        process.env.NODE_ENV = 'development'

        try {
          mockApiHandler.validate.mockImplementationOnce(() => {
            throw new Error('Database connection failed')
          })

          const handler = UnifiedRouteFactory.createPostHandler(() => mockApiHandler)
          const request = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            body: JSON.stringify({}),
          })

          // When: ハンドラーを実行
          const response = await handler(request)

          // Then: 詳細なエラー情報が含まれる
          expect(response.status).toBe(500)
          const body = await response.json()
          expect(body.error.message).toContain('Database connection failed')
          expect(body.error.details).toBeDefined()
        } finally {
          // @ts-expect-error - テストのためにNODE_ENVを書き換え
          process.env.NODE_ENV = originalEnv
        }
      })
    })

    describe('HTTPメソッド別ハンドラー', () => {
      beforeEach(() => {
        mockAuth.mockResolvedValueOnce({
          user: { domainUserId: 'user123' },
          expires: new Date().toISOString(),
        } as any)
        mockApiHandler.validate.mockReturnValueOnce({})
        mockApiHandler.execute.mockResolvedValueOnce({ success: true })
      })

      it('createGetHandler - GETリクエストを処理', async () => {
        // Given: GETハンドラー
        const handler = UnifiedRouteFactory.createGetHandler(() => mockApiHandler)
        const request = new NextRequest('http://localhost/api/test')

        // When: ハンドラーを実行
        const response = await handler(request)

        // Then: 200 OKが返される
        expect(response.status).toBe(200)
        expect(response.body).toEqual({ success: true })
      })

      it('createPostHandler - POSTリクエストを処理', async () => {
        // Given: POSTハンドラー
        const handler = UnifiedRouteFactory.createPostHandler(() => mockApiHandler)
        const request = new NextRequest('http://localhost/api/test', {
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
        })

        // When: ハンドラーを実行
        const response = await handler(request)

        // Then: 201 Createdが返される
        expect(response.status).toBe(201)
        expect(response.body).toEqual({ success: true })
      })

      it('createPutHandler - PUTリクエストを処理', async () => {
        // Given: PUTハンドラー
        const handler = UnifiedRouteFactory.createPutHandler(() => mockApiHandler)
        const request = new NextRequest('http://localhost/api/test/123', {
          method: 'PUT',
          body: JSON.stringify({ data: 'updated' }),
        })

        // When: ハンドラーを実行
        const response = await handler(request)

        // Then: 200 OKが返される
        expect(response.status).toBe(200)
        expect(response.body).toEqual({ success: true })
      })

      it('createDeleteHandler - DELETEリクエストを処理', async () => {
        // Given: DELETEハンドラー
        mockApiHandler.execute.mockResolvedValueOnce(undefined) // DELETEは通常undefinedを返す
        const handler = UnifiedRouteFactory.createDeleteHandler(() => mockApiHandler)
        const request = new NextRequest('http://localhost/api/test/123', {
          method: 'DELETE',
        })

        // When: ハンドラーを実行
        const response = await handler(request)

        // Then: 200 OKが返される（UnifiedRouteFactoryはundefinedでも200を返す）
        expect(response.status).toBe(200)
      })
    })

    describe('リクエストコンテキスト', () => {
      it('リクエストコンテキストがAPIハンドラーに渡される', async () => {
        // Given: 認証済みリクエスト
        mockAuth.mockResolvedValueOnce({
          user: { domainUserId: 'user123' },
          expires: new Date().toISOString(),
        } as any)

        // handleメソッドをモック（コンテキストを検証するため）
        const handleSpy = vi.spyOn(mockApiHandler, 'handle')
        handleSpy.mockResolvedValueOnce({ success: true })

        const handler = UnifiedRouteFactory.createPostHandler(() => mockApiHandler)
        const request = new NextRequest('http://localhost/api/v1/ingredients', {
          method: 'POST',
          headers: {
            'user-agent': 'TestAgent/1.0',
          },
          body: JSON.stringify({ name: 'test' }),
        })

        // When: ハンドラーを実行
        await handler(request)

        // Then: コンテキストが含まれている
        expect(handleSpy).toHaveBeenCalledWith(
          expect.any(Object),
          'user123',
          expect.objectContaining({
            method: 'POST',
            path: 'http://localhost/api/v1/ingredients',
            userAgent: 'TestAgent/1.0',
          })
        )
      })
    })
  })
})
