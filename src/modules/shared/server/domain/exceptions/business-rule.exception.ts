import { DomainException } from './domain.exception'

/**
 * ビジネスルール違反の例外
 */
export class BusinessRuleException extends DomainException {
  readonly httpStatusCode = 422
  readonly errorCode = 'BUSINESS_RULE_VIOLATION'
  readonly code?: string

  constructor(message: string, details?: Record<string, unknown>, code?: string) {
    super(message, details)
    this.code = code
  }
}

/**
 * 重複エラーの例外
 */
export class DuplicateException extends BusinessRuleException {
  constructor(resourceType: string, field: string, value: unknown) {
    super(`${resourceType} with ${field} '${value}' already exists`, {
      resourceType,
      field,
      value,
    })
  }
}

/**
 * 操作が許可されていない場合の例外
 */
export class OperationNotAllowedException extends BusinessRuleException {
  constructor(operation: string, reason: string) {
    super(`Operation '${operation}' is not allowed: ${reason}`, {
      operation,
      reason,
    })
  }
}
