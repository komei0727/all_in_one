import { type NextRequest } from 'next/server'

import { GetRecentSessionsQuery } from '@/modules/ingredients/server/application/queries/get-recent-sessions.query'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

/**
 * 買い物セッション履歴取得API
 * GET /api/v1/shopping-sessions/history
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
    const handler = compositionRoot.getGetRecentSessionsHandler()

    // クエリを作成してハンドラーを実行
    const query = new GetRecentSessionsQuery(userId, limit)
    const sessions = await handler.handle(query)

    // レスポンスを構築
    const responseData = {
      success: true,
      data: {
        sessions: sessions.map((session) => ({
          sessionId: session.sessionId,
          userId: session.userId,
          status: session.status,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
          deviceType: session.deviceType,
          location: session.location,
          checkedItems: session.checkedItems?.map((item) => ({
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            stockStatus: item.stockStatus,
            expiryStatus: item.expiryStatus,
            checkedAt: item.checkedAt,
          })),
        })),
      },
    }

    return Response.json(responseData, { status: 200 })
  } catch (error) {
    // エラーログを出力（本来はロガーを使用）
    console.error('Session history API error:', error)

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
