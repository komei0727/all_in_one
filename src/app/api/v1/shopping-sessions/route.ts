import { type NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import {
  BusinessRuleException,
  ValidationException,
} from '@/modules/ingredients/server/domain/exceptions'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

/**
 * POST /api/v1/shopping-sessions
 * 新しい買い物セッションを開始する
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await auth()
    if (!session?.user?.domainUserId) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です',
            timestamp: new Date().toISOString(),
            path: '/api/v1/shopping-sessions',
          },
        },
        { status: 401 }
      )
    }

    // リクエストボディを解析
    const body = (await request.json()) as unknown

    // DIコンテナからAPIハンドラーを取得
    const compositionRoot = CompositionRoot.getInstance()
    const apiHandler = compositionRoot.getStartShoppingSessionApiHandler()

    // ハンドラーの実行（userIdはセッションから取得）
    const result = await apiHandler.handle({
      ...(body as object),
      userId: session.user.domainUserId,
    })

    // 成功レスポンス（201 Created）
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    // エラーハンドリング
    if (error instanceof ValidationException) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: '/api/v1/shopping-sessions',
          },
        },
        { status: 400 }
      )
    }

    if (error instanceof BusinessRuleException) {
      return NextResponse.json(
        {
          error: {
            code: 'BUSINESS_RULE_VIOLATION',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: '/api/v1/shopping-sessions',
          },
        },
        { status: 409 }
      )
    }

    // その他のエラーは500を返す
    console.error('Failed to start shopping session:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: '内部エラーが発生しました',
          timestamp: new Date().toISOString(),
          path: '/api/v1/shopping-sessions',
        },
      },
      { status: 500 }
    )
  }
}
