import { GetIngredientByIdQuery } from '../../../application/queries/get-ingredient-by-id.query'
import { ValidationException } from '../../../domain/exceptions'

import type { IngredientDto } from '../../../application/dtos/ingredient.dto'
import type { GetIngredientByIdHandler } from '../../../application/queries/get-ingredient-by-id.handler'

/**
 * 食材詳細取得APIハンドラー
 */
export class GetIngredientByIdApiHandler {
  constructor(private readonly getIngredientByIdHandler: GetIngredientByIdHandler) {}

  /**
   * HTTPリクエストを処理して食材詳細を返す
   */
  async handle(
    params: { id: string },
    userId: string
  ): Promise<ReturnType<IngredientDto['toJSON']>> {
    // UUID形式のバリデーション
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(params.id)) {
      throw new ValidationException('無効なIDフォーマットです')
    }

    // クエリを実行
    const query = new GetIngredientByIdQuery(userId, params.id)
    const result = await this.getIngredientByIdHandler.execute(query)

    return result.toJSON()
  }
}
