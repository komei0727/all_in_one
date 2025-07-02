import { type GetSessionHistoryHandler } from '@/modules/ingredients/server/application/queries/get-session-history.handler'
import { GetSessionHistoryQuery } from '@/modules/ingredients/server/application/queries/get-session-history.query'

/**
 * 買い物セッション履歴取得APIハンドラー
 */
export class GetSessionHistoryApiHandler {
  constructor(private readonly getSessionHistoryHandler: GetSessionHistoryHandler) {}

  async handle(request: Request, userId: string): Promise<Response> {
    try {
      // URLからクエリパラメータを取得
      const url = new URL(request.url, 'http://localhost')
      const pageParam = url.searchParams.get('page')
      const limitParam = url.searchParams.get('limit')
      const fromParam = url.searchParams.get('from')
      const toParam = url.searchParams.get('to')
      const statusParam = url.searchParams.get('status')

      let page = 1 // デフォルト値
      let limit = 20 // デフォルト値

      const errors: Array<{ field: string; message: string }> = []

      // pageのバリデーション
      if (pageParam) {
        const parsedPage = parseInt(pageParam, 10)
        if (isNaN(parsedPage)) {
          errors.push({
            field: 'page',
            message: 'page must be a valid integer',
          })
        } else if (parsedPage < 1) {
          errors.push({
            field: 'page',
            message: 'page must be greater than or equal to 1',
          })
        } else {
          page = parsedPage
        }
      }

      // limitのバリデーション
      if (limitParam) {
        const parsedLimit = parseInt(limitParam, 10)
        if (isNaN(parsedLimit)) {
          errors.push({
            field: 'limit',
            message: 'limit must be a valid integer',
          })
        } else if (parsedLimit < 1 || parsedLimit > 100) {
          errors.push({
            field: 'limit',
            message: 'limit must be between 1 and 100',
          })
        } else {
          limit = parsedLimit
        }
      }

      // fromのバリデーション（ISO 8601形式）
      if (fromParam) {
        const fromDate = new Date(fromParam)
        if (isNaN(fromDate.getTime())) {
          errors.push({
            field: 'from',
            message: 'from must be a valid ISO 8601 date',
          })
        }
      }

      // toのバリデーション（ISO 8601形式）
      if (toParam) {
        const toDate = new Date(toParam)
        if (isNaN(toDate.getTime())) {
          errors.push({
            field: 'to',
            message: 'to must be a valid ISO 8601 date',
          })
        }
      }

      // statusのバリデーション
      let status: 'COMPLETED' | 'ABANDONED' | undefined
      if (statusParam) {
        if (statusParam !== 'COMPLETED' && statusParam !== 'ABANDONED') {
          errors.push({
            field: 'status',
            message: 'status must be either COMPLETED or ABANDONED',
          })
        } else {
          status = statusParam
        }
      }

      // バリデーションエラーがある場合
      if (errors.length > 0) {
        return new Response(
          JSON.stringify({
            message: 'Validation failed',
            errors,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // クエリを作成して実行
      const query = new GetSessionHistoryQuery(
        userId,
        page,
        limit,
        fromParam || undefined,
        toParam || undefined,
        status
      )
      const result = await this.getSessionHistoryHandler.handle(query)

      // API仕様書に準拠したレスポンスフォーマット
      const response = {
        data: result.data,
        pagination: result.pagination,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      // 予期しないエラー
      console.error('Unexpected error in GetSessionHistoryApiHandler:', error)
      return new Response(
        JSON.stringify({
          message: 'Internal server error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}
