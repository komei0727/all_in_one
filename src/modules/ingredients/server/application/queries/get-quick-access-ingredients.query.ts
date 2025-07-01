/**
 * クイックアクセス食材取得クエリ
 */
export class GetQuickAccessIngredientsQuery {
  constructor(
    public readonly userId: string,
    public readonly limit?: number
  ) {}
}
