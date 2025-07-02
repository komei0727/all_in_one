import type { Category } from '../../domain/entities/category.entity'
import type { Ingredient } from '../../domain/entities/ingredient.entity'

/**
 * カテゴリー別食材DTOクラス
 * 買い物用の軽量フォーマットで食材情報を保持する
 */
export class IngredientsByCategoryDto {
  constructor(
    private readonly category: {
      id: string
      name: string
    },
    private readonly ingredients: Array<{
      id: string
      name: string
      stockStatus: string
      expiryStatus?: string
      lastCheckedAt?: string
      currentQuantity: {
        amount: number
        unit: {
          symbol: string
        }
      }
    }>,
    private readonly summary: {
      totalItems: number
      outOfStockCount: number
      lowStockCount: number
      expiringSoonCount: number
    }
  ) {}

  /**
   * DTOをJSON形式に変換
   * @returns JSON形式のカテゴリー別食材情報
   */
  toJSON() {
    return {
      data: {
        category: this.category,
        ingredients: this.ingredients,
        summary: this.summary,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    }
  }

  /**
   * ドメインオブジェクトからDTOを作成
   * @param params ドメインオブジェクト
   * @returns カテゴリー別食材DTO
   */
  static fromDomain(params: {
    category: Category
    ingredients: Array<Ingredient>
  }): IngredientsByCategoryDto {
    // 食材情報をマッピング
    const ingredients = params.ingredients.map((ingredient) => ({
      id: ingredient.getId().getValue(),
      name: ingredient.getName().getValue(),
      stockStatus: (() => {
        if (ingredient.getIngredientStock().isOutOfStock()) return 'OUT_OF_STOCK'
        if (ingredient.getIngredientStock().isLowStock()) return 'LOW_STOCK'
        return 'IN_STOCK'
      })(),
      expiryStatus: (() => {
        const expiryInfo = ingredient.getExpiryInfo()
        if (!expiryInfo) return undefined

        const daysUntilExpiry = expiryInfo.getDaysUntilExpiry()
        if (daysUntilExpiry === null) return undefined

        if (daysUntilExpiry < 0) return 'EXPIRED'
        if (daysUntilExpiry <= 3) return 'CRITICAL'
        if (daysUntilExpiry <= 7) return 'EXPIRING_SOON'
        return 'FRESH'
      })(),
      lastCheckedAt: undefined, // TODO: セッション内での最終確認時刻を実装
      currentQuantity: {
        amount: ingredient.getIngredientStock().getQuantity(),
        unit: {
          symbol: ingredient.getIngredientStock().getUnitId().getValue(), // 一時的にunitIdを表示
        },
      },
    }))

    // サマリー情報を計算
    const summary = {
      totalItems: ingredients.length,
      outOfStockCount: ingredients.filter((i) => i.stockStatus === 'OUT_OF_STOCK').length,
      lowStockCount: ingredients.filter((i) => i.stockStatus === 'LOW_STOCK').length,
      expiringSoonCount: ingredients.filter(
        (i) => i.expiryStatus === 'EXPIRING_SOON' || i.expiryStatus === 'CRITICAL'
      ).length,
    }

    return new IngredientsByCategoryDto(
      {
        id: params.category.getId(),
        name: params.category.getName(),
      },
      ingredients,
      summary
    )
  }
}
