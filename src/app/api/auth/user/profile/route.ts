import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

/**
 * ユーザープロフィール取得 API
 * GET /api/auth/user/profile
 */
export const GET = UnifiedRouteFactory.createGetHandler(() =>
  CompositionRoot.getInstance().getGetProfileApiHandler()
)

/**
 * ユーザープロフィール更新 API
 * PUT /api/auth/user/profile
 */
export const PUT = UnifiedRouteFactory.createPutHandler(() =>
  CompositionRoot.getInstance().getUpdateProfileApiHandler()
)
