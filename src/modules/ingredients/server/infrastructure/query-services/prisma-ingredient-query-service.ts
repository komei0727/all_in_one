import type { PrismaClient } from '@/generated/prisma'

import type { IngredientQueryService } from '../../application/query-services/ingredient-query-service.interface'
import type { IngredientDetailView } from '../../application/views/ingredient-detail.view'

/**
 * Prismaを使用した食材クエリサービス実装
 * 単一のJOINクエリで食材詳細情報を効率的に取得
 */
export class PrismaIngredientQueryService implements IngredientQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * ユーザーの食材詳細を取得する
   * 単一クエリでカテゴリー・単位情報を含めて取得し、パフォーマンスを最適化
   */
  async findDetailById(userId: string, ingredientId: string): Promise<IngredientDetailView | null> {
    // 単一のJOINクエリで全ての必要な情報を取得
    const ingredient = await this.prisma.ingredient.findFirst({
      where: {
        id: ingredientId,
        userId: userId,
        deletedAt: null, // 削除済み食材を除外
      },
      include: {
        category: true, // カテゴリー情報を結合
        unit: true, // 単位情報を結合
      },
    })

    // データが見つからない場合はnullを返す
    if (!ingredient) {
      return null
    }

    // データベース結果をビューオブジェクトに変換
    return {
      id: ingredient.id,
      userId: ingredient.userId,
      name: ingredient.name,
      categoryId: ingredient.category?.id || null,
      categoryName: ingredient.category?.name || null,
      price: ingredient.price ? Number(ingredient.price) : null,
      purchaseDate: ingredient.purchaseDate.toISOString().split('T')[0],
      bestBeforeDate: ingredient.bestBeforeDate?.toISOString().split('T')[0] || null,
      useByDate: ingredient.useByDate?.toISOString().split('T')[0] || null,
      quantity: ingredient.quantity,
      unitId: ingredient.unit.id,
      unitName: ingredient.unit.name,
      unitSymbol: ingredient.unit.symbol,
      storageType: ingredient.storageLocationType,
      storageDetail: ingredient.storageLocationDetail,
      threshold: ingredient.threshold,
      memo: ingredient.memo,
      createdAt: ingredient.createdAt.toISOString(),
      updatedAt: ingredient.updatedAt.toISOString(),
    }
  }
}
