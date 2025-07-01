import { type NextRequest } from 'next/server'

import { GetQuickAccessIngredientsQuery } from '@/modules/ingredients/server/application/queries/get-quick-access-ingredients.query'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

/**
 * クイックアクセス食材取得API
 * GET /api/v1/shopping-sessions/quick-access-ingredients
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
    const limitParam = searchParams.get('limit')

    let limit = 10 // デフォルト値
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10)
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return Response.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'limitは1以上100以下の整数である必要があります',
            },
          },
          { status: 400 }
        )
      }
      limit = parsedLimit
    }

    // クエリとハンドラーを使用
    const compositionRoot = CompositionRoot.getInstance()
    const handler = compositionRoot.getGetQuickAccessIngredientsHandler()

    // クエリを作成してハンドラーを実行
    const query = new GetQuickAccessIngredientsQuery(userId, limit)
    const ingredients = await handler.handle(query)

    // レスポンスを構築
    const responseData = {
      success: true,
      data: {
        ingredients: ingredients.map((ingredient) => ({
          ingredientId: ingredient.ingredientId,
          ingredientName: ingredient.ingredientName,
          checkCount: ingredient.checkCount,
          lastCheckedAt: ingredient.lastCheckedAt,
          currentStockStatus: ingredient.currentStockStatus,
          currentExpiryStatus: ingredient.currentExpiryStatus,
        })),
      },
    }

    return Response.json(responseData, { status: 200 })
  } catch (error) {
    // エラーログを出力（本来はロガーを使用）
    console.error('Quick access ingredients API error:', error)

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
