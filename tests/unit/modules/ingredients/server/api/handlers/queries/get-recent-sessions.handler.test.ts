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
      const mockResult = {
        data: [
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
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }

      mockGetRecentSessionsHandler.handle.mockResolvedValue(mockResult)

      // When: デフォルト件数でリクエスト
      const data = await handler.handle({}, userId)

      // Then: 正常なレスポンスが返される
      // API仕様書に準拠したレスポンスフォーマットの確認
      expect(data.data).toHaveLength(1)
      expect(data.data[0]).toEqual({
        sessionId: 'ses_test123',
        status: 'COMPLETED',
        startedAt: '2025-07-01T10:00:00.000Z',
        completedAt: '2025-07-01T10:30:00.000Z',
        duration: 1800, // 30分 = 1800秒
        checkedItemsCount: 1,
        totalSpent: undefined,
        deviceType: 'MOBILE',
        location: {
          name: 'イオン',
          address: '東京都',
          storeType: 'SUPERMARKET',
        },
      })

      // ページネーション情報の確認
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })

      // メタ情報の確認
      expect(data.meta).toHaveProperty('timestamp')
      expect(data.meta.version).toBe('1.0.0')

      // ハンドラーがデフォルト件数で呼び出される
      expect(mockGetRecentSessionsHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          limit: 10,
          page: 1,
        })
      )
    })

    it('カスタム件数で履歴セッションを取得できる', async () => {
      // Given: 履歴セッションのモックデータ
      const mockResult = {
        data: [
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
        ],
        pagination: {
          page: 1,
          limit: 5,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }

      mockGetRecentSessionsHandler.handle.mockResolvedValue(mockResult)

      // When: カスタム件数でリクエスト
      const data = await handler.handle({ limit: 5 }, userId)

      // Then: 正常なレスポンスが返される
      expect(data.data).toHaveLength(1)
      expect(data.data[0].sessionId).toBe('ses_test789')
      expect(data.pagination.limit).toBe(5)

      // ハンドラーがカスタム件数で呼び出される
      expect(mockGetRecentSessionsHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          limit: 5,
          page: 1,
        })
      )
    })

    it('ページネーション付きで履歴セッションを取得できる', async () => {
      // Given: 履歴セッションのモックデータ
      const mockSessions = []
      for (let i = 0; i < 5; i++) {
        mockSessions.push({
          sessionId: `ses_page2_${i}`,
          userId,
          status: 'COMPLETED',
          startedAt: '2025-06-25T10:00:00.000Z',
          completedAt: '2025-06-25T10:30:00.000Z',
          deviceType: 'MOBILE',
          location: null,
          checkedItems: [],
        })
      }

      const mockResult = {
        data: mockSessions,
        pagination: {
          page: 2,
          limit: 5,
          total: 50,
          totalPages: 10,
          hasNext: true,
          hasPrev: true,
        },
      }

      mockGetRecentSessionsHandler.handle.mockResolvedValue(mockResult)

      // When: ページ2、limit5でリクエスト
      const data = await handler.handle({ page: 2, limit: 5 }, userId)

      // Then: 正常なレスポンスが返される
      expect(data.data).toHaveLength(5)
      expect(data.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 50,
        totalPages: 10,
        hasNext: true,
        hasPrev: true,
      })

      // ハンドラーが正しいパラメータで呼び出される
      expect(mockGetRecentSessionsHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          limit: 5,
          page: 2,
        })
      )
    })

    it('履歴セッションが0件の場合でも正常なレスポンスを返す', async () => {
      // Given: 空の履歴セッション
      const mockResult = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      }
      mockGetRecentSessionsHandler.handle.mockResolvedValue(mockResult)

      // When: リクエスト
      const data = await handler.handle({}, userId)

      // Then: 空配列で正常レスポンス
      expect(data.data).toEqual([])
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      })
    })
  })

  describe('異常系', () => {
    it('limitパラメータが無効な値の場合、バリデーションエラーを返す', async () => {
      // Given: 無効なlimit

      // When & Then: 無効なlimitでリクエストするとバリデーションエラーが発生
      await expect(handler.handle({ limit: 'invalid' }, userId)).rejects.toThrow(
        'limitは有効な整数である必要があります'
      )
    })

    it('limitパラメータが範囲外の場合、バリデーションエラーを返す', async () => {
      // Given: 範囲外のlimit

      // When & Then: 範囲外のlimitでリクエストするとバリデーションエラーが発生
      await expect(handler.handle({ limit: 150 }, userId)).rejects.toThrow(
        'limitは1以上50以下である必要があります'
      )
    })

    it('limitパラメータが下限を下回る場合、バリデーションエラーを返す', async () => {
      // Given: 下限未満のlimit

      // When & Then: 0でリクエストするとバリデーションエラーが発生
      await expect(handler.handle({ limit: 0 }, userId)).rejects.toThrow(
        'limitは1以上50以下である必要があります'
      )
    })

    it('pageパラメータが数値でない場合、バリデーションエラーを返す', async () => {
      // Given: 数値でないpage

      // When & Then: 文字列でリクエストするとバリデーションエラーが発生
      await expect(handler.handle({ page: 'abc' }, userId)).rejects.toThrow(
        'pageは有効な整数である必要があります'
      )
    })

    it('pageパラメータが0以下の場合、バリデーションエラーを返す', async () => {
      // Given: 0以下のpage

      // When & Then: 0でリクエストするとバリデーションエラーが発生
      await expect(handler.handle({ page: 0 }, userId)).rejects.toThrow(
        'pageは1以上である必要があります'
      )
    })

    it('予期しないエラーが発生した場合、500エラーを返す', async () => {
      // Given: ハンドラーでエラーが発生
      mockGetRecentSessionsHandler.handle.mockRejectedValue(new Error('Database error'))

      // When & Then: リクエストでデータベースエラーが発生
      await expect(handler.handle({}, userId)).rejects.toThrow('An unexpected error occurred')
    })
  })
})
