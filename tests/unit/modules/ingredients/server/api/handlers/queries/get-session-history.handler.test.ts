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
      const requestData = {}
      const result = await handler.handle(requestData, userId)

      // Then: 正常なレスポンスが返される
      // API仕様書に準拠したレスポンスフォーマットの確認
      expect(result.data).toEqual(mockResult.data)
      expect(result.pagination).toEqual(mockResult.pagination)
      expect(result.meta).toHaveProperty('timestamp')
      expect(result.meta.version).toBe('1.0.0')

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
      const requestData = {
        page: '2',
        limit: '10',
        from: '2025-07-01T00:00:00Z',
        to: '2025-07-31T23:59:59Z',
        status: 'COMPLETED',
      }
      await handler.handle(requestData, userId)

      // Then: 正常なレスポンスが返される

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
      // When & Then: 無効なpageでリクエスト
      const requestData = { page: 'abc' }
      await expect(handler.handle(requestData, userId)).rejects.toThrow(
        'pageは有効な整数である必要があります'
      )
    })

    it('limitが範囲外の場合、バリデーションエラーを返す', async () => {
      // When & Then: 範囲外のlimitでリクエスト
      const requestData = { limit: '200' }
      await expect(handler.handle(requestData, userId)).rejects.toThrow(
        'limitは1以上100以下である必要があります'
      )
    })

    it('fromが無効な日付形式の場合、バリデーションエラーを返す', async () => {
      // When & Then: 無効な日付でリクエスト
      const requestData = { from: 'invalid-date' }
      await expect(handler.handle(requestData, userId)).rejects.toThrow(
        'fromは有効なISO 8601形式の日付である必要があります'
      )
    })

    it('statusが無効な値の場合、バリデーションエラーを返す', async () => {
      // When & Then: 無効なstatusでリクエスト
      const requestData = { status: 'INVALID' }
      await expect(handler.handle(requestData, userId)).rejects.toThrow(
        'statusはCOMPLETEDまたはABANDONEDのいずれかである必要があります'
      )
    })

    it('複数のバリデーションエラーがある場合、すべて返す', async () => {
      // When & Then: 複数の無効なパラメータでリクエスト
      const requestData = { page: '0', limit: '0', status: 'INVALID' }
      await expect(handler.handle(requestData, userId)).rejects.toThrow()
    })
  })

  describe('エラーハンドリング', () => {
    it('予期しないエラーが発生した場合、500エラーを返す', async () => {
      // Given: ハンドラーでエラーが発生
      mockGetSessionHistoryHandler.handle.mockRejectedValue(new Error('Database error'))

      // When & Then: リクエスト
      const requestData = {}
      await expect(handler.handle(requestData, userId)).rejects.toThrow(
        'An unexpected error occurred'
      )
    })
  })
})
