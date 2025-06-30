import { IngredientDetailViewMapper } from '../../../application/mappers/ingredient-detail-view.mapper'
import { GetIngredientByIdQuery } from '../../../application/queries/get-ingredient-by-id.query'
import { ValidationException } from '../../../domain/exceptions'

import type { GetIngredientByIdHandler } from '../../../application/queries/get-ingredient-by-id.handler'

/**
 * 食材詳細取得APIハンドラー
 * QueryServiceベースの新実装とレガシーAPI仕様の橋渡し
 */
export class GetIngredientByIdApiHandler {
  constructor(private readonly getIngredientByIdHandler: GetIngredientByIdHandler) {}

  /**
   * HTTPリクエストを処理して食材詳細を返す
   * 既存のAPI仕様との後方互換性を保つ
   */
  async handle(
    params: { id: string },
    userId: string
  ): Promise<{
    ingredient: {
      id: string
      userId: string
      name: string
      category: { id: string; name: string } | null
      price: number | null
      purchaseDate: string
      expiryInfo: {
        bestBeforeDate: string | null
        useByDate: string | null
      } | null
      stock: {
        quantity: number
        unit: {
          id: string
          name: string
          symbol: string
        }
        storageLocation: {
          type: string
          detail: string | null
        }
        threshold: number | null
      }
      memo: string | null
      createdAt: string
      updatedAt: string
    }
  }> {
    // プレフィックス付きCUID形式のバリデーション（ing_で始まるCUID v2）
    const ingredientIdRegex = /^ing_[0-9a-z]{24}$/
    if (!ingredientIdRegex.test(params.id)) {
      throw new ValidationException('無効なIDフォーマットです。食材IDはing_で始まる必要があります')
    }

    // クエリを実行（新しいQueryService経由）
    const query = new GetIngredientByIdQuery(userId, params.id)
    const ingredientDetailView = await this.getIngredientByIdHandler.execute(query)

    // 既存のAPI仕様に合致する形式に変換
    return IngredientDetailViewMapper.toApiResponse(ingredientDetailView)
  }
}
