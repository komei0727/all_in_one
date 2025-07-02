import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { POST } from '@/app/api/v1/shopping-sessions/[sessionId]/complete/route'
import { auth } from '@/auth'
import { type CompleteShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/commands/complete-shopping-session.handler'
import { ShoppingSessionId } from '@/modules/ingredients/server/domain/value-objects/shopping-session-id.vo'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

// auth関数をモック
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// CompositionRootをモック
vi.mock('@/modules/ingredients/server/infrastructure/composition-root', () => ({
  CompositionRoot: {
    getInstance: vi.fn(),
  },
}))

// NextRequestのモック
class MockNextRequest {
  public method: string
  public headers: Headers
  public body: ReadableStream<Uint8Array> | null
  public url: string

  constructor(url: string, init?: RequestInit) {
    this.url = url
    this.method = init?.method || 'GET'
    this.headers = new Headers(init?.headers)

    if (init?.body) {
      const encoder = new TextEncoder()
      const uint8Array = encoder.encode(init.body as string)
      this.body = new ReadableStream({
        start(controller) {
          controller.enqueue(uint8Array)
          controller.close()
        },
      })
    } else {
      this.body = null
    }
  }

  async json() {
    if (!this.body) {
      throw new Error('Body is empty')
    }
    const reader = this.body.getReader()
    const decoder = new TextDecoder()
    let result = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      result += decoder.decode(value)
    }

    return JSON.parse(result)
  }
}

const NextRequest = MockNextRequest as any

describe('POST /api/v1/shopping-sessions/[sessionId]/complete', () => {
  let mockAuth: Mock
  let mockApiHandler: CompleteShoppingSessionApiHandler
  let sessionId: string
  let userId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    mockAuth = auth as Mock
    sessionId = ShoppingSessionId.create().getValue()
    userId = testDataHelpers.userId()

    // APIハンドラーのモックを作成
    mockApiHandler = {
      handle: vi.fn(),
    } as any

    // CompositionRootのモックを設定
    const { CompositionRoot } = await import(
      '@/modules/ingredients/server/infrastructure/composition-root'
    )
    vi.mocked(CompositionRoot.getInstance).mockReturnValue({
      getCompleteShoppingSessionApiHandler: () => mockApiHandler,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('認証チェック', () => {
    it('未認証の場合は401エラーを返す', async () => {
      // Given: 未認証ユーザー
      mockAuth.mockResolvedValueOnce(null)

      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/${sessionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      )

      // When: APIを呼び出す
      const response = await POST(request, { params: Promise.resolve({ sessionId }) })

      // Then: 401エラーが返される
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toHaveProperty('code', 'UNAUTHORIZED')
      expect(data).toHaveProperty('message', 'Authentication required')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('path')
    })
  })

  describe('正常系', () => {
    it('ショッピングセッションを完了できる', async () => {
      // Given: 認証済みユーザー
      mockAuth.mockResolvedValueOnce({
        user: { domainUserId: userId },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/${sessionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      )

      // APIハンドラーが成功レスポンスを返す
      const completedAt = new Date().toISOString()
      const mockResponse = new Response(
        JSON.stringify({
          sessionId,
          userId,
          status: 'COMPLETED',
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt,
          deviceType: null,
          location: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )

      ;(mockApiHandler.handle as Mock).mockResolvedValue(mockResponse)

      // When: APIを呼び出す
      const response = await POST(request, { params: Promise.resolve({ sessionId }) })

      // Then: 200レスポンスが返される
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('sessionId', sessionId)
      expect(data).toHaveProperty('userId', userId)
      expect(data).toHaveProperty('status', 'COMPLETED')
      expect(data).toHaveProperty('startedAt')
      expect(data).toHaveProperty('completedAt', completedAt)

      // APIハンドラーが正しく呼ばれた
      expect(mockApiHandler.handle).toHaveBeenCalledWith(request, { sessionId }, userId)
    })
  })

  describe('エラーハンドリング', () => {
    beforeEach(() => {
      // 各エラーテストで認証済みユーザーを設定
      mockAuth.mockResolvedValueOnce({
        user: { domainUserId: userId },
      })
    })

    it('バリデーションエラーの場合は400エラーを返す', async () => {
      // Given: 無効なセッションID
      const invalidSessionId = 'invalid-session-id'
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/${invalidSessionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      )

      // APIハンドラーが400エラーを返す
      const mockResponse = new Response(
        JSON.stringify({
          message: 'Invalid session ID format',
          errors: [{ field: 'sessionId', message: 'Invalid session ID format' }],
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )

      ;(mockApiHandler.handle as Mock).mockResolvedValue(mockResponse)

      // When: APIを呼び出す
      const response = await POST(request, {
        params: Promise.resolve({ sessionId: invalidSessionId }),
      })

      // Then: 400エラーが返される
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('code', 'VALIDATION_ERROR')
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('path')
      expect(data).toHaveProperty('errors')
    })

    it('セッションが存在しない場合は404エラーを返す', async () => {
      // Given: 有効なリクエスト
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/${sessionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      )

      // APIハンドラーが404エラーを返す
      const mockResponse = new Response(
        JSON.stringify({ message: `ShoppingSession with ID ${sessionId} not found` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )

      ;(mockApiHandler.handle as Mock).mockResolvedValue(mockResponse)

      // When: APIを呼び出す
      const response = await POST(request, { params: Promise.resolve({ sessionId }) })

      // Then: 404エラーが返される
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toHaveProperty('code', 'RESOURCE_NOT_FOUND')
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('path')
    })

    it('権限がない場合は403エラーを返す', async () => {
      // Given: 有効なリクエスト
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/${sessionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      )

      // APIハンドラーが403エラーを返す
      const mockResponse = new Response(
        JSON.stringify({ message: 'You are not authorized to complete this session' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )

      ;(mockApiHandler.handle as Mock).mockResolvedValue(mockResponse)

      // When: APIを呼び出す
      const response = await POST(request, { params: Promise.resolve({ sessionId }) })

      // Then: 403エラーが返される
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data).toHaveProperty('code', 'FORBIDDEN')
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('path')
    })

    it('予期しないエラーの場合は500エラーを返す', async () => {
      // Given: 有効なリクエスト
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/${sessionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      )

      // APIハンドラーがエラーを投げる
      ;(mockApiHandler.handle as Mock).mockRejectedValue(new Error('データベースエラー'))

      // When: APIを呼び出す
      const response = await POST(request, { params: Promise.resolve({ sessionId }) })

      // Then: 500エラーが返される
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toHaveProperty('code', 'INTERNAL_SERVER_ERROR')
      expect(data).toHaveProperty('message', 'An unexpected error occurred')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('path')
    })
  })
})
