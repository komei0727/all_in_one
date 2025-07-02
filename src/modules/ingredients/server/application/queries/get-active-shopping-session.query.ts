/**
 * アクティブな買い物セッション取得クエリ
 */
export class GetActiveShoppingSessionQuery {
  constructor(public readonly userId: string) {}
}
