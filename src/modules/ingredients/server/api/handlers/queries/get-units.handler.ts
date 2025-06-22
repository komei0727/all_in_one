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
   * @returns 単位一覧のレスポンス
   */
  async handle() {
    // DIコンテナからクエリハンドラーを取得
    const compositionRoot = CompositionRoot.getInstance()
    const queryHandler = compositionRoot.getGetUnitsQueryHandler()

    // クエリを実行
    const dto = await queryHandler.execute()

    // DTOをJSON形式にシリアライズして返却
    return dto.toJSON()
  }
}
