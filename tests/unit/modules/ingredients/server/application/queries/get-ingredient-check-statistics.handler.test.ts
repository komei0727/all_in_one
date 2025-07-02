import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

import { GetIngredientCheckStatisticsHandler } from '@/modules/ingredients/server/application/queries/get-ingredient-check-statistics.handler'
import { GetIngredientCheckStatisticsQuery } from '@/modules/ingredients/server/application/queries/get-ingredient-check-statistics.query'
import type {
  ShoppingQueryService,
  IngredientCheckStatistics,
} from '@/modules/ingredients/server/application/query-services/shopping-query-service.interface'

describe('GetIngredientCheckStatisticsHandler', () => {
  let handler: GetIngredientCheckStatisticsHandler
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
    handler = new GetIngredientCheckStatisticsHandler(
      mockQueryService as unknown as ShoppingQueryService
    )
  })

  it('全食材の統計を取得できる', async () => {
    // Given: ingredientIdなしのクエリとモックデータ
    const userId = faker.string.uuid()
    const query = new GetIngredientCheckStatisticsQuery(userId)

    const mockStatistics: IngredientCheckStatistics[] = [
      {
        ingredientId: faker.string.uuid(),
        ingredientName: 'トマト',
        totalCheckCount: 25,
        firstCheckedAt: faker.date.past().toISOString(),
        lastCheckedAt: faker.date.recent().toISOString(),
        monthlyCheckCounts: [
          { yearMonth: '2025-06', checkCount: 12 },
          { yearMonth: '2025-07', checkCount: 13 },
        ],
        stockStatusBreakdown: {
          inStockChecks: 15,
          lowStockChecks: 8,
          outOfStockChecks: 2,
        },
      },
      {
        ingredientId: faker.string.uuid(),
        ingredientName: 'きゅうり',
        totalCheckCount: 18,
        firstCheckedAt: faker.date.past().toISOString(),
        lastCheckedAt: faker.date.recent().toISOString(),
        monthlyCheckCounts: [{ yearMonth: '2025-07', checkCount: 18 }],
        stockStatusBreakdown: {
          inStockChecks: 10,
          lowStockChecks: 5,
          outOfStockChecks: 3,
        },
      },
    ]

    mockQueryService.getIngredientCheckStatistics.mockResolvedValue(mockStatistics)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: ingredientIdなしでサービスが呼ばれる
    expect(mockQueryService.getIngredientCheckStatistics).toHaveBeenCalledWith(userId, undefined)
    expect(result).toEqual(mockStatistics)
    expect(result).toHaveLength(2)
    expect(result[0].ingredientName).toBe('トマト')
  })

  it('特定食材の統計を取得できる', async () => {
    // Given: 特定のingredientIdを持つクエリ
    const userId = faker.string.uuid()
    const ingredientId = faker.string.uuid()
    const query = new GetIngredientCheckStatisticsQuery(userId, ingredientId)

    const mockStatistics: IngredientCheckStatistics[] = [
      {
        ingredientId,
        ingredientName: '玉ねぎ',
        totalCheckCount: 30,
        firstCheckedAt: '2025-01-01T00:00:00Z',
        lastCheckedAt: '2025-07-01T00:00:00Z',
        monthlyCheckCounts: [
          { yearMonth: '2025-01', checkCount: 5 },
          { yearMonth: '2025-02', checkCount: 8 },
          { yearMonth: '2025-03', checkCount: 7 },
          { yearMonth: '2025-04', checkCount: 4 },
          { yearMonth: '2025-05', checkCount: 3 },
          { yearMonth: '2025-06', checkCount: 2 },
          { yearMonth: '2025-07', checkCount: 1 },
        ],
        stockStatusBreakdown: {
          inStockChecks: 20,
          lowStockChecks: 7,
          outOfStockChecks: 3,
        },
      },
    ]

    mockQueryService.getIngredientCheckStatistics.mockResolvedValue(mockStatistics)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: 指定したingredientIdでサービスが呼ばれる
    expect(mockQueryService.getIngredientCheckStatistics).toHaveBeenCalledWith(userId, ingredientId)
    expect(result).toEqual(mockStatistics)
    expect(result).toHaveLength(1)
    expect(result[0].ingredientId).toBe(ingredientId)
  })

  it('空の統計リストも正常に処理できる', async () => {
    // Given: 空のリストを返すモック
    const userId = faker.string.uuid()
    const query = new GetIngredientCheckStatisticsQuery(userId)

    mockQueryService.getIngredientCheckStatistics.mockResolvedValue([])

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: 空の配列が返される
    expect(result).toEqual([])
    expect(result).toHaveLength(0)
  })

  it('複雑な統計データを正しく返す', async () => {
    // Given: 複雑な統計データ
    const userId = faker.string.uuid()
    const query = new GetIngredientCheckStatisticsQuery(userId)

    const mockStatistics: IngredientCheckStatistics[] = [
      {
        ingredientId: 'ing1',
        ingredientName: 'にんじん',
        totalCheckCount: 100,
        firstCheckedAt: '2024-01-01T00:00:00Z',
        lastCheckedAt: '2025-07-01T23:59:59Z',
        monthlyCheckCounts: [
          { yearMonth: '2024-01', checkCount: 10 },
          { yearMonth: '2024-02', checkCount: 15 },
          // ... 省略
          { yearMonth: '2025-06', checkCount: 8 },
          { yearMonth: '2025-07', checkCount: 5 },
        ],
        stockStatusBreakdown: {
          inStockChecks: 60,
          lowStockChecks: 30,
          outOfStockChecks: 10,
        },
      },
      {
        ingredientId: 'ing2',
        ingredientName: 'じゃがいも',
        totalCheckCount: 50,
        firstCheckedAt: '2025-03-01T00:00:00Z',
        lastCheckedAt: '2025-07-01T12:00:00Z',
        monthlyCheckCounts: [
          { yearMonth: '2025-03', checkCount: 10 },
          { yearMonth: '2025-04', checkCount: 15 },
          { yearMonth: '2025-05', checkCount: 12 },
          { yearMonth: '2025-06', checkCount: 8 },
          { yearMonth: '2025-07', checkCount: 5 },
        ],
        stockStatusBreakdown: {
          inStockChecks: 40,
          lowStockChecks: 8,
          outOfStockChecks: 2,
        },
      },
    ]

    mockQueryService.getIngredientCheckStatistics.mockResolvedValue(mockStatistics)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: 複雑な統計データが正しく返される
    expect(result).toHaveLength(2)

    // 最初の食材
    expect(result[0].totalCheckCount).toBe(100)
    expect(result[0].monthlyCheckCounts.length).toBeGreaterThan(0)
    expect(result[0].stockStatusBreakdown.inStockChecks).toBe(60)

    // 2番目の食材
    expect(result[1].totalCheckCount).toBe(50)
    expect(result[1].monthlyCheckCounts).toHaveLength(5)
  })

  it('エラーが発生した場合は適切に伝播される', async () => {
    // Given: エラーを返すモック
    const userId = faker.string.uuid()
    const query = new GetIngredientCheckStatisticsQuery(userId)
    const error = new Error('Query execution failed')

    mockQueryService.getIngredientCheckStatistics.mockRejectedValue(error)

    // When/Then: エラーが伝播される
    await expect(handler.handle(query)).rejects.toThrow('Query execution failed')
  })
})
