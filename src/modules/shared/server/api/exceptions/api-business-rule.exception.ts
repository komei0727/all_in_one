import { ApiException } from './api.exception'

/**
 * ビジネスルール違反のAPI例外
 */
export class ApiBusinessRuleException extends ApiException {
  readonly statusCode = 422
  readonly errorCode = 'BUSINESS_RULE_VIOLATION'

  constructor(message: string = 'Business rule violation', context?: Record<string, unknown>) {
    super(message, context)
  }
}
