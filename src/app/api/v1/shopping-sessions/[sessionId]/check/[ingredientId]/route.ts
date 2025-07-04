import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

/**
 * 食材確認API - POST /api/v1/shopping-sessions/{sessionId}/check/{ingredientId}
 * 買い物セッション中に食材をチェック
 */
export const POST = UnifiedRouteFactory.createPostHandler(() =>
  CompositionRoot.getInstance().getCheckIngredientApiHandler()
)
