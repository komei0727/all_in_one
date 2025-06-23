/**
 * 単位取得クエリオブジェクト
 *
 * 単位一覧取得のパラメータをカプセル化する
 * 将来的な拡張（フィルタリング、グルーピング）に対応
 */
export class GetUnitsQuery {
  public readonly sortBy: 'displayOrder' | 'name' | 'symbol'
  public readonly groupByType: boolean

  constructor(params?: { sortBy?: 'displayOrder' | 'name' | 'symbol'; groupByType?: boolean }) {
    this.sortBy = params?.sortBy ?? 'displayOrder'
    this.groupByType = params?.groupByType ?? false

    // イミュータビリティを保証
    Object.freeze(this)
  }

  /**
   * JSONシリアライズ
   */
  toJSON(): {
    sortBy: 'displayOrder' | 'name' | 'symbol'
    groupByType: boolean
  } {
    return {
      sortBy: this.sortBy,
      groupByType: this.groupByType,
    }
  }

  /**
   * JSONからインスタンスを復元
   */
  static fromJSON(json: {
    sortBy: 'displayOrder' | 'name' | 'symbol'
    groupByType: boolean
  }): GetUnitsQuery {
    return new GetUnitsQuery({
      sortBy: json.sortBy,
      groupByType: json.groupByType,
    })
  }
}
