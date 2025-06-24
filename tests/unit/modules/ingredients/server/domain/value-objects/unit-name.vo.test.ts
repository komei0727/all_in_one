import { describe, it, expect } from 'vitest'

import {
  RequiredFieldException,
  InvalidFieldException,
} from '@/modules/ingredients/server/domain/exceptions'
import { UnitName } from '@/modules/ingredients/server/domain/value-objects'

import { UnitNameBuilder } from '../../../../../../__fixtures__/builders'

describe('UnitName', () => {
  describe('create', () => {
    // 正常系のテスト
    it('有効な単位名でインスタンスを生成できる', () => {
      // Arrange & Act
      const unitName = new UnitNameBuilder().build()

      // Assert
      expect(unitName.getValue()).toBeTruthy()
      expect(unitName.getValue().length).toBeGreaterThan(0)
      expect(unitName.getValue().length).toBeLessThanOrEqual(30)
    })

    it('前後の空白をトリミングする', () => {
      // Arrange
      const builder = new UnitNameBuilder().withWhitespaceWrappedValue('キログラム')

      // Act
      const unitName = builder.build()

      // Assert
      expect(unitName.getValue()).toBe('キログラム')
    })

    it('最大文字数（30文字）の単位名を許可する', () => {
      // Arrange & Act
      const unitName = new UnitNameBuilder().withMaxLengthValue().build()

      // Assert
      expect(unitName.getValue().length).toBe(30)
    })

    // 異常系のテスト
    it('空文字の場合はRequiredFieldExceptionをスローする', () => {
      // Arrange
      const builder = new UnitNameBuilder().withEmptyValue()

      // Act & Assert
      expect(() => builder.build()).toThrow(RequiredFieldException)
      expect(() => builder.build()).toThrow('単位名は必須です')
    })

    it('空白のみの場合はRequiredFieldExceptionをスローする', () => {
      // Arrange
      const builder = new UnitNameBuilder().withWhitespaceOnlyValue()

      // Act & Assert
      expect(() => builder.build()).toThrow(RequiredFieldException)
    })

    it('30文字を超える場合はInvalidFieldExceptionをスローする', () => {
      // Arrange
      const builder = new UnitNameBuilder().withTooLongValue()

      // Act & Assert
      expect(() => builder.build()).toThrow(InvalidFieldException)
      expect(() => builder.build()).toThrow('30文字以内で入力してください')
    })
  })

  describe('equals', () => {
    it('同じ値の場合はtrueを返す', () => {
      // Arrange
      const builder = new UnitNameBuilder()
      const name1 = builder.build()
      const name2 = UnitName.create(name1.getValue())

      // Act & Assert
      expect(name1.equals(name2)).toBe(true)
    })

    it('異なる値の場合はfalseを返す', () => {
      // Arrange
      const name1 = new UnitNameBuilder().build()

      // Act & Assert
      // ランダム値が偶然同じになる可能性があるため、明示的に異なる値を設定
      const differentName = UnitName.create(name1.getValue() + 'テスト')
      expect(name1.equals(differentName)).toBe(false)
    })
  })
})
