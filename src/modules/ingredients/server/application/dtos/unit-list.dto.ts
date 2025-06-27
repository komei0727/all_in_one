import type { UnitDTO } from './unit.dto'

/**
 * 単位一覧DTO
 *
 * 単位一覧APIのレスポンスで使用するデータ転送オブジェクト
 */
export class UnitListDTO {
  constructor(public readonly units: UnitDTO[]) {}

  /**
   * JSONシリアライズ用のオブジェクトを返す
   */
  toJSON(): {
    units: {
      id: string
      name: string
      symbol: string
      displayOrder: number
    }[]
  } {
    return {
      units: this.units.map((unit) => unit.toJSON()),
    }
  }
}
