import { type NextRequest, NextResponse } from 'next/server'

import {
  BusinessRuleException,
  NotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

/**
 * 食材確認API - POST /api/v1/shopping-sessions/{sessionId}/check-ingredient
 * 買い物セッション中に食材をチェック
 */
export async function POST(
  request: NextRequest,
  context: { params: { sessionId: string } }
): Promise<NextResponse> {
  try {
    // リクエストボディを取得
    const body = (await request.json()) as { ingredientId?: string; userId?: string }
    const { ingredientId, userId } = body

    // バリデーション
    if (!ingredientId || typeof ingredientId !== 'string') {
      return NextResponse.json(
        { error: 'ingredientId is required and must be a string' },
        { status: 400 }
      )
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required and must be a string' },
        { status: 400 }
      )
    }

    // ハンドラーを取得
    const compositionRoot = CompositionRoot.getInstance()
    const apiHandler = compositionRoot.getCheckIngredientApiHandler()

    // 食材確認を実行
    const result = await apiHandler.handle({
      sessionId: context.params.sessionId,
      ingredientId,
      userId,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('食材確認エラー:', error)

    if (error instanceof NotFoundException) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    if (error instanceof BusinessRuleException) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
