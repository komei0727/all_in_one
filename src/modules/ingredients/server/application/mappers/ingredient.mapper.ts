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
   * エンティティからDTOへ変換（統合されたIngredientエンティティ対応）
   * @param ingredient 食材エンティティ
   * @param category カテゴリーエンティティ（オプション）
   * @param unit 単位エンティティ（オプション）
   * @returns 食材DTO
   */
  static toDto(ingredient: Ingredient, category?: Category, unit?: Unit): IngredientDto {
    return new IngredientDto(
      ingredient.getId().getValue(),
      ingredient.getName().getValue(),
      category
        ? {
            id: category.id.getValue(),
            name: category.name.getValue(),
          }
        : null,
      unit
        ? {
            quantity: ingredient.getQuantity().getValue(),
            unit: {
              id: unit.id.getValue(),
              name: unit.name.getValue(),
              symbol: unit.symbol.getValue(),
            },
            storageLocation: {
              type: ingredient.getStorageLocation().getType(),
              detail: ingredient.getStorageLocation().getDetail() || null,
            },
            bestBeforeDate:
              ingredient.getExpiryInfo().getBestBeforeDate()?.toISOString().split('T')[0] || null,
            useByDate:
              ingredient.getExpiryInfo().getUseByDate()?.toISOString().split('T')[0] || null,
            purchaseDate: ingredient.getPurchaseDate().toISOString().split('T')[0],
            price: ingredient.getPrice()?.getValue() || null,
            isInStock: true,
          }
        : null,
      ingredient.getMemo()?.getValue() || null,
      ingredient.getCreatedAt().toISOString(),
      ingredient.getUpdatedAt().toISOString()
    )
  }
}
