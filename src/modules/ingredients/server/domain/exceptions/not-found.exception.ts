import { NotFoundException } from '@/modules/shared/server/domain/exceptions'

/**
 * カテゴリが見つからない場合の例外
 */
export class CategoryNotFoundException extends NotFoundException {
  constructor(categoryId: string) {
    super('Category', categoryId)
  }
}

/**
 * 単位が見つからない場合の例外
 */
export class UnitNotFoundException extends NotFoundException {
  constructor(unitId: string) {
    super('Unit', unitId)
  }
}

/**
 * 食材が見つからない場合の例外
 */
export class IngredientNotFoundException extends NotFoundException {
  constructor(ingredientId: string) {
    super('Ingredient', ingredientId)
  }
}
