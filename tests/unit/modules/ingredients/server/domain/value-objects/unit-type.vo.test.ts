import { describe, it, expect } from 'vitest'
import { UnitType } from '@/modules/ingredients/server/domain/value-objects/unit-type.vo'
import { ValidationException } from '@/modules/ingredients/server/domain/exceptions'

describe('UnitType', () => {
  describe('正常系テスト', () => {
    it('COUNT（個数）タイプで作成できる', () => {
      // 個数タイプの単位（個、枚、本など）を作成
      const unitType = new UnitType('COUNT')
      expect(unitType.getValue()).toBe('COUNT')
    })

    it('WEIGHT（重量）タイプで作成できる', () => {
      // 重量タイプの単位（g、kg、mgなど）を作成
      const unitType = new UnitType('WEIGHT')
      expect(unitType.getValue()).toBe('WEIGHT')
    })

    it('VOLUME（容量）タイプで作成できる', () => {
      // 容量タイプの単位（ml、L、ccなど）を作成
      const unitType = new UnitType('VOLUME')
      expect(unitType.getValue()).toBe('VOLUME')
    })
  })

  describe('バリデーションテスト', () => {
    it('空文字の場合はValidationExceptionを発生させる', () => {
      expect(() => new UnitType('')).toThrow(ValidationException)
      expect(() => new UnitType('')).toThrow('単位タイプは必須です')
    })

    it('nullの場合はValidationExceptionを発生させる', () => {
      expect(() => new UnitType(null as any)).toThrow(ValidationException)
    })

    it('undefinedの場合はValidationExceptionを発生させる', () => {
      expect(() => new UnitType(undefined as any)).toThrow(ValidationException)
    })

    it('無効な値の場合はValidationExceptionを発生させる', () => {
      expect(() => new UnitType('INVALID')).toThrow(ValidationException)
      expect(() => new UnitType('INVALID')).toThrow(
        '単位タイプはCOUNT, WEIGHT, VOLUME のいずれかである必要があります'
      )
    })

    it('小文字の場合はValidationExceptionを発生させる', () => {
      expect(() => new UnitType('count')).toThrow(ValidationException)
    })

    it('空白を含む場合はValidationExceptionを発生させる', () => {
      expect(() => new UnitType(' COUNT ')).toThrow(ValidationException)
    })
  })

  describe('等価性テスト', () => {
    it('同じタイプの場合はtrueを返す', () => {
      // 同じタイプの単位は等価とみなす
      const unitType1 = new UnitType('COUNT')
      const unitType2 = new UnitType('COUNT')
      expect(unitType1.equals(unitType2)).toBe(true)
    })

    it('異なるタイプの場合はfalseを返す', () => {
      // 異なるタイプの単位は等価ではない
      const countType = new UnitType('COUNT')
      const weightType = new UnitType('WEIGHT')
      expect(countType.equals(weightType)).toBe(false)
    })

    it('nullとの比較ではfalseを返す', () => {
      const unitType = new UnitType('COUNT')
      expect(unitType.equals(null as any)).toBe(false)
    })
  })

  describe('型判定メソッドテスト', () => {
    it('isCount()で個数タイプを正しく判定する', () => {
      // 個数タイプの判定テスト
      const countType = new UnitType('COUNT')
      const weightType = new UnitType('WEIGHT')
      const volumeType = new UnitType('VOLUME')

      expect(countType.isCount()).toBe(true)
      expect(weightType.isCount()).toBe(false)
      expect(volumeType.isCount()).toBe(false)
    })

    it('isWeight()で重量タイプを正しく判定する', () => {
      // 重量タイプの判定テスト
      const countType = new UnitType('COUNT')
      const weightType = new UnitType('WEIGHT')
      const volumeType = new UnitType('VOLUME')

      expect(countType.isWeight()).toBe(false)
      expect(weightType.isWeight()).toBe(true)
      expect(volumeType.isWeight()).toBe(false)
    })

    it('isVolume()で容量タイプを正しく判定する', () => {
      // 容量タイプの判定テスト
      const countType = new UnitType('COUNT')
      const weightType = new UnitType('WEIGHT')
      const volumeType = new UnitType('VOLUME')

      expect(countType.isVolume()).toBe(false)
      expect(weightType.isVolume()).toBe(false)
      expect(volumeType.isVolume()).toBe(true)
    })
  })

  describe('変換可能性判定テスト', () => {
    it('canConvertTo()で同じタイプ間は変換可能と判定する', () => {
      // 同じタイプの単位間は変換可能（例：g ↔ kg）
      const gram = new UnitType('WEIGHT')
      const kilogram = new UnitType('WEIGHT')
      expect(gram.canConvertTo(kilogram)).toBe(true)
    })

    it('canConvertTo()で異なるタイプ間は変換不可能と判定する', () => {
      // 異なるタイプの単位間は変換不可能（例：g → 個）
      const weight = new UnitType('WEIGHT')
      const count = new UnitType('COUNT')
      const volume = new UnitType('VOLUME')

      expect(weight.canConvertTo(count)).toBe(false)
      expect(weight.canConvertTo(volume)).toBe(false)
      expect(count.canConvertTo(volume)).toBe(false)
    })
  })

  describe('表示用メソッドテスト', () => {
    it('getDisplayName()で日本語の表示名を返す', () => {
      // 日本語での表示用名称を返すテスト
      const countType = new UnitType('COUNT')
      const weightType = new UnitType('WEIGHT')
      const volumeType = new UnitType('VOLUME')

      expect(countType.getDisplayName()).toBe('個数')
      expect(weightType.getDisplayName()).toBe('重量')
      expect(volumeType.getDisplayName()).toBe('容量')
    })
  })
})
