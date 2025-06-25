import { InvalidFieldException } from '../exceptions'
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
  readonly description: string | null
  readonly displayOrder: DisplayOrder

  constructor(props: {
    id: string
    name: string
    description?: string | null
    displayOrder?: number
  }) {
    // 値オブジェクトに変換（バリデーションは値オブジェクト内で実行される）
    this.id = new CategoryId(props.id)
    this.name = new CategoryName(props.name)
    this.description = this.validateDescription(props.description ?? null)
    this.displayOrder =
      props.displayOrder !== undefined
        ? new DisplayOrder(props.displayOrder)
        : DisplayOrder.default()
  }

  /**
   * 説明のバリデーション
   * @param description 説明（nullまたは最大100文字）
   * @returns バリデーション済みの説明
   */
  private validateDescription(description: string | null): string | null {
    if (description === null) {
      return null
    }

    // 前後の空白をトリミング
    const trimmed = description.trim()

    // 空文字の場合はnullとして扱う
    if (trimmed.length === 0) {
      return null
    }

    // 100文字以内かチェック
    if (trimmed.length > 100) {
      throw new InvalidFieldException(
        'カテゴリー説明',
        description,
        '100文字以内で入力してください'
      )
    }

    return trimmed
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
   * 説明取得
   */
  getDescription(): string | null {
    return this.description
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
      description: this.description,
      displayOrder: this.displayOrder.getValue(),
    }
  }
}
