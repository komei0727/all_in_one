import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { POST } from '@/app/api/v1/shopping-sessions/route'
import { type StartShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/start-shopping-session.handler'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import { BusinessRuleException } from '@/modules/ingredients/server/domain/exceptions'

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

  beforeEach(async () => {
    vi.clearAllMocks()
    userId = faker.string.uuid()

    // ハンドラーのモックを作成
    mockHandle = vi.fn()
    const mockHandler: Partial<StartShoppingSessionHandler> = {
      handle: mockHandle,
    }

    // CompositionRootのモックを設定
    const { CompositionRoot } = await import(
      '@/modules/ingredients/server/infrastructure/composition-root'
    )
    vi.mocked(CompositionRoot.getInstance).mockReturnValue({
      getStartShoppingSessionHandler: () => mockHandler as StartShoppingSessionHandler,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('リクエスト検証', () => {
    it('空のボディでリクエストすると400エラーを返す', async () => {
      // Given: 空のボディ
      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      // When: APIを呼び出す
      const response = await POST(request)

      // Then: 400エラーが返される
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toEqual({
        error: 'User ID is required',
      })
    })

    it('無効なJSONでリクエストすると400エラーを返す', async () => {
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

      // Then: 400エラーが返される
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid request')
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
        body: JSON.stringify({ userId }),
      })

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
      const response = await POST(request)

      // Then: 201レスポンスが返される
      expect(response.status).toBe(201)
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
    it('アクティブなセッションが既に存在する場合は409エラーを返す', async () => {
      // Given: 有効なリクエスト
      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
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
      expect(data).toEqual({
        error: 'アクティブなセッションが既に存在します',
      })
    })

    it('予期しないエラーの場合は500エラーを返す', async () => {
      // Given: 有効なリクエスト
      const request = new NextRequest('http://localhost:3000/api/v1/shopping-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      // ハンドラーが予期しないエラーを投げる
      mockHandle.mockRejectedValue(new Error('データベースエラー'))

      // When: APIを呼び出す
      const response = await POST(request)

      // Then: 500エラーが返される
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toEqual({
        error: 'Internal server error',
      })
    })
  })
})
