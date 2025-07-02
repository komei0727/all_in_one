import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/active/route'
import { auth } from '@/auth'
import { type GetActiveShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-active-shopping-session.handler'

vi.mock('@/modules/ingredients/server/infrastructure/composition-root', () => ({
  CompositionRoot: {
    getInstance: vi.fn(),
  },
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// NextRequestのモック
class MockNextRequest {
  public method: string
  public headers: Headers
  public url: string
  private _url: URL

  constructor(url: string, init?: RequestInit) {
    this.url = url
    this._url = new URL(url)
    this.method = init?.method || 'GET'
    this.headers = new Headers(init?.headers)
  }

  get nextUrl() {
    return {
      searchParams: this._url.searchParams,
    }
  }
}

const NextRequest = MockNextRequest as any

describe('GET /api/v1/shopping-sessions/active', () => {
  let mockHandle: Mock
  let userId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    userId = faker.string.uuid()

    // APIハンドラーのモックを作成
    mockHandle = vi.fn()
    const mockApiHandler: Partial<GetActiveShoppingSessionApiHandler> = {
      handle: mockHandle,
    }

    // CompositionRootのモックを設定
    const { CompositionRoot } = await import(
      '@/modules/ingredients/server/infrastructure/composition-root'
    )
    vi.mocked(CompositionRoot.getInstance).mockReturnValue({
      getGetActiveShoppingSessionApiHandler: () =>
        mockApiHandler as GetActiveShoppingSessionApiHandler,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('認証', () => {
    it('認証されていない場合は401エラーを返す', async () => {
      // Given: 認証なし
      ;(auth as any).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/active')

      // When: APIを呼び出す
      const response = await GET(request)

      // Then: 401エラーが返される
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      })
    })
  })

  describe('正常系', () => {
    it('アクティブなショッピングセッションを取得できる', async () => {
      // Given: 認証済みユーザー
      ;(auth as any).mockResolvedValueOnce({
        user: { domainUserId: userId },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/active')

      // APIハンドラーが成功レスポンスを返す
      const mockResponseData = {
        sessionId: 'ses_' + faker.string.alphanumeric(24),
        userId,
        status: 'ACTIVE',
        startedAt: new Date().toISOString(),
        completedAt: null,
        deviceType: 'MOBILE',
        location: { placeName: 'スーパーマーケット' },
      }

      mockHandle.mockResolvedValue(
        new Response(JSON.stringify(mockResponseData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      // When: APIを呼び出す
      const response = await GET(request)

      // Then: 200レスポンスが返される
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockResponseData)

      // APIハンドラーが正しく呼ばれた
      expect(mockHandle).toHaveBeenCalledWith(expect.any(Object), userId)
    })
  })

  describe('エラーハンドリング', () => {
    it('アクティブなセッションが存在しない場合は404エラーを返す', async () => {
      // Given: 認証済みユーザー
      ;(auth as any).mockResolvedValueOnce({
        user: { domainUserId: userId },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/active')

      // APIハンドラーが404レスポンスを返す
      mockHandle.mockResolvedValue(
        new Response(JSON.stringify({ message: 'No active shopping session found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      // When: APIを呼び出す
      const response = await GET(request)

      // Then: 404エラーが返される
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toMatchObject({
        code: 'RESOURCE_NOT_FOUND',
        message: 'No active shopping session found',
      })
    })

    it('予期しないエラーの場合は500エラーを返す', async () => {
      // Given: 認証済みユーザー
      ;(auth as any).mockResolvedValueOnce({
        user: { domainUserId: userId },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/active')

      // APIハンドラーがエラーを投げる
      mockHandle.mockRejectedValue(new Error('データベースエラー'))

      // When: APIを呼び出す
      const response = await GET(request)

      // Then: 500エラーが返される
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      })
    })
  })
})
