import { BaseApiHandler } from '@/modules/shared/server/api/base-api-handler'
import { ValidationException } from '@/modules/shared/server/domain/exceptions/validation.exception'

import { GetUnitsQuery } from '../../../application/queries/get-units.query'

import type { UnitDTO } from '../../../application/dtos/unit.dto'
import type { GetUnitsQueryHandler } from '../../../application/queries/get-units.handler'

/**
 * GetUnitsリクエストの型定義
 */
interface GetUnitsRequest {
  sortBy?: 'displayOrder' | 'name' | 'symbol'
  groupByType?: boolean
}

/**
 * GetUnitsレスポンスの型定義
 * 単位一覧またはタイプ別の単位一覧を返す
 */
type GetUnitsResponse =
  | {
      units: {
        id: string
        name: string
        symbol: string
        displayOrder: number
      }[]
    }
  | {
      unitsByType: Record<string, UnitDTO[]>
    }

/**
 * 単位一覧取得APIハンドラー
 * BaseApiHandlerを継承し、統一的な例外処理を実現
 */
export class GetUnitsApiHandler extends BaseApiHandler<GetUnitsRequest, GetUnitsResponse> {
  constructor(private readonly getUnitsQueryHandler: GetUnitsQueryHandler) {
    super()
  }

  /**
   * リクエストのバリデーション
   * クエリパラメータの妥当性を検証
   */
  validate(data: unknown): GetUnitsRequest {
    // 空のリクエストも許可（デフォルト値を使用）
    if (!data) {
      return {}
    }

    // dataが適切な型であることを確認
    if (typeof data !== 'object') {
      throw new ValidationException('リクエストデータが不正です')
    }

    const request = data as Record<string, unknown>
    const result: GetUnitsRequest = {}

    // sortByパラメータのバリデーション
    if (request.sortBy !== undefined) {
      if (typeof request.sortBy !== 'string') {
        throw new ValidationException('sortByは文字列である必要があります')
      }

      const validSortBy = ['displayOrder', 'name', 'symbol']
      if (!validSortBy.includes(request.sortBy)) {
        throw new ValidationException(
          `sortByは${validSortBy.join(', ')}のいずれかである必要があります`
        )
      }

      result.sortBy = request.sortBy as 'displayOrder' | 'name' | 'symbol'
    }

    // groupByTypeパラメータのバリデーション
    if (request.groupByType !== undefined) {
      if (typeof request.groupByType !== 'boolean') {
        throw new ValidationException('groupByTypeは真偽値である必要があります')
      }

      result.groupByType = request.groupByType
    }

    return result
  }

  /**
   * ビジネスロジックの実行
   * 単位一覧を取得する処理
   */
  async execute(request: GetUnitsRequest, _userId: string): Promise<GetUnitsResponse> {
    // クエリオブジェクトを作成
    const query = new GetUnitsQuery(request)

    // クエリを実行
    const result = await this.getUnitsQueryHandler.handle(query)

    // 結果の形式に応じて返却
    if ('unitsByType' in result) {
      return result as { unitsByType: Record<string, UnitDTO[]> }
    } else {
      return result.toJSON()
    }
  }
}
