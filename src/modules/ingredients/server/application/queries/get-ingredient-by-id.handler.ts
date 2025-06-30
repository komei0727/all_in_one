import { IngredientNotFoundException } from '../../domain/exceptions'

import type { GetIngredientByIdQuery } from './get-ingredient-by-id.query'
import type { IngredientQueryService } from '../query-services/ingredient-query-service.interface'
import type { IngredientDetailView } from '../views/ingredient-detail.view'

/**
 * 食材詳細取得ハンドラー
 * CQRSパターンに基づきQueryServiceを使用して読み取り専用データを効率的に取得
 */
export class GetIngredientByIdHandler {
  constructor(private readonly queryService: IngredientQueryService) {}

  /**
   * 食材詳細を取得する
   * 単一のクエリで必要な全ての情報を取得し、パフォーマンスを最適化
   */
  async execute(query: GetIngredientByIdQuery): Promise<IngredientDetailView> {
    // QueryServiceを使用して単一クエリで詳細情報を取得
    const ingredientDetail = await this.queryService.findDetailById(query.userId, query.id)

    // 食材が見つからない場合は例外を投げる
    if (!ingredientDetail) {
      throw new IngredientNotFoundException()
    }

    return ingredientDetail
  }
}
