import { type NextRequest } from 'next/server'

import { GetIngredientCheckStatisticsQuery } from '@/modules/ingredients/server/application/queries/get-ingredient-check-statistics.query'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

/**
 * 食材チェック統計取得API
 * GET /api/v1/shopping-sessions/ingredient-statistics
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
    const ingredientIdParam = searchParams.get('ingredientId')

    let ingredientId: string | undefined = undefined
    if (ingredientIdParam !== null) {
      // 空文字列の場合はエラー
      if (ingredientIdParam.trim() === '') {
        return Response.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'ingredientIdが空です',
            },
          },
          { status: 400 }
        )
      }

      // 簡単な形式チェック（UUIDっぽい形式）
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(ingredientIdParam.trim())) {
        return Response.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'ingredientIdは有効なUUID形式である必要があります',
            },
          },
          { status: 400 }
        )
      }

      ingredientId = ingredientIdParam.trim()
    }

    // クエリとハンドラーを使用
    const compositionRoot = CompositionRoot.getInstance()
    const handler = compositionRoot.getGetIngredientCheckStatisticsHandler()

    // クエリを作成してハンドラーを実行
    const query = new GetIngredientCheckStatisticsQuery(userId, ingredientId)
    const statistics = await handler.handle(query)

    // レスポンスを構築
    const responseData = {
      success: true,
      data: {
        statistics: statistics.map((statistic) => ({
          ingredientId: statistic.ingredientId,
          ingredientName: statistic.ingredientName,
          totalCheckCount: statistic.totalCheckCount,
          firstCheckedAt: statistic.firstCheckedAt,
          lastCheckedAt: statistic.lastCheckedAt,
          monthlyCheckCounts: statistic.monthlyCheckCounts.map((count) => ({
            yearMonth: count.yearMonth,
            checkCount: count.checkCount,
          })),
          stockStatusBreakdown: {
            inStockChecks: statistic.stockStatusBreakdown.inStockChecks,
            lowStockChecks: statistic.stockStatusBreakdown.lowStockChecks,
            outOfStockChecks: statistic.stockStatusBreakdown.outOfStockChecks,
          },
        })),
      },
    }

    return Response.json(responseData, { status: 200 })
  } catch (error) {
    // エラーログを出力（本来はロガーを使用）
    console.error('Ingredient check statistics API error:', error)

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
