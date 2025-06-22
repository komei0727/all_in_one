import { NextRequest, NextResponse } from 'next/server'

import { GetUnitsHandler } from '@/modules/ingredients/server/api/handlers/queries/get-units.handler'

/**
 * GET /api/v1/ingredients/units
 *
 * 単位一覧を取得するAPIエンドポイント
 * Next.js App Routerのルートハンドラー（薄いラッパー）
 * 実際の処理はモジュール内のハンドラーに委譲
 */
export async function GET(_request: NextRequest) {
  try {
    // モジュール内のハンドラーに処理を委譲
    const handler = new GetUnitsHandler()
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
