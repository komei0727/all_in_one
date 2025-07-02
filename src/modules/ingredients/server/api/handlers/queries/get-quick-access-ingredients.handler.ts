import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'
import { ValidationException } from '@/modules/shared/server/domain/exceptions/validation.exception'

import { GetQuickAccessIngredientsQuery } from '../../../application/queries/get-quick-access-ingredients.query'

import type { GetQuickAccessIngredientsHandler } from '../../../application/queries/get-quick-access-ingredients.handler'

/**
 * GetQuickAccessIngredientsリクエストの型定義
 */
interface GetQuickAccessIngredientsRequest {
  limit?: number
}

/**
 * GetQuickAccessIngredientsレスポンスの型定義
 */
interface GetQuickAccessIngredientsResponse {
  ingredients: Array<{
    ingredientId: string
    ingredientName: string
    checkCount: number
    lastCheckedAt: string
    currentStockStatus: string
    currentExpiryStatus: string
  }>
}

/**
 * クイックアクセス食材取得APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class GetQuickAccessIngredientsApiHandler extends BaseApiHandler<
  GetQuickAccessIngredientsRequest,
  GetQuickAccessIngredientsResponse
> {
  constructor(private readonly getQuickAccessIngredientsHandler: GetQuickAccessIngredientsHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * クエリパラメータの妥当性を検証
   */
  validate(data: unknown): GetQuickAccessIngredientsRequest {
    // 空のリクエストも許可（デフォルト値を使用）
    if (!data) {
      return {}
    }

    // dataが適切な型であることを確認
    if (typeof data !== 'object') {
      throw new ValidationException('リクエストデータが不正です')
    }

    const request = data as Record<string, unknown>
    const result: GetQuickAccessIngredientsRequest = {}

    // limitパラメータのバリデーション
    if (request.limit !== undefined) {
      const limitValue = request.limit

      // 文字列の場合は数値に変換
      let parsedLimit: number
      if (typeof limitValue === 'string') {
        parsedLimit = parseInt(limitValue, 10)
        if (isNaN(parsedLimit)) {
          throw new ValidationException('limitは有効な整数である必要があります')
        }
      } else if (typeof limitValue === 'number') {
        parsedLimit = limitValue
      } else {
        throw new ValidationException('limitは数値である必要があります')
      }

      // 範囲チェック（1-100）
      if (parsedLimit < 1 || parsedLimit > 100) {
        throw new ValidationException('limitは1以上100以下である必要があります')
      }

      result.limit = parsedLimit
    }

    return result
  }

  /**
   * ビジネスロジックの実行
   * クイックアクセス食材を取得する処理
   */
  async execute(
    request: GetQuickAccessIngredientsRequest,
    userId: string
  ): Promise<GetQuickAccessIngredientsResponse> {
    // デフォルト値の設定
    const limit = request.limit || 10

    // クエリオブジェクトを作成
    const query = new GetQuickAccessIngredientsQuery(userId, limit)

    // クエリを実行
    const ingredients = await this.getQuickAccessIngredientsHandler.handle(query)

    // レスポンスを作成
    return {
      ingredients,
    }
  }
}
