import { UniversalExceptionConverter } from './exception-converter'

import type { ErrorContext } from './exceptions'

/**
 * 包括的例外変換機能を持つBaseAPIハンドラー
 *
 * 全てのAPIハンドラーはこのクラスを継承することで、
 * 統一的な例外変換とエラーハンドリングを利用できる
 */
export abstract class BaseApiHandler<TRequest, TResponse> {
  /**
   * リクエストデータのバリデーション
   * @param data バリデーション対象のデータ
   * @returns バリデーション済みのリクエストデータ
   */
  abstract validate(data: unknown): TRequest

  /**
   * ビジネスロジックの実行
   * @param request バリデーション済みのリクエストデータ
   * @param userId 認証されたユーザーID
   * @returns レスポンスデータ
   */
  abstract execute(request: TRequest, userId: string): Promise<TResponse>

  /**
   * 統一例外変換を含むハンドリング
   *
   * このメソッドは以下の処理を順次実行する：
   * 1. リクエストデータのバリデーション
   * 2. ビジネスロジックの実行
   * 3. 例外発生時の統一変換
   *
   * @param data リクエストデータ
   * @param userId 認証されたユーザーID
   * @param context エラーコンテキスト情報
   * @returns レスポンスデータ
   * @throws {ApiException} 変換されたAPI例外
   */
  async handle(data: unknown, userId: string, context?: ErrorContext): Promise<TResponse> {
    try {
      // 1. バリデーション実行
      const validatedRequest = this.validate(data)

      // 2. ビジネスロジック実行
      return await this.execute(validatedRequest, userId)
    } catch (error) {
      // 3. 全例外をAPI例外に変換してから再投げ
      const enhancedContext: ErrorContext = {
        handler: this.constructor.name,
        userId,
        ...context,
      }

      const apiException = UniversalExceptionConverter.convert(error, enhancedContext)
      throw apiException
    }
  }

  /**
   * バリデーションのみを実行するヘルパーメソッド
   * テスト時などに有用
   *
   * @param data バリデーション対象のデータ
   * @returns バリデーション済みのリクエストデータ
   */
  validateOnly(data: unknown): TRequest {
    return this.validate(data)
  }

  /**
   * ビジネスロジックのみを実行するヘルパーメソッド
   * テスト時などに有用
   *
   * @param request バリデーション済みのリクエストデータ
   * @param userId 認証されたユーザーID
   * @returns レスポンスデータ
   */
  async executeOnly(request: TRequest, userId: string): Promise<TResponse> {
    return await this.execute(request, userId)
  }
}
