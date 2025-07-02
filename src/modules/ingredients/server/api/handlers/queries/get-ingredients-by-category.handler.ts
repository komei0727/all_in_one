import { NotFoundException } from '../../../domain/exceptions'

import type { GetIngredientsByCategoryHandler } from '../../../application/queries/get-ingredients-by-category.handler'

/**
 * カテゴリー別食材取得APIハンドラー
 * HTTPリクエストを処理し、アプリケーション層のハンドラーに委譲する
 */
export class GetIngredientsByCategoryApiHandler {
  constructor(private readonly queryHandler: GetIngredientsByCategoryHandler) {}

  /**
   * カテゴリー別食材取得APIを処理
   * @param request HTTPリクエスト
   * @param params パラメータ
   * @param userId 認証済みユーザーID
   * @returns HTTPレスポンス
   */
  async handle(
    request: Request,
    params: { categoryId: string; sortBy: string },
    userId: string
  ): Promise<Response> {
    try {
      // バリデーション
      const categoryIdPattern = /^cat_[a-zA-Z0-9]{20,30}$/
      if (!categoryIdPattern.test(params.categoryId)) {
        return new Response(
          JSON.stringify({
            message: 'Validation failed',
            errors: [
              {
                path: ['categoryId'],
                message: 'Invalid category ID format',
              },
            ],
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // ソート項目のバリデーション
      const validSortOptions = ['stockStatus', 'name']
      if (!validSortOptions.includes(params.sortBy)) {
        return new Response(
          JSON.stringify({
            message: 'Validation failed',
            errors: [
              {
                path: ['sortBy'],
                message: 'Invalid sort option. Must be one of: stockStatus, name',
              },
            ],
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // クエリハンドラーを実行
      const result = await this.queryHandler.handle({
        categoryId: params.categoryId,
        userId,
        sortBy: params.sortBy as 'stockStatus' | 'name',
      })

      // DTOをレスポンス形式に変換
      const responseData = result.toJSON()

      // 成功レスポンスを返す
      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      // ドメイン例外のハンドリング
      if (error instanceof NotFoundException) {
        return new Response(
          JSON.stringify({
            message: error.message,
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // エラーログを出力
      console.error('Failed to get ingredients by category:', error)
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error?.constructor?.name,
        categoryId: params.categoryId,
        userId,
        sortBy: params.sortBy,
      })

      // 内部エラーレスポンスを返す（エラー詳細を含める）
      return new Response(
        JSON.stringify({
          message: 'Internal server error',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}
