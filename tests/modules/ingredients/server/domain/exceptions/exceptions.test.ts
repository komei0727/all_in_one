import { describe, it, expect } from 'vitest'

import {
  ValidationException,
  BusinessRuleException,
  NotFoundException,
  CategoryNotFoundException,
  UnitNotFoundException,
} from '@/modules/ingredients/server/domain/exceptions'

describe('Domain Exceptions', () => {
  describe('ValidationException', () => {
    it('バリデーションエラーを正しく生成できる', () => {
      // バリデーションエラーの生成とプロパティの検証
      const error = new ValidationException('無効な値です')

      expect(error).toBeInstanceOf(ValidationException)
      expect(error.message).toBe('無効な値です')
      expect(error.httpStatusCode).toBe(400)
      expect(error.errorCode).toBe('VALIDATION_ERROR')
    })

    it('詳細情報付きでエラーを生成できる', () => {
      // 詳細情報付きエラーの生成
      const error = new ValidationException('名前は必須です', 'name', '')

      expect(error.message).toBe('名前は必須です')
      expect(error.details).toEqual({ field: 'name', value: '' })
    })
  })

  describe('BusinessRuleException', () => {
    it('ビジネスルール違反エラーを正しく生成できる', () => {
      // ビジネスルール違反エラーの生成とプロパティの検証
      const error = new BusinessRuleException('在庫数量は0以上である必要があります')

      expect(error).toBeInstanceOf(BusinessRuleException)
      expect(error.message).toBe('在庫数量は0以上である必要があります')
      expect(error.httpStatusCode).toBe(422)
      expect(error.errorCode).toBe('BUSINESS_RULE_VIOLATION')
    })
  })

  describe('NotFoundException', () => {
    it('リソース不存在エラーを正しく生成できる', () => {
      // リソース不存在エラーの生成とプロパティの検証
      const error = new NotFoundException('Ingredient', 'test-id')

      expect(error).toBeInstanceOf(NotFoundException)
      expect(error.message).toBe('Ingredient not found: test-id')
      expect(error.httpStatusCode).toBe(404)
      expect(error.errorCode).toBe('RESOURCE_NOT_FOUND')
    })

    it('複合キーでのリソース不存在エラーを生成できる', () => {
      // 複合キーでのエラー生成
      const identifier = { categoryId: 'cat-1', name: 'トマト' }
      const error = new NotFoundException('Ingredient', identifier)

      expect(error.message).toBe('Ingredient not found: {"categoryId":"cat-1","name":"トマト"}')
      expect(error.details).toEqual({ resourceType: 'Ingredient', identifier })
    })
  })

  describe('CategoryNotFoundException', () => {
    it('カテゴリー不存在エラーを正しく生成できる', () => {
      // カテゴリー不存在エラーの生成
      const error = new CategoryNotFoundException('category-id')

      expect(error).toBeInstanceOf(CategoryNotFoundException)
      expect(error).toBeInstanceOf(NotFoundException)
      expect(error.message).toBe('Category not found: category-id')
      expect(error.httpStatusCode).toBe(404)
    })
  })

  describe('UnitNotFoundException', () => {
    it('単位不存在エラーを正しく生成できる', () => {
      // 単位不存在エラーの生成
      const error = new UnitNotFoundException('unit-id')

      expect(error).toBeInstanceOf(UnitNotFoundException)
      expect(error).toBeInstanceOf(NotFoundException)
      expect(error.message).toBe('Unit not found: unit-id')
      expect(error.httpStatusCode).toBe(404)
    })
  })
})
