import type { Category } from '../../domain/entities/category.entity'
import type { Ingredient } from '../../domain/entities/ingredient.entity'
import type { Unit } from '../../domain/entities/unit.entity'

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
      category: this.category,
      ingredients: this.ingredients,
      summary: this.summary,
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
    unitMap: Map<string, Unit>
    checkedItemsMap: Map<string, Date>
  }): IngredientsByCategoryDto {
    // 食材情報をマッピング
    const ingredients = params.ingredients.map((ingredient) => {
      // 単位情報を取得
      const unitId = ingredient.getIngredientStock().getUnitId().getValue()
      const unit = params.unitMap.get(unitId)
      const unitSymbol = unit ? unit.getSymbol() : unitId // 単位が見つからない場合はIDを表示

      return {
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
          if (daysUntilExpiry <= 1) return 'CRITICAL'
          if (daysUntilExpiry <= 3) return 'EXPIRING_SOON'
          return undefined // FRESHステータスは表示しない
        })(),
        lastCheckedAt: (() => {
          const checkedAt = params.checkedItemsMap.get(ingredient.getId().getValue())
          return checkedAt ? checkedAt.toISOString() : undefined
        })(),
        currentQuantity: {
          amount: ingredient.getIngredientStock().getQuantity(),
          unit: {
            symbol: unitSymbol,
          },
        },
      }
    })

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
