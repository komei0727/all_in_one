import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

/**
 * ユーザープロフィール取得 API
 * GET /api/v1/users/me
 */
export const GET = UnifiedRouteFactory.createGetHandler(() =>
  CompositionRoot.getInstance().getGetProfileApiHandler()
)

/**
 * ユーザープロフィール更新 API
 * PUT /api/v1/users/me
 */
export const PUT = UnifiedRouteFactory.createPutHandler(() =>
  CompositionRoot.getInstance().getUpdateProfileApiHandler()
)
