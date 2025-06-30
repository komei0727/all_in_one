import { describe, expect, it } from 'vitest'

import { IngredientNameBuilder } from '@tests/__fixtures__/builders'

describe('IngredientName', () => {
  describe('constructor', () => {
    it('有効な食材名で作成できる', () => {
      // テストデータビルダーを使用してランダムな食材名で検証
      const builder = new IngredientNameBuilder()
      const ingredientName = builder.build()

      // Assert
      expect(ingredientName.getValue()).toBeTruthy()
      expect(ingredientName.getValue().length).toBeGreaterThanOrEqual(1)
      expect(ingredientName.getValue().length).toBeLessThanOrEqual(50)
    })

    it('1文字の食材名で作成できる', () => {
      // 1文字の食材名を設定
      const ingredientName = new IngredientNameBuilder().withValue('米').build()

      // Assert
      expect(ingredientName.getValue()).toBe('米')
    })

    it('50文字の食材名で作成できる', () => {
      // 最大長の食材名を設定
      const ingredientName = new IngredientNameBuilder().withMaxLengthValue().build()

      // Assert
      expect(ingredientName.getValue()).toHaveLength(50)
    })

    it('空文字の場合エラーをスローする', () => {
      // 空文字を設定してエラーを検証
      const builder = new IngredientNameBuilder().withEmptyValue()

      // Act & Assert
      expect(() => builder.build()).toThrow('食材名は必須です')
    })

    it('51文字以上の場合エラーをスローする', () => {
      // 最大長を超える食材名を設定してエラーを検証
      const builder = new IngredientNameBuilder().withTooLongValue()

      // Act & Assert
      expect(() => builder.build()).toThrow('食材名は50文字以内で入力してください')
    })

    it('前後の空白は自動的にトリムされる', () => {
      // 前後に空白を含む食材名を設定
      const ingredientName = new IngredientNameBuilder().withValue('  トマト  ').build()

      // Assert
      expect(ingredientName.getValue()).toBe('トマト')
    })
  })

  describe('equals', () => {
    it('同じ値の場合trueを返す', () => {
      // 同じ値の食材名を2つ作成
      const value = 'トマト'
      const name1 = new IngredientNameBuilder().withValue(value).build()
      const name2 = new IngredientNameBuilder().withValue(value).build()

      // Act & Assert
      expect(name1.equals(name2)).toBe(true)
    })

    it('異なる値の場合falseを返す', () => {
      // 異なる値の食材名を2つ作成
      const name1 = new IngredientNameBuilder().withValue('トマト').build()
      const name2 = new IngredientNameBuilder().withValue('キャベツ').build()

      // Act & Assert
      expect(name1.equals(name2)).toBe(false)
    })
  })
})
