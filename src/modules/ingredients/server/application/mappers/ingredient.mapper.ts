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
    const stock = ingredient.getIngredientStock()
    const expiryInfo = ingredient.getExpiryInfo()

    return new IngredientDto(
      ingredient.getId().getValue(),
      ingredient.getUserId(),
      ingredient.getName().getValue(),
      category
        ? {
            id: category.id.getValue(),
            name: category.name.getValue(),
          }
        : null,
      ingredient.getPrice()?.getValue() || null,
      ingredient.getPurchaseDate().toISOString().split('T')[0],
      expiryInfo
        ? {
            bestBeforeDate: expiryInfo.getBestBeforeDate()?.toISOString().split('T')[0] || null,
            useByDate: expiryInfo.getUseByDate()?.toISOString().split('T')[0] || null,
          }
        : null,
      unit
        ? {
            quantity: stock.getQuantity(),
            unit: {
              id: unit.id.getValue(),
              name: unit.name.getValue(),
              symbol: unit.symbol.getValue(),
            },
            storageLocation: {
              type: stock.getStorageLocation().getType(),
              detail: stock.getStorageLocation().getDetail() || null,
            },
            threshold: stock.getThreshold(),
          }
        : {
            quantity: stock.getQuantity(),
            unit: {
              id: stock.getUnitId().getValue(),
              name: '',
              symbol: '',
            },
            storageLocation: {
              type: stock.getStorageLocation().getType(),
              detail: stock.getStorageLocation().getDetail() || null,
            },
            threshold: stock.getThreshold(),
          },
      ingredient.getMemo()?.getValue() || null,
      ingredient.getCreatedAt().toISOString(),
      ingredient.getUpdatedAt().toISOString()
    )
  }
}
