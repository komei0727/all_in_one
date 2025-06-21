import {
  getIngredientByIdHandler,
  updateIngredientHandler,
  deleteIngredientHandler,
} from '@/modules/ingredients/server/api/handlers'

export const GET = getIngredientByIdHandler
export const PUT = updateIngredientHandler
export const DELETE = deleteIngredientHandler
