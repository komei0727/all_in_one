import { Decimal } from '@prisma/client/runtime/library'

import type { PrismaClient } from '@/generated/prisma'

import { CheckedItemDto } from '../../application/dtos/checked-item.dto'
import { ShoppingSessionDto } from '../../application/dtos/shopping-session.dto'

import type {
  ShoppingQueryService,
  ShoppingStatistics,
  QuickAccessIngredient,
  IngredientCheckStatistics,
  TopCheckedIngredient,
  MonthlyCheckCount,
  SessionHistoryCriteria,
  SessionHistoryResult,
  RecentSessionsResult,
} from '../../application/query-services/shopping-query-service.interface'

/**
 * Prismaを使用した買い物クエリサービス実装
 */
export class PrismaShoppingQueryService implements ShoppingQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * ユーザーの直近の買い物セッション履歴を取得
   */
  async getRecentSessions(userId: string, limit = 10, page = 1): Promise<RecentSessionsResult> {
    // オフセットを計算
    const offset = (page - 1) * limit

    // 並行してデータと総件数を取得
    const [sessions, totalCount] = await Promise.all([
      this.prisma.shoppingSession.findMany({
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
        skip: offset,
      }),
      this.prisma.shoppingSession.count({
        where: { userId },
      }),
    ])

    // セッションデータをDTOに変換
    const sessionDtos = sessions.map((session) => {
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

      // セッション中に確認した食材の価格を合計
      const totalSpent = session.sessionItems
        .map((item) => item.ingredient.price)
        .filter((price): price is Decimal => price !== null)
        .reduce((sum, price) => sum.add(price), new Decimal(0))

      return new ShoppingSessionDto(
        session.id,
        session.userId,
        session.status,
        session.startedAt.toISOString(),
        session.completedAt?.toISOString() ?? null,
        session.deviceType,
        session.locationLat && session.locationLng
          ? {
              latitude: Number(session.locationLat),
              longitude: Number(session.locationLng),
              name: session.locationName ?? undefined,
            }
          : null,
        checkedItems,
        totalSpent.gt(0) ? Number(totalSpent) : undefined
      )
    })

    // ページネーション情報を計算
    const totalPages = Math.ceil(totalCount / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    return {
      data: sessionDtos,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext,
        hasPrev,
      },
    }
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

      // 頻繁にチェックされた食材Top5の基本データ
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

      // 月別セッション数の取得
      // Prismaのnativeクエリを使用してデータベース依存を回避
      this.prisma.shoppingSession
        .findMany({
          where: {
            userId,
            startedAt: {
              gte: startDate,
            },
          },
          select: {
            startedAt: true,
          },
        })
        .then((sessions) => {
          // JavaScriptで月別に集計
          const monthlyCounts = new Map<string, number>()

          sessions.forEach((session) => {
            const yearMonth = `${session.startedAt.getFullYear()}-${String(session.startedAt.getMonth() + 1).padStart(2, '0')}`
            monthlyCounts.set(yearMonth, (monthlyCounts.get(yearMonth) || 0) + 1)
          })

          return Array.from(monthlyCounts.entries())
            .map(([yearMonth, sessionCount]) => ({
              yearMonth,
              sessionCount,
            }))
            .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
        }),

      // セッション時間計算用データ
      this.prisma.shoppingSession.findMany({
        where: {
          userId,
          startedAt: {
            gte: startDate,
          },
          completedAt: {
            not: null,
          },
        },
        select: {
          startedAt: true,
          completedAt: true,
        },
      }),
    ])

    // 平均セッション時間を計算
    const averageSessionDurationMinutes = this.calculateAverageSessionDuration(sessionDurations)

    // 各頻繁チェック食材の最終チェック日時を取得
    const topCheckedIngredientsFormatted: TopCheckedIngredient[] = await Promise.all(
      topCheckedIngredients.map(async (item) => {
        // 該当食材の最新のチェック日時を取得
        const lastCheckedItem = await this.prisma.shoppingSessionItem.findFirst({
          where: {
            ingredientId: item.ingredientId,
            session: {
              userId,
              startedAt: {
                gte: startDate,
              },
            },
          },
          orderBy: {
            checkedAt: 'desc',
          },
          select: {
            checkedAt: true,
          },
        })

        return {
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          checkCount: item._count.id,
          checkRatePercentage:
            totalSessions > 0 ? Math.round((item._count.id / totalSessions) * 100) : 0,
          lastCheckedAt: lastCheckedItem?.checkedAt.toISOString() ?? new Date().toISOString(),
        }
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
  async getQuickAccessIngredients(
    userId: string,
    limit = 20
  ): Promise<{
    recentlyChecked: QuickAccessIngredient[]
    frequentlyChecked: QuickAccessIngredient[]
  }> {
    // 現在の日付を取得
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // 食材情報を含めて全チェック履歴を取得
    const sessionItems = await this.prisma.shoppingSessionItem.findMany({
      where: {
        session: {
          userId,
        },
        ingredient: {
          deletedAt: null,
        },
      },
      include: {
        ingredient: {
          include: {
            category: true,
          },
        },
      },
    })

    // グループ化して集計
    interface GroupedIngredient {
      ingredientId: string
      ingredientName: string
      categoryId: string | null
      categoryName: string | null
      checkCount: number
      lastCheckedAt: Date
      recentCheckCount: number // 30日以内のチェック回数
      ingredient: {
        quantity: number
        threshold: number | null
        bestBeforeDate: Date | null
      }
    }

    const groupedData = sessionItems.reduce(
      (acc, item) => {
        const key = item.ingredientId
        if (!acc[key]) {
          acc[key] = {
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            categoryId: item.ingredient.categoryId,
            categoryName: item.ingredient.category?.name ?? null,
            checkCount: 0,
            lastCheckedAt: item.checkedAt,
            recentCheckCount: 0,
            ingredient: item.ingredient,
          }
        }
        acc[key].checkCount++
        if (item.checkedAt > acc[key].lastCheckedAt) {
          acc[key].lastCheckedAt = item.checkedAt
        }
        // 30日以内のチェックをカウント
        if (item.checkedAt >= thirtyDaysAgo) {
          acc[key].recentCheckCount++
        }
        return acc
      },
      {} as Record<string, GroupedIngredient>
    )

    const allItems = Object.values(groupedData)

    // 最近チェックした食材（30日以内にチェックされた食材を最新順でソート）
    const recentlyCheckedItems = allItems
      .filter((item) => item.lastCheckedAt >= thirtyDaysAgo)
      .sort((a, b) => b.lastCheckedAt.getTime() - a.lastCheckedAt.getTime())
      .slice(0, limit)

    // 頻繁にチェックされる食材（全期間でチェック回数が多い順）
    const frequentlyCheckedItems = allItems
      .sort((a, b) => {
        if (b.checkCount !== a.checkCount) {
          return b.checkCount - a.checkCount
        }
        return b.lastCheckedAt.getTime() - a.lastCheckedAt.getTime()
      })
      .slice(0, limit)

    // 重複を除去（recentlyCheckedに含まれる食材をfrequentlyCheckedから除外）
    const recentlyCheckedIds = new Set(recentlyCheckedItems.map((item) => item.ingredientId))
    const uniqueFrequentlyCheckedItems = frequentlyCheckedItems
      .filter((item) => !recentlyCheckedIds.has(item.ingredientId))
      .slice(0, limit)

    // QuickAccessIngredient形式に変換する関数
    const mapToQuickAccessIngredient = (item: GroupedIngredient): QuickAccessIngredient => {
      // 在庫状態を計算
      let currentStockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
      if (item.ingredient.quantity <= 0) {
        currentStockStatus = 'OUT_OF_STOCK'
      } else if (
        item.ingredient.threshold &&
        item.ingredient.quantity <= item.ingredient.threshold
      ) {
        currentStockStatus = 'LOW_STOCK'
      } else {
        currentStockStatus = 'IN_STOCK'
      }

      // 期限状態を計算
      let currentExpiryStatus: 'FRESH' | 'NEAR_EXPIRY' | 'EXPIRING_SOON' | 'CRITICAL' | 'EXPIRED' =
        'FRESH'
      if (item.ingredient.bestBeforeDate) {
        const diffDays = Math.ceil(
          (item.ingredient.bestBeforeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (diffDays < 0) {
          currentExpiryStatus = 'EXPIRED'
        } else if (diffDays <= 1) {
          currentExpiryStatus = 'CRITICAL'
        } else if (diffDays <= 3) {
          currentExpiryStatus = 'EXPIRING_SOON'
        } else if (diffDays <= 7) {
          currentExpiryStatus = 'NEAR_EXPIRY'
        }
      }

      return {
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        categoryId: item.categoryId ?? '',
        categoryName: item.categoryName ?? '未分類',
        checkCount: item.checkCount,
        lastCheckedAt: item.lastCheckedAt.toISOString(),
        currentStockStatus,
        currentExpiryStatus,
      }
    }

    return {
      recentlyChecked: recentlyCheckedItems.map(mapToQuickAccessIngredient),
      frequentlyChecked: uniqueFrequentlyCheckedItems.map(mapToQuickAccessIngredient),
    }
  }

  /**
   * 食材ごとのチェック履歴統計を取得
   */
  async getIngredientCheckStatistics(
    userId: string,
    ingredientId?: string
  ): Promise<IngredientCheckStatistics[]> {
    // Prisma ORMを使用してクエリを構築（SQLiteとPostgreSQL両方で動作）
    const whereClause = {
      session: {
        userId,
      },
      ingredient: {
        deletedAt: null,
      },
      ...(ingredientId && { ingredientId }),
    }

    const sessionItems = await this.prisma.shoppingSessionItem.findMany({
      where: whereClause,
      include: {
        ingredient: true,
      },
      orderBy: {
        checkedAt: 'desc',
      },
    })

    // グループ化して集計
    interface GroupedStatistics {
      ingredientId: string
      ingredientName: string
      checks: Array<{
        checkedAt: Date
        stockStatus: string
      }>
    }

    const groupedData = sessionItems.reduce(
      (acc, item) => {
        const key = item.ingredientId
        if (!acc[key]) {
          acc[key] = {
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            checks: [],
          }
        }
        acc[key].checks.push({
          checkedAt: item.checkedAt,
          stockStatus: item.stockStatus,
        })
        return acc
      },
      {} as Record<string, GroupedStatistics>
    )

    // 各食材の統計を計算
    const result = Object.values(groupedData).map((item) => {
      const checks = item.checks
      const firstCheckedAt = checks[checks.length - 1].checkedAt
      const lastCheckedAt = checks[0].checkedAt

      // 月別のチェック回数を計算
      const monthlyChecks = checks.reduce((acc: Record<string, number>, check) => {
        const yearMonth = `${check.checkedAt.getFullYear()}-${String(check.checkedAt.getMonth() + 1).padStart(2, '0')}`
        acc[yearMonth] = (acc[yearMonth] || 0) + 1
        return acc
      }, {})

      const monthlyCheckCounts: MonthlyCheckCount[] = Object.entries(monthlyChecks).map(
        ([yearMonth, checkCount]) => ({
          yearMonth,
          checkCount: checkCount as number,
        })
      )

      // 在庫状態の内訳を計算
      const stockStatusBreakdown = {
        inStockChecks: checks.filter((c) => c.stockStatus === 'IN_STOCK').length,
        lowStockChecks: checks.filter((c) => c.stockStatus === 'LOW_STOCK').length,
        outOfStockChecks: checks.filter((c) => c.stockStatus === 'OUT_OF_STOCK').length,
      }

      return {
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        totalCheckCount: checks.length,
        firstCheckedAt: firstCheckedAt.toISOString(),
        lastCheckedAt: lastCheckedAt.toISOString(),
        monthlyCheckCounts,
        stockStatusBreakdown,
      }
    })

    // チェック回数の多い順にソート
    return result.sort((a, b) => b.totalCheckCount - a.totalCheckCount)
  }

  /**
   * ユーザーの買い物セッション履歴を検索条件付きで取得
   */
  async getSessionHistory(
    userId: string,
    criteria: SessionHistoryCriteria
  ): Promise<SessionHistoryResult> {
    const { page = 1, limit = 20, from, to, status } = criteria

    // WHERE条件の構築
    const where: {
      userId: string
      startedAt?: { gte?: Date; lte?: Date }
      status?: 'COMPLETED' | 'ABANDONED'
    } = { userId }

    // 日付範囲フィルタ
    if (from || to) {
      where.startedAt = {}
      if (from) {
        where.startedAt.gte = new Date(from)
      }
      if (to) {
        where.startedAt.lte = new Date(to)
      }
    }

    // ステータスフィルタ
    if (status) {
      where.status = status as 'COMPLETED' | 'ABANDONED'
    }

    // 総件数を取得
    const total = await this.prisma.shoppingSession.count({ where })

    // ページネーション計算
    const skip = (page - 1) * limit
    const totalPages = Math.ceil(total / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    // セッションデータを取得（食材の価格情報も含める）
    const sessions = await this.prisma.shoppingSession.findMany({
      where,
      include: {
        sessionItems: {
          include: {
            ingredient: {
              select: {
                price: true,
              },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit,
    })

    // レスポンスデータの構築
    const data = sessions.map((session) => {
      const duration = session.completedAt
        ? Math.floor((session.completedAt.getTime() - session.startedAt.getTime()) / 1000)
        : 0

      // セッション中に確認した食材の価格を合計
      const totalSpent = session.sessionItems
        .map((item) => item.ingredient.price)
        .filter((price): price is Decimal => price !== null)
        .reduce((sum, price) => sum.add(price), new Decimal(0))

      return {
        sessionId: session.id,
        status: session.status as 'COMPLETED' | 'ABANDONED',
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt?.toISOString(),
        duration,
        checkedItemsCount: session.sessionItems.length,
        totalSpent: totalSpent.gt(0) ? Number(totalSpent) : undefined,
        deviceType: session.deviceType as 'MOBILE' | 'TABLET' | 'DESKTOP' | undefined,
        location:
          session.locationLat && session.locationLng
            ? {
                name: session.locationName ?? undefined,
                latitude: Number(session.locationLat),
                longitude: Number(session.locationLng),
              }
            : undefined,
      }
    })

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    }
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
