/**
 * エラーコンテキスト情報
 * エラー発生時の追加情報を格納する
 */
export interface ErrorContext {
  /**
   * HTTPメソッド
   */
  method?: string

  /**
   * リクエストパス
   */
  path?: string

  /**
   * ユーザーID
   */
  userId?: string

  /**
   * ハンドラー名
   */
  handler?: string

  /**
   * クエリパラメータ
   */
  query?: Record<string, unknown>

  /**
   * ユーザーエージェント
   */
  userAgent?: string

  /**
   * その他の任意の情報
   */
  [key: string]: unknown
}
