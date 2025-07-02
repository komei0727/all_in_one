import { ApiException } from './api.exception'

/**
 * インフラストラクチャ関連のAPI例外
 */
export class ApiInfrastructureException extends ApiException {
  readonly statusCode = 503
  readonly errorCode = 'SERVICE_UNAVAILABLE'

  constructor(
    message: string = 'Service temporarily unavailable',
    context?: Record<string, unknown>
  ) {
    super(message, context)
  }
}
