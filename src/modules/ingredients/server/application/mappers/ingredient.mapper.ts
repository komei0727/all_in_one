import { Category } from '../../domain/entities/category.entity'
import { Ingredient } from '../../domain/entities/ingredient.entity'
import { Unit } from '../../domain/entities/unit.entity'
import { IngredientDto } from '../dtos/ingredient.dto'

/**
 * 食材マッパー
 * ドメインエンティティとDTOの相互変換を行う
 */
export class IngredientMapper {
  /**
   * エンティティからDTOへ変換
   * @param ingredient 食材エンティティ
   * @param category カテゴリーエンティティ（オプション）
   * @param unit 単位エンティティ（オプション）
   * @returns 食材DTO
   */
  static toDto(ingredient: Ingredient, category?: Category, unit?: Unit): IngredientDto {
    const stock = ingredient.getCurrentStock()

    return new IngredientDto(
      ingredient.getId().getValue(),
      ingredient.getName().getValue(),
      category
        ? {
            id: category.id.getValue(),
            name: category.name.getValue(),
          }
        : null,
      stock && unit
        ? {
            quantity: stock.getQuantity().getValue(),
            unit: {
              id: unit.id.getValue(),
              name: unit.name.getValue(),
              symbol: unit.symbol.getValue(),
            },
            storageLocation: {
              type: stock.getStorageLocation().getType(),
              detail: stock.getStorageLocation().getDetail() || null,
            },
            bestBeforeDate:
              stock.getExpiryInfo().getBestBeforeDate()?.toISOString().split('T')[0] || null,
            useByDate: stock.getExpiryInfo().getUseByDate()?.toISOString().split('T')[0] || null,
            purchaseDate: stock.getPurchaseDate().toISOString().split('T')[0],
            price: stock.getPrice()?.getValue() || null,
            isInStock: true,
          }
        : null,
      ingredient.getMemo()?.getValue() || null,
      ingredient.getCreatedAt().toISOString(),
      ingredient.getUpdatedAt().toISOString()
    )
  }
}
