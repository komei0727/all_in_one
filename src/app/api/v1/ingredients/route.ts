import { type NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import { GetIngredientsApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-ingredients.handler'
import {
  BusinessRuleException,
  NotFoundException,
  ValidationException,
} from '@/modules/ingredients/server/domain/exceptions'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

/**
 * POST /api/v1/ingredients
 *
 * 食材を新規登録するAPIエンドポイント
 * Next.js App Routerのルートハンドラー
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
            path: '/api/v1/ingredients',
          },
        },
        { status: 401 }
      )
    }

    // リクエストボディの取得
    const body = (await request.json()) as unknown

    // DIコンテナからAPIハンドラーを取得
    const compositionRoot = CompositionRoot.getInstance()
    const apiHandler = compositionRoot.getCreateIngredientApiHandler()

    // ハンドラーの実行（ドメインユーザーIDを渡す）
    const result = await apiHandler.handle(
      body as Parameters<typeof apiHandler.handle>[0],
      session.user.domainUserId
    )

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
            path: '/api/v1/ingredients',
          },
        },
        { status: 400 }
      )
    }

    if (error instanceof NotFoundException) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: '/api/v1/ingredients',
          },
        },
        { status: 404 }
      )
    }

    if (error instanceof BusinessRuleException) {
      return NextResponse.json(
        {
          error: {
            code: 'BUSINESS_RULE_VIOLATION',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: '/api/v1/ingredients',
          },
        },
        { status: 422 }
      )
    }

    // 予期しないエラー
    // 予期しないエラーのログ出力

    console.error('Unexpected error in POST /api/v1/ingredients:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました。しばらく時間をおいて再試行してください',
          timestamp: new Date().toISOString(),
          path: '/api/v1/ingredients',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/ingredients
 *
 * 食材一覧を取得するAPIエンドポイント
 * Next.js App Routerのルートハンドラー
 */
export async function GET(request: NextRequest) {
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
            path: '/api/v1/ingredients',
          },
        },
        { status: 401 }
      )
    }

    // URLからクエリパラメータを取得
    const { searchParams } = new URL(request.url)

    // DIコンテナからハンドラーを取得
    const compositionRoot = CompositionRoot.getInstance()
    const getIngredientsHandler = compositionRoot.getGetIngredientsHandler()
    const apiHandler = new GetIngredientsApiHandler(getIngredientsHandler)

    // ハンドラーの実行（ドメインユーザーIDを渡す）
    const result = await apiHandler.handle(searchParams, session.user.domainUserId)

    // 成功レスポンス（200 OK）
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    // エラーハンドリング
    if (error instanceof ValidationException) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: '/api/v1/ingredients',
          },
        },
        { status: 400 }
      )
    }

    // 予期しないエラー

    console.error('Unexpected error in GET /api/v1/ingredients:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました。しばらく時間をおいて再試行してください',
          timestamp: new Date().toISOString(),
          path: '/api/v1/ingredients',
        },
      },
      { status: 500 }
    )
  }
}
