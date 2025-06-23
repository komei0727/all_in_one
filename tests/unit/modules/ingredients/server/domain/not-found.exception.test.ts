import { describe, it, expect } from 'vitest'

import {
  NotFoundException,
  CategoryNotFoundException,
  UnitNotFoundException,
} from '@ingredients/server/domain/exceptions/not-found.exception'

describe('NotFoundException', () => {
  it('should create an instance with string identifier', () => {
    // Test creating exception with string identifier
    const exception = new NotFoundException('User', 'user-123')

    expect(exception).toBeInstanceOf(NotFoundException)
    expect(exception.httpStatusCode).toBe(404)
    expect(exception.errorCode).toBe('RESOURCE_NOT_FOUND')
    expect(exception.message).toBe('User not found: user-123')
    expect(exception.details).toEqual({
      resourceType: 'User',
      identifier: 'user-123',
    })
  })

  it('should create an instance with object identifier', () => {
    // Test creating exception with object identifier
    const identifier = { email: 'test@example.com', role: 'admin' }
    const exception = new NotFoundException('User', identifier)

    expect(exception.message).toBe('User not found: {"email":"test@example.com","role":"admin"}')
    expect(exception.details).toEqual({
      resourceType: 'User',
      identifier: identifier,
    })
  })

  it('should generate proper API response', () => {
    // Test API response generation
    const exception = new NotFoundException('Product', 'prod-456')
    const response = exception.toApiResponse()

    expect(response).toEqual({
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Product not found: prod-456',
        details: {
          resourceType: 'Product',
          identifier: 'prod-456',
        },
      },
    })
  })
})

describe('CategoryNotFoundException', () => {
  it('should create an instance for category not found', () => {
    // Test creating category not found exception
    const exception = new CategoryNotFoundException('category-123')

    expect(exception).toBeInstanceOf(CategoryNotFoundException)
    expect(exception).toBeInstanceOf(NotFoundException)
    expect(exception.httpStatusCode).toBe(404)
    expect(exception.errorCode).toBe('RESOURCE_NOT_FOUND')
    expect(exception.message).toBe('Category not found: category-123')
    expect(exception.details).toEqual({
      resourceType: 'Category',
      identifier: 'category-123',
    })
  })

  it('should generate proper API response', () => {
    // Test API response generation for category not found
    const exception = new CategoryNotFoundException('cat-789')
    const response = exception.toApiResponse()

    expect(response).toEqual({
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Category not found: cat-789',
        details: {
          resourceType: 'Category',
          identifier: 'cat-789',
        },
      },
    })
  })
})

describe('UnitNotFoundException', () => {
  it('should create an instance for unit not found', () => {
    // Test creating unit not found exception
    const exception = new UnitNotFoundException('unit-456')

    expect(exception).toBeInstanceOf(UnitNotFoundException)
    expect(exception).toBeInstanceOf(NotFoundException)
    expect(exception.httpStatusCode).toBe(404)
    expect(exception.errorCode).toBe('RESOURCE_NOT_FOUND')
    expect(exception.message).toBe('Unit not found: unit-456')
    expect(exception.details).toEqual({
      resourceType: 'Unit',
      identifier: 'unit-456',
    })
  })

  it('should generate proper API response', () => {
    // Test API response generation for unit not found
    const exception = new UnitNotFoundException('unit-abc')
    const response = exception.toApiResponse()

    expect(response).toEqual({
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Unit not found: unit-abc',
        details: {
          resourceType: 'Unit',
          identifier: 'unit-abc',
        },
      },
    })
  })
})
