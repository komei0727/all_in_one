import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { DomainException } from '../domain/exceptions'

/**
 * APIエラーレスポンスの型
 */
interface ErrorResponse {
  error: string
  message: string
  details?: unknown
}

/**
 * APIエラーハンドラー
 * 各種エラーを適切なHTTPレスポンスに変換する
 */
export class ApiErrorHandler {
  /**
   * エラーをHTTPレスポンスに変換
   * @param error エラーオブジェクト
   * @returns NextResponse
   */
  static handleError(error: unknown): NextResponse<ErrorResponse> {
    // Zodバリデーションエラー
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'リクエストデータが無効です',
          details: error.flatten(),
        },
        { status: 400 }
      )
    }

    // ドメイン例外
    if (error instanceof DomainException) {
      const apiResponse = error.toApiResponse()
      return NextResponse.json(
        {
          error: apiResponse.error.code,
          message: apiResponse.error.message,
          details: apiResponse.error.details,
        },
        { status: error.httpStatusCode }
      )
    }

    // その他のエラー
    // エラーログ出力（本番環境では適切なロガーに置き換える）
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('Unexpected error:', error)
    }
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: '処理中にエラーが発生しました',
      },
      { status: 500 }
    )
  }

  /**
   * 認証エラーレスポンスを生成
   * @returns NextResponse
   */
  static unauthorizedError(): NextResponse<ErrorResponse> {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'ログインが必要です',
      },
      { status: 401 }
    )
  }
}
