import { describe, it, expect } from 'vitest'

import { DomainException } from '@ingredients/server/domain/exceptions/domain.exception'

// Test implementation of DomainException
class TestDomainException extends DomainException {
  readonly httpStatusCode = 400
  readonly errorCode = 'TEST_ERROR'
}

describe('DomainException', () => {
  it('should create an instance with message', () => {
    // Test creating exception with message only
    const exception = new TestDomainException('Test error message')

    expect(exception).toBeInstanceOf(DomainException)
    expect(exception).toBeInstanceOf(Error)
    expect(exception.message).toBe('Test error message')
    expect(exception.name).toBe('TestDomainException')
    expect(exception.httpStatusCode).toBe(400)
    expect(exception.errorCode).toBe('TEST_ERROR')
    expect(exception.details).toBeUndefined()
  })

  it('should create an instance with message and details', () => {
    // Test creating exception with message and details
    const details = { field: 'testField', value: 'testValue' }
    const exception = new TestDomainException('Test error message', details)

    expect(exception.message).toBe('Test error message')
    expect(exception.details).toEqual(details)
  })

  it('should generate API response without details', () => {
    // Test API response generation without details
    const exception = new TestDomainException('Test error message')
    const response = exception.toApiResponse()

    expect(response).toEqual({
      error: {
        code: 'TEST_ERROR',
        message: 'Test error message',
      },
    })
  })

  it('should generate API response with details', () => {
    // Test API response generation with details
    const details = { field: 'testField', value: 'testValue' }
    const exception = new TestDomainException('Test error message', details)
    const response = exception.toApiResponse()

    expect(response).toEqual({
      error: {
        code: 'TEST_ERROR',
        message: 'Test error message',
        details: details,
      },
    })
  })

  it('should have proper stack trace', () => {
    // Test that stack trace is properly maintained
    const exception = new TestDomainException('Test error message')

    expect(exception.stack).toBeDefined()
    expect(exception.stack).toContain('TestDomainException')
  })
})
