import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

import { CheckedItemDto } from '@/modules/ingredients/server/application/dtos/checked-item.dto'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import { GetRecentSessionsHandler } from '@/modules/ingredients/server/application/queries/get-recent-sessions.handler'
import { GetRecentSessionsQuery } from '@/modules/ingredients/server/application/queries/get-recent-sessions.query'
import type {
  ShoppingQueryService,
  RecentSessionsResult,
} from '@/modules/ingredients/server/application/query-services/shopping-query-service.interface'

describe('GetRecentSessionsHandler', () => {
  let handler: GetRecentSessionsHandler
  let mockQueryService: {
    getRecentSessions: Mock
    getShoppingStatistics: Mock
    getQuickAccessIngredients: Mock
    getIngredientCheckStatistics: Mock
  }

  beforeEach(() => {
    mockQueryService = {
      getRecentSessions: vi.fn(),
      getShoppingStatistics: vi.fn(),
      getQuickAccessIngredients: vi.fn(),
      getIngredientCheckStatistics: vi.fn(),
    }
    handler = new GetRecentSessionsHandler(mockQueryService as unknown as ShoppingQueryService)
  })

  it('デフォルトのlimit値でセッション履歴を取得できる', async () => {
    // Given: デフォルトlimitのクエリとモックデータ
    const userId = faker.string.uuid()
    const query = new GetRecentSessionsQuery(userId)

    const mockResult: RecentSessionsResult = {
      data: [
        new ShoppingSessionDto(
          faker.string.uuid(),
          userId,
          'COMPLETED',
          faker.date.recent().toISOString(),
          faker.date.recent().toISOString(),
          null,
          null,
          [
            new CheckedItemDto(
              faker.string.uuid(),
              'トマト',
              'IN_STOCK',
              'FRESH',
              faker.date.recent().toISOString()
            ),
          ]
        ),
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

    mockQueryService.getRecentSessions.mockResolvedValue(mockResult)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: デフォルト値（limit: 10, page: 1）でサービスが呼ばれる
    expect(mockQueryService.getRecentSessions).toHaveBeenCalledWith(userId, 10, 1)
    expect(result).toEqual(mockResult)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toBeInstanceOf(ShoppingSessionDto)
    expect(result.pagination.page).toBe(1)
    expect(result.pagination.limit).toBe(10)
  })

  it('指定されたlimit値でセッション履歴を取得できる', async () => {
    // Given: カスタムlimitのクエリ
    const userId = faker.string.uuid()
    const limit = 20
    const query = new GetRecentSessionsQuery(userId, limit)

    const mockResult: RecentSessionsResult = {
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    }
    mockQueryService.getRecentSessions.mockResolvedValue(mockResult)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: 指定されたlimit値でサービスが呼ばれる
    expect(mockQueryService.getRecentSessions).toHaveBeenCalledWith(userId, limit, 1)
    expect(result).toEqual(mockResult)
  })

  it('空の履歴も正常に処理できる', async () => {
    // Given: 空の履歴を返すモック
    const userId = faker.string.uuid()
    const query = new GetRecentSessionsQuery(userId, 5)

    const mockResult: RecentSessionsResult = {
      data: [],
      pagination: {
        page: 1,
        limit: 5,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    }
    mockQueryService.getRecentSessions.mockResolvedValue(mockResult)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: 空の結果が返される
    expect(result.data).toEqual([])
    expect(result.data).toHaveLength(0)
    expect(result.pagination.total).toBe(0)
  })

  it('複数のセッションを正しい順序で返す', async () => {
    // Given: 複数のセッション
    const userId = faker.string.uuid()
    const query = new GetRecentSessionsQuery(userId, 3)

    const mockResult: RecentSessionsResult = {
      data: [
        new ShoppingSessionDto(
          'session-1',
          userId,
          'COMPLETED',
          '2025-07-01T10:00:00Z',
          '2025-07-01T10:30:00Z',
          null,
          null
        ),
        new ShoppingSessionDto(
          'session-2',
          userId,
          'ACTIVE',
          '2025-07-01T11:00:00Z',
          null,
          null,
          null
        ),
        new ShoppingSessionDto(
          'session-3',
          userId,
          'COMPLETED',
          '2025-07-01T09:00:00Z',
          '2025-07-01T09:20:00Z',
          null,
          null
        ),
      ],
      pagination: {
        page: 1,
        limit: 3,
        total: 3,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    }

    mockQueryService.getRecentSessions.mockResolvedValue(mockResult)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: サービスから返された順序が保持される
    expect(result.data).toHaveLength(3)
    expect(result.data[0].sessionId).toBe('session-1')
    expect(result.data[1].sessionId).toBe('session-2')
    expect(result.data[2].sessionId).toBe('session-3')
    expect(result.pagination.total).toBe(3)
  })

  it('エラーが発生した場合は適切に伝播される', async () => {
    // Given: エラーを返すモック
    const userId = faker.string.uuid()
    const query = new GetRecentSessionsQuery(userId)
    const error = new Error('Database connection failed')

    mockQueryService.getRecentSessions.mockRejectedValue(error)

    // When/Then: エラーが伝播される
    await expect(handler.handle(query)).rejects.toThrow('Database connection failed')
  })
})
