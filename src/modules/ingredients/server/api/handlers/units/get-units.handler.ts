import { prisma } from '@/lib/prisma/client'

import { GetUnitsQueryHandler } from '../../../application/queries/get-units'
import { PrismaUnitRepository } from '../../../infrastructure/repositories/prisma-unit-repository'

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
    // Infrastructure層のリポジトリを生成
    const unitRepository = new PrismaUnitRepository(prisma)

    // Application層のクエリハンドラーを生成
    const queryHandler = new GetUnitsQueryHandler(unitRepository)

    // クエリを実行
    const result = await queryHandler.execute()

    // レスポンスとして返却
    return result
  }
}
