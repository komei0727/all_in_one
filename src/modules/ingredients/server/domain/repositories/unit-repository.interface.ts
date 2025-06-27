import type { Unit } from '../entities/unit.entity'
import type { UnitId } from '../value-objects'

/**
 * UnitRepository Interface
 *
 * 単位エンティティの永続化を担当するリポジトリのインターフェース
 * Domain層で定義し、Infrastructure層で実装する（依存性逆転の原則）
 */
export interface UnitRepository {
  /**
   * アクティブな単位を表示順で取得
   * @returns 単位エンティティの配列
   */
  findAllActive(): Promise<Unit[]>

  /**
   * IDによる単位の取得
   * @param id 単位ID
   * @returns 単位エンティティ、存在しない場合はnull
   */
  findById(id: UnitId): Promise<Unit | null>
}
