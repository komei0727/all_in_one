import { faker } from '@faker-js/faker'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { POST } from '@/app/api/v1/shopping-sessions/[sessionId]/complete/route'
import { type CompleteShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/complete-shopping-session.handler'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import {
  BusinessRuleException,
  NotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'

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
  let mockHandle: Mock
  let sessionId: string
  let userId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    sessionId = 'ses_' + faker.string.uuid()
    userId = faker.string.uuid()

    // ハンドラーのモックを作成
    mockHandle = vi.fn()
    const mockHandler: Partial<CompleteShoppingSessionHandler> = {
      handle: mockHandle,
    }

    // CompositionRootのモックを設定
    const { CompositionRoot } = await import(
      '@/modules/ingredients/server/infrastructure/composition-root'
    )
    vi.mocked(CompositionRoot.getInstance).mockReturnValue({
      getCompleteShoppingSessionHandler: () => mockHandler as CompleteShoppingSessionHandler,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('リクエスト検証', () => {
    it('空のボディでリクエストすると400エラーを返す', async () => {
      // Given: 空のボディ
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
      const response = await POST(request, { params: { sessionId } })

      // Then: 400エラーが返される
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toEqual({
        error: 'User ID is required',
      })
    })

    it('無効なJSONでリクエストすると400エラーを返す', async () => {
      // Given: 無効なJSON
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/${sessionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: 'invalid json',
        }
      )

      // When: APIを呼び出す
      const response = await POST(request, { params: { sessionId } })

      // Then: 400エラーが返される
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid request')
    })
  })

  describe('正常系', () => {
    it('ショッピングセッションを完了できる', async () => {
      // Given: 有効なリクエスト
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/${sessionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        }
      )

      // 完了したセッションDTOのモック
      const completedAt = new Date().toISOString()
      const mockSessionDto = new ShoppingSessionDto(
        sessionId,
        userId,
        'COMPLETED',
        new Date(Date.now() - 3600000).toISOString(), // 1時間前に開始
        completedAt,
        null,
        null
      )

      // ハンドラーがDTOを返す
      mockHandle.mockResolvedValue(mockSessionDto)

      // When: APIを呼び出す
      const response = await POST(request, { params: { sessionId } })

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
          sessionId,
          userId,
        })
      )
    })
  })

  describe('エラーハンドリング', () => {
    it('セッションが存在しない場合は404エラーを返す', async () => {
      // Given: 有効なリクエスト
      const request = new NextRequest(
        `http://localhost:3000/api/v1/shopping-sessions/${sessionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        }
      )

      // ハンドラーがNotFoundExceptionを投げる
      mockHandle.mockRejectedValue(new NotFoundException('ShoppingSession', sessionId))

      // When: APIを呼び出す
      const response = await POST(request, { params: { sessionId } })

      // Then: 404エラーが返される
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toEqual({
        error: `ShoppingSession not found: ${sessionId}`,
      })
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
          body: JSON.stringify({ userId }),
        }
      )

      // ハンドラーがBusinessRuleExceptionを投げる
      mockHandle.mockRejectedValue(
        new BusinessRuleException('このセッションを完了する権限がありません')
      )

      // When: APIを呼び出す
      const response = await POST(request, { params: { sessionId } })

      // Then: 403エラーが返される
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data).toEqual({
        error: 'このセッションを完了する権限がありません',
      })
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
          body: JSON.stringify({ userId }),
        }
      )

      // ハンドラーが予期しないエラーを投げる
      mockHandle.mockRejectedValue(new Error('データベースエラー'))

      // When: APIを呼び出す
      const response = await POST(request, { params: { sessionId } })

      // Then: 500エラーが返される
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toEqual({
        error: 'Internal server error',
      })
    })
  })
})
