import { DomainException } from './domain.exception'

/**
 * バリデーションエラーの例外
 */
export class ValidationException extends DomainException {
  readonly httpStatusCode = 400
  readonly errorCode = 'VALIDATION_ERROR'

  constructor(message: string, field?: string, value?: unknown) {
    super(message, {
      ...(field && { field }),
      ...(value !== undefined && { value }),
    })
  }
}

/**
 * 必須フィールドが欠けている場合の例外
 */
export class RequiredFieldException extends ValidationException {
  constructor(fieldName: string) {
    super(`${fieldName}は必須です`, fieldName)
  }
}

/**
 * フィールドの値が無効な場合の例外
 */
export class InvalidFieldException extends ValidationException {
  constructor(fieldName: string, value: unknown, reason: string) {
    super(`${fieldName}は${reason}`, fieldName, value)
  }
}
