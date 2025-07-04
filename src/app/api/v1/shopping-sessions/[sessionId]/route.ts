import { IngredientsApiCompositionRoot } from '@/modules/ingredients/server/composition-root'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

/**
 * DELETE /api/v1/shopping-sessions/[sessionId]
 * 買い物セッションを中断する
 */
export const DELETE = UnifiedRouteFactory.createDeleteHandler(() =>
  IngredientsApiCompositionRoot.getInstance().getAbandonShoppingSessionApiHandler()
)
