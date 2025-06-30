import type { IngredientDetailView } from '../views/ingredient-detail.view'

/**
 * IngredientDetailViewマッパー
 * ビューオブジェクトを既存のAPI仕様に合致するJSON形式に変換
 */
export class IngredientDetailViewMapper {
  /**
   * IngredientDetailViewを既存のIngredientDto.toJSON()互換形式に変換
   * API仕様の後方互換性を保つために使用
   */
  static toApiResponse(view: IngredientDetailView): {
    ingredient: {
      id: string
      userId: string
      name: string
      category: { id: string; name: string } | null
      price: number | null
      purchaseDate: string
      expiryInfo: {
        bestBeforeDate: string | null
        useByDate: string | null
      } | null
      stock: {
        quantity: number
        unit: {
          id: string
          name: string
          symbol: string
        }
        storageLocation: {
          type: string
          detail: string | null
        }
        threshold: number | null
      }
      memo: string | null
      createdAt: string
      updatedAt: string
    }
  } {
    return {
      ingredient: {
        id: view.id,
        userId: view.userId,
        name: view.name,
        category:
          view.categoryId && view.categoryName
            ? {
                id: view.categoryId,
                name: view.categoryName,
              }
            : null,
        price: view.price,
        purchaseDate: view.purchaseDate,
        expiryInfo:
          view.bestBeforeDate || view.useByDate
            ? {
                bestBeforeDate: view.bestBeforeDate,
                useByDate: view.useByDate,
              }
            : null,
        stock: {
          quantity: view.quantity,
          unit: {
            id: view.unitId,
            name: view.unitName,
            symbol: view.unitSymbol,
          },
          storageLocation: {
            type: view.storageType,
            detail: view.storageDetail,
          },
          threshold: view.threshold,
        },
        memo: view.memo,
        createdAt: view.createdAt,
        updatedAt: view.updatedAt,
      },
    }
  }
}
