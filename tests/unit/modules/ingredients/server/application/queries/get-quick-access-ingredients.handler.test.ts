import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

import { GetQuickAccessIngredientsHandler } from '@/modules/ingredients/server/application/queries/get-quick-access-ingredients.handler'
import { GetQuickAccessIngredientsQuery } from '@/modules/ingredients/server/application/queries/get-quick-access-ingredients.query'
import type {
  ShoppingQueryService,
  QuickAccessIngredient,
} from '@/modules/ingredients/server/application/query-services/shopping-query-service.interface'

describe('GetQuickAccessIngredientsHandler', () => {
  let handler: GetQuickAccessIngredientsHandler
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
    handler = new GetQuickAccessIngredientsHandler(
      mockQueryService as unknown as ShoppingQueryService
    )
  })

  it('デフォルトのlimitでクイックアクセス食材を取得できる', async () => {
    // Given: デフォルトlimitのクエリとモックデータ
    const userId = faker.string.uuid()
    const query = new GetQuickAccessIngredientsQuery(userId)

    const mockIngredients: QuickAccessIngredient[] = [
      {
        ingredientId: faker.string.uuid(),
        ingredientName: 'トマト',
        checkCount: 25,
        lastCheckedAt: faker.date.recent().toISOString(),
        currentStockStatus: 'LOW_STOCK',
        currentExpiryStatus: 'FRESH',
      },
      {
        ingredientId: faker.string.uuid(),
        ingredientName: 'きゅうり',
        checkCount: 18,
        lastCheckedAt: faker.date.recent().toISOString(),
        currentStockStatus: 'IN_STOCK',
        currentExpiryStatus: 'NEAR_EXPIRY',
      },
    ]

    mockQueryService.getQuickAccessIngredients.mockResolvedValue(mockIngredients)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: デフォルト値（10）でサービスが呼ばれる
    expect(mockQueryService.getQuickAccessIngredients).toHaveBeenCalledWith(userId, 10)
    expect(result).toEqual(mockIngredients)
    expect(result).toHaveLength(2)
    expect(result[0].ingredientName).toBe('トマト')
  })

  it('指定されたlimitでクイックアクセス食材を取得できる', async () => {
    // Given: カスタムlimitのクエリ
    const userId = faker.string.uuid()
    const limit = 5
    const query = new GetQuickAccessIngredientsQuery(userId, limit)

    const mockIngredients: QuickAccessIngredient[] = []
    mockQueryService.getQuickAccessIngredients.mockResolvedValue(mockIngredients)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: 指定されたlimitでサービスが呼ばれる
    expect(mockQueryService.getQuickAccessIngredients).toHaveBeenCalledWith(userId, limit)
    expect(result).toEqual(mockIngredients)
  })

  it('空のリストも正常に処理できる', async () => {
    // Given: 空のリストを返すモック
    const userId = faker.string.uuid()
    const query = new GetQuickAccessIngredientsQuery(userId, 20)

    mockQueryService.getQuickAccessIngredients.mockResolvedValue([])

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: 空の配列が返される
    expect(result).toEqual([])
    expect(result).toHaveLength(0)
  })

  it('様々な在庫・期限状態の食材を正しく返す', async () => {
    // Given: 様々な状態の食材
    const userId = faker.string.uuid()
    const query = new GetQuickAccessIngredientsQuery(userId, 10)

    const mockIngredients: QuickAccessIngredient[] = [
      {
        ingredientId: 'ing1',
        ingredientName: '新鮮な食材',
        checkCount: 30,
        lastCheckedAt: '2025-07-01T10:00:00Z',
        currentStockStatus: 'IN_STOCK',
        currentExpiryStatus: 'FRESH',
      },
      {
        ingredientId: 'ing2',
        ingredientName: '期限切れ食材',
        checkCount: 20,
        lastCheckedAt: '2025-07-01T09:00:00Z',
        currentStockStatus: 'OUT_OF_STOCK',
        currentExpiryStatus: 'EXPIRED',
      },
      {
        ingredientId: 'ing3',
        ingredientName: '在庫少の食材',
        checkCount: 15,
        lastCheckedAt: '2025-07-01T08:00:00Z',
        currentStockStatus: 'LOW_STOCK',
        currentExpiryStatus: 'EXPIRING_SOON',
      },
    ]

    mockQueryService.getQuickAccessIngredients.mockResolvedValue(mockIngredients)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: 様々な状態の食材が正しく返される
    expect(result).toHaveLength(3)

    // 新鮮な食材
    expect(result[0].currentStockStatus).toBe('IN_STOCK')
    expect(result[0].currentExpiryStatus).toBe('FRESH')

    // 期限切れ食材
    expect(result[1].currentStockStatus).toBe('OUT_OF_STOCK')
    expect(result[1].currentExpiryStatus).toBe('EXPIRED')

    // 在庫少の食材
    expect(result[2].currentStockStatus).toBe('LOW_STOCK')
    expect(result[2].currentExpiryStatus).toBe('EXPIRING_SOON')
  })

  it('エラーが発生した場合は適切に伝播される', async () => {
    // Given: エラーを返すモック
    const userId = faker.string.uuid()
    const query = new GetQuickAccessIngredientsQuery(userId)
    const error = new Error('Database connection lost')

    mockQueryService.getQuickAccessIngredients.mockRejectedValue(error)

    // When/Then: エラーが伝播される
    await expect(handler.handle(query)).rejects.toThrow('Database connection lost')
  })
})
