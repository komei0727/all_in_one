import { type GetIngredientCheckStatisticsHandler } from '@/modules/ingredients/server/application/queries/get-ingredient-check-statistics.handler'
import { GetIngredientCheckStatisticsQuery } from '@/modules/ingredients/server/application/queries/get-ingredient-check-statistics.query'

import { getIngredientCheckStatisticsSchema } from '../../validators/get-ingredient-check-statistics.validator'

/**
 * 食材チェック統計取得APIハンドラー
 * HTTPリクエストを処理し、アプリケーション層のハンドラーに委譲する
 */
export class GetIngredientCheckStatisticsApiHandler {
  constructor(
    private readonly getIngredientCheckStatisticsHandler: GetIngredientCheckStatisticsHandler
  ) {}

  /**
   * 食材チェック統計取得APIを処理
   * @param request HTTPリクエスト
   * @param userId 認証済みユーザーID
   * @returns HTTPレスポンス
   */
  async handle(request: Request, userId: string): Promise<Response> {
    try {
      // URLパラメータを取得
      const url = new URL(request.url)
      const ingredientId = url.searchParams.get('ingredientId') || undefined

      // パラメータをバリデーション
      const validationResult = getIngredientCheckStatisticsSchema.safeParse({
        userId,
        ingredientId,
      })

      if (!validationResult.success) {
        // バリデーションエラーをレスポンス形式に変換
        const errors = validationResult.error.errors.map((error) => ({
          field: error.path.join('.'),
          message: error.message,
        }))

        return new Response(
          JSON.stringify({
            message: 'Validation failed',
            errors,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // アプリケーション層のハンドラーを呼び出し
      const query = new GetIngredientCheckStatisticsQuery(
        validationResult.data.userId,
        validationResult.data.ingredientId
      )
      const statistics = await this.getIngredientCheckStatisticsHandler.handle(query)

      // 成功レスポンスを返す
      return new Response(
        JSON.stringify({
          statistics,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } catch (error) {
      // エラーログを出力
      console.error('Failed to get ingredient check statistics:', error)

      // 内部エラーレスポンスを返す
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
