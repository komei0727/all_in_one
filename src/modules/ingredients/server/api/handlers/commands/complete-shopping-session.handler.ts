import { ZodError } from 'zod'

import { type CompleteShoppingSessionHandler } from '@/modules/ingredients/server/application/commands/complete-shopping-session.handler'
import {
  BusinessRuleException,
  NotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import { ValidationException } from '@/modules/shared/server/domain/exceptions/validation.exception'

import { completeShoppingSessionValidator } from '../../validators/complete-shopping-session.validator'

export class CompleteShoppingSessionApiHandler {
  constructor(private readonly completeShoppingSessionHandler: CompleteShoppingSessionHandler) {}

  async handle(request: Request, params: { sessionId: string }, userId: string): Promise<Response> {
    try {
      // パラメータのバリデーション
      const validatedParams = completeShoppingSessionValidator.parse({
        sessionId: params.sessionId,
      })

      // コマンドハンドラーを実行
      const result = await this.completeShoppingSessionHandler.handle({
        sessionId: validatedParams.sessionId,
        userId,
      })

      // レスポンスを作成
      const response = {
        sessionId: result.sessionId,
        userId: result.userId,
        status: result.status,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        deviceType: result.deviceType,
        location: result.location,
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      // エラーハンドリング
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            message: 'Validation failed',
            errors: error.errors,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      if (error instanceof ValidationException) {
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
        const statusCode = error.message.includes('権限がありません') ? 403 : 409
        return new Response(
          JSON.stringify({
            message: error.message,
          }),
          {
            status: statusCode,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // 予期しないエラー
      console.error('Unexpected error in CompleteShoppingSessionApiHandler:', error)
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
