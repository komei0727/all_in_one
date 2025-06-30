/**
 * 食材詳細取得クエリ
 */
export class GetIngredientByIdQuery {
  constructor(
    public readonly userId: string,
    public readonly id: string
  ) {}
}
