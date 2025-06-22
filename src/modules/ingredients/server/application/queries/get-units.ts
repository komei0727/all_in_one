import { UnitRepository } from '../../domain/repositories/unit-repository.interface'

/**
 * 単位一覧取得クエリの結果DTO
 */
export interface GetUnitsResult {
  units: Array<{
    id: string
    name: string
    symbol: string
    displayOrder: number
  }>
}

/**
 * GetUnitsQueryHandler
 *
 * 単位一覧を取得するクエリハンドラー
 * CQRSパターンにおけるQuery側の実装
 */
export class GetUnitsQueryHandler {
  constructor(private readonly unitRepository: UnitRepository) {}

  /**
   * クエリを実行して単位一覧を取得
   * @returns 単位一覧のDTO
   */
  async execute(): Promise<GetUnitsResult> {
    // リポジトリからアクティブな単位を取得
    const units = await this.unitRepository.findAllActive()

    // エンティティをDTOに変換
    return {
      units: units.map((unit) => unit.toJSON()),
    }
  }
}
