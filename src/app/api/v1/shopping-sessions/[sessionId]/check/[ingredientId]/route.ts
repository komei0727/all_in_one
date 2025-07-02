import { type NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

/**
 * 食材確認API - POST /api/v1/shopping-sessions/{sessionId}/check/{ingredientId}
 * 買い物セッション中に食材をチェック
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string; ingredientId: string }> }
): Promise<NextResponse> {
  try {
    // 認証チェック
    const session = await auth()
    if (!session?.user?.domainUserId) {
      return NextResponse.json(
        {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          path: request.url,
        },
        { status: 401 }
      )
    }

    // パラメータを取得
    const params = await context.params

    // APIハンドラーを取得して実行
    const compositionRoot = CompositionRoot.getInstance()
    const apiHandler = compositionRoot.getCheckIngredientApiHandler()

    // Webアダプターパターンに対応したhandleメソッドの呼び出し
    const response = await apiHandler.handle(
      request,
      session.user.domainUserId,
      params.sessionId,
      params.ingredientId
    )

    // レスポンスが成功の場合はそのまま返す
    if (response.status === 200) {
      const data = (await response.json()) as unknown
      return NextResponse.json(data)
    }

    // エラーレスポンスの場合は、標準フォーマットに変換
    const errorData = (await response.json()) as { message?: string; errors?: unknown }
    const errorCode = getErrorCode(response.status)

    const errorResponse: Record<string, unknown> = {
      code: errorCode,
      message: errorData.message || 'An error occurred',
      timestamp: new Date().toISOString(),
      path: request.url,
    }

    if (errorData.errors) {
      errorResponse.errors = errorData.errors
    }

    return NextResponse.json(errorResponse, { status: response.status })
  } catch (error) {
    // 予期しないエラー
    console.error('Failed to check ingredient:', error)
    return NextResponse.json(
      {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      },
      { status: 500 }
    )
  }
}

/**
 * HTTPステータスコードからエラーコードを取得
 */
function getErrorCode(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR'
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'RESOURCE_NOT_FOUND'
    case 409:
      return 'CONFLICT'
    default:
      return 'INTERNAL_SERVER_ERROR'
  }
}
