import { IngredientEntity } from '../entities/ingredient'

export interface FindAllParams {
  page?: number
  limit?: number
  status?: string
  category?: string
  sort?: 'name' | 'expirationDate' | 'updatedAt'
  order?: 'asc' | 'desc'
}

export interface FindAllResult {
  items: IngredientEntity[]
  total: number
}

export interface IIngredientRepository {
  findAll(params: FindAllParams): Promise<FindAllResult>
  findById(id: string): Promise<IngredientEntity | null>
  findExpiringWithinDays(days: number): Promise<IngredientEntity[]>
  create(ingredient: IngredientEntity): Promise<IngredientEntity>
  update(ingredient: IngredientEntity): Promise<IngredientEntity>
  delete(id: string): Promise<void>
}
