import { type NextRequest, NextResponse } from 'next/server'

import { CompleteShoppingSessionCommand } from '@/modules/ingredients/server/application/commands/complete-shopping-session.command'
import {
  BusinessRuleException,
  NotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

/**
 * POST /api/v1/shopping-sessions/[sessionId]/complete
 * 買い物セッションを完了する
 */
export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    // リクエストボディを解析
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // ユーザーIDの検証
    if (!body || typeof body !== 'object' || !('userId' in body)) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { userId } = body as { userId: string }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // コマンドを作成して実行
    const compositionRoot = CompositionRoot.getInstance()
    const handler = compositionRoot.getCompleteShoppingSessionHandler()
    const command = new CompleteShoppingSessionCommand(params.sessionId, userId)
    const sessionDto = await handler.handle(command)

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

    // ビジネスルール例外の場合は403を返す（権限エラー）
    if (error instanceof BusinessRuleException) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    // その他のエラーは500を返す
    console.error('Failed to complete shopping session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
