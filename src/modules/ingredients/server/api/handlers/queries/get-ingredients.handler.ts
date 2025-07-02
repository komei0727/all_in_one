import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'
import { ValidationException } from '@/modules/shared/server/domain/exceptions/validation.exception'

import { GetIngredientsQuery } from '../../../application/queries/get-ingredients.query'

import type { IngredientDto } from '../../../application/dtos/ingredient.dto'
import type { GetIngredientsHandler } from '../../../application/queries/get-ingredients.handler'

/**
 * GetIngredientsリクエストの型定義
 */
interface GetIngredientsRequest {
  page?: string
  limit?: string
  search?: string
  categoryId?: string
  expiryStatus?: string
  sortBy?: string
  sortOrder?: string
}

/**
 * GetIngredientsレスポンスの型定義
 */
interface GetIngredientsResponse {
  ingredients: ReturnType<IngredientDto['toJSON']>['ingredient'][]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

/**
 * 食材一覧取得APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class GetIngredientsApiHandler extends BaseApiHandler<
  GetIngredientsRequest,
  GetIngredientsResponse
> {
  constructor(private readonly getIngredientsHandler: GetIngredientsHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * クエリパラメータの妥当性を検証
   */
  validate(data: unknown): GetIngredientsRequest {
    // 空のリクエストも許可（デフォルト値を使用）
    if (!data) {
      return {}
    }

    // dataが適切な型であることを確認
    if (typeof data !== 'object') {
      throw new ValidationException('リクエストデータが不正です')
    }

    const request = data as Record<string, unknown>
    const result: GetIngredientsRequest = {}

    // ページ番号のバリデーション
    if (request.page !== undefined) {
      if (typeof request.page !== 'string') {
        throw new ValidationException('pageは文字列である必要があります')
      }
      const pageNum = parseInt(request.page, 10)
      if (isNaN(pageNum) || pageNum < 1) {
        throw new ValidationException('無効なページ番号です')
      }
      result.page = request.page
    }

    // リミットのバリデーション
    if (request.limit !== undefined) {
      if (typeof request.limit !== 'string') {
        throw new ValidationException('limitは文字列である必要があります')
      }
      const limitNum = parseInt(request.limit, 10)
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new ValidationException('無効なリミット値です（1-100の範囲で指定してください）')
      }
      result.limit = request.limit
    }

    // 検索文字列
    if (request.search !== undefined) {
      if (typeof request.search !== 'string') {
        throw new ValidationException('searchは文字列である必要があります')
      }
      result.search = request.search
    }

    // カテゴリーID
    if (request.categoryId !== undefined) {
      if (typeof request.categoryId !== 'string') {
        throw new ValidationException('categoryIdは文字列である必要があります')
      }
      result.categoryId = request.categoryId
    }

    // 賞味期限ステータス
    if (request.expiryStatus !== undefined) {
      if (typeof request.expiryStatus !== 'string') {
        throw new ValidationException('expiryStatusは文字列である必要があります')
      }
      const validStatuses = ['all', 'expired', 'expiring', 'fresh']
      if (!validStatuses.includes(request.expiryStatus)) {
        throw new ValidationException(
          `expiryStatusは${validStatuses.join(', ')}のいずれかである必要があります`
        )
      }
      result.expiryStatus = request.expiryStatus
    }

    // ソートフィールド
    if (request.sortBy !== undefined) {
      if (typeof request.sortBy !== 'string') {
        throw new ValidationException('sortByは文字列である必要があります')
      }
      const validSortBy = ['name', 'purchaseDate', 'expiryDate', 'createdAt']
      if (!validSortBy.includes(request.sortBy)) {
        throw new ValidationException(
          `sortByは${validSortBy.join(', ')}のいずれかである必要があります`
        )
      }
      result.sortBy = request.sortBy
    }

    // ソート順
    if (request.sortOrder !== undefined) {
      if (typeof request.sortOrder !== 'string') {
        throw new ValidationException('sortOrderは文字列である必要があります')
      }
      const validSortOrder = ['asc', 'desc']
      if (!validSortOrder.includes(request.sortOrder)) {
        throw new ValidationException(
          `sortOrderは${validSortOrder.join(', ')}のいずれかである必要があります`
        )
      }
      result.sortOrder = request.sortOrder
    }

    return result
  }

  /**
   * ビジネスロジックの実行
   * 食材一覧を取得する処理
   */
  async execute(request: GetIngredientsRequest, userId: string): Promise<GetIngredientsResponse> {
    // デフォルト値の設定
    const page = request.page ? parseInt(request.page, 10) : 1
    const limit = request.limit ? parseInt(request.limit, 10) : 20
    const search = request.search
    const categoryId = request.categoryId
    const expiryStatus = request.expiryStatus as
      | 'all'
      | 'expired'
      | 'expiring'
      | 'fresh'
      | undefined
    const sortBy = request.sortBy as
      | 'name'
      | 'purchaseDate'
      | 'expiryDate'
      | 'createdAt'
      | undefined
    const sortOrder = request.sortOrder as 'asc' | 'desc' | undefined

    // クエリを実行
    const query = new GetIngredientsQuery(
      userId,
      page,
      limit,
      search,
      categoryId,
      expiryStatus,
      sortBy,
      sortOrder
    )

    const result = await this.getIngredientsHandler.execute(query)

    return {
      ingredients: result.items.map((item) => item.toJSON().ingredient),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    }
  }
}
