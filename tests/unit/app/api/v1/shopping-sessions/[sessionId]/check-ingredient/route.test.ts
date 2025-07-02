import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/v1/shopping-sessions/[sessionId]/check-ingredient/route'
import { auth } from '@/auth'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'

// auth関数のモック
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// APIハンドラーのモック
const mockApiHandler = {
  handle: vi.fn(),
}

// CompositionRootのモック
vi.mock('@/modules/ingredients/server/infrastructure/composition-root', () => ({
  CompositionRoot: {
    getInstance: vi.fn(() => ({
      getCheckIngredientApiHandler: vi.fn(() => mockApiHandler),
    })),
  },
}))

// NextRequestのモック
class MockNextRequest {
  public method: string
  public headers: Headers
  public body: ReadableStream<Uint8Array> | null
  public url: string

  constructor(url: string, options: { method?: string; body?: string } = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Headers()
    this.body = options.body ? (new TextEncoder().encode(options.body).buffer as any) : null
  }

  async json() {
    if (!this.body) return {}
    const text = new TextDecoder().decode(this.body as any)
    return JSON.parse(text)
  }
}

describe('POST /api/v1/shopping-sessions/[sessionId]/check-ingredient', () => {
  let userId: string
  let sessionId: string
  let ingredientId: string

  beforeEach(() => {
    vi.clearAllMocks()
    userId = faker.string.uuid()
    sessionId = faker.string.uuid()
    ingredientId = faker.string.uuid()
  })

  it('食材を正常にチェックできる', async () => {
    // Given: 認証済みユーザーと正常なリクエスト
    vi.mocked(auth).mockResolvedValue({
      user: {
        domainUserId: userId,
      },
    } as any)

    const expectedDto = new ShoppingSessionDto(
      sessionId,
      userId,
      'ACTIVE',
      new Date().toISOString(),
      null,
      null,
      null,
      []
    )

    const mockResponse = new Response(
      JSON.stringify({
        data: expectedDto,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

    mockApiHandler.handle.mockResolvedValue(mockResponse)

    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ ingredientId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: Promise.resolve({ sessionId }) })

    // Then: 成功レスポンス
    expect(response.status).toBe(200)
    const responseData = await response.json()

    // レスポンスがdataキーでネストされている
    expect(responseData).toEqual({
      data: {
        data: {
          sessionId: expectedDto.sessionId,
          userId: expectedDto.userId,
          status: expectedDto.status,
          startedAt: expectedDto.startedAt,
          completedAt: expectedDto.completedAt,
          deviceType: expectedDto.deviceType,
          location: expectedDto.location,
          checkedItems: expectedDto.checkedItems,
        },
      },
    })

    // APIハンドラーが正しい引数で呼ばれる
    expect(mockApiHandler.handle).toHaveBeenCalledWith(request, userId, sessionId)
  })

  it('認証されていない場合は401エラーを返す', async () => {
    // Given: 認証されていないユーザー
    vi.mocked(auth).mockResolvedValue(null as any)

    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ ingredientId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: Promise.resolve({ sessionId }) })

    // Then: 401エラー
    expect(response.status).toBe(401)
    const responseData = await response.json()
    expect(responseData).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      timestamp: expect.any(String),
      path: request.url,
    })
  })

  it('ingredientIdが未指定の場合は400エラー', async () => {
    // Given: 認証済みユーザーとingredientIdなしのリクエスト
    vi.mocked(auth).mockResolvedValue({
      user: {
        domainUserId: userId,
      },
    } as any)

    const mockResponse = new Response(
      JSON.stringify({
        message: 'Validation failed',
        errors: [
          {
            field: 'ingredientId',
            message: '食材IDは必須です',
          },
        ],
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )

    mockApiHandler.handle.mockResolvedValue(mockResponse)

    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: Promise.resolve({ sessionId }) })

    // Then: 400エラー
    expect(response.status).toBe(400)
    const responseData = await response.json()
    expect(responseData.code).toBe('VALIDATION_ERROR')
    expect(responseData.errors).toBeDefined()
  })

  it('セッションが見つからない場合は404エラー', async () => {
    // Given: 認証済みユーザーと存在しないセッション
    vi.mocked(auth).mockResolvedValue({
      user: {
        domainUserId: userId,
      },
    } as any)

    const mockResponse = new Response(
      JSON.stringify({
        message: `買い物セッション: ${sessionId} が見つかりません`,
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    )

    mockApiHandler.handle.mockResolvedValue(mockResponse)

    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ ingredientId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: Promise.resolve({ sessionId }) })

    // Then: 404エラー
    expect(response.status).toBe(404)
    const responseData = await response.json()
    expect(responseData.code).toBe('RESOURCE_NOT_FOUND')
    expect(responseData.message).toContain('買い物セッション')
  })

  it('食材が見つからない場合は404エラー', async () => {
    // Given: 認証済みユーザーと存在しない食材
    vi.mocked(auth).mockResolvedValue({
      user: {
        domainUserId: userId,
      },
    } as any)

    const mockResponse = new Response(
      JSON.stringify({
        message: `食材: ${ingredientId} が見つかりません`,
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    )

    mockApiHandler.handle.mockResolvedValue(mockResponse)

    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ ingredientId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: Promise.resolve({ sessionId }) })

    // Then: 404エラー
    expect(response.status).toBe(404)
    const responseData = await response.json()
    expect(responseData.code).toBe('RESOURCE_NOT_FOUND')
    expect(responseData.message).toContain('食材')
  })

  it('権限がない場合は400エラー', async () => {
    // Given: 認証済みユーザーと権限エラー
    vi.mocked(auth).mockResolvedValue({
      user: {
        domainUserId: userId,
      },
    } as any)

    const mockResponse = new Response(
      JSON.stringify({
        message: 'このセッションで食材を確認する権限がありません',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )

    mockApiHandler.handle.mockResolvedValue(mockResponse)

    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ ingredientId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: Promise.resolve({ sessionId }) })

    // Then: 400エラー
    expect(response.status).toBe(400)
    const responseData = await response.json()
    expect(responseData.code).toBe('VALIDATION_ERROR')
    expect(responseData.message).toBe('このセッションで食材を確認する権限がありません')
  })

  it('既にチェック済みの場合は400エラー', async () => {
    // Given: 認証済みユーザーと既にチェック済みの食材
    vi.mocked(auth).mockResolvedValue({
      user: {
        domainUserId: userId,
      },
    } as any)

    const mockResponse = new Response(
      JSON.stringify({
        message: 'この食材は既にチェック済みです',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )

    mockApiHandler.handle.mockResolvedValue(mockResponse)

    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ ingredientId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: Promise.resolve({ sessionId }) })

    // Then: 400エラー
    expect(response.status).toBe(400)
    const responseData = await response.json()
    expect(responseData.code).toBe('VALIDATION_ERROR')
    expect(responseData.message).toBe('この食材は既にチェック済みです')
  })

  it('予期せぬエラーの場合は500エラー', async () => {
    // Given: 認証済みユーザーと予期せぬエラー
    vi.mocked(auth).mockResolvedValue({
      user: {
        domainUserId: userId,
      },
    } as any)

    mockApiHandler.handle.mockRejectedValue(new Error('Unexpected error'))

    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ ingredientId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: Promise.resolve({ sessionId }) })

    // Then: 500エラー
    expect(response.status).toBe(500)
    const responseData = await response.json()
    expect(responseData).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: expect.any(String),
      path: request.url,
    })
  })
})
