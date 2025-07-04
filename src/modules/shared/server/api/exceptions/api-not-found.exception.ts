import { ApiException } from './api.exception'

/**
 * リソースが見つからない場合のAPI例外
 */
export class ApiNotFoundException extends ApiException {
  readonly statusCode = 404
  readonly errorCode = 'RESOURCE_NOT_FOUND'

  constructor(message: string = 'Resource not found', context?: Record<string, unknown>) {
    super(message, context)
  }
}
