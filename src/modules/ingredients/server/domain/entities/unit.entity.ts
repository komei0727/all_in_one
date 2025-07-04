import { UnitId, UnitName, UnitSymbol, UnitType, DisplayOrder } from '../value-objects'

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
  readonly type: UnitType
  readonly displayOrder: DisplayOrder

  constructor(props: {
    id: string
    name: string
    symbol: string
    type: string
    displayOrder?: number
  }) {
    // 値オブジェクトに変換（バリデーションは値オブジェクト内で実行される）
    this.id = new UnitId(props.id)
    this.name = new UnitName(props.name)
    this.symbol = new UnitSymbol(props.symbol)
    this.type = new UnitType(props.type)
    this.displayOrder =
      props.displayOrder !== undefined
        ? new DisplayOrder(props.displayOrder)
        : DisplayOrder.default()
  }

  /**
   * ID取得
   */
  getId(): string {
    return this.id.getValue()
  }

  /**
   * 名前取得
   */
  getName(): string {
    return this.name.getValue()
  }

  /**
   * 記号取得
   */
  getSymbol(): string {
    return this.symbol.getValue()
  }

  /**
   * 単位タイプ取得
   */
  getType(): string {
    return this.type.getValue()
  }

  /**
   * 表示順取得
   */
  getDisplayOrder(): number {
    return this.displayOrder.getValue()
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
      type: this.type.getValue(),
      displayOrder: this.displayOrder.getValue(),
    }
  }
}
