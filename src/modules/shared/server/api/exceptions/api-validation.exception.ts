import { ApiException } from './api.exception'

/**
 * バリデーションエラーのAPI例外
 */
export class ApiValidationException extends ApiException {
  readonly statusCode = 400
  readonly errorCode = 'VALIDATION_ERROR'

  constructor(message: string = 'Validation failed', context?: Record<string, unknown>) {
    super(message, context)
  }
}
