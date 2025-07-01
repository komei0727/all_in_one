import type { PrismaClient } from '@/generated/prisma'

import { CheckedItemDto } from '../../application/dtos/checked-item.dto'
import { ShoppingSessionDto } from '../../application/dtos/shopping-session.dto'

import type {
  ShoppingQueryService,
  ShoppingStatistics,
  QuickAccessIngredient,
  IngredientCheckStatistics,
  TopCheckedIngredient,
  MonthlySessionCount,
  MonthlyCheckCount,
  StockStatusBreakdown,
} from '../../application/query-services/shopping-query-service.interface'

/**
 * Prismaを使用した買い物クエリサービス実装
 */
export class PrismaShoppingQueryService implements ShoppingQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * ユーザーの直近の買い物セッション履歴を取得
   */
  async getRecentSessions(userId: string, limit = 10): Promise<ShoppingSessionDto[]> {
    const sessions = await this.prisma.shoppingSession.findMany({
      where: { userId },
      include: {
        sessionItems: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    })

    return sessions.map((session) => {
      // チェック済みアイテムをDTOに変換
      const checkedItems = session.sessionItems.map(
        (item) =>
          new CheckedItemDto(
            item.ingredientId,
            item.ingredientName,
            item.stockStatus,
            item.expiryStatus,
            item.checkedAt.toISOString()
          )
      )

      return new ShoppingSessionDto(
        session.id,
        session.userId,
        session.status,
        session.startedAt.toISOString(),
        session.completedAt?.toISOString() ?? null,
        session.deviceType,
        session.locationName ? { placeName: session.locationName } : null,
        checkedItems
      )
    })
  }

  /**
   * ユーザーの買い物統計を取得
   */
  async getShoppingStatistics(userId: string, periodDays = 30): Promise<ShoppingStatistics> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // 並行してデータを取得
    const [
      totalSessions,
      totalCheckedIngredients,
      topCheckedIngredients,
      monthlySessionCounts,
      sessionDurations,
    ] = await Promise.all([
      // 総セッション数
      this.prisma.shoppingSession.count({
        where: {
          userId,
          startedAt: {
            gte: startDate,
          },
        },
      }),

      // 総チェック食材数
      this.prisma.shoppingSessionItem.count({
        where: {
          session: {
            userId,
            startedAt: {
              gte: startDate,
            },
          },
        },
      }),

      // 頻繁にチェックされた食材Top5
      this.prisma.shoppingSessionItem.groupBy({
        by: ['ingredientId', 'ingredientName'],
        where: {
          session: {
            userId,
            startedAt: {
              gte: startDate,
            },
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 5,
      }),

      // 月別セッション数の取得（生SQLクエリ）
      this.prisma.$queryRaw<MonthlySessionCount[]>`
        SELECT 
          DATE_FORMAT(started_at, '%Y-%m') as yearMonth,
          COUNT(*) as sessionCount
        FROM shopping_sessions 
        WHERE user_id = ${userId}
          AND started_at >= ${startDate}
        GROUP BY DATE_FORMAT(started_at, '%Y-%m')
        ORDER BY yearMonth ASC
      `,

      // セッション時間計算用データ
      this.prisma.$queryRaw<{ startedAt: Date; completedAt: Date | null }[]>`
        SELECT started_at as startedAt, completed_at as completedAt
        FROM shopping_sessions 
        WHERE user_id = ${userId}
          AND started_at >= ${startDate}
          AND completed_at IS NOT NULL
      `,
    ])

    // 平均セッション時間を計算
    const averageSessionDurationMinutes = this.calculateAverageSessionDuration(sessionDurations)

    // 頻繁チェック食材を変換
    const topCheckedIngredientsFormatted: TopCheckedIngredient[] = topCheckedIngredients.map(
      (item) => ({
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        checkCount: item._count.id,
        checkRatePercentage:
          totalSessions > 0 ? Math.round((item._count.id / totalSessions) * 100) : 0,
      })
    )

    return {
      totalSessions,
      totalCheckedIngredients,
      averageSessionDurationMinutes,
      topCheckedIngredients: topCheckedIngredientsFormatted,
      monthlySessionCounts,
    }
  }

  /**
   * よくチェックする食材のクイックアクセスリストを取得
   */
  async getQuickAccessIngredients(userId: string, limit = 10): Promise<QuickAccessIngredient[]> {
    // 複雑なクエリのため生SQLを使用
    const result = await this.prisma.$queryRaw<
      Array<{
        ingredientId: string
        ingredientName: string
        checkCount: number
        lastCheckedAt: Date
        currentStockStatus: string
        currentExpiryStatus: string
      }>
    >`
      SELECT 
        i.id as ingredientId,
        i.name as ingredientName,
        COUNT(si.id) as checkCount,
        MAX(si.checked_at) as lastCheckedAt,
        CASE 
          WHEN i.quantity <= 0 THEN 'OUT_OF_STOCK'
          WHEN i.threshold IS NOT NULL AND i.quantity <= i.threshold THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END as currentStockStatus,
        CASE 
          WHEN i.use_by_date IS NOT NULL AND i.use_by_date < NOW() THEN 'EXPIRED'
          WHEN i.use_by_date IS NOT NULL AND DATEDIFF(i.use_by_date, NOW()) <= 1 THEN 'CRITICAL'
          WHEN i.use_by_date IS NOT NULL AND DATEDIFF(i.use_by_date, NOW()) <= 3 THEN 'EXPIRING_SOON'
          WHEN i.use_by_date IS NOT NULL AND DATEDIFF(i.use_by_date, NOW()) <= 7 THEN 'NEAR_EXPIRY'
          ELSE 'FRESH'
        END as currentExpiryStatus
      FROM ingredients i
      INNER JOIN shopping_session_items si ON i.id = si.ingredient_id
      INNER JOIN shopping_sessions s ON si.session_id = s.id
      WHERE s.user_id = ${userId}
        AND i.deleted_at IS NULL
      GROUP BY i.id, i.name, i.quantity, i.threshold, i.use_by_date
      ORDER BY checkCount DESC, lastCheckedAt DESC
      LIMIT ${limit}
    `

    return result.map((item) => ({
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      checkCount: Number(item.checkCount),
      lastCheckedAt: item.lastCheckedAt.toISOString(),
      currentStockStatus: item.currentStockStatus as 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK',
      currentExpiryStatus: item.currentExpiryStatus as
        | 'FRESH'
        | 'NEAR_EXPIRY'
        | 'EXPIRING_SOON'
        | 'CRITICAL'
        | 'EXPIRED',
    }))
  }

  /**
   * 食材ごとのチェック履歴統計を取得
   */
  async getIngredientCheckStatistics(
    userId: string,
    ingredientId?: string
  ): Promise<IngredientCheckStatistics[]> {
    let result: Array<{
      ingredientId: string
      ingredientName: string
      totalCheckCount: number
      firstCheckedAt: Date
      lastCheckedAt: Date
      monthlyCheckCounts: MonthlyCheckCount[]
      stockStatusBreakdown: StockStatusBreakdown
    }>

    if (ingredientId) {
      result = await this.prisma.$queryRaw`
        SELECT 
          i.id as ingredientId,
          i.name as ingredientName,
          COUNT(si.id) as totalCheckCount,
          MIN(si.checked_at) as firstCheckedAt,
          MAX(si.checked_at) as lastCheckedAt,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'yearMonth', DATE_FORMAT(si.checked_at, '%Y-%m'),
              'checkCount', COUNT(si.id)
            )
          ) as monthlyCheckCounts,
          JSON_OBJECT(
            'inStockChecks', SUM(CASE WHEN si.stock_status = 'IN_STOCK' THEN 1 ELSE 0 END),
            'lowStockChecks', SUM(CASE WHEN si.stock_status = 'LOW_STOCK' THEN 1 ELSE 0 END),
            'outOfStockChecks', SUM(CASE WHEN si.stock_status = 'OUT_OF_STOCK' THEN 1 ELSE 0 END)
          ) as stockStatusBreakdown
        FROM ingredients i
        INNER JOIN shopping_session_items si ON i.id = si.ingredient_id
        INNER JOIN shopping_sessions s ON si.session_id = s.id
        WHERE s.user_id = ${userId}
          AND i.deleted_at IS NULL
          AND i.id = ${ingredientId}
        GROUP BY i.id, i.name
        ORDER BY totalCheckCount DESC
      `
    } else {
      result = await this.prisma.$queryRaw`
        SELECT 
          i.id as ingredientId,
          i.name as ingredientName,
          COUNT(si.id) as totalCheckCount,
          MIN(si.checked_at) as firstCheckedAt,
          MAX(si.checked_at) as lastCheckedAt,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'yearMonth', DATE_FORMAT(si.checked_at, '%Y-%m'),
              'checkCount', COUNT(si.id)
            )
          ) as monthlyCheckCounts,
          JSON_OBJECT(
            'inStockChecks', SUM(CASE WHEN si.stock_status = 'IN_STOCK' THEN 1 ELSE 0 END),
            'lowStockChecks', SUM(CASE WHEN si.stock_status = 'LOW_STOCK' THEN 1 ELSE 0 END),
            'outOfStockChecks', SUM(CASE WHEN si.stock_status = 'OUT_OF_STOCK' THEN 1 ELSE 0 END)
          ) as stockStatusBreakdown
        FROM ingredients i
        INNER JOIN shopping_session_items si ON i.id = si.ingredient_id
        INNER JOIN shopping_sessions s ON si.session_id = s.id
        WHERE s.user_id = ${userId}
          AND i.deleted_at IS NULL
        GROUP BY i.id, i.name
        ORDER BY totalCheckCount DESC
      `
    }

    return result.map((item) => ({
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      totalCheckCount: Number(item.totalCheckCount),
      firstCheckedAt: item.firstCheckedAt.toISOString(),
      lastCheckedAt: item.lastCheckedAt.toISOString(),
      monthlyCheckCounts: Array.isArray(item.monthlyCheckCounts) ? item.monthlyCheckCounts : [],
      stockStatusBreakdown: item.stockStatusBreakdown,
    }))
  }

  /**
   * セッション時間の平均を計算
   */
  private calculateAverageSessionDuration(
    sessions: { startedAt: Date; completedAt: Date | null }[]
  ): number {
    if (sessions.length === 0) {
      return 0
    }

    const totalMinutes = sessions.reduce((total, session) => {
      if (!session.completedAt) {
        return total
      }

      const durationMs = session.completedAt.getTime() - session.startedAt.getTime()
      const durationMinutes = durationMs / (1000 * 60)
      return total + durationMinutes
    }, 0)

    return totalMinutes / sessions.length
  }
}
