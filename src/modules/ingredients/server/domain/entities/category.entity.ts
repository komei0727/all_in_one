import { CategoryId, CategoryName, DisplayOrder } from '../value-objects'

/**
 * Category Entity
 *
 * 食材カテゴリーを表すドメインエンティティ
 * 値オブジェクトを使用してビジネスルールを保証
 */
export class Category {
  readonly id: CategoryId
  readonly name: CategoryName
  readonly displayOrder: DisplayOrder

  constructor(props: { id: string; name: string; displayOrder?: number }) {
    // 値オブジェクトに変換（バリデーションは値オブジェクト内で実行される）
    this.id = new CategoryId(props.id)
    this.name = new CategoryName(props.name)
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
      displayOrder: this.displayOrder.getValue(),
    }
  }
}
