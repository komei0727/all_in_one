import { type NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'

import { type BaseApiHandler } from './base-api-handler'
import { UniversalExceptionConverter } from './exception-converter'
import { ApiUnauthorizedException } from './exceptions/api-unauthorized.exception'
import { type ErrorContext } from './exceptions/error-context'
import { ResponseFormatter } from './response-formatter'

/**
 * ルートオプション
 */
export interface RouteOptions {
  /** 認証が必要かどうか（デフォルト: true） */
  requireAuth?: boolean
  /** カスタムのエラーコンテキスト */
  errorContext?: Partial<ErrorContext>
}

/**
 * 統一されたRouteハンドラーファクトリー
 * 全ての共通処理（認証、例外変換、レスポンス生成）を提供
 */
export class UnifiedRouteFactory {
  /**
   * POST用ルートハンドラーの生成
   */
  static createPostHandler<TRequest, TResponse>(
    apiHandlerFactory: () => BaseApiHandler<TRequest, TResponse>,
    options: RouteOptions = {}
  ) {
    return async (
      request: NextRequest,
      routeContext?: { params: Promise<Record<string, string>> | Record<string, string> }
    ): Promise<NextResponse> => {
      const context: ErrorContext = {
        method: 'POST',
        path: request.url,
        userAgent: request.headers.get('user-agent') || undefined,
        ...options.errorContext,
      }

      try {
        // 1. 認証処理
        const userId = await this.authenticateRequest(request, options.requireAuth !== false)

        // 2. パラメータを解決（Promiseの場合はawait）
        let params: Record<string, string> = {}
        if (routeContext?.params) {
          params =
            routeContext.params instanceof Promise ? await routeContext.params : routeContext.params
        }

        // 3. リクエストボディの取得
        let body: Record<string, unknown> = {}
        try {
          // Content-Typeに関係なく、JSONの解析を試みる（寛容なアプローチ）
          const text = await request.text()
          if (text.trim()) {
            body = JSON.parse(text) as Record<string, unknown>
          }
        } catch (_error) {
          // JSONパースエラーの場合は例外として扱う
          const contentType = request.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            throw new Error('Invalid JSON format in request body')
          }
          // Content-Typeが不正でもJSONとして解析できない場合は無視
        }

        // 4. パラメータとボディを統合（userIdも含める）
        const requestData = { ...params, ...body, userId }

        // 5. APIハンドラーの実行
        const apiHandler = apiHandlerFactory()
        const result = await apiHandler.handle(requestData, userId, context)

        // 6. 成功レスポンスの生成
        return this.createSuccessResponse(result, 201)
      } catch (error) {
        // 7. 統一エラーハンドリング
        return this.handleError(error, context)
      }
    }
  }

  /**
   * GET用ルートハンドラーの生成
   */
  static createGetHandler<TQuery, TResponse>(
    apiHandlerFactory: () => BaseApiHandler<TQuery, TResponse>,
    options: RouteOptions = {}
  ) {
    return async (
      request: NextRequest,
      routeContext?: { params: Promise<Record<string, string>> | Record<string, string> }
    ): Promise<NextResponse> => {
      const context: ErrorContext = {
        method: 'GET',
        path: request.url,
        query: Object.fromEntries(new URL(request.url).searchParams),
        ...options.errorContext,
      }

      try {
        const userId = await this.authenticateRequest(request, options.requireAuth !== false)

        // パラメータを解決（Promiseの場合はawait）
        let params: Record<string, string> = {}
        if (routeContext?.params) {
          params =
            routeContext.params instanceof Promise ? await routeContext.params : routeContext.params
        }

        // URLパラメータとクエリパラメータの結合
        const queryData = {
          ...params,
          ...Object.fromEntries(new URL(request.url).searchParams),
        }

        const apiHandler = apiHandlerFactory()
        const result = await apiHandler.handle(queryData, userId, context)

        return this.createSuccessResponse(result, 200)
      } catch (error) {
        return this.handleError(error, context)
      }
    }
  }

  /**
   * PUT用ルートハンドラーの生成
   */
  static createPutHandler<TRequest, TResponse>(
    apiHandlerFactory: () => BaseApiHandler<TRequest, TResponse>,
    options: RouteOptions = {}
  ) {
    return async (
      request: NextRequest,
      routeContext?: { params: Promise<Record<string, string>> | Record<string, string> }
    ): Promise<NextResponse> => {
      const context: ErrorContext = {
        method: 'PUT',
        path: request.url,
        userAgent: request.headers.get('user-agent') || undefined,
        ...options.errorContext,
      }

      try {
        const userId = await this.authenticateRequest(request, options.requireAuth !== false)

        // パラメータを解決（Promiseの場合はawait）
        let params: Record<string, string> = {}
        if (routeContext?.params) {
          params =
            routeContext.params instanceof Promise ? await routeContext.params : routeContext.params
        }

        // リクエストボディとパラメータの結合
        const body = (await request.json()) as Record<string, unknown>
        const requestData = {
          ...params,
          ...body,
        }

        const apiHandler = apiHandlerFactory()
        const result = await apiHandler.handle(requestData, userId, context)

        return this.createSuccessResponse(result, 200)
      } catch (error) {
        return this.handleError(error, context)
      }
    }
  }

  /**
   * DELETE用ルートハンドラーの生成
   */
  static createDeleteHandler<TRequest, TResponse>(
    apiHandlerFactory: () => BaseApiHandler<TRequest, TResponse>,
    options: RouteOptions = {}
  ) {
    return async (
      request: NextRequest,
      routeContext?: { params: Promise<Record<string, string>> | Record<string, string> }
    ): Promise<NextResponse> => {
      const errorContext: ErrorContext = {
        method: 'DELETE',
        path: request.url,
        userAgent: request.headers.get('user-agent') || undefined,
        ...options.errorContext,
      }

      try {
        const userId = await this.authenticateRequest(request, options.requireAuth !== false)

        // パラメータを解決（Promiseの場合はawait）
        let params: Record<string, string> = {}
        if (routeContext?.params) {
          params =
            routeContext.params instanceof Promise ? await routeContext.params : routeContext.params
        }

        // リクエストボディがある場合は取得（オプション）
        let body: Record<string, unknown> = {}
        try {
          // Content-Typeに関係なく、JSONの解析を試みる（寛容なアプローチ）
          const text = await request.text()
          if (text.trim()) {
            body = JSON.parse(text) as Record<string, unknown>
          }
        } catch (_error) {
          // JSONパースエラーの場合は例外として扱う
          const contentType = request.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            throw new Error('Invalid JSON format in request body')
          }
          // Content-Typeが不正でもJSONとして解析できない場合は無視
        }

        // パラメータとボディを統合
        const requestData = { ...params, ...body }

        const apiHandler = apiHandlerFactory()
        const result = await apiHandler.handle(requestData, userId, errorContext)

        // DELETEハンドラーがvoidを返す場合は204 No Contentを返す
        const statusCode = result === undefined || result === null ? 204 : 200
        return this.createSuccessResponse(result, statusCode)
      } catch (error) {
        return this.handleError(error, errorContext)
      }
    }
  }

  /**
   * 認証処理
   */
  private static async authenticateRequest(
    request: NextRequest,
    required: boolean
  ): Promise<string> {
    if (!required) return 'anonymous'

    const session = await auth()
    if (!session?.user?.domainUserId) {
      throw new ApiUnauthorizedException()
    }
    return session.user.domainUserId
  }

  /**
   * 成功レスポンスの生成
   */
  private static createSuccessResponse<T>(data: T, status: number): NextResponse {
    // nullの場合は404エラーとして扱う（特にGET操作で見つからない場合）
    if (data === null && status === 200) {
      const errorResponse = {
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource not found',
          type: 'NOT_FOUND' as const,
          timestamp: new Date().toISOString(),
          path: '', // 呼び出し元で設定される
        },
        meta: {
          timestamp: new Date().toISOString(),
          correlationId: '', // 実際のアプリケーションではUUIDを生成
        },
      }

      return NextResponse.json(errorResponse, {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // DTOがtoJSON()メソッドを持っている場合は呼び出す
    let processedData = data
    if (data && typeof data === 'object' && 'toJSON' in data) {
      // ActiveShoppingSessionDtoの場合は特別なメソッドを呼び出す
      if ('toActiveSessionJSON' in data && typeof data.toActiveSessionJSON === 'function') {
        processedData = (data as { toActiveSessionJSON: () => unknown }).toActiveSessionJSON() as T
      } else {
        processedData = (data as { toJSON: () => unknown }).toJSON() as T
      }
    }

    // 204 No Contentの場合は空のレスポンスを返す
    // NextResponse.json()は204ステータスコードをサポートしていないため、
    // 空のResponseオブジェクトを直接作成する
    if (status === 204) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
    }

    // 共通メタデータを付与したレスポンスを生成
    const formattedResponse = ResponseFormatter.success(processedData)

    return NextResponse.json(formattedResponse, {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })
  }

  /**
   * エラーハンドリング
   */
  private static handleError(error: unknown, context: ErrorContext): NextResponse {
    // デバッグ用：エラーを出力
    if (process.env.NODE_ENV !== 'production') {
      console.error('RouteFactory handleError:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    }

    // API例外への統一変換
    const apiException = UniversalExceptionConverter.convert(error, context)

    // 統一エラーレスポンス形式の生成
    const errorResponse = {
      error: {
        code: apiException.errorCode,
        message: apiException.message,
        type: this.mapToErrorType(apiException.statusCode),
        timestamp: apiException.timestamp,
        path: context.path,
        ...(apiException.context && { details: apiException.context }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        correlationId: this.generateCorrelationId(),
      },
    }

    // セキュリティ：本番環境では内部エラー詳細を隠蔽
    if (process.env.NODE_ENV === 'production' && apiException.statusCode >= 500) {
      errorResponse.error.message = 'Internal server error'
      delete errorResponse.error.details
    }

    // 開発環境では元のエラーメッセージを含める
    if (process.env.NODE_ENV !== 'production' && apiException.statusCode >= 500) {
      errorResponse.error.details = {
        ...errorResponse.error.details,
        originalError: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }
    }

    return NextResponse.json(errorResponse, {
      status: apiException.statusCode,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  /**
   * HTTPステータスコードからエラータイプをマッピング
   */
  private static mapToErrorType(
    statusCode: number
  ): 'BUSINESS_RULE_VIOLATION' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'SYSTEM_ERROR' {
    if (statusCode >= 400 && statusCode < 500) {
      switch (statusCode) {
        case 400:
          return 'VALIDATION_ERROR'
        case 404:
          return 'NOT_FOUND'
        case 409:
          return 'BUSINESS_RULE_VIOLATION'
        default:
          return 'VALIDATION_ERROR'
      }
    }
    return 'SYSTEM_ERROR'
  }

  /**
   * 相関IDの生成（簡易実装）
   */
  private static generateCorrelationId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
