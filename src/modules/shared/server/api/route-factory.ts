import { type NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'

import { type BaseApiHandler } from './base-api-handler'
import { UniversalExceptionConverter } from './exception-converter'
import { ApiUnauthorizedException } from './exceptions/api-unauthorized.exception'
import { type ErrorContext } from './exceptions/error-context'

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
      _params?: Record<string, unknown>
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

        // 2. リクエストボディの取得
        const body = (await request.json()) as unknown

        // 3. APIハンドラーの実行
        const apiHandler = apiHandlerFactory()
        const result = await apiHandler.handle(body, userId, context)

        // 4. 成功レスポンスの生成
        return this.createSuccessResponse(result, 201)
      } catch (error) {
        // 5. 統一エラーハンドリング
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
      _params?: Record<string, unknown>
    ): Promise<NextResponse> => {
      const context: ErrorContext = {
        method: 'GET',
        path: request.url,
        query: Object.fromEntries(new URL(request.url).searchParams),
        ...options.errorContext,
      }

      try {
        const userId = await this.authenticateRequest(request, options.requireAuth !== false)

        // URLパラメータとクエリパラメータの結合
        const queryData = {
          ..._params,
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
      _params?: Record<string, unknown>
    ): Promise<NextResponse> => {
      const context: ErrorContext = {
        method: 'PUT',
        path: request.url,
        userAgent: request.headers.get('user-agent') || undefined,
        ...options.errorContext,
      }

      try {
        const userId = await this.authenticateRequest(request, options.requireAuth !== false)

        // リクエストボディとパラメータの結合
        const body = (await request.json()) as Record<string, unknown>
        const requestData = {
          ..._params,
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
      _params?: Record<string, unknown>
    ): Promise<NextResponse> => {
      const context: ErrorContext = {
        method: 'DELETE',
        path: request.url,
        userAgent: request.headers.get('user-agent') || undefined,
        ...options.errorContext,
      }

      try {
        const userId = await this.authenticateRequest(request, options.requireAuth !== false)

        const apiHandler = apiHandlerFactory()
        const result = await apiHandler.handle(_params || {}, userId, context)

        return this.createSuccessResponse(result, 200)
      } catch (error) {
        return this.handleError(error, context)
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
      return NextResponse.json(
        {
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found',
            timestamp: new Date().toISOString(),
          },
        },
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // DTOがtoJSON()メソッドを持っている場合は呼び出す
    const responseData =
      data && typeof data === 'object' && 'toJSON' in data
        ? (data as { toJSON: () => unknown }).toJSON()
        : data

    return NextResponse.json(responseData, {
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
    // API例外への統一変換
    const apiException = UniversalExceptionConverter.convert(error, context)

    // 構造化エラーレスポンスの生成
    const errorResponse = {
      error: {
        code: apiException.errorCode,
        message: apiException.message,
        timestamp: apiException.timestamp,
        path: context.path,
        ...(apiException.context && { details: apiException.context }),
      },
    }

    // セキュリティ：本番環境では内部エラー詳細を隠蔽
    if (process.env.NODE_ENV === 'production' && apiException.statusCode >= 500) {
      errorResponse.error.message = 'Internal server error'
      delete errorResponse.error.details
    }

    return NextResponse.json(errorResponse, {
      status: apiException.statusCode,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
