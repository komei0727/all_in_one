import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GetRecentSessionsApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-recent-sessions.handler'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

/**
 * GetRecentSessionsApiHandler単体テスト
 * Web Adapterパターンでの実装をテスト
 */
describe('GetRecentSessionsApiHandler', () => {
  let handler: GetRecentSessionsApiHandler
  let mockGetRecentSessionsHandler: any
  let userId: string

  beforeEach(() => {
    // モックの作成
    mockGetRecentSessionsHandler = {
      handle: vi.fn(),
    } as any

    // テストデータの準備
    userId = testDataHelpers.userId()

    // ハンドラーのインスタンス作成
    handler = new GetRecentSessionsApiHandler(mockGetRecentSessionsHandler)
  })

  describe('正常系', () => {
    it('デフォルト件数で履歴セッションを取得できる', async () => {
      // Given: 履歴セッションのモックデータ
      const mockSessions = [
        {
          sessionId: 'ses_test123',
          userId,
          status: 'COMPLETED',
          startedAt: '2025-07-01T10:00:00.000Z',
          completedAt: '2025-07-01T10:30:00.000Z',
          deviceType: 'MOBILE',
          location: {
            name: 'イオン',
            address: '東京都',
            storeType: 'SUPERMARKET',
          },
          checkedItems: [
            {
              ingredientId: 'ing_test456',
              ingredientName: 'トマト',
              stockStatus: 'IN_STOCK',
              expiryStatus: 'FRESH',
              checkedAt: '2025-07-01T10:15:00.000Z',
            },
          ],
        },
      ]

      mockGetRecentSessionsHandler.handle.mockResolvedValue(mockSessions)

      // When: デフォルト件数でリクエスト
      const result = await handler.handle(new Request('http://localhost'), userId)

      // Then: 正常なレスポンスが返される
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data).toEqual({
        sessions: [
          {
            sessionId: 'ses_test123',
            userId,
            status: 'COMPLETED',
            startedAt: '2025-07-01T10:00:00.000Z',
            completedAt: '2025-07-01T10:30:00.000Z',
            deviceType: 'MOBILE',
            location: {
              name: 'イオン',
              address: '東京都',
              storeType: 'SUPERMARKET',
            },
            checkedItems: [
              {
                ingredientId: 'ing_test456',
                ingredientName: 'トマト',
                stockStatus: 'IN_STOCK',
                expiryStatus: 'FRESH',
                checkedAt: '2025-07-01T10:15:00.000Z',
              },
            ],
          },
        ],
      })

      // ハンドラーがデフォルト件数で呼び出される
      expect(mockGetRecentSessionsHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          limit: 10,
        })
      )
    })

    it('カスタム件数で履歴セッションを取得できる', async () => {
      // Given: 履歴セッションのモックデータ
      const mockSessions = [
        {
          sessionId: 'ses_test789',
          userId,
          status: 'COMPLETED',
          startedAt: '2025-06-30T15:00:00.000Z',
          completedAt: '2025-06-30T15:20:00.000Z',
          deviceType: 'DESKTOP',
          location: null,
          checkedItems: [],
        },
      ]

      mockGetRecentSessionsHandler.handle.mockResolvedValue(mockSessions)

      // When: カスタム件数でリクエスト
      const result = await handler.handle(new Request('http://localhost?limit=5'), userId)

      // Then: 正常なレスポンスが返される
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data.sessions).toHaveLength(1)
      expect(data.sessions[0].sessionId).toBe('ses_test789')

      // ハンドラーがカスタム件数で呼び出される
      expect(mockGetRecentSessionsHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          limit: 5,
        })
      )
    })

    it('履歴セッションが0件の場合でも正常なレスポンスを返す', async () => {
      // Given: 空の履歴セッション
      mockGetRecentSessionsHandler.handle.mockResolvedValue([])

      // When: リクエスト
      const result = await handler.handle(new Request('http://localhost'), userId)

      // Then: 空配列で正常レスポンス
      expect(result.status).toBe(200)
      const data = await result.json()

      expect(data.sessions).toEqual([])
    })
  })

  describe('異常系', () => {
    it('limitパラメータが無効な値の場合、バリデーションエラーを返す', async () => {
      // Given: 無効なlimit

      // When: 無効なlimitでリクエスト
      const result = await handler.handle(new Request('http://localhost?limit=invalid'), userId)

      // Then: 400エラーが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.message).toBe('Validation failed')
      expect(data.errors[0]).toMatchObject({
        field: 'limit',
        message: 'limit must be a valid integer',
      })
    })

    it('limitパラメータが範囲外の場合、バリデーションエラーを返す', async () => {
      // Given: 範囲外のlimit

      // When: 範囲外のlimitでリクエスト
      const result = await handler.handle(new Request('http://localhost?limit=150'), userId)

      // Then: 400エラーが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.message).toBe('Validation failed')
      expect(data.errors[0]).toMatchObject({
        field: 'limit',
        message: 'limit must be between 1 and 100',
      })
    })

    it('limitパラメータが下限を下回る場合、バリデーションエラーを返す', async () => {
      // Given: 下限未満のlimit

      // When: 0でリクエスト
      const result = await handler.handle(new Request('http://localhost?limit=0'), userId)

      // Then: 400エラーが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.message).toBe('Validation failed')
      expect(data.errors[0]).toMatchObject({
        field: 'limit',
        message: 'limit must be between 1 and 100',
      })
    })

    it('予期しないエラーが発生した場合、500エラーを返す', async () => {
      // Given: ハンドラーでエラーが発生
      mockGetRecentSessionsHandler.handle.mockRejectedValue(new Error('Database error'))

      // When: リクエスト
      const result = await handler.handle(new Request('http://localhost'), userId)

      // Then: 500エラーが返される
      expect(result.status).toBe(500)
      const data = await result.json()
      expect(data.message).toBe('Internal server error')
    })
  })
})
