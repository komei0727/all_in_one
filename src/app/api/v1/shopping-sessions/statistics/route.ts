import { type NextRequest } from 'next/server'

import { GetShoppingStatisticsQuery } from '@/modules/ingredients/server/application/queries/get-shopping-statistics.query'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

/**
 * 買い物統計取得API
 * GET /api/v1/shopping-sessions/statistics
 */
export async function GET(request: NextRequest) {
  try {
    // ユーザーIDを取得
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'ユーザー認証が必要です',
          },
        },
        { status: 401 }
      )
    }

    // クエリパラメータを取得・バリデーション
    const { searchParams } = new URL(request.url)
    const periodDaysParam = searchParams.get('periodDays')

    let periodDays = 30 // デフォルト値
    if (periodDaysParam) {
      const parsedPeriodDays = parseInt(periodDaysParam, 10)
      if (isNaN(parsedPeriodDays) || parsedPeriodDays < 1 || parsedPeriodDays > 365) {
        return Response.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'periodDaysは1以上365以下の整数である必要があります',
            },
          },
          { status: 400 }
        )
      }
      periodDays = parsedPeriodDays
    }

    // クエリとハンドラーを使用
    const compositionRoot = CompositionRoot.getInstance()
    const handler = compositionRoot.getGetShoppingStatisticsHandler()

    // クエリを作成してハンドラーを実行
    const query = new GetShoppingStatisticsQuery(userId, periodDays)
    const statistics = await handler.handle(query)

    // レスポンスを構築
    const responseData = {
      success: true,
      data: {
        statistics: {
          totalSessions: statistics.totalSessions,
          totalCheckedIngredients: statistics.totalCheckedIngredients,
          averageSessionDurationMinutes: statistics.averageSessionDurationMinutes,
          topCheckedIngredients: statistics.topCheckedIngredients.map((ingredient) => ({
            ingredientId: ingredient.ingredientId,
            ingredientName: ingredient.ingredientName,
            checkCount: ingredient.checkCount,
            checkRatePercentage: ingredient.checkRatePercentage,
          })),
          monthlySessionCounts: statistics.monthlySessionCounts.map((count) => ({
            yearMonth: count.yearMonth,
            sessionCount: count.sessionCount,
          })),
        },
      },
    }

    return Response.json(responseData, { status: 200 })
  } catch (error) {
    // エラーログを出力（本来はロガーを使用）
    console.error('Shopping statistics API error:', error)

    return Response.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'サーバー内部エラーが発生しました',
        },
      },
      { status: 500 }
    )
  }
}
