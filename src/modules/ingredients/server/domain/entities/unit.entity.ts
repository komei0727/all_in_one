import { UnitId, UnitName, UnitSymbol, DisplayOrder } from '../value-objects'

/**
 * Unit Entity
 *
 * 単位を表すドメインエンティティ
 * 値オブジェクトを使用してビジネスルールを保証
 */
export class Unit {
  readonly id: UnitId
  readonly name: UnitName
  readonly symbol: UnitSymbol
  readonly displayOrder: DisplayOrder

  constructor(props: { id: string; name: string; symbol: string; displayOrder?: number }) {
    // 値オブジェクトに変換（バリデーションは値オブジェクト内で実行される）
    this.id = new UnitId(props.id)
    this.name = new UnitName(props.name)
    this.symbol = new UnitSymbol(props.symbol)
    this.displayOrder =
      props.displayOrder !== undefined
        ? new DisplayOrder(props.displayOrder)
        : DisplayOrder.default()
  }

  /**
   * エンティティをプレーンオブジェクトに変換
   * APIレスポンスやデータ永続化で使用
   */
  toJSON() {
    return {
      id: this.id.getValue(),
      name: this.name.getValue(),
      symbol: this.symbol.getValue(),
      displayOrder: this.displayOrder.getValue(),
    }
  }
}
