import { IngredientsApiCompositionRoot } from '@/modules/ingredients/server/composition-root'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

/**
 * ユーザープロフィール取得 API
 * GET /api/v1/users/me
 */
export const GET = UnifiedRouteFactory.createGetHandler(() =>
  IngredientsApiCompositionRoot.getInstance().getGetProfileApiHandler()
)

/**
 * ユーザープロフィール更新 API
 * PUT /api/v1/users/me
 */
export const PUT = UnifiedRouteFactory.createPutHandler(() =>
  IngredientsApiCompositionRoot.getInstance().getUpdateProfileApiHandler()
)
