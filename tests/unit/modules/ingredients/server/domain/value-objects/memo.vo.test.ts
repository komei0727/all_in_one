import { describe, expect, it } from 'vitest'

import { Memo } from '@/modules/ingredients/server/domain/value-objects'
import { MemoBuilder } from '@tests/__fixtures__/builders'

describe('Memo', () => {
  describe('constructor', () => {
    it('有効なメモで作成できる', () => {
      // Arrange & Act
      const memo = new MemoBuilder().build()

      // Assert
      expect(memo.getValue()).toBeTruthy()
      expect(memo.getValue().length).toBeLessThanOrEqual(200)
    })

    it('空文字で作成できる', () => {
      // Arrange & Act
      const memo = new MemoBuilder().withEmptyValue().build()

      // Assert
      expect(memo.getValue()).toBe('')
    })

    it('200文字のメモで作成できる', () => {
      // Arrange & Act
      const memo = new MemoBuilder().withMaxLengthValue().build()

      // Assert
      expect(memo.getValue().length).toBe(200)
    })

    it('201文字以上の場合エラーをスローする', () => {
      // Arrange
      const builder = new MemoBuilder().withTooLongValue()

      // Act & Assert
      expect(() => builder.build()).toThrow('メモは200文字以内で入力してください')
    })

    it('前後の空白は自動的にトリムされる', () => {
      // Arrange
      const builder = new MemoBuilder().withSpaces()
      const originalValue = builder['props'].value!
      const expectedValue = originalValue.trim()

      // Act
      const memo = builder.build()

      // Assert
      expect(memo.getValue()).toBe(expectedValue)
      expect(memo.getValue()).not.toMatch(/^\s|\s$/) // 前後に空白がないことを確認
    })
  })

  describe('equals', () => {
    it('同じ値の場合trueを返す', () => {
      // Arrange
      const builder = new MemoBuilder()
      const value = builder['props'].value!
      const memo1 = new Memo(value)
      const memo2 = new Memo(value)

      // Act & Assert
      expect(memo1.equals(memo2)).toBe(true)
    })

    it('異なる値の場合falseを返す', () => {
      // Arrange
      const memo1 = new MemoBuilder().build()
      const memo2 = new MemoBuilder().build()

      // Act & Assert
      expect(memo1.equals(memo2)).toBe(false)
    })
  })
})
