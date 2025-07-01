import { type NextRequest, NextResponse } from 'next/server'

import { GetActiveShoppingSessionQuery } from '@/modules/ingredients/server/application/queries/get-active-shopping-session.query'
import { NotFoundException } from '@/modules/ingredients/server/domain/exceptions'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

/**
 * GET /api/v1/shopping-sessions/active
 * アクティブな買い物セッションを取得する
 */
export async function GET(request: NextRequest) {
  try {
    // URLパラメータからuserIdを取得
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    // ユーザーIDの検証
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // クエリを作成して実行
    const compositionRoot = CompositionRoot.getInstance()
    const handler = compositionRoot.getGetActiveShoppingSessionHandler()
    const query = new GetActiveShoppingSessionQuery(userId)
    const sessionDto = await handler.handle(query)

    // セッションが見つからない場合は404を返す
    if (!sessionDto) {
      return NextResponse.json({ error: 'アクティブなセッションが見つかりません' }, { status: 404 })
    }

    // レスポンスを返す
    return NextResponse.json({
      sessionId: sessionDto.sessionId,
      userId: sessionDto.userId,
      status: sessionDto.status,
      startedAt: sessionDto.startedAt,
      completedAt: sessionDto.completedAt,
      deviceType: sessionDto.deviceType,
      location: sessionDto.location,
    })
  } catch (error) {
    // NotFoundExceptionの場合は404を返す
    if (error instanceof NotFoundException) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    // その他のエラーは500を返す
    console.error('Failed to get active shopping session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
