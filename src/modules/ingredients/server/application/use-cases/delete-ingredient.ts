import type { IIngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import { IngredientNotFoundError } from '../errors'

export class DeleteIngredientUseCase {
  constructor(private readonly repository: IIngredientRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findById(id)

    if (!existing) {
      throw new IngredientNotFoundError(id)
    }

    await this.repository.delete(id)
  }
}
