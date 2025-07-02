import { type GetRecentSessionsHandler } from '@/modules/ingredients/server/application/queries/get-recent-sessions.handler'
import { GetRecentSessionsQuery } from '@/modules/ingredients/server/application/queries/get-recent-sessions.query'

/**
 * 直近のショッピングセッション履歴取得APIハンドラー
 */
export class GetRecentSessionsApiHandler {
  constructor(private readonly getRecentSessionsHandler: GetRecentSessionsHandler) {}

  async handle(request: Request, userId: string): Promise<Response> {
    try {
      // URLからクエリパラメータを取得
      const url = new URL(request.url, 'http://localhost')
      const limitParam = url.searchParams.get('limit')
      const pageParam = url.searchParams.get('page')

      let limit = 10 // デフォルト値
      let page = 1 // デフォルト値

      // limitのバリデーション
      if (limitParam) {
        const parsedLimit = parseInt(limitParam, 10)

        // 数値でない場合
        if (isNaN(parsedLimit)) {
          return new Response(
            JSON.stringify({
              message: 'Validation failed',
              errors: [
                {
                  field: 'limit',
                  message: 'limit must be a valid integer',
                },
              ],
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        // 範囲チェック（1-50）- API仕様書に合わせて修正
        if (parsedLimit < 1 || parsedLimit > 50) {
          return new Response(
            JSON.stringify({
              message: 'Validation failed',
              errors: [
                {
                  field: 'limit',
                  message: 'limit must be between 1 and 50',
                },
              ],
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        limit = parsedLimit
      }

      // pageのバリデーション
      if (pageParam) {
        const parsedPage = parseInt(pageParam, 10)

        // 数値でない場合
        if (isNaN(parsedPage)) {
          return new Response(
            JSON.stringify({
              message: 'Validation failed',
              errors: [
                {
                  field: 'page',
                  message: 'page must be a valid integer',
                },
              ],
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        // 範囲チェック（1以上）
        if (parsedPage < 1) {
          return new Response(
            JSON.stringify({
              message: 'Validation failed',
              errors: [
                {
                  field: 'page',
                  message: 'page must be greater than or equal to 1',
                },
              ],
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        page = parsedPage
      }

      // クエリを作成して実行
      const query = new GetRecentSessionsQuery(userId, limit, page)
      const sessions = await this.getRecentSessionsHandler.handle(query)

      // ページネーション情報の計算
      // TODO: 現在の実装では総件数が取得できないため、仮の実装
      // 将来的にはShoppingQueryServiceでページネーション対応が必要
      const totalSessions = sessions.length
      const totalPages = Math.ceil(totalSessions / limit)
      const hasNext = page < totalPages
      const hasPrev = page > 1

      // API仕様書に準拠したレスポンスフォーマット
      const response = {
        data: sessions.map((session) => ({
          sessionId: session.sessionId,
          status: session.status,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
          duration: session.completedAt
            ? Math.floor(
                (new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) /
                  1000
              )
            : 0, // 秒単位
          checkedItemsCount: session.checkedItems?.length || 0,
          totalSpent: undefined, // TODO: 将来の実装で追加
          deviceType: session.deviceType,
          location: session.location,
        })),
        pagination: {
          page,
          limit,
          total: totalSessions,
          totalPages,
          hasNext,
          hasPrev,
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      // 予期しないエラー
      console.error('Unexpected error in GetRecentSessionsApiHandler:', error)
      return new Response(
        JSON.stringify({
          message: 'Internal server error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}
