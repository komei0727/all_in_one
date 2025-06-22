import { UnitRepository } from '../../domain/repositories/unit-repository.interface'
import { UnitListDTO } from '../dtos/unit/unit-list.dto'
import { UnitMapper } from '../mappers/unit.mapper'

/**
 * 単位一覧取得クエリの結果
 * @deprecated Use UnitListDTO instead
 */
export type GetUnitsResult = UnitListDTO

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
  async execute(): Promise<UnitListDTO> {
    // リポジトリからアクティブな単位を取得
    const units = await this.unitRepository.findAllActive()

    // エンティティをDTOに変換
    return UnitMapper.toListDTO(units)
  }
}
