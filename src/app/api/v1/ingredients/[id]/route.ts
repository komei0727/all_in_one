import { type NextRequest } from 'next/server'

import { IngredientsApiCompositionRoot } from '@/modules/ingredients/server/composition-root'
import { UnifiedRouteFactory } from '@/modules/shared/server/api/route-factory'

/**
 * GET /api/v1/ingredients/{id}
 *
 * 食材詳細を取得するAPIエンドポイント
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Next.js 15のasync paramsを解決
  const resolvedParams = await params

  // UnifiedRouteFactoryのハンドラーを作成して実行
  const handler = UnifiedRouteFactory.createGetHandler(() =>
    IngredientsApiCompositionRoot.getInstance().getGetIngredientByIdApiHandler()
  )

  // paramsを渡してハンドラーを実行
  return handler(request, { params: resolvedParams })
}

/**
 * PUT /api/v1/ingredients/{id}
 *
 * 食材を更新するAPIエンドポイント
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Next.js 15のasync paramsを解決
  const resolvedParams = await params

  // UnifiedRouteFactoryのハンドラーを作成して実行
  const handler = UnifiedRouteFactory.createPutHandler(() =>
    IngredientsApiCompositionRoot.getInstance().getUpdateIngredientApiHandler()
  )

  // paramsを渡してハンドラーを実行
  return handler(request, { params: resolvedParams })
}

/**
 * DELETE /api/v1/ingredients/{id}
 *
 * 食材を削除するAPIエンドポイント
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Next.js 15のasync paramsを解決
  const resolvedParams = await params

  // UnifiedRouteFactoryのハンドラーを作成して実行
  const handler = UnifiedRouteFactory.createDeleteHandler(() =>
    IngredientsApiCompositionRoot.getInstance().getDeleteIngredientApiHandler()
  )

  // paramsを渡してハンドラーを実行
  return handler(request, { params: resolvedParams })
}
