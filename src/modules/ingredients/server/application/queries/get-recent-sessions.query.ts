/**
 * 買い物セッション履歴取得クエリ
 */
export class GetRecentSessionsQuery {
  constructor(
    public readonly userId: string,
    public readonly limit?: number,
    public readonly page?: number
  ) {}
}
