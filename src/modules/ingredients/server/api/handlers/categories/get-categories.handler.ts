import { prisma } from '@/lib/prisma/client'

import { GetCategoriesQueryHandler } from '../../../application/queries/get-categories'
import { PrismaCategoryRepository } from '../../../infrastructure/repositories/prisma-category-repository'

/**
 * カテゴリー一覧取得ハンドラー
 *
 * 4層アーキテクチャのAPI層（Web Adapter）として、
 * HTTPリクエストを受け取り、Application層を呼び出して結果を返す
 */
export class GetCategoriesHandler {
  /**
   * カテゴリー一覧を取得
   * @returns カテゴリー一覧のレスポンス
   */
  async handle() {
    // Infrastructure層のリポジトリを生成
    const categoryRepository = new PrismaCategoryRepository(prisma)

    // Application層のクエリハンドラーを生成
    const queryHandler = new GetCategoriesQueryHandler(categoryRepository)

    // クエリを実行
    const result = await queryHandler.execute()

    // レスポンスとして返却
    return result
  }
}
