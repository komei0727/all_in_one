import { type GetShoppingStatisticsHandler } from '@/modules/ingredients/server/application/queries/get-shopping-statistics.handler'
import { GetShoppingStatisticsQuery } from '@/modules/ingredients/server/application/queries/get-shopping-statistics.query'

/**
 * 買い物統計取得APIハンドラー
 */
export class GetShoppingStatisticsApiHandler {
  constructor(private readonly getShoppingStatisticsHandler: GetShoppingStatisticsHandler) {}

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
      const periodDaysParam = url.searchParams.get('periodDays')

      let periodDays = 30 // デフォルト値

      // periodDaysのバリデーション
      if (periodDaysParam) {
        const parsedPeriodDays = parseInt(periodDaysParam, 10)

        // 数値でない場合
        if (isNaN(parsedPeriodDays)) {
          return new Response(
            JSON.stringify({
              message: 'Validation failed',
              errors: [
                {
                  field: 'periodDays',
                  message: 'periodDays must be a valid integer',
                },
              ],
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        // 範囲チェック（1-365）
        if (parsedPeriodDays < 1 || parsedPeriodDays > 365) {
          return new Response(
            JSON.stringify({
              message: 'Validation failed',
              errors: [
                {
                  field: 'periodDays',
                  message: 'periodDays must be between 1 and 365',
                },
              ],
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        periodDays = parsedPeriodDays
      }

      // クエリを作成して実行
      const query = new GetShoppingStatisticsQuery(userId, periodDays)
      const statistics = await this.getShoppingStatisticsHandler.handle(query)

      // レスポンスを作成
      const response = {
        statistics,
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      // 予期しないエラー
      console.error('Unexpected error in GetShoppingStatisticsApiHandler:', error)
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
