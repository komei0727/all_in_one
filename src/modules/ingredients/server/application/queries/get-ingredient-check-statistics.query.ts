/**
 * 食材チェック統計取得クエリ
 */
export class GetIngredientCheckStatisticsQuery {
  constructor(
    public readonly userId: string,
    public readonly ingredientId?: string
  ) {}
}
