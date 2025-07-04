import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

/**
 * GET /api/v1/shopping-sessions/active
 * アクティブな買い物セッションを取得する
 */
export const GET = UnifiedRouteFactory.createGetHandler(() =>
  CompositionRoot.getInstance().getGetActiveShoppingSessionApiHandler()
)
