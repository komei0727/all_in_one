/**
 * 買い物統計取得クエリ
 */
export class GetShoppingStatisticsQuery {
  constructor(
    public readonly userId: string,
    public readonly periodDays?: number
  ) {}
}
