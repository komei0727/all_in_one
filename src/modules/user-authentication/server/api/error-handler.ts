import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

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

    // アプリケーションエラー（将来的には専用例外クラスに置き換え）
    if (error instanceof Error) {
      // ユーザーが見つからない
      if (error.message === 'ユーザーが見つかりません') {
        return NextResponse.json(
          {
            error: 'User not found',
            message: error.message,
          },
          { status: 404 }
        )
      }

      // バリデーションエラー（アプリケーション層）
      if (
        error.message.includes('必須') ||
        error.message.includes('文字以内') ||
        error.message.includes('サポートされていない')
      ) {
        return NextResponse.json(
          {
            error: 'Validation error',
            message: error.message,
          },
          { status: 400 }
        )
      }

      // アカウント無効化エラー
      if (error.message === 'アカウントが無効化されています') {
        return NextResponse.json(
          {
            error: 'Account deactivated',
            message: error.message,
          },
          { status: 403 }
        )
      }

      // 既に無効化されたユーザー
      if (error.message === '既に無効化されたユーザーです') {
        return NextResponse.json(
          {
            error: 'Already deactivated',
            message: error.message,
          },
          { status: 400 }
        )
      }

      // メールアドレス重複
      if (error.message === 'メールアドレスが既に使用されています') {
        return NextResponse.json(
          {
            error: 'Email already exists',
            message: error.message,
          },
          { status: 409 }
        )
      }
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
