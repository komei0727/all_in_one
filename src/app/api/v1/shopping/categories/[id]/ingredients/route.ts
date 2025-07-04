import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

/**
 * GET /api/v1/shopping/categories/[id]/ingredients
 * カテゴリー別食材取得（買い物用）
 * UnifiedRouteFactoryを使用して統一的なエラーハンドリングと認証処理を実現
 */
export const GET = UnifiedRouteFactory.createGetHandler(() =>
  CompositionRoot.getInstance().getIngredientsByCategoryApiHandler()
)
