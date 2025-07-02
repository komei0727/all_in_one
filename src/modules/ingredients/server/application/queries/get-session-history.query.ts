/**
 * 買い物セッション履歴取得クエリ
 */
export class GetSessionHistoryQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly from?: string,
    public readonly to?: string,
    public readonly status?: 'COMPLETED' | 'ABANDONED'
  ) {}
}
