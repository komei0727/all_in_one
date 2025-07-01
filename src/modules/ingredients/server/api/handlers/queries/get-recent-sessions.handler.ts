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

      let limit = 10 // デフォルト値

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

        // 範囲チェック（1-100）
        if (parsedLimit < 1 || parsedLimit > 100) {
          return new Response(
            JSON.stringify({
              message: 'Validation failed',
              errors: [
                {
                  field: 'limit',
                  message: 'limit must be between 1 and 100',
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

      // クエリを作成して実行
      const query = new GetRecentSessionsQuery(userId, limit)
      const sessions = await this.getRecentSessionsHandler.handle(query)

      // レスポンスを作成
      const response = {
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
