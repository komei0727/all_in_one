import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { GET } from '@/app/api/v1/shopping-sessions/active/route'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import { type GetActiveShoppingSessionHandler } from '@/modules/ingredients/server/application/queries/get-active-shopping-session.handler'

vi.mock('@/modules/ingredients/server/infrastructure/composition-root', () => ({
  CompositionRoot: {
    getInstance: vi.fn(),
  },
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

    // ハンドラーのモックを作成
    mockHandle = vi.fn()
    const mockHandler: Partial<GetActiveShoppingSessionHandler> = {
      handle: mockHandle,
    }

    // CompositionRootのモックを設定
    const { CompositionRoot } = await import(
      '@/modules/ingredients/server/infrastructure/composition-root'
    )
    vi.mocked(CompositionRoot.getInstance).mockReturnValue({
      getGetActiveShoppingSessionHandler: () => mockHandler as GetActiveShoppingSessionHandler,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('リクエスト検証', () => {
    it('userIdパラメータがない場合は400エラーを返す', async () => {
      // Given: userIdパラメータなし
      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions/active')

      // When: APIを呼び出す
      const response = await GET(request)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toEqual({
        error: 'User ID is required',
      })
    })
  })

  describe('正常系', () => {
    it('アクティブなショッピングセッションを取得できる', async () => {
      // Given: 有効なリクエスト
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/active?userId=${userId}`
      )

      // セッションDTOのモック
      const mockSessionDto = new ShoppingSessionDto(
        'ses_' + faker.string.uuid(),
        userId,
        'ACTIVE',
        new Date().toISOString(),
        null,
        null,
        null
      )

      // ハンドラーがDTOを返す
      mockHandle.mockResolvedValue(mockSessionDto)

      // When: APIを呼び出す
      const response = await GET(request)

      // Then: 200レスポンスが返される
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({
        sessionId: mockSessionDto.sessionId,
        userId: mockSessionDto.userId,
        status: mockSessionDto.status,
        startedAt: mockSessionDto.startedAt,
        completedAt: mockSessionDto.completedAt,
        deviceType: mockSessionDto.deviceType,
        location: mockSessionDto.location,
      })

      // ハンドラーが正しく呼ばれた
      expect(mockHandle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
        })
      )
    })
  })

  describe('エラーハンドリング', () => {
    it('アクティブなセッションが存在しない場合は404エラーを返す', async () => {
      // Given: 有効なリクエスト
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/active?userId=${userId}`
      )

      // ハンドラーがnullを返す
      mockHandle.mockResolvedValue(null)

      // When: APIを呼び出す
      const response = await GET(request)

      // Then: 404エラーが返される
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toEqual({
        error: 'アクティブなセッションが見つかりません',
      })
    })

    it('予期しないエラーの場合は500エラーを返す', async () => {
      // Given: 有効なリクエスト
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/active?userId=${userId}`
      )

      // ハンドラーが予期しないエラーを投げる
      mockHandle.mockRejectedValue(new Error('データベースエラー'))

      // When: APIを呼び出す
      const response = await GET(request)

      // Then: 500エラーが返される
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toEqual({
        error: 'Internal server error',
      })
    })
  })
})
