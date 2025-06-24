import { createId } from '@paralleldrive/cuid2'
import { describe, it, expect } from 'vitest'

import { ValidationException } from '@/modules/ingredients/server/domain/exceptions/validation.exception'
import { CategoryId } from '@/modules/ingredients/server/domain/value-objects'

import { faker } from '../../../../../../__fixtures__/builders/faker.config'

describe('CategoryId', () => {
  describe('create', () => {
    // 正常系のテスト
    it('有効なCUID形式のIDでインスタンスを生成できる', () => {
      // CUID形式のIDでインスタンスを作成
      const id = createId()
      const categoryId = CategoryId.create(id)
      expect(categoryId.getValue()).toBe(id)
    })

    it('8文字以上の英数字とハイフン、アンダースコアを含むIDを許可する', () => {
      // 最小文字数（8文字）のテスト
      const minId = 'test1234'
      expect(() => CategoryId.create(minId)).not.toThrow()

      // ハイフンを含むID
      const hyphenId = 'test-id-1234'
      expect(() => CategoryId.create(hyphenId)).not.toThrow()

      // アンダースコアを含むID
      const underscoreId = 'test_id_1234'
      expect(() => CategoryId.create(underscoreId)).not.toThrow()

      // 混合パターン
      const mixedId = 'test-id_1234-ABCD'
      expect(() => CategoryId.create(mixedId)).not.toThrow()
    })

    it('UUID形式のIDを許可する', () => {
      // UUID v4形式（ハイフンを含む36文字）
      const uuid = faker.string.uuid()
      const categoryId = CategoryId.create(uuid)
      expect(categoryId.getValue()).toBe(uuid)
    })

    // 異常系のテスト
    it('空文字の場合はValidationExceptionをスローする', () => {
      expect(() => CategoryId.create('')).toThrow(ValidationException)
      expect(() => CategoryId.create('')).toThrow('カテゴリーIDは必須です')
    })

    it('空白文字のみの場合はValidationExceptionをスローする', () => {
      expect(() => CategoryId.create('   ')).toThrow(ValidationException)
      expect(() => CategoryId.create('\t\n')).toThrow('カテゴリーIDは必須です')
    })

    it('8文字未満の場合はValidationExceptionをスローする', () => {
      expect(() => CategoryId.create('abc123')).toThrow(ValidationException)
      expect(() => CategoryId.create('abc123')).toThrow(
        'カテゴリーIDは8文字以上の英数字、ハイフン、アンダースコアで構成される必要があります'
      )
    })

    it('許可されていない文字を含む場合はValidationExceptionをスローする', () => {
      // スペースを含む
      expect(() => CategoryId.create('test id 1234')).toThrow(ValidationException)

      // 特殊文字を含む
      expect(() => CategoryId.create('test@id#1234')).toThrow(ValidationException)

      // 日本語を含む
      expect(() => CategoryId.create('testあいう1234')).toThrow(
        'カテゴリーIDは8文字以上の英数字、ハイフン、アンダースコアで構成される必要があります'
      )
    })
  })

  describe('generate', () => {
    it('新しいカテゴリーIDを生成できる', () => {
      // 新しいIDを生成
      const categoryId = CategoryId.generate()

      expect(categoryId).toBeInstanceOf(CategoryId)
      // 生成されたIDは8文字以上
      expect(categoryId.getValue().length).toBeGreaterThanOrEqual(8)
      // 生成されたIDは許可された文字のみを含む
      expect(categoryId.getValue()).toMatch(/^[a-zA-Z0-9\-_]+$/)
    })

    it('生成されるIDは毎回異なる', () => {
      // Act
      const id1 = CategoryId.generate()
      const id2 = CategoryId.generate()

      // Assert
      expect(id1.getValue()).not.toBe(id2.getValue())
    })
  })

  describe('equals', () => {
    it('同じ値の場合はtrueを返す', () => {
      // Arrange
      const id = createId()
      const id1 = CategoryId.create(id)
      const id2 = CategoryId.create(id)

      // Act & Assert
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なる値の場合はfalseを返す', () => {
      // Arrange
      const id1 = CategoryId.create(createId())
      const id2 = CategoryId.create(createId())

      // Act & Assert
      expect(id1.equals(id2)).toBe(false)
    })
  })
})
