import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'
import { ValidationException } from '@/modules/shared/server/domain/exceptions/validation.exception'

import { GetSessionHistoryQuery } from '../../../application/queries/get-session-history.query'

import type { GetSessionHistoryHandler } from '../../../application/queries/get-session-history.handler'

/**
 * GetSessionHistoryリクエストの型定義
 */
interface GetSessionHistoryRequest {
  page?: number
  limit?: number
  from?: string
  to?: string
  status?: 'COMPLETED' | 'ABANDONED'
}

/**
 * GetSessionHistoryレスポンスの型定義
 */
interface GetSessionHistoryResponse {
  data: Array<{
    sessionId: string
    status: string
    startedAt: string
    completedAt: string | null
    duration: number
    checkedItemsCount: number
    totalSpent?: number
    deviceType: string | null
    location: { latitude?: number; longitude?: number; placeName?: string } | null
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
 * 買い物セッション履歴取得APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class GetSessionHistoryApiHandler extends BaseApiHandler<
  GetSessionHistoryRequest,
  GetSessionHistoryResponse
> {
  constructor(private readonly getSessionHistoryHandler: GetSessionHistoryHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * クエリパラメータの妥当性を検証
   */
  validate(data: unknown): GetSessionHistoryRequest {
    // 空のリクエストも許可（デフォルト値を使用）
    if (!data) {
      return {}
    }

    // dataが適切な型であることを確認
    if (typeof data !== 'object') {
      throw new ValidationException('リクエストデータが不正です')
    }

    const request = data as Record<string, unknown>
    const result: GetSessionHistoryRequest = {}

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

    // fromパラメータのバリデーション（ISO 8601形式）
    if (request.from !== undefined) {
      if (typeof request.from !== 'string') {
        throw new ValidationException('fromは文字列である必要があります')
      }

      const fromDate = new Date(request.from)
      if (isNaN(fromDate.getTime())) {
        throw new ValidationException('fromは有効なISO 8601形式の日付である必要があります')
      }

      result.from = request.from
    }

    // toパラメータのバリデーション（ISO 8601形式）
    if (request.to !== undefined) {
      if (typeof request.to !== 'string') {
        throw new ValidationException('toは文字列である必要があります')
      }

      const toDate = new Date(request.to)
      if (isNaN(toDate.getTime())) {
        throw new ValidationException('toは有効なISO 8601形式の日付である必要があります')
      }

      result.to = request.to
    }

    // statusパラメータのバリデーション
    if (request.status !== undefined) {
      if (typeof request.status !== 'string') {
        throw new ValidationException('statusは文字列である必要があります')
      }

      if (request.status !== 'COMPLETED' && request.status !== 'ABANDONED') {
        throw new ValidationException(
          'statusはCOMPLETEDまたはABANDONEDのいずれかである必要があります'
        )
      }

      result.status = request.status as 'COMPLETED' | 'ABANDONED'
    }

    return result
  }

  /**
   * ビジネスロジックの実行
   * セッション履歴を取得する処理
   */
  async execute(
    request: GetSessionHistoryRequest,
    userId: string
  ): Promise<GetSessionHistoryResponse> {
    // デフォルト値の設定
    const page = request.page || 1
    const limit = request.limit || 20

    // クエリオブジェクトを作成
    const query = new GetSessionHistoryQuery(
      userId,
      page,
      limit,
      request.from || undefined,
      request.to || undefined,
      request.status
    )

    // クエリを実行
    const result = await this.getSessionHistoryHandler.handle(query)

    // API仕様書に準拠したレスポンスフォーマット
    return {
      data: result.data,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    }
  }
}
