import { AppError } from '@/modules/shared/server/errors/app.error'

import { GetIngredientsQuery } from '../../../application/queries/get-ingredients.query'

import type { IngredientDto } from '../../../application/dtos/ingredient.dto'
import type { GetIngredientsHandler } from '../../../application/queries/get-ingredients.handler'

/**
 * 食材一覧取得APIハンドラー
 */
export class GetIngredientsApiHandler {
  constructor(private readonly getIngredientsHandler: GetIngredientsHandler) {}

  /**
   * HTTPリクエストを処理して食材一覧を返す
   */
  async handle(
    searchParams: URLSearchParams,
    userId: string
  ): Promise<{
    ingredients: IngredientDto[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }> {
    try {
      // クエリパラメータを解析
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
      const search = searchParams.get('search') || undefined
      const categoryId = searchParams.get('categoryId') || undefined
      const expiryStatus = searchParams.get('expiryStatus') as
        | 'all'
        | 'expired'
        | 'expiring'
        | 'fresh'
        | undefined
      const sortBy = searchParams.get('sortBy') as
        | 'name'
        | 'purchaseDate'
        | 'expiryDate'
        | 'createdAt'
        | undefined
      const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined

      // バリデーション
      if (expiryStatus && !['all', 'expired', 'expiring', 'fresh'].includes(expiryStatus)) {
        throw new AppError('Invalid expiry status', 400)
      }
      if (sortBy && !['name', 'purchaseDate', 'expiryDate', 'createdAt'].includes(sortBy)) {
        throw new AppError('Invalid sort field', 400)
      }
      if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
        throw new AppError('Invalid sort order', 400)
      }

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
        ingredients: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError('Failed to fetch ingredients', 500)
    }
  }
}
