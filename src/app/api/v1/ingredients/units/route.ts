import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

// Next.js 15でキャッシュを有効にするための設定
// 単位マスターは頻繁に変更されないため、キャッシュを有効化
// ただし、データベース接続が必要なため、動的にする
export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/ingredients/units
 *
 * 単位一覧を取得するAPIエンドポイント
 * UnifiedRouteFactoryを使用して統一的なエラーハンドリングと認証処理を実現
 */
export const GET = UnifiedRouteFactory.createGetHandler(
  () => CompositionRoot.getInstance().getGetUnitsApiHandler(),
  { requireAuth: false } // 単位マスターは認証不要
)
