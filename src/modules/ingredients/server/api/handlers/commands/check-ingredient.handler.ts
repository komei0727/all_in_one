import { CheckIngredientCommand } from '../../../application/commands/check-ingredient.command'

import type { CheckIngredientHandler } from '../../../application/commands/check-ingredient.handler'
import type { ShoppingSessionDto } from '../../../application/dtos/shopping-session.dto'

/**
 * 食材確認APIハンドラー
 * 買い物セッション中に食材をチェックするAPI処理
 */
export class CheckIngredientApiHandler {
  constructor(private readonly commandHandler: CheckIngredientHandler) {}

  /**
   * 食材確認リクエストを処理
   * @param request 食材確認リクエスト
   * @returns 更新されたセッションのDTO
   */
  async handle(request: {
    sessionId: string
    ingredientId: string
    userId: string
  }): Promise<ShoppingSessionDto> {
    // コマンドを作成して実行
    const command = new CheckIngredientCommand(
      request.sessionId,
      request.ingredientId,
      request.userId
    )

    return await this.commandHandler.handle(command)
  }
}
