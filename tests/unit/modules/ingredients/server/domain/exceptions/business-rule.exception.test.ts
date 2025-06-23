import { describe, it, expect } from 'vitest'

import {
  BusinessRuleException,
  DuplicateException,
  OperationNotAllowedException,
} from '@ingredients/server/domain/exceptions/business-rule.exception'

describe('BusinessRuleException', () => {
  it('should create an instance with message only', () => {
    // Test creating exception with message only
    const exception = new BusinessRuleException('Business rule violated')

    expect(exception).toBeInstanceOf(BusinessRuleException)
    expect(exception.httpStatusCode).toBe(422)
    expect(exception.errorCode).toBe('BUSINESS_RULE_VIOLATION')
    expect(exception.message).toBe('Business rule violated')
    expect(exception.details).toBeUndefined()
  })

  it('should create an instance with details', () => {
    // Test creating exception with details
    const details = { rule: 'max_items', limit: 100, current: 105 }
    const exception = new BusinessRuleException('Maximum items exceeded', details)

    expect(exception.message).toBe('Maximum items exceeded')
    expect(exception.details).toEqual(details)
  })

  it('should generate proper API response', () => {
    // Test API response generation
    const exception = new BusinessRuleException('Cannot process order', { status: 'cancelled' })
    const response = exception.toApiResponse()

    expect(response).toEqual({
      error: {
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'Cannot process order',
        details: {
          status: 'cancelled',
        },
      },
    })
  })
})

describe('DuplicateException', () => {
  it('should create an instance for duplicate resource', () => {
    // Test creating duplicate exception
    const exception = new DuplicateException('User', 'email', 'test@example.com')

    expect(exception).toBeInstanceOf(DuplicateException)
    expect(exception).toBeInstanceOf(BusinessRuleException)
    expect(exception.httpStatusCode).toBe(422)
    expect(exception.errorCode).toBe('BUSINESS_RULE_VIOLATION')
    expect(exception.message).toBe("User with email 'test@example.com' already exists")
    expect(exception.details).toEqual({
      resourceType: 'User',
      field: 'email',
      value: 'test@example.com',
    })
  })

  it('should handle different value types', () => {
    // Test with different value types
    const exception = new DuplicateException('Product', 'id', 12345)

    expect(exception.message).toBe("Product with id '12345' already exists")
    expect(exception.details).toEqual({
      resourceType: 'Product',
      field: 'id',
      value: 12345,
    })
  })

  it('should generate proper API response', () => {
    // Test API response generation for duplicate
    const exception = new DuplicateException('Category', 'name', '野菜')
    const response = exception.toApiResponse()

    expect(response).toEqual({
      error: {
        code: 'BUSINESS_RULE_VIOLATION',
        message: "Category with name '野菜' already exists",
        details: {
          resourceType: 'Category',
          field: 'name',
          value: '野菜',
        },
      },
    })
  })
})

describe('OperationNotAllowedException', () => {
  it('should create an instance for not allowed operation', () => {
    // Test creating operation not allowed exception
    const exception = new OperationNotAllowedException('delete', 'resource is in use')

    expect(exception).toBeInstanceOf(OperationNotAllowedException)
    expect(exception).toBeInstanceOf(BusinessRuleException)
    expect(exception.httpStatusCode).toBe(422)
    expect(exception.errorCode).toBe('BUSINESS_RULE_VIOLATION')
    expect(exception.message).toBe("Operation 'delete' is not allowed: resource is in use")
    expect(exception.details).toEqual({
      operation: 'delete',
      reason: 'resource is in use',
    })
  })

  it('should handle complex operation names', () => {
    // Test with complex operation names
    const exception = new OperationNotAllowedException('bulk_update', 'insufficient permissions')

    expect(exception.message).toBe(
      "Operation 'bulk_update' is not allowed: insufficient permissions"
    )
    expect(exception.details).toEqual({
      operation: 'bulk_update',
      reason: 'insufficient permissions',
    })
  })

  it('should generate proper API response', () => {
    // Test API response generation for operation not allowed
    const exception = new OperationNotAllowedException('archive', 'already archived')
    const response = exception.toApiResponse()

    expect(response).toEqual({
      error: {
        code: 'BUSINESS_RULE_VIOLATION',
        message: "Operation 'archive' is not allowed: already archived",
        details: {
          operation: 'archive',
          reason: 'already archived',
        },
      },
    })
  })
})
