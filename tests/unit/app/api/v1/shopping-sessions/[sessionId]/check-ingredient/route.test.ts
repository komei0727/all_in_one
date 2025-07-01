import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/v1/shopping-sessions/[sessionId]/check-ingredient/route'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import {
  BusinessRuleException,
  NotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

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

// モック設定は不要（認証を削除したため）

describe('POST /api/v1/shopping-sessions/[sessionId]/check-ingredient', () => {
  let mockCompositionRoot: any
  let mockApiHandler: any
  let userId: string
  let sessionId: string
  let ingredientId: string

  beforeEach(async () => {
    userId = testDataHelpers.userId()
    sessionId = testDataHelpers.shoppingSessionId()
    ingredientId = testDataHelpers.ingredientId()

    // CompositionRoot のモック
    mockApiHandler = {
      handle: vi.fn(),
    }

    mockCompositionRoot = {
      getCheckIngredientApiHandler: vi.fn().mockReturnValue(mockApiHandler),
    }

    const { CompositionRoot } = vi.mocked(
      await import('@/modules/ingredients/server/infrastructure/composition-root')
    )
    vi.mocked(CompositionRoot.getInstance).mockReturnValue(mockCompositionRoot)
  })

  it('食材を正常にチェックできる', async () => {
    // Given: 正常なリクエスト
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

    mockApiHandler.handle.mockResolvedValue(expectedDto)

    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ ingredientId, userId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: { sessionId } })

    // Then: 成功レスポンス
    expect(response.status).toBe(200)
    const responseData = await response.json()

    // レスポンスがdataキーでネストされている
    expect(responseData.data).toEqual({
      sessionId: expectedDto.sessionId,
      userId: expectedDto.userId,
      status: expectedDto.status,
      startedAt: expectedDto.startedAt,
      completedAt: expectedDto.completedAt,
      deviceType: expectedDto.deviceType,
      location: expectedDto.location,
      checkedItems: expectedDto.checkedItems,
    })

    // APIハンドラーが正しい引数で呼ばれる
    expect(mockApiHandler.handle).toHaveBeenCalledWith({
      sessionId,
      ingredientId,
      userId,
    })
  })

  it('userIdが未指定の場合は400エラー', async () => {
    // Given: userIdなしのリクエスト
    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ ingredientId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: { sessionId } })

    // Then: 400エラー
    expect(response.status).toBe(400)
    const responseData = await response.json()
    expect(responseData.error).toBe('userId is required and must be a string')
  })

  it('ingredientIdが未指定の場合は400エラー', async () => {
    // Given: ingredientIdなしのリクエスト
    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: { sessionId } })

    // Then: 400エラー
    expect(response.status).toBe(400)
    const responseData = await response.json()
    expect(responseData.error).toBe('ingredientId is required and must be a string')
  })

  it('セッションが見つからない場合は404エラー', async () => {
    // Given: 存在しないセッション
    mockApiHandler.handle.mockRejectedValue(new NotFoundException('買い物セッション', sessionId))

    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ ingredientId, userId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: { sessionId } })

    // Then: 404エラー
    expect(response.status).toBe(404)
    const responseData = await response.json()
    expect(responseData.error).toContain('買い物セッション')
  })

  it('食材が見つからない場合は404エラー', async () => {
    // Given: 存在しない食材
    mockApiHandler.handle.mockRejectedValue(new NotFoundException('食材', ingredientId))

    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ ingredientId, userId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: { sessionId } })

    // Then: 404エラー
    expect(response.status).toBe(404)
    const responseData = await response.json()
    expect(responseData.error).toContain('食材')
  })

  it('権限がない場合は400エラー', async () => {
    // Given: 権限のないユーザー
    mockApiHandler.handle.mockRejectedValue(
      new BusinessRuleException('このセッションで食材を確認する権限がありません')
    )

    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ ingredientId, userId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: { sessionId } })

    // Then: 400エラー
    expect(response.status).toBe(400)
    const responseData = await response.json()
    expect(responseData.error).toBe('このセッションで食材を確認する権限がありません')
  })

  it('既にチェック済みの場合は400エラー', async () => {
    // Given: 既にチェック済みの食材
    mockApiHandler.handle.mockRejectedValue(
      new BusinessRuleException('この食材は既にチェック済みです')
    )

    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ ingredientId, userId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: { sessionId } })

    // Then: 400エラー
    expect(response.status).toBe(400)
    const responseData = await response.json()
    expect(responseData.error).toBe('この食材は既にチェック済みです')
  })

  it('予期せぬエラーの場合は500エラー', async () => {
    // Given: 予期せぬエラー
    mockApiHandler.handle.mockRejectedValue(new Error('Unexpected error'))

    const request = new MockNextRequest(
      'http://localhost/api/v1/shopping-sessions/123/check-ingredient',
      {
        method: 'POST',
        body: JSON.stringify({ ingredientId, userId }),
      }
    ) as any

    // When: APIを呼び出し
    const response = await POST(request, { params: { sessionId } })

    // Then: 500エラー
    expect(response.status).toBe(500)
    const responseData = await response.json()
    expect(responseData.error).toBe('Internal Server Error')
  })
})
