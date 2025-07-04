import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

/**
 * POST /api/v1/ingredients
 *
 * 食材を新規登録するAPIエンドポイント
 */
export const POST = UnifiedRouteFactory.createPostHandler(() =>
  CompositionRoot.getInstance().getCreateIngredientApiHandler()
)

/**
 * GET /api/v1/ingredients
 *
 * 食材一覧を取得するAPIエンドポイント
 * UnifiedRouteFactoryを使用して統一的なエラーハンドリングと認証処理を実現
 */
export const GET = UnifiedRouteFactory.createGetHandler(() =>
  CompositionRoot.getInstance().getGetIngredientsApiHandler()
)
