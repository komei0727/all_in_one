import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'
import { ValidationException } from '@/modules/shared/server/domain/exceptions/validation.exception'

import { GetRecentSessionsQuery } from '../../../application/queries/get-recent-sessions.query'

import type { GetRecentSessionsHandler } from '../../../application/queries/get-recent-sessions.handler'

/**
 * GetRecentSessionsリクエストの型定義
 */
interface GetRecentSessionsRequest {
  limit?: number
  page?: number
}

/**
 * GetRecentSessionsレスポンスの型定義
 */
interface GetRecentSessionsResponse {
  data: Array<{
    sessionId: string
    status: string
    startedAt: string
    completedAt: string | null
    duration: number
    checkedItemsCount: number
    totalSpent?: number
    deviceType: string | null
    location: { latitude?: number; longitude?: number; name?: string } | null
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta: {
    timestamp: string
    version: string
  }
}

/**
 * 直近のショッピングセッション履歴取得APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class GetRecentSessionsApiHandler extends BaseApiHandler<
  GetRecentSessionsRequest,
  GetRecentSessionsResponse
> {
  constructor(private readonly getRecentSessionsHandler: GetRecentSessionsHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * クエリパラメータの妥当性を検証
   */
  validate(data: unknown): GetRecentSessionsRequest {
    // 空のリクエストも許可（デフォルト値を使用）
    if (!data) {
      return {}
    }

    // dataが適切な型であることを確認
    if (typeof data !== 'object') {
      throw new ValidationException('リクエストデータが不正です')
    }

    const request = data as Record<string, unknown>
    const result: GetRecentSessionsRequest = {}

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

    // pageパラメータのバリデーション
    if (request.page !== undefined) {
      const pageValue = request.page

      // 文字列の場合は数値に変換
      let parsedPage: number
      if (typeof pageValue === 'string') {
        parsedPage = parseInt(pageValue, 10)
        if (isNaN(parsedPage)) {
          throw new ValidationException('pageは有効な整数である必要があります')
        }
      } else if (typeof pageValue === 'number') {
        parsedPage = pageValue
      } else {
        throw new ValidationException('pageは数値である必要があります')
      }

      // 範囲チェック（1以上）
      if (parsedPage < 1) {
        throw new ValidationException('pageは1以上である必要があります')
      }

      result.page = parsedPage
    }

    return result
  }

  /**
   * ビジネスロジックの実行
   * 直近のセッション履歴を取得する処理
   */
  async execute(
    request: GetRecentSessionsRequest,
    userId: string
  ): Promise<GetRecentSessionsResponse> {
    // デフォルト値の設定
    const limit = request.limit || 10
    const page = request.page || 1

    // クエリオブジェクトを作成
    const query = new GetRecentSessionsQuery(userId, limit, page)

    // クエリを実行
    const result = await this.getRecentSessionsHandler.handle(query)

    // API仕様書に準拠したレスポンスフォーマット
    return {
      data: result.data.map((session) => ({
        sessionId: session.sessionId,
        status: session.status,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        duration: session.completedAt
          ? Math.floor(
              (new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) /
                1000
            )
          : 0, // 秒単位
        checkedItemsCount: session.checkedItems?.length || 0,
        totalSpent: session.totalSpent,
        deviceType: session.deviceType,
        location: session.location,
      })),
      pagination: {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        hasNext: result.pagination.hasNext,
        hasPrev: result.pagination.hasPrev,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    }
  }
}
