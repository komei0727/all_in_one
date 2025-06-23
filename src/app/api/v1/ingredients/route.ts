import { NextRequest, NextResponse } from 'next/server'

import { BusinessRuleException } from '@/modules/ingredients/server/domain/exceptions/business-rule.exception'
import { NotFoundException } from '@/modules/ingredients/server/domain/exceptions/not-found.exception'
import { ValidationException } from '@/modules/ingredients/server/domain/exceptions/validation.exception'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'

/**
 * POST /api/v1/ingredients
 *
 * 食材を新規登録するAPIエンドポイント
 * Next.js App Routerのルートハンドラー
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディの取得
    const body = await request.json()

    // DIコンテナからAPIハンドラーを取得
    const compositionRoot = CompositionRoot.getInstance()
    const apiHandler = compositionRoot.getCreateIngredientApiHandler()

    // ハンドラーの実行
    const result = await apiHandler.handle(body)

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
    // eslint-disable-next-line no-console
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
