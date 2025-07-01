import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it } from 'vitest'

import { POST } from '@/app/api/v1/shopping-sessions/[sessionId]/check-ingredient/route'
import { StartShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/start-shopping-session.command'
import { type StartShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/start-shopping-session.handler'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'
import { getTestPrismaClient, resetDatabase } from '@tests/helpers/database.helper'

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

describe('POST /api/v1/shopping-sessions/[sessionId]/check-ingredient 統合テスト', () => {
  let startShoppingSessionHandler: StartShoppingSessionHandler
  let userId: string
  let sessionId: string

  beforeEach(async () => {
    // データベースをクリーンアップ
    await resetDatabase()

    // ハンドラーを取得
    const compositionRoot = CompositionRoot.getInstance()
    startShoppingSessionHandler = compositionRoot.getStartShoppingSessionHandler()

    // テストデータの準備
    userId = testDataHelpers.userId()

    // ユーザーをデータベースに作成
    const prisma = getTestPrismaClient()
    const nextAuthUserId = faker.string.uuid()
    const email = faker.internet.email()

    await prisma.user.create({
      data: {
        id: nextAuthUserId,
        email: email,
      },
    })

    await prisma.domainUser.create({
      data: {
        id: userId,
        nextAuthId: nextAuthUserId,
        email: email,
      },
    })

    // 買い物セッションを開始
    const startSessionCommand = new StartShoppingSessionCommand(userId)
    const sessionDto = await startShoppingSessionHandler.handle(startSessionCommand)
    sessionId = sessionDto.sessionId
  })

  describe('異常系', () => {
    it('userIdが未指定の場合は400エラー', async () => {
      // Given: userIdなしのリクエスト
      const ingredientId = testDataHelpers.ingredientId()
      const request = new MockNextRequest(
        `http://localhost/api/v1/shopping-sessions/${sessionId}/check-ingredient`,
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
        `http://localhost/api/v1/shopping-sessions/${sessionId}/check-ingredient`,
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

    it('存在しないセッションIDの場合は404エラー', async () => {
      // Given: 存在しないセッションID
      const nonExistentSessionId = testDataHelpers.shoppingSessionId()
      const ingredientId = testDataHelpers.ingredientId()
      const request = new MockNextRequest(
        `http://localhost/api/v1/shopping-sessions/${nonExistentSessionId}/check-ingredient`,
        {
          method: 'POST',
          body: JSON.stringify({ ingredientId, userId }),
        }
      ) as any

      // When: APIを呼び出し
      const response = await POST(request, { params: { sessionId: nonExistentSessionId } })

      // Then: 404エラー
      expect(response.status).toBe(404)
      const responseData = await response.json()
      expect(responseData.error).toContain('買い物セッション')
    })

    it('存在しない食材IDの場合は404エラー', async () => {
      // Given: 存在しない食材ID
      const nonExistentIngredientId = testDataHelpers.ingredientId()
      const request = new MockNextRequest(
        `http://localhost/api/v1/shopping-sessions/${sessionId}/check-ingredient`,
        {
          method: 'POST',
          body: JSON.stringify({ ingredientId: nonExistentIngredientId, userId }),
        }
      ) as any

      // When: APIを呼び出し
      const response = await POST(request, { params: { sessionId } })

      // Then: 404エラー
      expect(response.status).toBe(404)
      const responseData = await response.json()
      expect(responseData.error).toContain('食材')
    })

    it('権限のないユーザーの場合は400エラー', async () => {
      // Given: 権限のないユーザー
      const unauthorizedUserId = testDataHelpers.userId()
      const ingredientId = testDataHelpers.ingredientId()
      const request = new MockNextRequest(
        `http://localhost/api/v1/shopping-sessions/${sessionId}/check-ingredient`,
        {
          method: 'POST',
          body: JSON.stringify({ ingredientId, userId: unauthorizedUserId }),
        }
      ) as any

      // When: APIを呼び出し
      const response = await POST(request, { params: { sessionId } })

      // Then: 400エラー
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toBe('このセッションで食材を確認する権限がありません')
    })
  })
})
