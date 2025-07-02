import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { POST } from '@/app/api/v1/shopping-sessions/route'
import { type StartShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/commands/start-shopping-session.handler'
import {
  BusinessRuleException,
  ValidationException,
} from '@/modules/ingredients/server/domain/exceptions'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

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

describe('POST /api/v1/shopping-sessions', () => {
  let mockHandle: Mock
  let userId: string
  let domainUserId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    userId = faker.string.uuid()
    domainUserId = faker.string.uuid()

    // 認証のモックを設定（デフォルトは認証済み）
    const { auth } = await import('@/auth')
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: userId,
        domainUserId,
        email: faker.internet.email(),
      },
    } as any)

    // ハンドラーのモックを作成
    mockHandle = vi.fn()
    const mockHandler: Partial<StartShoppingSessionApiHandler> = {
      handle: mockHandle,
    }

    // CompositionRootのモックを設定
    const { CompositionRoot } = await import(
      '@/modules/ingredients/server/infrastructure/composition-root'
    )
    vi.mocked(CompositionRoot.getInstance).mockReturnValue({
      getStartShoppingSessionApiHandler: () => mockHandler as StartShoppingSessionApiHandler,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('認証', () => {
    it('未認証の場合は401エラーを返す', async () => {
      // Given: 認証されていない
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue(null as any)

      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      // When: APIを呼び出す
      const response = await POST(request)

      // Then: 401エラーが返される
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('リクエスト検証', () => {
    it('バリデーションエラーの場合は400エラーを返す', async () => {
      // Given: バリデーションエラー
      mockHandle.mockRejectedValue(new ValidationException('deviceTypeは無効です'))

      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceType: 'INVALID' }),
      })

      // When: APIを呼び出す
      const response = await POST(request)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('deviceTypeは無効です')
    })

    it('無効なJSONでリクエストすると500エラーを返す', async () => {
      // Given: 無効なJSON
      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      // When: APIを呼び出す
      const response = await POST(request)

      // Then: 500エラーが返される（JSONパースエラーは予期しないエラーとして扱われる）
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('正常系', () => {
    it('新しいショッピングセッションを開始できる', async () => {
      // Given: 有効なリクエスト
      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceType: 'MOBILE',
          location: {
            latitude: 35.6762,
            longitude: 139.6503,
            address: '東京駅',
          },
        }),
      })

      // APIハンドラーのレスポンスをモック
      const mockResponse = {
        sessionId: 'ses_' + faker.string.uuid(),
        userId: domainUserId,
        status: 'ACTIVE',
        startedAt: new Date().toISOString(),
        completedAt: null,
        deviceType: 'MOBILE',
        location: {
          placeName: '東京駅',
        },
      }

      // ハンドラーがレスポンスを返す
      mockHandle.mockResolvedValue(mockResponse)

      // When: APIを呼び出す
      const response = await POST(request)

      // Then: 201レスポンスが返される
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toEqual(mockResponse)

      // ハンドラーが正しく呼ばれた（userIdはdomainUserIdに置き換えられる）
      expect(mockHandle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: domainUserId,
          deviceType: 'MOBILE',
          location: {
            latitude: 35.6762,
            longitude: 139.6503,
            address: '東京駅',
          },
        })
      )
    })
  })

  describe('エラーハンドリング', () => {
    it('アクティブなセッションが既に存在する場合は409エラーを返す', async () => {
      // Given: 有効なリクエスト
      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      // ハンドラーがビジネスルール例外を投げる
      mockHandle.mockRejectedValue(
        new BusinessRuleException('アクティブなセッションが既に存在します')
      )

      // When: APIを呼び出す
      const response = await POST(request)

      // Then: 409エラーが返される
      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error.code).toBe('BUSINESS_RULE_VIOLATION')
      expect(data.error.message).toBe('アクティブなセッションが既に存在します')
    })

    it('予期しないエラーの場合は500エラーを返す', async () => {
      // Given: 有効なリクエスト
      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      // ハンドラーが予期しないエラーを投げる
      mockHandle.mockRejectedValue(new Error('データベースエラー'))

      // When: APIを呼び出す
      const response = await POST(request)

      // Then: 500エラーが返される
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('内部エラーが発生しました')
    })
  })
})
