import {
  getAllIngredientsHandler,
  createIngredientHandler,
} from '@/modules/ingredients/server/api/handlers'

export const GET = getAllIngredientsHandler
export const POST = createIngredientHandler
