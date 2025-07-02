import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'
import { ValidationException } from '@/modules/shared/server/domain/exceptions/validation.exception'

import { GetShoppingStatisticsQuery } from '../../../application/queries/get-shopping-statistics.query'

import type { GetShoppingStatisticsHandler } from '../../../application/queries/get-shopping-statistics.handler'

/**
 * GetShoppingStatisticsリクエストの型定義
 */
interface GetShoppingStatisticsRequest {
  periodDays?: number
}

/**
 * GetShoppingStatisticsレスポンスの型定義
 */
interface GetShoppingStatisticsResponse {
  statistics: {
    totalSessions: number
    totalTime: number
    averageSessionDuration: number
    totalItemsChecked: number
    averageItemsPerSession: number
    dailyBreakdown: Array<{
      date: string
      sessionCount: number
      totalDuration: number
      itemsChecked: number
    }>
    weeklyComparison: {
      thisWeek: number
      lastWeek: number
      changePercent: number
    }
    monthlyComparison: {
      thisMonth: number
      lastMonth: number
      changePercent: number
    }
  }
}

/**
 * 買い物統計取得APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class GetShoppingStatisticsApiHandler extends BaseApiHandler<
  GetShoppingStatisticsRequest,
  GetShoppingStatisticsResponse
> {
  constructor(private readonly getShoppingStatisticsHandler: GetShoppingStatisticsHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * クエリパラメータの妥当性を検証
   */
  validate(data: unknown): GetShoppingStatisticsRequest {
    // 空のリクエストも許可（デフォルト値を使用）
    if (!data) {
      return {}
    }

    // dataが適切な型であることを確認
    if (typeof data !== 'object') {
      throw new ValidationException('リクエストデータが不正です')
    }

    const request = data as Record<string, unknown>
    const result: GetShoppingStatisticsRequest = {}

    // periodDaysパラメータのバリデーション
    if (request.periodDays !== undefined) {
      const periodDaysValue = request.periodDays

      // 文字列の場合は数値に変換
      let parsedPeriodDays: number
      if (typeof periodDaysValue === 'string') {
        parsedPeriodDays = parseInt(periodDaysValue, 10)
        if (isNaN(parsedPeriodDays)) {
          throw new ValidationException('periodDaysは有効な整数である必要があります')
        }
      } else if (typeof periodDaysValue === 'number') {
        parsedPeriodDays = periodDaysValue
      } else {
        throw new ValidationException('periodDaysは数値である必要があります')
      }

      // 範囲チェック（1-365）
      if (parsedPeriodDays < 1 || parsedPeriodDays > 365) {
        throw new ValidationException('periodDaysは1以上365以下である必要があります')
      }

      result.periodDays = parsedPeriodDays
    }

    return result
  }

  /**
   * ビジネスロジックの実行
   * 買い物統計を取得する処理
   */
  async execute(
    request: GetShoppingStatisticsRequest,
    userId: string
  ): Promise<GetShoppingStatisticsResponse> {
    // デフォルト値の設定
    const periodDays = request.periodDays || 30

    // クエリオブジェクトを作成
    const query = new GetShoppingStatisticsQuery(userId, periodDays)

    // クエリを実行
    const statistics = await this.getShoppingStatisticsHandler.handle(query)

    // レスポンスを作成
    return {
      statistics,
    }
  }
}
