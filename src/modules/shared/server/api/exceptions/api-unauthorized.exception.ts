import { ApiException } from './api.exception'

/**
 * 認証が必要な場合のAPI例外
 */
export class ApiUnauthorizedException extends ApiException {
  readonly statusCode = 401
  readonly errorCode = 'UNAUTHORIZED'

  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, context)
  }
}
