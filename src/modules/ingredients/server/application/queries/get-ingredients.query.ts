/**
 * 食材一覧取得クエリ
 */
export class GetIngredientsQuery {
  constructor(
    public readonly userId?: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly search?: string,
    public readonly categoryId?: string,
    public readonly expiryStatus?: 'all' | 'expired' | 'expiring' | 'fresh',
    public readonly sortBy?: 'name' | 'purchaseDate' | 'expiryDate' | 'createdAt',
    public readonly sortOrder?: 'asc' | 'desc'
  ) {}
}
