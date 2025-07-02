import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GetSessionHistoryApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-session-history.handler'
import { testDataHelpers } from '@tests/__fixtures__/builders/faker.config'

/**
 * GetSessionHistoryApiHandler単体テスト
 * Web Adapterパターンでの実装をテスト
 */
describe('GetSessionHistoryApiHandler', () => {
  let handler: GetSessionHistoryApiHandler
  let mockGetSessionHistoryHandler: any
  let userId: string

  beforeEach(() => {
    // モックの作成
    mockGetSessionHistoryHandler = {
      handle: vi.fn(),
    } as any

    // テストデータの準備
    userId = testDataHelpers.userId()

    // ハンドラーのインスタンス作成
    handler = new GetSessionHistoryApiHandler(mockGetSessionHistoryHandler)
  })

  describe('正常系', () => {
    it('デフォルトパラメータで履歴を取得できる', async () => {
      // Given: 履歴データのモック
      const mockResult = {
        data: [
          {
            sessionId: 'ses_hist123',
            status: 'COMPLETED',
            startedAt: '2025-07-01T10:00:00.000Z',
            completedAt: '2025-07-01T10:30:00.000Z',
            duration: 1800,
            checkedItemsCount: 5,
            totalSpent: undefined,
            deviceType: 'MOBILE',
            location: {
              name: 'スーパー',
              latitude: 35.6762,
              longitude: 139.6503,
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }

      mockGetSessionHistoryHandler.handle.mockResolvedValue(mockResult)

      // When: デフォルトパラメータでリクエスト
      const result = await handler.handle(new Request('http://localhost'), userId)

      // Then: 正常なレスポンスが返される
      expect(result.status).toBe(200)
      const data = await result.json()

      // API仕様書に準拠したレスポンスフォーマットの確認
      expect(data.data).toEqual(mockResult.data)
      expect(data.pagination).toEqual(mockResult.pagination)
      expect(data.meta).toHaveProperty('timestamp')
      expect(data.meta.version).toBe('1.0.0')

      // ハンドラーがデフォルト値で呼び出される
      expect(mockGetSessionHistoryHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          page: 1,
          limit: 20,
          from: undefined,
          to: undefined,
          status: undefined,
        })
      )
    })

    it('すべてのパラメータ付きで履歴を取得できる', async () => {
      // Given: 履歴データのモック
      const mockResult = {
        data: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: true,
        },
      }

      mockGetSessionHistoryHandler.handle.mockResolvedValue(mockResult)

      // When: すべてのパラメータ付きでリクエスト
      const url =
        'http://localhost?page=2&limit=10&from=2025-07-01T00:00:00Z&to=2025-07-31T23:59:59Z&status=COMPLETED'
      const result = await handler.handle(new Request(url), userId)

      // Then: 正常なレスポンスが返される
      expect(result.status).toBe(200)

      // ハンドラーが正しいパラメータで呼び出される
      expect(mockGetSessionHistoryHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          page: 2,
          limit: 10,
          from: '2025-07-01T00:00:00Z',
          to: '2025-07-31T23:59:59Z',
          status: 'COMPLETED',
        })
      )
    })
  })

  describe('バリデーション', () => {
    it('pageパラメータが数値でない場合、バリデーションエラーを返す', async () => {
      // When: 無効なpageでリクエスト
      const result = await handler.handle(new Request('http://localhost?page=abc'), userId)

      // Then: 400エラーが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.message).toBe('Validation failed')
      expect(data.errors).toContainEqual({
        field: 'page',
        message: 'page must be a valid integer',
      })
    })

    it('limitが範囲外の場合、バリデーションエラーを返す', async () => {
      // When: 範囲外のlimitでリクエスト
      const result = await handler.handle(new Request('http://localhost?limit=200'), userId)

      // Then: 400エラーが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.errors).toContainEqual({
        field: 'limit',
        message: 'limit must be between 1 and 100',
      })
    })

    it('fromが無効な日付形式の場合、バリデーションエラーを返す', async () => {
      // When: 無効な日付でリクエスト
      const result = await handler.handle(new Request('http://localhost?from=invalid-date'), userId)

      // Then: 400エラーが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.errors).toContainEqual({
        field: 'from',
        message: 'from must be a valid ISO 8601 date',
      })
    })

    it('statusが無効な値の場合、バリデーションエラーを返す', async () => {
      // When: 無効なstatusでリクエスト
      const result = await handler.handle(new Request('http://localhost?status=INVALID'), userId)

      // Then: 400エラーが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.errors).toContainEqual({
        field: 'status',
        message: 'status must be either COMPLETED or ABANDONED',
      })
    })

    it('複数のバリデーションエラーがある場合、すべて返す', async () => {
      // When: 複数の無効なパラメータでリクエスト
      const result = await handler.handle(
        new Request('http://localhost?page=0&limit=0&status=INVALID'),
        userId
      )

      // Then: 400エラーが返される
      expect(result.status).toBe(400)
      const data = await result.json()
      expect(data.errors).toHaveLength(3)
    })
  })

  describe('エラーハンドリング', () => {
    it('予期しないエラーが発生した場合、500エラーを返す', async () => {
      // Given: ハンドラーでエラーが発生
      mockGetSessionHistoryHandler.handle.mockRejectedValue(new Error('Database error'))

      // When: リクエスト
      const result = await handler.handle(new Request('http://localhost'), userId)

      // Then: 500エラーが返される
      expect(result.status).toBe(500)
      const data = await result.json()
      expect(data.message).toBe('Internal server error')
    })
  })
})
