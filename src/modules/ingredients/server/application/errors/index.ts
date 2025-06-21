export class IngredientNotFoundError extends Error {
  constructor(id: string) {
    super(`Ingredient with id ${id} not found`)
    this.name = 'IngredientNotFoundError'
  }
}
