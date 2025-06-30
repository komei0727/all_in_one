import { describe, it, expect } from 'vitest'

import {
  BusinessRuleException,
  DuplicateException,
  OperationNotAllowedException,
} from '@/modules/shared/server/domain/exceptions/business-rule.exception'

describe('BusinessRuleException', () => {
  describe('基本的な例外作成', () => {
    it('メッセージのみで例外を作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const exception = new BusinessRuleException('ビジネスルール違反です')

      // Assert（検証）
      expect(exception.message).toBe('ビジネスルール違反です')
      expect(exception.httpStatusCode).toBe(422)
      expect(exception.errorCode).toBe('BUSINESS_RULE_VIOLATION')
      expect(exception.details).toBeUndefined()
    })

    it('メッセージと詳細情報で例外を作成できる', () => {
      // Arrange（準備）
      const details = {
        field: 'quantity',
        value: -1,
        rule: '数量は0以上である必要があります',
      }

      // Act（実行）
      const exception = new BusinessRuleException('数量が無効です', details)

      // Assert（検証）
      expect(exception.message).toBe('数量が無効です')
      expect(exception.details).toEqual(details)
    })
  })

  describe('DuplicateException', () => {
    it('重複エラーの例外を作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const exception = new DuplicateException('User', 'email', 'test@example.com')

      // Assert（検証）
      expect(exception.message).toBe("User with email 'test@example.com' already exists")
      expect(exception.httpStatusCode).toBe(422)
      expect(exception.errorCode).toBe('BUSINESS_RULE_VIOLATION')
      expect(exception.details).toEqual({
        resourceType: 'User',
        field: 'email',
        value: 'test@example.com',
      })
    })

    it('数値の重複も扱える', () => {
      // Arrange & Act（準備 & 実行）
      const exception = new DuplicateException('Product', 'code', 12345)

      // Assert（検証）
      expect(exception.message).toBe("Product with code '12345' already exists")
      expect(exception.details).toEqual({
        resourceType: 'Product',
        field: 'code',
        value: 12345,
      })
    })

    it('オブジェクトの重複も扱える', () => {
      // Arrange（準備）
      const compositeKey = { categoryId: 'cat1', name: '既存商品' }

      // Act（実行）
      const exception = new DuplicateException('Product', 'compositeKey', compositeKey)

      // Assert（検証）
      expect(exception.message).toBe("Product with compositeKey '[object Object]' already exists")
      expect(exception.details).toEqual({
        resourceType: 'Product',
        field: 'compositeKey',
        value: compositeKey,
      })
    })
  })

  describe('OperationNotAllowedException', () => {
    it('操作不許可の例外を作成できる', () => {
      // Arrange & Act（準備 & 実行）
      const exception = new OperationNotAllowedException('delete', 'リソースは使用中です')

      // Assert（検証）
      expect(exception.message).toBe("Operation 'delete' is not allowed: リソースは使用中です")
      expect(exception.httpStatusCode).toBe(422)
      expect(exception.errorCode).toBe('BUSINESS_RULE_VIOLATION')
      expect(exception.details).toEqual({
        operation: 'delete',
        reason: 'リソースは使用中です',
      })
    })

    it('複雑な操作名も扱える', () => {
      // Arrange & Act（準備 & 実行）
      const exception = new OperationNotAllowedException(
        'status.transition.active->inactive',
        'アクティブなユーザーは無効化できません'
      )

      // Assert（検証）
      expect(exception.message).toBe(
        "Operation 'status.transition.active->inactive' is not allowed: アクティブなユーザーは無効化できません"
      )
      expect(exception.details).toEqual({
        operation: 'status.transition.active->inactive',
        reason: 'アクティブなユーザーは無効化できません',
      })
    })
  })

  describe('継承関係の確認', () => {
    it('すべての例外がBusinessRuleExceptionを継承している', () => {
      // Arrange & Act（準備 & 実行）
      const duplicateException = new DuplicateException('Resource', 'id', '123')
      const operationException = new OperationNotAllowedException('update', '読み取り専用')

      // Assert（検証）
      expect(duplicateException).toBeInstanceOf(BusinessRuleException)
      expect(operationException).toBeInstanceOf(BusinessRuleException)
    })

    it('すべての例外がErrorを継承している', () => {
      // Arrange & Act（準備 & 実行）
      const businessRuleException = new BusinessRuleException('ルール違反')
      const duplicateException = new DuplicateException('Resource', 'id', '123')
      const operationException = new OperationNotAllowedException('update', '読み取り専用')

      // Assert（検証）
      expect(businessRuleException).toBeInstanceOf(Error)
      expect(duplicateException).toBeInstanceOf(Error)
      expect(operationException).toBeInstanceOf(Error)
    })
  })
})
