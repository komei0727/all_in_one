import { AppError } from '@/modules/shared/server/errors/app.error'

import { GetIngredientsQuery } from '../../../application/queries/get-ingredients.query'
import { ValidationException } from '../../../domain/exceptions'

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
    ingredients: ReturnType<IngredientDto['toJSON']>['ingredient'][]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }> {
    try {
      // クエリパラメータを解析
      const pageParam = searchParams.get('page')
      const limitParam = searchParams.get('limit')

      // ページ番号のバリデーション
      if (pageParam !== null) {
        const pageNum = parseInt(pageParam, 10)
        if (isNaN(pageNum) || pageNum < 1) {
          throw new ValidationException('Invalid page number')
        }
      }

      // リミットのバリデーション
      if (limitParam !== null) {
        const limitNum = parseInt(limitParam, 10)
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          throw new ValidationException('Invalid limit value')
        }
      }

      const page = pageParam ? parseInt(pageParam, 10) : 1
      const limit = limitParam ? parseInt(limitParam, 10) : 20
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
        throw new ValidationException('Invalid expiry status')
      }
      if (sortBy && !['name', 'purchaseDate', 'expiryDate', 'createdAt'].includes(sortBy)) {
        throw new ValidationException('Invalid sortBy field')
      }
      if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
        throw new ValidationException('Invalid sort order')
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
        ingredients: result.items.map((item) => item.toJSON().ingredient),
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      }
    } catch (error) {
      // ValidationExceptionはそのまま再スロー
      if (error instanceof ValidationException) {
        throw error
      }
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError('Failed to fetch ingredients', 500)
    }
  }
}
