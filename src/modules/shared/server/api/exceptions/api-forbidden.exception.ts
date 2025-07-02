import { ApiException } from './api.exception'

/**
 * アクセス権限がない場合のAPI例外
 */
export class ApiForbiddenException extends ApiException {
  readonly statusCode = 403
  readonly errorCode = 'FORBIDDEN'

  constructor(message: string = 'Access denied', context?: Record<string, unknown>) {
    super(message, context)
  }
}
