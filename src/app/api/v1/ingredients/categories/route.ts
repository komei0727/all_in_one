import { NextRequest, NextResponse } from 'next/server'

import { GetCategoriesHandler } from '@/modules/ingredients/server/api/handlers/queries/get-categories.handler'

// Next.js 15でキャッシュを有効にするための設定
// カテゴリーマスターは頻繁に変更されないため、キャッシュを有効化
// ただし、データベース接続が必要なため、動的にする
export const dynamic = 'force-dynamic'

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
