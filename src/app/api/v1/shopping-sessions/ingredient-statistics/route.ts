import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

/**
 * 食材チェック統計取得API
 * GET /api/v1/shopping-sessions/ingredient-statistics
 */
export const GET = UnifiedRouteFactory.createGetHandler(() =>
  CompositionRoot.getInstance().getGetIngredientCheckStatisticsApiHandler()
)
