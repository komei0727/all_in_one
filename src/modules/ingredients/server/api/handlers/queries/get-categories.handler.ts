import { GetCategoriesQuery } from '../../../application/queries/get-categories.query'
import { CompositionRoot } from '../../../infrastructure/composition-root'

/**
 * カテゴリー一覧取得ハンドラー
 *
 * 4層アーキテクチャのAPI層（Web Adapter）として、
 * HTTPリクエストを受け取り、Application層を呼び出して結果を返す
 */
export class GetCategoriesHandler {
  /**
   * カテゴリー一覧を取得
   * @param params クエリパラメータ
   * @returns カテゴリー一覧のレスポンス
   */
  async handle(params?: { sortBy?: 'displayOrder' | 'name' }) {
    // DIコンテナからクエリハンドラーを取得
    const compositionRoot = CompositionRoot.getInstance()
    const queryHandler = compositionRoot.getGetCategoriesQueryHandler()

    // クエリオブジェクトを作成
    const query = new GetCategoriesQuery(params)

    // クエリを実行
    const dto = await queryHandler.handle(query)

    // DTOをJSON形式にシリアライズして返却
    return dto.toJSON()
  }
}
