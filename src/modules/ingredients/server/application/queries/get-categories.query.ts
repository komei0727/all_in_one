/**
 * カテゴリー取得クエリオブジェクト
 *
 * カテゴリー一覧取得のパラメータをカプセル化する
 * 将来的な拡張（フィルタリング、ソート）に対応
 */
export class GetCategoriesQuery {
  public readonly sortBy: 'displayOrder' | 'name'

  constructor(params?: { sortBy?: 'displayOrder' | 'name' }) {
    this.sortBy = params?.sortBy ?? 'displayOrder'

    // イミュータビリティを保証
    Object.freeze(this)
  }

  /**
   * JSONシリアライズ
   */
  toJSON(): {
    sortBy: 'displayOrder' | 'name'
  } {
    return {
      sortBy: this.sortBy,
    }
  }

  /**
   * JSONからインスタンスを復元
   */
  static fromJSON(json: { sortBy: 'displayOrder' | 'name' }): GetCategoriesQuery {
    return new GetCategoriesQuery({
      sortBy: json.sortBy,
    })
  }
}
