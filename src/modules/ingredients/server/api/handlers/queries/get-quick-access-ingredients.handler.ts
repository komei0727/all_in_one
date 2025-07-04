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
  recentlyChecked: Array<{
    ingredientId: string
    name: string
    categoryId: string
    categoryName: string
    stockStatus: string
    expiryStatus?: string
    lastCheckedAt: string
  }>
  frequentlyChecked: Array<{
    ingredientId: string
    name: string
    categoryId: string
    categoryName: string
    stockStatus: string
    expiryStatus?: string
    checkCount: number
    lastCheckedAt: string
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

      // 範囲チェック（1-50）
      if (parsedLimit < 1 || parsedLimit > 50) {
        throw new ValidationException('limitは1以上50以下である必要があります')
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
    const limit = request.limit || 20

    // クエリオブジェクトを作成
    const query = new GetQuickAccessIngredientsQuery(userId, limit)

    // クエリを実行
    const result = await this.getQuickAccessIngredientsHandler.handle(query)

    // レスポンスを作成（API設計書に合わせた形式に変換）
    return {
      recentlyChecked: result.recentlyChecked.map((item) => ({
        ingredientId: item.ingredientId,
        name: item.ingredientName,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        stockStatus: item.currentStockStatus,
        expiryStatus: item.currentExpiryStatus !== 'FRESH' ? item.currentExpiryStatus : undefined,
        lastCheckedAt: item.lastCheckedAt,
      })),
      frequentlyChecked: result.frequentlyChecked.map((item) => ({
        ingredientId: item.ingredientId,
        name: item.ingredientName,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        stockStatus: item.currentStockStatus,
        expiryStatus: item.currentExpiryStatus !== 'FRESH' ? item.currentExpiryStatus : undefined,
        checkCount: item.checkCount,
        lastCheckedAt: item.lastCheckedAt,
      })),
    }
  }
}
