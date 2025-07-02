import { BaseApiHandler } from './base-api-handler'

import type { ErrorContext } from './exceptions'

/**
 * 型安全なAPIハンドラーのインターフェース
 */
export interface TypedApiHandler<TRequest, TResponse> {
  handle(data: unknown, userId: string, context?: ErrorContext): Promise<TResponse>
  validate(data: unknown): TRequest
  execute(request: TRequest, userId: string): Promise<TResponse>
}

/**
 * コマンド系APIハンドラーの基底クラス
 * 作成、更新、削除などの状態変更を行うAPI用
 */
export abstract class BaseCommandApiHandler<TRequest, TResponse>
  extends BaseApiHandler<TRequest, TResponse>
  implements TypedApiHandler<TRequest, TResponse>
{
  /**
   * コマンド実行前の事前条件チェック
   * オーバーライド可能
   */
  protected async validatePreconditions(_request: TRequest, _userId: string): Promise<void> {
    // デフォルトでは何もしない
    // 子クラスで必要に応じてオーバーライド
  }

  /**
   * コマンド実行後の後処理
   * オーバーライド可能
   */
  protected async postProcess(
    _request: TRequest,
    _response: TResponse,
    _userId: string
  ): Promise<void> {
    // デフォルトでは何もしない
    // 子クラスで必要に応じてオーバーライド
  }

  /**
   * コマンド実行のテンプレートメソッド
   */
  async execute(request: TRequest, userId: string): Promise<TResponse> {
    // 事前条件チェック
    await this.validatePreconditions(request, userId)

    // メインのビジネスロジック実行
    const response = await this.executeCommand(request, userId)

    // 後処理
    await this.postProcess(request, response, userId)

    return response
  }

  /**
   * 実際のコマンド実行ロジック
   * 子クラスで実装必須
   */
  protected abstract executeCommand(request: TRequest, userId: string): Promise<TResponse>
}

/**
 * クエリ系APIハンドラーの基底クラス
 * データの取得を行うAPI用
 */
export abstract class BaseQueryApiHandler<TRequest, TResponse>
  extends BaseApiHandler<TRequest, TResponse>
  implements TypedApiHandler<TRequest, TResponse>
{
  /**
   * クエリ実行前のアクセス権限チェック
   * オーバーライド可能
   */
  protected async validateAccess(_request: TRequest, _userId: string): Promise<void> {
    // デフォルトでは何もしない
    // 子クラスで必要に応じてオーバーライド
  }

  /**
   * レスポンスデータの後処理・フィルタリング
   * オーバーライド可能
   */
  protected async filterResponse(response: TResponse, _userId: string): Promise<TResponse> {
    // デフォルトではそのまま返す
    // 子クラスで必要に応じてオーバーライド
    return response
  }

  /**
   * クエリ実行のテンプレートメソッド
   */
  async execute(request: TRequest, userId: string): Promise<TResponse> {
    // アクセス権限チェック
    await this.validateAccess(request, userId)

    // メインのクエリ実行
    const response = await this.executeQuery(request, userId)

    // レスポンスフィルタリング
    return await this.filterResponse(response, userId)
  }

  /**
   * 実際のクエリ実行ロジック
   * 子クラスで実装必須
   */
  protected abstract executeQuery(request: TRequest, userId: string): Promise<TResponse>
}
