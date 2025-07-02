import { CheckIngredientCommand } from '../../../application/commands/check-ingredient.command'
import { BusinessRuleException, NotFoundException } from '../../../domain/exceptions'
import { checkIngredientSchema } from '../../validators/check-ingredient.validator'

import type { CheckIngredientHandler } from '../../../application/commands/check-ingredient.handler'

/**
 * 食材確認APIハンドラー
 * HTTPリクエストを処理し、アプリケーション層のハンドラーに委譲する
 */
export class CheckIngredientApiHandler {
  constructor(private readonly commandHandler: CheckIngredientHandler) {}

  /**
   * 食材確認APIを処理
   * @param request HTTPリクエスト
   * @param userId 認証済みユーザーID
   * @param sessionId セッションID（URLパラメータ）
   * @param ingredientId 食材ID（URLパラメータ）
   * @returns HTTPレスポンス
   */
  async handle(
    request: Request,
    userId: string,
    sessionId: string,
    ingredientId: string
  ): Promise<Response> {
    try {
      // パラメータをバリデーション
      const validationResult = checkIngredientSchema.safeParse({
        sessionId,
        ingredientId,
        userId,
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

      // コマンドを作成して実行
      const command = new CheckIngredientCommand(
        validationResult.data.sessionId,
        validationResult.data.ingredientId,
        validationResult.data.userId
      )

      const result = await this.commandHandler.handle(command)

      // 成功レスポンスを返す（DTOの形式に合わせる）
      return new Response(
        JSON.stringify({
          data: result,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
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

      if (error instanceof BusinessRuleException) {
        return new Response(
          JSON.stringify({
            message: error.message,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // エラーログを出力
      console.error('Failed to check ingredient:', error)

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
