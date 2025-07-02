import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

import { GetShoppingStatisticsHandler } from '@/modules/ingredients/server/application/queries/get-shopping-statistics.handler'
import { GetShoppingStatisticsQuery } from '@/modules/ingredients/server/application/queries/get-shopping-statistics.query'
import type {
  ShoppingQueryService,
  ShoppingStatistics,
} from '@/modules/ingredients/server/application/query-services/shopping-query-service.interface'

describe('GetShoppingStatisticsHandler', () => {
  let handler: GetShoppingStatisticsHandler
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
    handler = new GetShoppingStatisticsHandler(mockQueryService as unknown as ShoppingQueryService)
  })

  it('デフォルトのperiodDaysで統計を取得できる', async () => {
    // Given: デフォルトperiodDaysのクエリとモックデータ
    const userId = faker.string.uuid()
    const query = new GetShoppingStatisticsQuery(userId)

    const mockStatistics: ShoppingStatistics = {
      totalSessions: 25,
      totalCheckedIngredients: 150,
      averageSessionDurationMinutes: 22.5,
      topCheckedIngredients: [
        {
          ingredientId: faker.string.uuid(),
          ingredientName: '玉ねぎ',
          checkCount: 15,
          checkRatePercentage: 60,
        },
      ],
      monthlySessionCounts: [{ yearMonth: '2025-07', sessionCount: 10 }],
    }

    mockQueryService.getShoppingStatistics.mockResolvedValue(mockStatistics)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: デフォルト値（30日）でサービスが呼ばれる
    expect(mockQueryService.getShoppingStatistics).toHaveBeenCalledWith(userId, 30)
    expect(result).toEqual(mockStatistics)
    expect(result.totalSessions).toBe(25)
    expect(result.totalCheckedIngredients).toBe(150)
  })

  it('指定されたperiodDaysで統計を取得できる', async () => {
    // Given: カスタムperiodDaysのクエリ
    const userId = faker.string.uuid()
    const periodDays = 90
    const query = new GetShoppingStatisticsQuery(userId, periodDays)

    const mockStatistics: ShoppingStatistics = {
      totalSessions: 50,
      totalCheckedIngredients: 300,
      averageSessionDurationMinutes: 25.0,
      topCheckedIngredients: [],
      monthlySessionCounts: [],
    }

    mockQueryService.getShoppingStatistics.mockResolvedValue(mockStatistics)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: 指定されたperiodDaysでサービスが呼ばれる
    expect(mockQueryService.getShoppingStatistics).toHaveBeenCalledWith(userId, periodDays)
    expect(result).toEqual(mockStatistics)
  })

  it('空の統計データも正常に処理できる', async () => {
    // Given: 空の統計を返すモック
    const userId = faker.string.uuid()
    const query = new GetShoppingStatisticsQuery(userId, 7)

    const emptyStatistics: ShoppingStatistics = {
      totalSessions: 0,
      totalCheckedIngredients: 0,
      averageSessionDurationMinutes: 0,
      topCheckedIngredients: [],
      monthlySessionCounts: [],
    }

    mockQueryService.getShoppingStatistics.mockResolvedValue(emptyStatistics)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: 空の統計が返される
    expect(result).toEqual(emptyStatistics)
    expect(result.totalSessions).toBe(0)
    expect(result.topCheckedIngredients).toHaveLength(0)
  })

  it('複雑な統計データを正しく返す', async () => {
    // Given: 複雑な統計データ
    const userId = faker.string.uuid()
    const query = new GetShoppingStatisticsQuery(userId, 180)

    const complexStatistics: ShoppingStatistics = {
      totalSessions: 100,
      totalCheckedIngredients: 750,
      averageSessionDurationMinutes: 28.5,
      topCheckedIngredients: [
        {
          ingredientId: 'ing1',
          ingredientName: 'トマト',
          checkCount: 80,
          checkRatePercentage: 80,
        },
        {
          ingredientId: 'ing2',
          ingredientName: 'きゅうり',
          checkCount: 65,
          checkRatePercentage: 65,
        },
        {
          ingredientId: 'ing3',
          ingredientName: 'にんじん',
          checkCount: 50,
          checkRatePercentage: 50,
        },
        {
          ingredientId: 'ing4',
          ingredientName: 'じゃがいも',
          checkCount: 45,
          checkRatePercentage: 45,
        },
        {
          ingredientId: 'ing5',
          ingredientName: 'ピーマン',
          checkCount: 40,
          checkRatePercentage: 40,
        },
      ],
      monthlySessionCounts: [
        { yearMonth: '2025-02', sessionCount: 15 },
        { yearMonth: '2025-03', sessionCount: 18 },
        { yearMonth: '2025-04', sessionCount: 20 },
        { yearMonth: '2025-05', sessionCount: 22 },
        { yearMonth: '2025-06', sessionCount: 17 },
        { yearMonth: '2025-07', sessionCount: 8 },
      ],
    }

    mockQueryService.getShoppingStatistics.mockResolvedValue(complexStatistics)

    // When: ハンドラーを実行
    const result = await handler.handle(query)

    // Then: 複雑な統計データが正しく返される
    expect(result.topCheckedIngredients).toHaveLength(5)
    expect(result.monthlySessionCounts).toHaveLength(6)
    expect(result.topCheckedIngredients[0].ingredientName).toBe('トマト')
    expect(result.monthlySessionCounts[0].yearMonth).toBe('2025-02')
  })

  it('エラーが発生した場合は適切に伝播される', async () => {
    // Given: エラーを返すモック
    const userId = faker.string.uuid()
    const query = new GetShoppingStatisticsQuery(userId)
    const error = new Error('Database query failed')

    mockQueryService.getShoppingStatistics.mockRejectedValue(error)

    // When/Then: エラーが伝播される
    await expect(handler.handle(query)).rejects.toThrow('Database query failed')
  })
})
