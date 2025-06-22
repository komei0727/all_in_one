import { describe, expect, it } from 'vitest'

import { Memo } from '@/modules/ingredients/server/domain/value-objects/memo.vo'

describe('Memo', () => {
  describe('constructor', () => {
    it('有効なメモで作成できる', () => {
      // Arrange
      const validMemo = '新鮮なトマト'

      // Act
      const memo = new Memo(validMemo)

      // Assert
      expect(memo.getValue()).toBe(validMemo)
    })

    it('空文字で作成できる', () => {
      // Arrange
      const emptyMemo = ''

      // Act
      const memo = new Memo(emptyMemo)

      // Assert
      expect(memo.getValue()).toBe('')
    })

    it('200文字のメモで作成できる', () => {
      // Arrange
      const longMemo = 'あ'.repeat(200)

      // Act
      const memo = new Memo(longMemo)

      // Assert
      expect(memo.getValue()).toBe(longMemo)
    })

    it('201文字以上の場合エラーをスローする', () => {
      // Arrange
      const tooLongMemo = 'あ'.repeat(201)

      // Act & Assert
      expect(() => new Memo(tooLongMemo)).toThrow('メモは200文字以内で入力してください')
    })

    it('前後の空白は自動的にトリムされる', () => {
      // Arrange
      const memoWithSpaces = '  新鮮なトマト  '

      // Act
      const memo = new Memo(memoWithSpaces)

      // Assert
      expect(memo.getValue()).toBe('新鮮なトマト')
    })
  })

  describe('equals', () => {
    it('同じ値の場合trueを返す', () => {
      // Arrange
      const memo1 = new Memo('新鮮なトマト')
      const memo2 = new Memo('新鮮なトマト')

      // Act & Assert
      expect(memo1.equals(memo2)).toBe(true)
    })

    it('異なる値の場合falseを返す', () => {
      // Arrange
      const memo1 = new Memo('新鮮なトマト')
      const memo2 = new Memo('有機栽培のトマト')

      // Act & Assert
      expect(memo1.equals(memo2)).toBe(false)
    })
  })
})
