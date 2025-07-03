import { ZodError } from 'zod'

import {
  ApiException,
  ApiValidationException,
  ApiNotFoundException,
  ApiBusinessRuleException,
  ApiUnauthorizedException,
  ApiForbiddenException,
  ApiInfrastructureException,
  ApiInternalException,
  type ErrorContext,
} from './exceptions'
import {
  DomainException,
  ValidationException,
  NotFoundException,
  BusinessRuleException,
} from '../domain/exceptions'

/**
 * 統一例外変換エンジン
 * 全てのレイヤーからの例外をAPI例外に変換する中央集権的なコンバーター
 */
export class UniversalExceptionConverter {
  /**
   * あらゆる例外をAPI例外に変換
   * @param error 変換対象の例外
   * @param context エラーコンテキスト情報
   * @returns API例外
   */
  static convert(error: unknown, context?: ErrorContext): ApiException {
    // 1. 既にAPI例外の場合はそのまま返す
    if (error instanceof ApiException) {
      return error
    }

    // 2. ドメイン例外の変換
    if (error instanceof DomainException) {
      return this.convertDomainException(error, context)
    }

    // 3. インフラ例外の変換（Prisma等）
    if (this.isPrismaError(error)) {
      return this.convertPrismaException(error, context)
    }

    // 4. バリデーション例外の変換（Zod等）
    if (error instanceof ZodError) {
      return this.convertZodError(error, context)
    }

    // 5. NextAuth例外の変換
    if (this.isNextAuthError(error)) {
      return this.convertNextAuthException(error, context)
    }

    // 6. 未知のエラーの安全な変換
    return this.convertUnknownError(error, context)
  }

  /**
   * ドメイン例外をAPI例外に変換
   */
  private static convertDomainException(
    error: DomainException,
    context?: ErrorContext
  ): ApiException {
    if (error instanceof ValidationException) {
      return new ApiValidationException(error.message, {
        ...error.details,
        ...context,
      })
    }

    if (error instanceof NotFoundException) {
      return new ApiNotFoundException(error.message, {
        ...error.details,
        ...context,
      })
    }

    if (error instanceof BusinessRuleException) {
      // エラーコードがある場合はそれを使用、なければデフォルトの422
      const statusCode = error.code === 'ACTIVE_SESSION_EXISTS' ? 409 : 422
      return new ApiBusinessRuleException(
        error.message,
        {
          ...error.details,
          ...context,
        },
        statusCode,
        error.code
      )
    }

    // その他のドメイン例外は内部エラーとして扱う
    return new ApiInternalException('Domain processing error', {
      originalError: error.constructor.name,
      originalMessage: error.message,
      ...context,
    })
  }

  /**
   * Prisma例外をAPI例外に変換
   */
  private static convertPrismaException(error: unknown, context?: ErrorContext): ApiException {
    const prismaError = error as { code?: string; meta?: Record<string, unknown>; message?: string }
    const { code, meta, message } = prismaError

    switch (code) {
      case 'P2002': // Unique constraint violation
        return new ApiBusinessRuleException('Resource already exists', {
          constraint: meta?.target,
          prismaCode: code,
          ...context,
        })

      case 'P2025': // Record not found
        return new ApiNotFoundException('Resource not found', {
          prismaCode: code,
          ...context,
        })

      case 'P2003': // Foreign key constraint violation
        return new ApiBusinessRuleException('Referenced resource not found', {
          constraint: meta?.field_name,
          prismaCode: code,
          ...context,
        })

      case 'P2014': // Required relation violation
        return new ApiBusinessRuleException('Required relation missing', {
          relation: meta?.relation_name,
          prismaCode: code,
          ...context,
        })

      default:
        // Connection errors (P1xxx)
        if (code && code.startsWith('P1')) {
          return new ApiInfrastructureException('Database connection error', {
            prismaCode: code,
            ...context,
          })
        }

        // その他のPrismaエラー
        return new ApiInternalException('Database error', {
          prismaCode: code,
          prismaMessage: message,
          ...context,
        })
    }
  }

  /**
   * Zod例外をAPI例外に変換
   */
  private static convertZodError(error: ZodError, context?: ErrorContext): ApiValidationException {
    const validationErrors = error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
      ...('received' in e && e.received !== undefined && { received: e.received }),
      ...('expected' in e && e.expected !== undefined && { expected: e.expected }),
    }))

    return new ApiValidationException('Validation failed', {
      validationErrors,
      ...context,
    })
  }

  /**
   * NextAuth例外をAPI例外に変換
   */
  private static convertNextAuthException(error: unknown, context?: ErrorContext): ApiException {
    const authError = error as { type?: string; message?: string }
    const { type, message } = authError

    switch (type) {
      case 'AccessDenied':
        return new ApiForbiddenException('Access denied', {
          authErrorType: type,
          ...context,
        })

      case 'Configuration':
        return new ApiInternalException('Authentication configuration error', {
          authErrorType: type,
          ...context,
        })

      case 'Verification':
        return new ApiUnauthorizedException('Authentication verification failed', {
          authErrorType: type,
          ...context,
        })

      default:
        return new ApiUnauthorizedException('Authentication failed', {
          authErrorType: type,
          authMessage: message,
          ...context,
        })
    }
  }

  /**
   * 未知のエラーを安全に変換
   */
  private static convertUnknownError(error: unknown, context?: ErrorContext): ApiInternalException {
    // セキュリティ：本番環境では内部エラー詳細を隠蔽
    const message =
      process.env.NODE_ENV === 'development'
        ? `Unexpected error: ${String(error)}`
        : 'An unexpected error occurred'

    const errorDetails =
      process.env.NODE_ENV === 'development'
        ? {
            errorType: typeof error,
            errorConstructor: error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessage: error instanceof Error ? error.message : String(error),
            ...context,
          }
        : context

    return new ApiInternalException(message, errorDetails)
  }

  /**
   * Prismaエラーかどうかを判定
   */
  private static isPrismaError(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string' &&
      (error as { code: string }).code.startsWith('P')
    )
  }

  /**
   * NextAuthエラーかどうかを判定
   */
  private static isNextAuthError(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === 'object' &&
      'type' in error &&
      typeof (error as { type?: unknown }).type === 'string'
    )
  }
}
