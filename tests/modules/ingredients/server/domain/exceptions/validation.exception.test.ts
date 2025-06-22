import { describe, it, expect } from 'vitest'

import {
  ValidationException,
  RequiredFieldException,
  InvalidFieldException,
} from '@ingredients/server/domain/exceptions/validation.exception'

describe('ValidationException', () => {
  it('should create an instance with message only', () => {
    // Test creating exception with message only
    const exception = new ValidationException('Validation failed')

    expect(exception).toBeInstanceOf(ValidationException)
    expect(exception.httpStatusCode).toBe(400)
    expect(exception.errorCode).toBe('VALIDATION_ERROR')
    expect(exception.message).toBe('Validation failed')
    expect(exception.details).toEqual({})
  })

  it('should create an instance with field information', () => {
    // Test creating exception with field information
    const exception = new ValidationException('Invalid email format', 'email')

    expect(exception.message).toBe('Invalid email format')
    expect(exception.details).toEqual({ field: 'email' })
  })

  it('should create an instance with field and value', () => {
    // Test creating exception with field and value
    const exception = new ValidationException('Invalid value', 'age', -5)

    expect(exception.message).toBe('Invalid value')
    expect(exception.details).toEqual({ field: 'age', value: -5 })
  })

  it('should handle undefined value correctly', () => {
    // Test that undefined value is included in details
    const exception = new ValidationException('Value is undefined', 'field', undefined)

    expect(exception.details).toEqual({ field: 'field', value: undefined })
  })

  it('should generate proper API response', () => {
    // Test API response generation
    const exception = new ValidationException('Invalid format', 'phone', '+123')
    const response = exception.toApiResponse()

    expect(response).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid format',
        details: {
          field: 'phone',
          value: '+123',
        },
      },
    })
  })
})

describe('RequiredFieldException', () => {
  it('should create an instance for required field', () => {
    // Test creating required field exception
    const exception = new RequiredFieldException('username')

    expect(exception).toBeInstanceOf(RequiredFieldException)
    expect(exception).toBeInstanceOf(ValidationException)
    expect(exception.httpStatusCode).toBe(400)
    expect(exception.errorCode).toBe('VALIDATION_ERROR')
    expect(exception.message).toBe('username is required')
    expect(exception.details).toEqual({ field: 'username' })
  })

  it('should generate proper API response', () => {
    // Test API response generation for required field
    const exception = new RequiredFieldException('email')
    const response = exception.toApiResponse()

    expect(response).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'email is required',
        details: {
          field: 'email',
        },
      },
    })
  })
})

describe('InvalidFieldException', () => {
  it('should create an instance for invalid field', () => {
    // Test creating invalid field exception
    const exception = new InvalidFieldException('age', -10, 'must be positive')

    expect(exception).toBeInstanceOf(InvalidFieldException)
    expect(exception).toBeInstanceOf(ValidationException)
    expect(exception.httpStatusCode).toBe(400)
    expect(exception.errorCode).toBe('VALIDATION_ERROR')
    expect(exception.message).toBe('Invalid age: must be positive')
    expect(exception.details).toEqual({
      field: 'age',
      value: -10,
    })
  })

  it('should handle complex values', () => {
    // Test with complex value types
    const complexValue = { nested: { value: 123 } }
    const exception = new InvalidFieldException('config', complexValue, 'invalid structure')

    expect(exception.message).toBe('Invalid config: invalid structure')
    expect(exception.details).toEqual({
      field: 'config',
      value: complexValue,
    })
  })

  it('should generate proper API response', () => {
    // Test API response generation for invalid field
    const exception = new InvalidFieldException('email', 'not-an-email', 'must be a valid email')
    const response = exception.toApiResponse()

    expect(response).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email: must be a valid email',
        details: {
          field: 'email',
          value: 'not-an-email',
        },
      },
    })
  })
})
