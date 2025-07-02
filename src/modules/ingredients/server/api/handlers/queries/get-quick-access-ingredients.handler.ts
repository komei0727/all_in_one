import { type GetQuickAccessIngredientsHandler } from '@/modules/ingredients/server/application/queries/get-quick-access-ingredients.handler'
import { GetQuickAccessIngredientsQuery } from '@/modules/ingredients/server/application/queries/get-quick-access-ingredients.query'

/**
 * クイックアクセス食材取得APIハンドラー
 * HTTPリクエストを受け取り、アプリケーション層のクエリハンドラーを呼び出す
 */
export class GetQuickAccessIngredientsApiHandler {
  constructor(
    private readonly getQuickAccessIngredientsHandler: GetQuickAccessIngredientsHandler
  ) {}

  /**
   * クイックアクセス食材の取得リクエストを処理
   * @param request HTTPリクエスト
   * @param userId ユーザーID
   * @returns クイックアクセス食材のレスポンス
   */
  async handle(request: Request, userId: string): Promise<Response> {
    try {
      // URLからクエリパラメータを取得
      let url: URL
      try {
        // request.urlが相対URLの場合でも動作するようにベースURLを指定
        url = new URL(request.url, 'http://localhost')
      } catch (urlError) {
        console.error('URL parsing error:', urlError, 'Request URL:', request.url)
        throw urlError
      }
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
      const query = new GetQuickAccessIngredientsQuery(userId, limit)
      const ingredients = await this.getQuickAccessIngredientsHandler.handle(query)

      // レスポンスを作成
      const response = {
        ingredients,
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      // 予期しないエラー
      console.error('Unexpected error in GetQuickAccessIngredientsApiHandler:', error)
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
