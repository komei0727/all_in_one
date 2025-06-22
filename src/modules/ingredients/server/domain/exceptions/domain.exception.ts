/**
 * ドメイン例外の基底クラス
 *
 * すべてのドメイン例外はこのクラスを継承する
 * HTTPステータスコードとエラーコードのマッピングを提供
 */
export abstract class DomainException extends Error {
  /**
   * HTTPステータスコード
   */
  abstract readonly httpStatusCode: number

  /**
   * エラーコード（API応答で使用）
   */
  abstract readonly errorCode: string

  /**
   * エラーの詳細情報
   */
  readonly details?: Record<string, unknown>

  constructor(message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = this.constructor.name
    this.details = details

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
      details?: Record<string, unknown>
    }
  } {
    return {
      error: {
        code: this.errorCode,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    }
  }
}
