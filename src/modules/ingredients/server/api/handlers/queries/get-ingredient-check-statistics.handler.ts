import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'
import { ValidationException } from '@/modules/shared/server/domain/exceptions/validation.exception'

import { GetIngredientCheckStatisticsQuery } from '../../../application/queries/get-ingredient-check-statistics.query'

import type { GetIngredientCheckStatisticsHandler } from '../../../application/queries/get-ingredient-check-statistics.handler'

/**
 * GetIngredientCheckStatisticsリクエストの型定義
 */
interface GetIngredientCheckStatisticsRequest {
  ingredientId?: string
}

/**
 * GetIngredientCheckStatisticsレスポンスの型定義
 */
interface GetIngredientCheckStatisticsResponse {
  statistics: Array<{
    ingredientId: string
    ingredientName: string
    totalCheckCount: number
    firstCheckedAt: string
    lastCheckedAt: string
    monthlyCheckCounts: Array<{
      yearMonth: string
      checkCount: number
    }>
    stockStatusBreakdown: {
      inStockChecks: number
      lowStockChecks: number
      outOfStockChecks: number
    }
  }>
}

/**
 * 食材チェック統計取得APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class GetIngredientCheckStatisticsApiHandler extends BaseApiHandler<
  GetIngredientCheckStatisticsRequest,
  GetIngredientCheckStatisticsResponse
> {
  constructor(
    private readonly getIngredientCheckStatisticsHandler: GetIngredientCheckStatisticsHandler
  ) {
    super()
  }

  /**
   * リクエストのバリデーション
   * クエリパラメータの妥当性を検証
   */
  validate(data: unknown): GetIngredientCheckStatisticsRequest {
    // 空のリクエストも許可（全体統計を取得）
    if (!data) {
      return {}
    }

    // dataが適切な型であることを確認
    if (typeof data !== 'object') {
      throw new ValidationException('リクエストデータが不正です')
    }

    const request = data as Record<string, unknown>
    const result: GetIngredientCheckStatisticsRequest = {}

    // ingredientIdパラメータのバリデーション
    if (request.ingredientId !== undefined) {
      if (typeof request.ingredientId !== 'string') {
        throw new ValidationException('ingredientIdは文字列である必要があります')
      }

      // 空文字列の場合はundefinedとして扱う
      if (request.ingredientId === '') {
        return result
      }

      // UUID形式またはプレフィックス付きID形式のバリデーション
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const prefixedIdRegex = /^ing_[a-zA-Z0-9]+$/

      if (!uuidRegex.test(request.ingredientId) && !prefixedIdRegex.test(request.ingredientId)) {
        throw new ValidationException(
          'ingredientIdは有効なUUIDまたはプレフィックス付きIDである必要があります'
        )
      }

      result.ingredientId = request.ingredientId
    }

    return result
  }

  /**
   * ビジネスロジックの実行
   * 食材チェック統計を取得する処理
   */
  async execute(
    request: GetIngredientCheckStatisticsRequest,
    userId: string
  ): Promise<GetIngredientCheckStatisticsResponse> {
    // クエリオブジェクトを作成
    const query = new GetIngredientCheckStatisticsQuery(userId, request.ingredientId)

    // クエリを実行
    const statistics = await this.getIngredientCheckStatisticsHandler.handle(query)

    // レスポンスを作成
    return {
      statistics,
    }
  }
}
