import { type NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'
import { DeleteIngredientApiHandler } from '@/modules/ingredients/server/api/handlers/commands/delete-ingredient.handler'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { UpdateIngredientApiHandler } from '@/modules/ingredients/server/api/handlers/commands/update-ingredient.handler'
import { GetIngredientByIdApiHandler } from '@/modules/ingredients/server/api/handlers/queries/get-ingredient-by-id.handler'
import {
  BusinessRuleException,
  NotFoundException,
  IngredientNotFoundException,
  ValidationException,
} from '@/modules/ingredients/server/domain/exceptions'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

/**
 * GET /api/v1/ingredients/{id}
 *
 * 食材詳細を取得するAPIエンドポイント
 * Next.js App Routerのルートハンドラー
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // パラメータを取得
  const { id } = await params

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
            path: `/api/v1/ingredients/${id}`,
          },
        },
        { status: 401 }
      )
    }

    // DIコンテナからAPIハンドラーを取得
    const compositionRoot = CompositionRoot.getInstance()
    const getIngredientByIdHandler = compositionRoot.getGetIngredientByIdHandler()
    const apiHandler = new GetIngredientByIdApiHandler(getIngredientByIdHandler)

    // ハンドラーの実行（ドメインユーザーIDを渡す）
    const result = await apiHandler.handle({ id }, session.user.domainUserId)

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
            path: `/api/v1/ingredients/${id}`,
          },
        },
        { status: 400 }
      )
    }

    if (error instanceof IngredientNotFoundException) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: `/api/v1/ingredients/${id}`,
          },
        },
        { status: 404 }
      )
    }

    if (error instanceof NotFoundException) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: `/api/v1/ingredients/${id}`,
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
            path: `/api/v1/ingredients/${id}`,
          },
        },
        { status: 422 }
      )
    }

    // 予期しないエラー
    console.error(`Unexpected error in GET /api/v1/ingredients/${id}:`, error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました。しばらく時間をおいて再試行してください',
          timestamp: new Date().toISOString(),
          path: `/api/v1/ingredients/${id}`,
        },
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/ingredients/{id}
 *
 * 食材情報を更新するAPIエンドポイント
 * Next.js App Routerのルートハンドラー
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // パラメータを取得
  const { id } = await params

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
            path: `/api/v1/ingredients/${id}`,
          },
        },
        { status: 401 }
      )
    }

    // リクエストボディの取得
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '無効なリクエストボディです',
            timestamp: new Date().toISOString(),
            path: `/api/v1/ingredients/${id}`,
          },
        },
        { status: 400 }
      )
    }

    // DIコンテナからAPIハンドラーを取得
    const compositionRoot = CompositionRoot.getInstance()
    const updateIngredientApiHandler = compositionRoot.getUpdateIngredientApiHandler()

    // ハンドラーの実行（ドメインユーザーIDを渡す）
    const result = await updateIngredientApiHandler.handle(body, id, session.user.domainUserId)

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
            path: `/api/v1/ingredients/${id}`,
          },
        },
        { status: 400 }
      )
    }

    if (error instanceof IngredientNotFoundException) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: `/api/v1/ingredients/${id}`,
          },
        },
        { status: 404 }
      )
    }

    if (error instanceof NotFoundException) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: `/api/v1/ingredients/${id}`,
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
            path: `/api/v1/ingredients/${id}`,
          },
        },
        { status: 422 }
      )
    }

    // 予期しないエラー
    console.error(`Unexpected error in PUT /api/v1/ingredients/${id}:`, error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました。しばらく時間をおいて再試行してください',
          timestamp: new Date().toISOString(),
          path: `/api/v1/ingredients/${id}`,
        },
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/ingredients/{id}
 *
 * 食材を削除するAPIエンドポイント（論理削除）
 * Next.js App Routerのルートハンドラー
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // パラメータを取得
  const { id } = await params

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
            path: `/api/v1/ingredients/${id}`,
          },
        },
        { status: 401 }
      )
    }

    // DIコンテナからAPIハンドラーを取得
    const compositionRoot = CompositionRoot.getInstance()
    const deleteIngredientHandler = compositionRoot.getDeleteIngredientHandler()
    const apiHandler = new DeleteIngredientApiHandler(deleteIngredientHandler)

    // ハンドラーの実行（ドメインユーザーIDを渡す）
    await apiHandler.handle({ id }, session.user.domainUserId)

    // 成功レスポンス（204 No Content）
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    // エラーハンドリング
    if (error instanceof ValidationException) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: `/api/v1/ingredients/${id}`,
          },
        },
        { status: 400 }
      )
    }

    if (error instanceof IngredientNotFoundException) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: `/api/v1/ingredients/${id}`,
          },
        },
        { status: 404 }
      )
    }

    if (error instanceof NotFoundException) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            timestamp: new Date().toISOString(),
            path: `/api/v1/ingredients/${id}`,
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
            path: `/api/v1/ingredients/${id}`,
          },
        },
        { status: 422 }
      )
    }

    // 予期しないエラー
    console.error(`Unexpected error in DELETE /api/v1/ingredients/${id}:`, error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラーが発生しました。しばらく時間をおいて再試行してください',
          timestamp: new Date().toISOString(),
          path: `/api/v1/ingredients/${id}`,
        },
      },
      { status: 500 }
    )
  }
}
