import {
  type DomainException,
  BusinessRuleException,
  NotFoundException,
} from '../domain/exceptions'

/**
 * Prismaエラーをドメイン例外に変換するヘルパークラス
 */
export class PrismaErrorConverter {
  /**
   * Prismaエラーをドメイン例外に変換
   * @param error Prismaエラー
   * @param operation 実行していた操作名
   * @param context 追加のコンテキスト情報
   * @returns ドメイン例外
   */
  static convertToDomainException(
    error: unknown,
    operation: string,
    context: Record<string, unknown> = {}
  ): DomainException {
    // Prismaエラーでない場合はそのまま再投げ
    if (!this.isPrismaError(error)) {
      throw error
    }

    const prismaError = error as { code?: string; meta?: Record<string, unknown>; message?: string }
    const { code, meta, message } = prismaError

    // エラーコンテキストの構築
    const errorContext = {
      operation,
      prismaCode: code,
      prismaMessage: message,
      ...context,
    }

    switch (code) {
      case 'P2002': // Unique constraint violation
        return new BusinessRuleException(
          this.buildUniqueConstraintMessage(meta, operation),
          errorContext
        )

      case 'P2025': // Record not found
        return new NotFoundException('Resource', errorContext)

      case 'P2003': // Foreign key constraint violation
        return new BusinessRuleException(
          this.buildForeignKeyConstraintMessage(meta, operation),
          errorContext
        )

      case 'P2014': // Required relation violation
        return new BusinessRuleException(
          this.buildRequiredRelationMessage(meta, operation),
          errorContext
        )

      case 'P2016': // Query interpretation error
        return new BusinessRuleException(`Invalid query during ${operation}`, errorContext)

      case 'P2021': // Table does not exist
        return new BusinessRuleException(`Table not found during ${operation}`, errorContext)

      case 'P2022': // Column does not exist
        return new BusinessRuleException(`Column not found during ${operation}`, errorContext)

      default:
        // Connection errors (P1xxx) や Unknown errors
        if (code && code.startsWith('P1')) {
          return new BusinessRuleException(
            `Database connection error during ${operation}`,
            errorContext
          )
        }

        // その他の未知のPrismaエラー
        return new BusinessRuleException(
          `Database operation failed during ${operation}`,
          errorContext
        )
    }
  }

  /**
   * 一意制約違反エラーのメッセージを構築
   */
  private static buildUniqueConstraintMessage(
    meta: Record<string, unknown> | undefined,
    operation: string
  ): string {
    if (meta?.target) {
      const fields = Array.isArray(meta.target) ? meta.target.join(', ') : String(meta.target)
      return `Duplicate value for ${fields} during ${operation}`
    }
    return `Duplicate resource during ${operation}`
  }

  /**
   * 外部キー制約違反エラーのメッセージを構築
   */
  private static buildForeignKeyConstraintMessage(
    meta: Record<string, unknown> | undefined,
    operation: string
  ): string {
    if (meta?.field_name) {
      return `Referenced resource not found for ${String(meta.field_name)} during ${operation}`
    }
    return `Referenced resource not found during ${operation}`
  }

  /**
   * 必須関係違反エラーのメッセージを構築
   */
  private static buildRequiredRelationMessage(
    meta: Record<string, unknown> | undefined,
    operation: string
  ): string {
    if (meta?.relation_name) {
      return `Required relation '${String(meta.relation_name)}' missing during ${operation}`
    }
    return `Required relation missing during ${operation}`
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
   * 操作をPrismaエラー変換でラップ
   * @param operation 実行する操作
   * @param operationName 操作名
   * @param context コンテキスト情報
   * @returns 操作結果
   */
  static async wrapOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: Record<string, unknown> = {}
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      throw this.convertToDomainException(error, operationName, context)
    }
  }
}
