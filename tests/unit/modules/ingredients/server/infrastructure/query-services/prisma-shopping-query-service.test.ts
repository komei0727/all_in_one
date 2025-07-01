import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { ShoppingSessionDto } from '@/modules/ingredients/server/application/dtos/shopping-session.dto'
import { PrismaShoppingQueryService } from '@/modules/ingredients/server/infrastructure/query-services/prisma-shopping-query-service'

// Prismaクライアントのモック型定義
const mockPrismaClient = {
  shoppingSession: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  shoppingSessionItem: {
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  ingredient: {
    findMany: vi.fn(),
  },
  $queryRaw: vi.fn(),
}

describe('PrismaShoppingQueryService', () => {
  let service: PrismaShoppingQueryService
  let userId: string

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PrismaShoppingQueryService(mockPrismaClient as any)
    userId = faker.string.uuid()
  })

  describe('getRecentSessions', () => {
    it('デフォルトで10件の直近セッション履歴を取得できる', async () => {
      // Given: モックデータの準備
      const mockSessions = Array.from({ length: 5 }, () => ({
        id: faker.string.uuid(),
        userId,
        status: 'COMPLETED',
        startedAt: faker.date.recent(),
        completedAt: faker.date.recent(),
        deviceType: null,
        location: null,
        createdAt: faker.date.recent(),
        updatedAt: faker.date.recent(),
        sessionItems: [],
      }))

      mockPrismaClient.shoppingSession.findMany.mockResolvedValue(mockSessions)

      // When: 直近セッション履歴を取得
      const result = await service.getRecentSessions(userId)

      // Then: 正しい条件でクエリが実行される
      expect(mockPrismaClient.shoppingSession.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          sessionItems: {
            include: {
              ingredient: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 10,
      })

      // 結果がShoppingSessionDtoの配列として返される
      expect(result).toHaveLength(5)
      expect(result[0]).toBeInstanceOf(ShoppingSessionDto)
    })

    it('指定した件数の履歴を取得できる', async () => {
      // Given: カスタム件数を指定
      const limit = 20
      mockPrismaClient.shoppingSession.findMany.mockResolvedValue([])

      // When: 指定件数で履歴を取得
      await service.getRecentSessions(userId, limit)

      // Then: 指定した件数でクエリが実行される
      expect(mockPrismaClient.shoppingSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: limit,
        })
      )
    })

    it('セッションアイテムを含むセッション履歴を取得できる', async () => {
      // Given: セッションアイテム付きのセッション
      const mockSessionWithItems = {
        id: faker.string.uuid(),
        userId,
        status: 'COMPLETED',
        startedAt: faker.date.recent(),
        completedAt: faker.date.recent(),
        deviceType: null,
        location: null,
        createdAt: faker.date.recent(),
        updatedAt: faker.date.recent(),
        sessionItems: [
          {
            id: faker.string.uuid(),
            sessionId: faker.string.uuid(),
            ingredientId: faker.string.uuid(),
            ingredientName: faker.commerce.productName(),
            stockStatus: 'IN_STOCK',
            expiryStatus: 'FRESH',
            checkedAt: faker.date.recent(),
            metadata: null,
            ingredient: {
              id: faker.string.uuid(),
              name: faker.commerce.productName(),
            },
          },
        ],
      }

      mockPrismaClient.shoppingSession.findMany.mockResolvedValue([mockSessionWithItems])

      // When: セッション履歴を取得
      const result = await service.getRecentSessions(userId)

      // Then: セッションアイテムが含まれる
      expect(result[0].checkedItems).toHaveLength(1)
      expect(result[0].checkedItems![0].ingredientName).toBe(
        mockSessionWithItems.sessionItems[0].ingredientName
      )
    })
  })

  describe('getShoppingStatistics', () => {
    it('指定期間の買い物統計を取得できる', async () => {
      // Given: 統計データのモック
      const mockSessionCount = 15
      const mockItemCount = 87
      const mockTopItems = [
        {
          ingredientId: faker.string.uuid(),
          ingredientName: '玉ねぎ',
          _count: { id: 10 },
        },
        {
          ingredientId: faker.string.uuid(),
          ingredientName: 'にんじん',
          _count: { id: 8 },
        },
      ]

      // セッション数のモック
      mockPrismaClient.shoppingSession.count.mockResolvedValue(mockSessionCount)

      // アイテム数のモック
      mockPrismaClient.shoppingSessionItem.count.mockResolvedValue(mockItemCount)

      // 頻繁チェック食材のモック
      mockPrismaClient.shoppingSessionItem.groupBy.mockResolvedValue(mockTopItems)

      // 月次データのモック（findManyの結果）
      const mockSessionsForMonthly = [
        { startedAt: new Date('2025-06-15T10:00:00Z') },
        { startedAt: new Date('2025-06-20T10:00:00Z') },
        { startedAt: new Date('2025-07-01T10:00:00Z') },
        { startedAt: new Date('2025-07-15T10:00:00Z') },
      ]

      // セッション時間計算用データのモック
      const mockSessionsForDuration = [
        {
          startedAt: new Date('2025-07-01T10:00:00Z'),
          completedAt: new Date('2025-07-01T10:30:00Z'),
        },
      ]

      // findManyのモック（複数の呼び出しに対応）
      mockPrismaClient.shoppingSession.findMany
        .mockResolvedValueOnce(mockSessionsForMonthly) // 月次集計用
        .mockResolvedValueOnce(mockSessionsForDuration) // セッション時間計算用

      const periodDays = 30

      // When: 買い物統計を取得
      const result = await service.getShoppingStatistics(userId, periodDays)

      // Then: 統計データが正しく計算される
      expect(result.totalSessions).toBe(mockSessionCount)
      expect(result.totalCheckedIngredients).toBe(mockItemCount)
      expect(result.topCheckedIngredients).toHaveLength(2)
      expect(result.topCheckedIngredients[0].ingredientName).toBe('玉ねぎ')
      expect(result.topCheckedIngredients[0].checkCount).toBe(10)
      expect(result.monthlySessionCounts).toHaveLength(2)
      expect(result.monthlySessionCounts[0].yearMonth).toBe('2025-06')
      expect(result.monthlySessionCounts[0].sessionCount).toBe(2)
      expect(result.monthlySessionCounts[1].yearMonth).toBe('2025-07')
      expect(result.monthlySessionCounts[1].sessionCount).toBe(2)

      // 正しい期間でクエリが実行される
      expect(mockPrismaClient.shoppingSession.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId,
            startedAt: {
              gte: expect.any(Date),
            },
          },
        })
      )
    })

    it('平均セッション時間を正しく計算できる', async () => {
      // Given: セッション時間の計算用データ
      const mockSessions = [
        {
          startedAt: new Date('2025-07-01T10:00:00Z'),
          completedAt: new Date('2025-07-01T10:30:00Z'), // 30分
        },
        {
          startedAt: new Date('2025-07-01T15:00:00Z'),
          completedAt: new Date('2025-07-01T15:45:00Z'), // 45分
        },
      ]

      mockPrismaClient.shoppingSession.count.mockResolvedValue(2)
      mockPrismaClient.shoppingSessionItem.count.mockResolvedValue(0)
      mockPrismaClient.shoppingSessionItem.groupBy.mockResolvedValue([])

      // findManyのモック（複数の呼び出しに対応）
      mockPrismaClient.shoppingSession.findMany
        .mockResolvedValueOnce([]) // 月次集計用（空）
        .mockResolvedValueOnce(mockSessions) // セッション時間計算用

      // When: 統計を取得
      const result = await service.getShoppingStatistics(userId)

      // Then: 平均セッション時間が正しく計算される（37.5分）
      expect(result.averageSessionDurationMinutes).toBe(37.5)
    })

    it('セッションが存在しない場合でも統計を返せる', async () => {
      // Given: データが存在しない場合
      mockPrismaClient.shoppingSession.count.mockResolvedValue(0)
      mockPrismaClient.shoppingSessionItem.count.mockResolvedValue(0)
      mockPrismaClient.shoppingSessionItem.groupBy.mockResolvedValue([])

      // findManyのモック（複数の呼び出しに対応）
      mockPrismaClient.shoppingSession.findMany
        .mockResolvedValueOnce([]) // 月次集計用（空）
        .mockResolvedValueOnce([]) // セッション時間計算用（空）

      // When: 統計を取得
      const result = await service.getShoppingStatistics(userId)

      // Then: デフォルト値で統計が返される
      expect(result.totalSessions).toBe(0)
      expect(result.totalCheckedIngredients).toBe(0)
      expect(result.averageSessionDurationMinutes).toBe(0)
      expect(result.topCheckedIngredients).toHaveLength(0)
      expect(result.monthlySessionCounts).toHaveLength(0)
    })
  })

  describe('getQuickAccessIngredients', () => {
    it('よくチェックする食材のリストを取得できる', async () => {
      // Given: クイックアクセス用データのモック
      const mockQuickAccessData = [
        {
          ingredientId: faker.string.uuid(),
          ingredientName: 'トマト',
          checkCount: 15,
          lastCheckedAt: faker.date.recent(),
          currentStockStatus: 'LOW_STOCK',
          currentExpiryStatus: 'FRESH',
        },
        {
          ingredientId: faker.string.uuid(),
          ingredientName: 'きゅうり',
          checkCount: 12,
          lastCheckedAt: faker.date.recent(),
          currentStockStatus: 'IN_STOCK',
          currentExpiryStatus: 'NEAR_EXPIRY',
        },
      ]

      mockPrismaClient.$queryRaw.mockResolvedValue(mockQuickAccessData)

      // When: クイックアクセス食材を取得
      const result = await service.getQuickAccessIngredients(userId)

      // Then: 食材リストが返される
      expect(result).toHaveLength(2)
      expect(result[0].ingredientName).toBe('トマト')
      expect(result[0].checkCount).toBe(15)
      expect(result[0].currentStockStatus).toBe('LOW_STOCK')
      expect(result[1].ingredientName).toBe('きゅうり')
      expect(result[1].checkCount).toBe(12)

      // 正しいクエリが実行される
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith(
        expect.anything(),
        userId,
        10 // デフォルト件数
      )
    })

    it('指定した件数のクイックアクセス食材を取得できる', async () => {
      // Given: カスタム件数
      const limit = 5
      mockPrismaClient.$queryRaw.mockResolvedValue([])

      // When: 指定件数でクイックアクセス食材を取得
      await service.getQuickAccessIngredients(userId, limit)

      // Then: 指定した件数でクエリが実行される
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith(expect.anything(), userId, limit)
    })
  })

  describe('getIngredientCheckStatistics', () => {
    it('食材ごとのチェック統計を取得できる', async () => {
      // Given: 食材チェック統計のモック
      const mockIngredientStats = [
        {
          ingredientId: faker.string.uuid(),
          ingredientName: 'じゃがいも',
          totalCheckCount: 25,
          firstCheckedAt: faker.date.past(),
          lastCheckedAt: faker.date.recent(),
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
      ]

      mockPrismaClient.$queryRaw.mockResolvedValue(mockIngredientStats)

      // When: 食材チェック統計を取得
      const result = await service.getIngredientCheckStatistics(userId)

      // Then: 統計データが返される
      expect(result).toHaveLength(1)
      expect(result[0].ingredientName).toBe('じゃがいも')
      expect(result[0].totalCheckCount).toBe(25)
      expect(result[0].monthlyCheckCounts).toHaveLength(2)
      expect(result[0].stockStatusBreakdown.inStockChecks).toBe(15)

      // 正しいクエリが実行される
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith(expect.anything(), userId)
    })

    it('特定の食材のチェック統計を取得できる', async () => {
      // Given: 特定の食材ID
      const specificIngredientId = faker.string.uuid()
      mockPrismaClient.$queryRaw.mockResolvedValue([])

      // When: 特定食材の統計を取得
      await service.getIngredientCheckStatistics(userId, specificIngredientId)

      // Then: 食材IDを含むクエリが実行される
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith(
        expect.anything(),
        userId,
        specificIngredientId
      )
    })
  })

  describe('エラーハンドリング', () => {
    it('データベースエラーが発生した場合は適切にエラーを伝播する', async () => {
      // Given: データベースエラーの発生
      const dbError = new Error('Database connection failed')
      mockPrismaClient.shoppingSession.findMany.mockRejectedValue(dbError)

      // When/Then: エラーが適切に伝播される
      await expect(service.getRecentSessions(userId)).rejects.toThrow('Database connection failed')
    })

    it('無効なユーザーIDでも例外を発生させない', async () => {
      // Given: 無効なユーザーID
      const invalidUserId = ''
      mockPrismaClient.shoppingSession.findMany.mockResolvedValue([])

      // When: 無効なユーザーIDで実行
      const result = await service.getRecentSessions(invalidUserId)

      // Then: 例外は発生せず、空の結果が返される
      expect(result).toHaveLength(0)
    })
  })

  describe('型安全性', () => {
    it('返り値の型が正しく定義されている', async () => {
      // Given: 各メソッドの実行
      mockPrismaClient.shoppingSession.findMany.mockResolvedValue([])
      mockPrismaClient.shoppingSession.count.mockResolvedValue(0)
      mockPrismaClient.shoppingSessionItem.count.mockResolvedValue(0)
      mockPrismaClient.shoppingSessionItem.groupBy.mockResolvedValue([])
      mockPrismaClient.$queryRaw.mockResolvedValue([])

      // When: 各メソッドを実行
      const recentSessions = await service.getRecentSessions(userId)
      const statistics = await service.getShoppingStatistics(userId)
      const quickAccess = await service.getQuickAccessIngredients(userId)
      const ingredientStats = await service.getIngredientCheckStatistics(userId)

      // Then: 返り値の型が正しい
      expect(Array.isArray(recentSessions)).toBe(true)
      expect(typeof statistics.totalSessions).toBe('number')
      expect(Array.isArray(statistics.topCheckedIngredients)).toBe(true)
      expect(Array.isArray(quickAccess)).toBe(true)
      expect(Array.isArray(ingredientStats)).toBe(true)
    })
  })
})
