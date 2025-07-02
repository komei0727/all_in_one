import { type GetActiveShoppingSessionHandler } from '@/modules/ingredients/server/application/queries/get-active-shopping-session.handler'
import { GetActiveShoppingSessionQuery } from '@/modules/ingredients/server/application/queries/get-active-shopping-session.query'

/**
 * アクティブな買い物セッション取得APIハンドラー
 */
export class GetActiveShoppingSessionApiHandler {
  constructor(private readonly getActiveShoppingSessionHandler: GetActiveShoppingSessionHandler) {}

  async handle(request: Request, userId: string): Promise<Response> {
    try {
      // クエリを作成して実行
      const query = new GetActiveShoppingSessionQuery(userId)
      const sessionDto = await this.getActiveShoppingSessionHandler.handle(query)

      // セッションが見つからない場合は404を返す
      if (!sessionDto) {
        return new Response(
          JSON.stringify({
            message: 'No active shopping session found',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // レスポンスを作成
      const response = {
        sessionId: sessionDto.sessionId,
        userId: sessionDto.userId,
        status: sessionDto.status,
        startedAt: sessionDto.startedAt,
        completedAt: sessionDto.completedAt,
        deviceType: sessionDto.deviceType,
        location: sessionDto.location,
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      // 予期しないエラー
      console.error('Unexpected error in GetActiveShoppingSessionApiHandler:', error)
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
