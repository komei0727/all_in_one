import { describe, it, expect } from 'vitest'

import { NotFoundException } from '@/modules/shared/server/domain/exceptions/not-found.exception'

describe('NotFoundException', () => {
  describe('文字列識別子での例外作成', () => {
    it('文字列IDで例外を作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const exception = new NotFoundException('User', 'user-123')

      // Assert（検証）
      expect(exception.message).toBe('User not found: user-123')
      expect(exception.httpStatusCode).toBe(404)
      expect(exception.errorCode).toBe('RESOURCE_NOT_FOUND')
      expect(exception.details).toEqual({
        resourceType: 'User',
        identifier: 'user-123',
      })
    })

    it('UUIDでも例外を作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      const exception = new NotFoundException('Product', uuid)

      // Assert（検証）
      expect(exception.message).toBe(`Product not found: ${uuid}`)
      expect(exception.details?.identifier).toBe(uuid)
    })
  })

  describe('オブジェクト識別子での例外作成', () => {
    it('単一プロパティのオブジェクトで例外を作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const identifier = { email: 'test@example.com' }
      const exception = new NotFoundException('User', identifier)

      // Assert（検証）
      expect(exception.message).toBe('User not found: {"email":"test@example.com"}')
      expect(exception.details).toEqual({
        resourceType: 'User',
        identifier: identifier,
      })
    })

    it('複合キーのオブジェクトで例外を作成できる', () => {
      // Arrange（準備）
      const identifier = {
        categoryId: 'cat-123',
        productName: 'テスト商品',
      }

      // Act（実行）
      const exception = new NotFoundException('Product', identifier)

      // Assert（検証）
      expect(exception.message).toBe(
        'Product not found: {"categoryId":"cat-123","productName":"テスト商品"}'
      )
      expect(exception.details?.identifier).toEqual(identifier)
    })

    it('ネストしたオブジェクトでも例外を作成できる', () => {
      // Arrange（準備）
      const identifier = {
        user: {
          id: 'user-123',
          tenant: 'tenant-456',
        },
        resourceId: 'res-789',
      }

      // Act（実行）
      const exception = new NotFoundException('Permission', identifier)

      // Assert（検証）
      expect(exception.message).toBe(
        'Permission not found: {"user":{"id":"user-123","tenant":"tenant-456"},"resourceId":"res-789"}'
      )
      expect(exception.details?.identifier).toEqual(identifier)
    })
  })

  describe('特殊な識別子での例外作成', () => {
    it('空文字列の識別子でも例外を作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const exception = new NotFoundException('Resource', '')

      // Assert（検証）
      expect(exception.message).toBe('Resource not found: ')
      expect(exception.details?.identifier).toBe('')
    })

    it('配列を含むオブジェクトでも例外を作成できる', () => {
      // Arrange（準備）
      const identifier = {
        ids: ['id1', 'id2', 'id3'],
        type: 'batch',
      }

      // Act（実行）
      const exception = new NotFoundException('Resources', identifier)

      // Assert（検証）
      expect(exception.message).toBe(
        'Resources not found: {"ids":["id1","id2","id3"],"type":"batch"}'
      )
      expect(exception.details?.identifier).toEqual(identifier)
    })

    it('nullやundefinedを含むオブジェクトでも例外を作成できる', () => {
      // Arrange（準備）
      const identifier = {
        id: 'test-123',
        optional: null,
        missing: undefined,
      }

      // Act（実行）
      const exception = new NotFoundException('Entity', identifier)

      // Assert（検証）
      expect(exception.message).toBe('Entity not found: {"id":"test-123","optional":null}')
      // JSON.stringifyはundefinedを除外する
      expect(exception.details?.identifier).toEqual(identifier)
    })
  })

  describe('継承関係の確認', () => {
    it('NotFoundExceptionはErrorを継承している', () => {
      // Arrange & Act（準備 & 実行）
      const exception = new NotFoundException('Resource', 'res-123')

      // Assert（検証）
      expect(exception).toBeInstanceOf(Error)
      expect(exception.name).toBe('NotFoundException')
    })

    it('スタックトレースが保持される', () => {
      // Arrange & Act（準備 & 実行）
      const exception = new NotFoundException('Resource', 'res-123')

      // Assert（検証）
      expect(exception.stack).toBeDefined()
      expect(exception.stack).toContain('NotFoundException')
    })
  })
})
