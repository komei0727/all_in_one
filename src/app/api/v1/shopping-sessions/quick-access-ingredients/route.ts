import { IngredientsApiCompositionRoot } from '@/modules/ingredients/server/composition-root'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

/**
 * GET /api/v1/shopping-sessions/quick-access-ingredients
 *
 * クイックアクセス食材取得APIエンドポイント
 * UnifiedRouteFactoryを使用して統一的なエラーハンドリングと認証処理を実現
 */
export const GET = UnifiedRouteFactory.createGetHandler(
  () => IngredientsApiCompositionRoot.getInstance().getGetQuickAccessIngredientsApiHandler(),
  { requireAuth: true } // 認証が必要
)
