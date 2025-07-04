import { IngredientsApiCompositionRoot } from '@/modules/ingredients/server/composition-root'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

/**
 * POST /api/v1/shopping-sessions
 * 新しい買い物セッションを開始する
 */
export const POST = UnifiedRouteFactory.createPostHandler(() =>
  IngredientsApiCompositionRoot.getInstance().getStartShoppingSessionApiHandler()
)
