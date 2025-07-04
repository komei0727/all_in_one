import { ApiException } from './api.exception'

/**
 * 内部サーバーエラーのAPI例外
 */
export class ApiInternalException extends ApiException {
  readonly statusCode = 500
  readonly errorCode = 'INTERNAL_SERVER_ERROR'

  constructor(message: string = 'Internal server error', context?: Record<string, unknown>) {
    super(message, context)
  }
}
