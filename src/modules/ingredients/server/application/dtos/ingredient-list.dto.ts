import type { IngredientDto } from './ingredient.dto'

/**
 * 食材一覧DTO
 */
export class IngredientListDto {
  constructor(
    public readonly items: IngredientDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
    public readonly totalPages: number
  ) {}

  static create(data: {
    items: IngredientDto[]
    total: number
    page: number
    limit: number
  }): IngredientListDto {
    const totalPages = Math.ceil(data.total / data.limit)
    return new IngredientListDto(data.items, data.total, data.page, data.limit, totalPages)
  }
}
