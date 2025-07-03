import { ApiException } from './api.exception'

/**
 * ビジネスルール違反のAPI例外
 */
export class ApiBusinessRuleException extends ApiException {
  readonly statusCode: number
  readonly errorCode: string

  constructor(
    message: string = 'Business rule violation',
    context?: Record<string, unknown>,
    statusCode: number = 422,
    errorCode: string = 'BUSINESS_RULE_VIOLATION'
  ) {
    super(message, context)
    this.statusCode = statusCode
    this.errorCode = errorCode
  }
}
