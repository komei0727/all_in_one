import { GetUnitsQuery } from '../../../application/queries/get-units.query'
import { CompositionRoot } from '../../../infrastructure/composition-root'

/**
 * 単位一覧取得ハンドラー
 *
 * 4層アーキテクチャのAPI層（Web Adapter）として、
 * HTTPリクエストを受け取り、Application層を呼び出して結果を返す
 */
export class GetUnitsHandler {
  /**
   * 単位一覧を取得
   * @param params クエリパラメータ
   * @returns 単位一覧のレスポンス
   */
  async handle(params?: { sortBy?: 'displayOrder' | 'name' | 'symbol'; groupByType?: boolean }) {
    // DIコンテナからクエリハンドラーを取得
    const compositionRoot = CompositionRoot.getInstance()
    const queryHandler = compositionRoot.getGetUnitsQueryHandler()

    // クエリオブジェクトを作成
    const query = new GetUnitsQuery(params)

    // クエリを実行
    const result = await queryHandler.handle(query)

    // 結果の形式に応じて返却
    if ('unitsByType' in result) {
      return result
    } else {
      return result.toJSON()
    }
  }
}
