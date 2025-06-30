import { DeleteIngredientCommand } from '../../../application/commands/delete-ingredient.command'
import { ValidationException } from '../../../domain/exceptions'

import type { DeleteIngredientHandler } from '../../../application/commands/delete-ingredient.handler'

/**
 * 食材削除APIハンドラー
 */
export class DeleteIngredientApiHandler {
  constructor(private readonly deleteIngredientHandler: DeleteIngredientHandler) {}

  /**
   * HTTPリクエストを処理して食材を削除する
   */
  async handle(params: { id: string }, userId: string): Promise<void> {
    // プレフィックス付きCUID形式のバリデーション（ing_で始まるCUID v2）
    const ingredientIdRegex = /^ing_[0-9a-z]{24}$/
    if (!ingredientIdRegex.test(params.id)) {
      throw new ValidationException('無効なIDフォーマットです。食材IDはing_で始まる必要があります')
    }

    // コマンドを作成
    const command = new DeleteIngredientCommand(params.id, userId)

    // ハンドラーを実行
    await this.deleteIngredientHandler.execute(command)
  }
}
