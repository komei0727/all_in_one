import { Unit } from '../../domain/entities/unit.entity'
import { UnitListDTO } from '../dtos/unit/unit-list.dto'
import { UnitDTO } from '../dtos/unit/unit.dto'

/**
 * 単位マッパー
 *
 * ドメインエンティティとDTOの相互変換を行う
 */
export class UnitMapper {
  /**
   * ドメインエンティティからDTOへ変換
   */
  static toDTO(unit: Unit): UnitDTO {
    return new UnitDTO(
      unit.id.getValue(),
      unit.name.getValue(),
      unit.symbol.getValue(),
      unit.displayOrder.getValue()
    )
  }

  /**
   * ドメインエンティティの配列からリストDTOへ変換
   */
  static toListDTO(units: Unit[]): UnitListDTO {
    const unitDTOs = units.map((unit) => this.toDTO(unit))
    return new UnitListDTO(unitDTOs)
  }
}
