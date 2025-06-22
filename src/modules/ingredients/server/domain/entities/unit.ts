/**
 * Unit Entity
 *
 * 単位を表すドメインエンティティ
 * ビジネスルール:
 * - 単位名は必須
 * - 記号は必須
 * - 表示順序のデフォルトは0
 */
export class Unit {
  constructor(
    private readonly props: {
      id: string
      name: string
      symbol: string
      displayOrder?: number
    }
  ) {
    // ビジネスルールの検証
    if (!props.name || props.name.trim() === '') {
      throw new Error('Unit name cannot be empty')
    }
    if (!props.symbol || props.symbol.trim() === '') {
      throw new Error('Unit symbol cannot be empty')
    }
  }

  get id(): string {
    return this.props.id
  }

  get name(): string {
    return this.props.name
  }

  get symbol(): string {
    return this.props.symbol
  }

  get displayOrder(): number {
    return this.props.displayOrder ?? 0
  }

  /**
   * エンティティをプレーンオブジェクトに変換
   * APIレスポンスやデータ永続化で使用
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      symbol: this.symbol,
      displayOrder: this.displayOrder,
    }
  }
}
