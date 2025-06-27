import { UnitListDTO } from '../dtos/unit-list.dto'
import { UnitDTO } from '../dtos/unit.dto'

import type { GetUnitsQuery } from './get-units.query'
import type { UnitRepository } from '../../domain/repositories/unit-repository.interface'

/**
 * GetUnitsQueryHandler
 *
 * 単位一覧を取得するクエリハンドラー
 * クエリオブジェクトに基づいて処理を実行
 */
export class GetUnitsQueryHandler {
  constructor(private readonly unitRepository: UnitRepository) {}

  /**
   * クエリを実行して単位一覧を取得
   * @param query 取得条件を含むクエリオブジェクト
   * @returns 単位一覧のDTO（グループ化の場合は異なる形式）
   */
  async handle(
    query: GetUnitsQuery
  ): Promise<UnitListDTO | { unitsByType: Record<string, UnitDTO[]> }> {
    // アクティブな単位を取得
    const units = await this.unitRepository.findAllActive()

    // DTOに変換
    const unitDTOs = units.map(
      (unit) => new UnitDTO(unit.getId(), unit.getName(), unit.getSymbol(), unit.getDisplayOrder())
    )

    // ソート処理
    const sortedDTOs = this.sortUnits(unitDTOs, query.sortBy)

    // グループ化が必要な場合
    if (query.groupByType) {
      return {
        unitsByType: this.groupByType(sortedDTOs),
      }
    }

    // 通常のリスト形式で返す
    return new UnitListDTO(sortedDTOs)
  }

  /**
   * 単位をソートする
   */
  private sortUnits(units: UnitDTO[], sortBy: 'displayOrder' | 'name' | 'symbol'): UnitDTO[] {
    const sorted = [...units]

    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => {
          // カタカナの「グラム」「キログラム」の比較を確実にする
          const compareResult = a.name.localeCompare(b.name, 'ja-JP', { sensitivity: 'base' })
          return compareResult
        })
      case 'symbol':
        return sorted.sort((a, b) => a.symbol.localeCompare(b.symbol, 'ja'))
      case 'displayOrder':
      default:
        return sorted.sort((a, b) => a.displayOrder - b.displayOrder)
    }
  }

  /**
   * 単位をタイプ別にグループ化する
   * 注: 現在のUnitエンティティにはtypeプロパティがないため、
   * 将来的な実装のためのプレースホルダー
   */
  private groupByType(units: UnitDTO[]): Record<string, UnitDTO[]> {
    // TODO: Unitエンティティにtypeプロパティを追加後、実装を更新
    // 現在は仮実装として、記号から推測
    const groups: Record<string, UnitDTO[]> = {}

    units.forEach((unit) => {
      let type = 'other'

      // 仮の分類ロジック（将来的にはエンティティのtypeプロパティを使用）
      if (['g', 'kg', 'mg'].includes(unit.symbol)) {
        type = 'weight'
      } else if (['ml', 'L', 'cc'].includes(unit.symbol)) {
        type = 'volume'
      } else if (['個', '本', '枚', 'パック', '束'].includes(unit.symbol)) {
        type = 'count'
      }

      if (!groups[type]) {
        groups[type] = []
      }
      groups[type].push(unit)
    })

    return groups
  }
}
