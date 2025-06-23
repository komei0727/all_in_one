import { describe, it, expect } from 'vitest'

import {
  RequiredFieldException,
  InvalidFieldException,
} from '@/modules/ingredients/server/domain/exceptions'

import { UnitSymbolBuilder } from '../../../../../../__fixtures__/builders'

describe('UnitSymbol', () => {
  describe('create', () => {
    // 正常系のテスト
    it('有効な単位記号でインスタンスを生成できる', () => {
      // Arrange & Act
      const unitSymbol = new UnitSymbolBuilder().withGram().build()

      // Assert
      expect(unitSymbol.getValue()).toBe('g')
    })

    it('日本語の単位記号を許可する', () => {
      // Arrange & Act
      const unitSymbol = new UnitSymbolBuilder().withPiece().build()

      // Assert
      expect(unitSymbol.getValue()).toBe('個')
    })

    it('前後の空白をトリミングする', () => {
      // Arrange
      const builder = new UnitSymbolBuilder().withSpaces()
      const originalValue = builder['props'].value ?? ''
      const expectedValue = originalValue.trim()

      // Act
      const unitSymbol = builder.build()

      // Assert
      expect(unitSymbol.getValue()).toBe(expectedValue)
      expect(unitSymbol.getValue()).not.toMatch(/^\s|\s$/) // 前後に空白がないことを確認
    })

    it('最大文字数（10文字）の単位記号を許可する', () => {
      // Arrange & Act
      const unitSymbol = new UnitSymbolBuilder().withMaxLengthValue().build()

      // Assert
      expect(unitSymbol.getValue().length).toBe(10)
    })

    // 異常系のテスト
    it('空文字の場合はRequiredFieldExceptionをスローする', () => {
      // Arrange
      const builder = new UnitSymbolBuilder().withEmptyValue()

      // Act & Assert
      expect(() => builder.build()).toThrow(RequiredFieldException)
      expect(() => builder.build()).toThrow('単位記号は必須です')
    })

    it('空白のみの場合はRequiredFieldExceptionをスローする', () => {
      // Arrange
      const builder = new UnitSymbolBuilder().withOnlySpaces()

      // Act & Assert
      expect(() => builder.build()).toThrow(RequiredFieldException)
    })

    it('10文字を超える場合はInvalidFieldExceptionをスローする', () => {
      // Arrange
      const builder = new UnitSymbolBuilder().withTooLongValue()

      // Act & Assert
      expect(() => builder.build()).toThrow(InvalidFieldException)
      expect(() => builder.build()).toThrow('10文字以内で入力してください')
    })
  })

  describe('equals', () => {
    it('同じ値の場合はtrueを返す', () => {
      // Arrange
      const symbol1 = new UnitSymbolBuilder().withGram().build()
      const symbol2 = new UnitSymbolBuilder().withGram().build()

      // Act & Assert
      expect(symbol1.equals(symbol2)).toBe(true)
    })

    it('異なる値の場合はfalseを返す', () => {
      // Arrange
      const symbol1 = new UnitSymbolBuilder().withGram().build()
      const symbol2 = new UnitSymbolBuilder().withKilogram().build()

      // Act & Assert
      expect(symbol1.equals(symbol2)).toBe(false)
    })
  })
})
