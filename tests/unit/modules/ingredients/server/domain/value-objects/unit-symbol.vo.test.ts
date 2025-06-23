import { describe, it, expect } from 'vitest'

import {
  RequiredFieldException,
  InvalidFieldException,
} from '@/modules/ingredients/server/domain/exceptions'
import { UnitSymbol } from '@/modules/ingredients/server/domain/value-objects'

describe('UnitSymbol', () => {
  describe('create', () => {
    // 正常系のテスト
    it('有効な単位記号でインスタンスを生成できる', () => {
      const symbol = 'g'
      const unitSymbol = UnitSymbol.create(symbol)
      expect(unitSymbol.getValue()).toBe(symbol)
    })

    it('日本語の単位記号を許可する', () => {
      const symbol = '個'
      const unitSymbol = UnitSymbol.create(symbol)
      expect(unitSymbol.getValue()).toBe(symbol)
    })

    it('前後の空白をトリミングする', () => {
      const symbol = '  kg  '
      const unitSymbol = UnitSymbol.create(symbol)
      expect(unitSymbol.getValue()).toBe('kg')
    })

    it('最大文字数（10文字）の単位記号を許可する', () => {
      const symbol = 'a'.repeat(10)
      const unitSymbol = UnitSymbol.create(symbol)
      expect(unitSymbol.getValue()).toBe(symbol)
    })

    // 異常系のテスト
    it('空文字の場合はRequiredFieldExceptionをスローする', () => {
      expect(() => UnitSymbol.create('')).toThrow(RequiredFieldException)
      expect(() => UnitSymbol.create('')).toThrow('単位記号 is required')
    })

    it('空白のみの場合はRequiredFieldExceptionをスローする', () => {
      expect(() => UnitSymbol.create('   ')).toThrow(RequiredFieldException)
    })

    it('10文字を超える場合はInvalidFieldExceptionをスローする', () => {
      const symbol = 'a'.repeat(11)
      expect(() => UnitSymbol.create(symbol)).toThrow(InvalidFieldException)
      expect(() => UnitSymbol.create(symbol)).toThrow('10文字以内で入力してください')
    })
  })

  describe('equals', () => {
    it('同じ値の場合はtrueを返す', () => {
      const symbol1 = UnitSymbol.create('g')
      const symbol2 = UnitSymbol.create('g')
      expect(symbol1.equals(symbol2)).toBe(true)
    })

    it('異なる値の場合はfalseを返す', () => {
      const symbol1 = UnitSymbol.create('g')
      const symbol2 = UnitSymbol.create('kg')
      expect(symbol1.equals(symbol2)).toBe(false)
    })
  })
})
