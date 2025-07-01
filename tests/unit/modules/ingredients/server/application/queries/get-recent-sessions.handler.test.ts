import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

import { CheckedItemDto } from '@/modules/ingredients/server/application/dtos/checked-item.dto'
import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import { GetRecentSessionsHandler } from '@/modules/ingredients/server/application/queries/get-recent-sessions.handler'
import { GetRecentSessionsQuery } from '@/modules/ingredients/server/application/queries/get-recent-sessions.query'
import type { ShoppingQueryService } from '@/modules/ingredients/server/application/query-services/shopping-query-service.interface'

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

    const mockSessions = [
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
    ]

    mockQueryService.getRecentSessions.mockResolvedValue(mockSessions)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: デフォルト値（10）でサービスが呼ばれる
    expect(mockQueryService.getRecentSessions).toHaveBeenCalledWith(userId, 10)
    expect(result).toEqual(mockSessions)
    expect(result).toHaveLength(1)
    expect(result[0]).toBeInstanceOf(ShoppingSessionDto)
  })

  it('指定されたlimit値でセッション履歴を取得できる', async () => {
    // Given: カスタムlimitのクエリ
    const userId = faker.string.uuid()
    const limit = 20
    const query = new GetRecentSessionsQuery(userId, limit)

    const mockSessions: ShoppingSessionDto[] = []
    mockQueryService.getRecentSessions.mockResolvedValue(mockSessions)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: 指定されたlimit値でサービスが呼ばれる
    expect(mockQueryService.getRecentSessions).toHaveBeenCalledWith(userId, limit)
    expect(result).toEqual(mockSessions)
  })

  it('空の履歴も正常に処理できる', async () => {
    // Given: 空の履歴を返すモック
    const userId = faker.string.uuid()
    const query = new GetRecentSessionsQuery(userId, 5)

    mockQueryService.getRecentSessions.mockResolvedValue([])

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: 空の配列が返される
    expect(result).toEqual([])
    expect(result).toHaveLength(0)
  })

  it('複数のセッションを正しい順序で返す', async () => {
    // Given: 複数のセッション
    const userId = faker.string.uuid()
    const query = new GetRecentSessionsQuery(userId, 3)

    const mockSessions = [
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
    ]

    mockQueryService.getRecentSessions.mockResolvedValue(mockSessions)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: サービスから返された順序が保持される
    expect(result).toHaveLength(3)
    expect(result[0].sessionId).toBe('session-1')
    expect(result[1].sessionId).toBe('session-2')
    expect(result[2].sessionId).toBe('session-3')
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
