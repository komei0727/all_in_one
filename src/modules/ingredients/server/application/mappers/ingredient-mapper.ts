import type { IngredientResponse } from '../../../shared/types/api'
import { IngredientEntity } from '../../domain/entities/ingredient'

export class IngredientMapper {
  static toResponse(entity: IngredientEntity): IngredientResponse {
    const obj = entity.toObject()
    return {
      id: obj.id,
      name: obj.name,
      quantity: obj.quantity,
      unit: obj.unit,
      expirationDate: obj.expirationDate?.toISOString().split('T')[0],
      category: obj.category,
      status: obj.status,
      createdAt: obj.createdAt.toISOString(),
      updatedAt: obj.updatedAt.toISOString(),
    }
  }
}
