import { describe, expect, it } from 'vitest'

import { IngredientName } from '@/modules/ingredients/server/domain/value-objects'

describe('IngredientName', () => {
  describe('constructor', () => {
    it('有効な食材名で作成できる', () => {
      // Arrange
      const validName = 'トマト'

      // Act
      const ingredientName = new IngredientName(validName)

      // Assert
      expect(ingredientName.getValue()).toBe(validName)
    })

    it('1文字の食材名で作成できる', () => {
      // Arrange
      const validName = '米'

      // Act
      const ingredientName = new IngredientName(validName)

      // Assert
      expect(ingredientName.getValue()).toBe(validName)
    })

    it('50文字の食材名で作成できる', () => {
      // Arrange
      const validName = 'あ'.repeat(50)

      // Act
      const ingredientName = new IngredientName(validName)

      // Assert
      expect(ingredientName.getValue()).toBe(validName)
    })

    it('空文字の場合エラーをスローする', () => {
      // Act & Assert
      expect(() => new IngredientName('')).toThrow('食材名は必須です')
    })

    it('51文字以上の場合エラーをスローする', () => {
      // Arrange
      const tooLongName = 'あ'.repeat(51)

      // Act & Assert
      expect(() => new IngredientName(tooLongName)).toThrow('食材名は50文字以内で入力してください')
    })

    it('前後の空白は自動的にトリムされる', () => {
      // Arrange
      const nameWithSpaces = '  トマト  '

      // Act
      const ingredientName = new IngredientName(nameWithSpaces)

      // Assert
      expect(ingredientName.getValue()).toBe('トマト')
    })
  })

  describe('equals', () => {
    it('同じ値の場合trueを返す', () => {
      // Arrange
      const name1 = new IngredientName('トマト')
      const name2 = new IngredientName('トマト')

      // Act & Assert
      expect(name1.equals(name2)).toBe(true)
    })

    it('異なる値の場合falseを返す', () => {
      // Arrange
      const name1 = new IngredientName('トマト')
      const name2 = new IngredientName('キャベツ')

      // Act & Assert
      expect(name1.equals(name2)).toBe(false)
    })
  })
})
