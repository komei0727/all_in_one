import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'

import { AbandonShoppingSessionCommand } from '../../../application/commands/abandon-shopping-session.command'
import { abandonShoppingSessionValidator } from '../../validators/abandon-shopping-session.validator'

import type { AbandonShoppingSessionHandler } from '../../../application/commands/abandon-shopping-session.handler'
import type { AbandonShoppingSessionRequest } from '../../validators/abandon-shopping-session.validator'

/**
 * セッション中断APIハンドラー
 * BaseApiHandlerを継承して統一的な例外変換とエラーハンドリングを提供
 */
export class AbandonShoppingSessionApiHandler extends BaseApiHandler<
  AbandonShoppingSessionRequest,
  void
> {
  constructor(private readonly commandHandler: AbandonShoppingSessionHandler) {
    super()
  }

  /**
   * リクエストデータのバリデーション
   * @param data バリデーション対象のデータ（パスパラメータ + ボディデータ）
   * @returns バリデーション済みのリクエストデータ
   */
  validate(data: unknown): AbandonShoppingSessionRequest {
    return abandonShoppingSessionValidator.parse(data)
  }

  /**
   * セッション中断のビジネスロジックを実行
   * @param request バリデーション済みのリクエストデータ
   * @param userId 認証済みユーザーID
   */
  async execute(request: AbandonShoppingSessionRequest, userId: string): Promise<void> {
    // コマンドを作成してアプリケーション層のハンドラーに委譲
    const command = new AbandonShoppingSessionCommand(request.sessionId, userId)
    await this.commandHandler.handle(command)
  }
}
