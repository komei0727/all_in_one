/**
 * API例外の基底クラス
 *
 * すべてのAPI例外はこのクラスを継承する
 * HTTPステータスコードとエラーコードのマッピングを提供
 */
export abstract class ApiException extends Error {
  /**
   * HTTPステータスコード
   */
  abstract readonly statusCode: number

  /**
   * エラーコード（API応答で使用）
   */
  abstract readonly errorCode: string

  /**
   * エラーの詳細情報
   */
  readonly context?: Record<string, unknown>

  /**
   * エラー発生時刻
   */
  readonly timestamp: string = new Date().toISOString()

  constructor(message: string, context?: Record<string, unknown>) {
    super(message)
    this.name = this.constructor.name
    this.context = context

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * API応答用のエラーオブジェクトを生成
   */
  toApiResponse(): {
    error: {
      code: string
      message: string
      timestamp: string
      details?: Record<string, unknown>
    }
  } {
    return {
      error: {
        code: this.errorCode,
        message: this.message,
        timestamp: this.timestamp,
        ...(this.context && { details: this.context }),
      },
    }
  }
}
