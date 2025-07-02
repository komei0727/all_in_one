import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'
import { ValidationException } from '@/modules/shared/server/domain/exceptions/validation.exception'

import type { GetIngredientsByCategoryHandler } from '../../../application/queries/get-ingredients-by-category.handler'

/**
 * GetIngredientsByCategoryリクエストの型定義
 */
interface GetIngredientsByCategoryRequest {
  categoryId: string
  sortBy: string
}

/**
 * GetIngredientsByCategoryレスポンスの型定義
 * IngredientsByCategoryDto.toJSON()の結果と同じ形式
 */
interface GetIngredientsByCategoryResponse {
  data: {
    category: {
      id: string
      name: string
    }
    ingredients: Array<{
      id: string
      name: string
      stockStatus: string
      expiryStatus?: string
      lastCheckedAt?: string
      currentQuantity: {
        amount: number
        unit: {
          symbol: string
        }
      }
    }>
    summary: {
      totalItems: number
      outOfStockCount: number
      lowStockCount: number
      expiringSoonCount: number
    }
  }
  meta: {
    timestamp: string
    version: string
  }
}

/**
 * カテゴリー別食材取得APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class GetIngredientsByCategoryApiHandler extends BaseApiHandler<
  GetIngredientsByCategoryRequest,
  GetIngredientsByCategoryResponse
> {
  constructor(private readonly queryHandler: GetIngredientsByCategoryHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * categoryIdとsortByパラメータの妥当性を検証
   */
  validate(data: unknown): GetIngredientsByCategoryRequest {
    if (!data || typeof data !== 'object') {
      throw new ValidationException('リクエストデータが不正です')
    }

    const request = data as Record<string, unknown>

    // categoryIdのバリデーション
    if (!request.categoryId || typeof request.categoryId !== 'string') {
      throw new ValidationException('categoryIdは必須です')
    }

    const categoryIdPattern = /^cat_[a-zA-Z0-9]{20,30}$/
    if (!categoryIdPattern.test(request.categoryId)) {
      throw new ValidationException('無効なカテゴリーIDフォーマットです')
    }

    // sortByのバリデーション
    if (!request.sortBy || typeof request.sortBy !== 'string') {
      throw new ValidationException('sortByは必須です')
    }

    const validSortOptions = ['stockStatus', 'name']
    if (!validSortOptions.includes(request.sortBy)) {
      throw new ValidationException(
        `sortByは${validSortOptions.join(', ')}のいずれかである必要があります`
      )
    }

    return {
      categoryId: request.categoryId,
      sortBy: request.sortBy,
    }
  }

  /**
   * ビジネスロジックの実行
   * カテゴリー別食材一覧を取得する処理
   */
  async execute(
    request: GetIngredientsByCategoryRequest,
    userId: string
  ): Promise<GetIngredientsByCategoryResponse> {
    // クエリハンドラーを実行
    const result = await this.queryHandler.handle({
      categoryId: request.categoryId,
      userId,
      sortBy: request.sortBy as 'stockStatus' | 'name',
    })

    // DTOをレスポンス形式に変換
    return result.toJSON()
  }
}
