/**
 * Category Entity
 *
 * 食材カテゴリーを表すドメインエンティティ
 * ビジネスルール:
 * - カテゴリー名は必須
 * - 表示順序のデフォルトは0
 */
export class Category {
  constructor(
    private readonly props: {
      id: string
      name: string
      displayOrder?: number
    }
  ) {
    // ビジネスルールの検証
    if (!props.name || props.name.trim() === '') {
      throw new Error('Category name cannot be empty')
    }
  }

  get id(): string {
    return this.props.id
  }

  get name(): string {
    return this.props.name
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
      displayOrder: this.displayOrder,
    }
  }
}
