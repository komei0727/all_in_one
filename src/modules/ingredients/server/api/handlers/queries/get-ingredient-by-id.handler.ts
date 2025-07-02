import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'

import { IngredientDetailViewMapper } from '../../../application/mappers/ingredient-detail-view.mapper'
import { GetIngredientByIdQuery } from '../../../application/queries/get-ingredient-by-id.query'
import { ValidationException } from '../../../domain/exceptions'

import type { GetIngredientByIdHandler } from '../../../application/queries/get-ingredient-by-id.handler'

/**
 * GetIngredientByIdリクエストの型定義
 */
interface GetIngredientByIdRequest {
  id: string
}

/**
 * GetIngredientByIdレスポンスの型定義
 * 既存のAPI仕様との後方互換性を保つ
 */
interface GetIngredientByIdResponse {
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
}

/**
 * 食材詳細取得APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class GetIngredientByIdApiHandler extends BaseApiHandler<
  GetIngredientByIdRequest,
  GetIngredientByIdResponse
> {
  constructor(private readonly getIngredientByIdHandler: GetIngredientByIdHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * 食材IDのフォーマットを検証
   */
  validate(data: unknown): GetIngredientByIdRequest {
    // dataが適切な型であることを確認
    if (!data || typeof data !== 'object' || !('id' in data)) {
      throw new ValidationException('リクエストデータが不正です')
    }

    const { id } = data as { id: unknown }

    // IDが文字列であることを確認
    if (typeof id !== 'string') {
      throw new ValidationException('IDは文字列である必要があります')
    }

    // プレフィックス付きCUID形式のバリデーション（ing_で始まるCUID v2）
    const ingredientIdRegex = /^ing_[0-9a-z]{24}$/
    if (!ingredientIdRegex.test(id)) {
      throw new ValidationException('無効なIDフォーマットです。食材IDはing_で始まる必要があります')
    }

    return { id }
  }

  /**
   * ビジネスロジックの実行
   * 食材詳細を取得する処理
   */
  async execute(
    request: GetIngredientByIdRequest,
    userId: string
  ): Promise<GetIngredientByIdResponse> {
    // クエリを実行（新しいQueryService経由）
    const query = new GetIngredientByIdQuery(userId, request.id)
    const ingredientDetailView = await this.getIngredientByIdHandler.execute(query)

    // 既存のAPI仕様に合致する形式に変換
    return IngredientDetailViewMapper.toApiResponse(ingredientDetailView)
  }
}
