import { NextRequest, NextResponse } from 'next/server'

import { GetCategoriesHandler } from '@/modules/ingredients/server/api/handlers/categories/get-categories.handler'

/**
 * GET /api/v1/ingredients/categories
 *
 * カテゴリー一覧を取得するAPIエンドポイント
 * Next.js App Routerのルートハンドラー（薄いラッパー）
 * 実際の処理はモジュール内のハンドラーに委譲
 */
export async function GET(_request: NextRequest) {
  try {
    // モジュール内のハンドラーに処理を委譲
    const handler = new GetCategoriesHandler()
    const result = await handler.handle()

    // HTTPレスポンスとして返却
    return NextResponse.json(result)
  } catch (error) {
    // エラーハンドリング
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}
