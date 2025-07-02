import { AbandonShoppingSessionCommand } from '../../../application/commands/abandon-shopping-session.command'
import { BusinessRuleException, NotFoundException } from '../../../domain/exceptions'

import type { AbandonShoppingSessionHandler } from '../../../application/commands/abandon-shopping-session.handler'

/**
 * セッション中断APIハンドラー
 * HTTPリクエストを処理し、アプリケーション層のハンドラーに委譲する
 */
export class AbandonShoppingSessionApiHandler {
  constructor(private readonly commandHandler: AbandonShoppingSessionHandler) {}

  /**
   * セッション中断APIを処理
   * @param request HTTPリクエスト
   * @param params パスパラメータ
   * @param userId 認証済みユーザーID
   * @returns HTTPレスポンス
   */
  async handle(request: Request, params: { sessionId: string }, userId: string): Promise<Response> {
    try {
      // リクエストボディを取得（オプション）
      let reason: string | undefined
      try {
        const body = (await request.json()) as Record<string, unknown>
        reason = body.reason as string | undefined
      } catch {
        // ボディが空の場合は無視
      }

      // バリデーション
      const sessionIdPattern = /^ses_[a-zA-Z0-9]{20,30}$/
      if (!sessionIdPattern.test(params.sessionId)) {
        return new Response(
          JSON.stringify({
            message: 'Validation failed',
            errors: [
              {
                path: ['sessionId'],
                message: 'Invalid session ID format',
              },
            ],
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // コマンドを作成して実行
      const command = new AbandonShoppingSessionCommand(params.sessionId, userId, reason)
      const result = await this.commandHandler.handle(command)

      // 成功レスポンスを返す（toJSON()を使用してフォーマット）
      return new Response(JSON.stringify(result.toJSON().data), {
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

      if (error instanceof BusinessRuleException) {
        return new Response(
          JSON.stringify({
            message: error.message,
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // エラーログを出力
      console.error('Failed to abandon shopping session:', error)

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
