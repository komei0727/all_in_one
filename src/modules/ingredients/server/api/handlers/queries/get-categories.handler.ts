import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'
import { ValidationException } from '@/modules/shared/server/domain/exceptions/validation.exception'

import { GetCategoriesQuery } from '../../../application/queries/get-categories.query'

import type { GetCategoriesQueryHandler } from '../../../application/queries/get-categories.handler'

/**
 * GetCategoriesリクエストの型定義
 */
interface GetCategoriesRequest {
  sortBy?: 'displayOrder' | 'name'
}

/**
 * GetCategoriesレスポンスの型定義
 * カテゴリー一覧を返す
 */
interface GetCategoriesResponse {
  categories: {
    id: string
    name: string
    displayOrder: number
  }[]
}

/**
 * カテゴリー一覧取得APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class GetCategoriesApiHandler extends BaseApiHandler<
  GetCategoriesRequest,
  GetCategoriesResponse
> {
  constructor(private readonly getCategoriesQueryHandler: GetCategoriesQueryHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * クエリパラメータの妥当性を検証
   */
  validate(data: unknown): GetCategoriesRequest {
    // 空のリクエストも許可（デフォルト値を使用）
    if (!data) {
      return {}
    }

    // dataが適切な型であることを確認
    if (typeof data !== 'object') {
      throw new ValidationException('リクエストデータが不正です')
    }

    const request = data as Record<string, unknown>
    const result: GetCategoriesRequest = {}

    // sortByパラメータのバリデーション
    if (request.sortBy !== undefined) {
      if (typeof request.sortBy !== 'string') {
        throw new ValidationException('sortByは文字列である必要があります')
      }

      const validSortBy = ['displayOrder', 'name']
      if (!validSortBy.includes(request.sortBy)) {
        throw new ValidationException(
          `sortByは${validSortBy.join(', ')}のいずれかである必要があります`
        )
      }

      result.sortBy = request.sortBy as 'displayOrder' | 'name'
    }

    return result
  }

  /**
   * ビジネスロジックの実行
   * カテゴリー一覧を取得する処理
   */
  async execute(request: GetCategoriesRequest, _userId: string): Promise<GetCategoriesResponse> {
    // クエリオブジェクトを作成
    const query = new GetCategoriesQuery(request)

    // クエリを実行
    const dto = await this.getCategoriesQueryHandler.handle(query)

    // DTOをJSON形式にシリアライズして返却
    return dto.toJSON()
  }
}
