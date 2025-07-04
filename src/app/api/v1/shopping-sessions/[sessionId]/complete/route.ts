import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

/**
 * PUT /api/v1/shopping-sessions/[sessionId]/complete
 * 買い物セッションを完了する
 */
export const PUT = UnifiedRouteFactory.createPutHandler(() =>
  CompositionRoot.getInstance().getCompleteShoppingSessionApiHandler()
)
