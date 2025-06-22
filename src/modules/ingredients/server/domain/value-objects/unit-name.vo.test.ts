import { describe, it, expect } from 'vitest'

import { UnitName } from './unit-name.vo'
import { RequiredFieldException, InvalidFieldException } from '../exceptions'

describe('UnitName', () => {
  describe('create', () => {
    // 正常系のテスト
    it('有効な単位名でインスタンスを生成できる', () => {
      const name = 'グラム'
      const unitName = UnitName.create(name)
      expect(unitName.getValue()).toBe(name)
    })

    it('前後の空白をトリミングする', () => {
      const name = '  キログラム  '
      const unitName = UnitName.create(name)
      expect(unitName.getValue()).toBe('キログラム')
    })

    it('最大文字数（30文字）の単位名を許可する', () => {
      const name = 'あ'.repeat(30)
      const unitName = UnitName.create(name)
      expect(unitName.getValue()).toBe(name)
    })

    // 異常系のテスト
    it('空文字の場合はRequiredFieldExceptionをスローする', () => {
      expect(() => UnitName.create('')).toThrow(RequiredFieldException)
      expect(() => UnitName.create('')).toThrow('単位名 is required')
    })

    it('空白のみの場合はRequiredFieldExceptionをスローする', () => {
      expect(() => UnitName.create('   ')).toThrow(RequiredFieldException)
    })

    it('30文字を超える場合はInvalidFieldExceptionをスローする', () => {
      const name = 'あ'.repeat(31)
      expect(() => UnitName.create(name)).toThrow(InvalidFieldException)
      expect(() => UnitName.create(name)).toThrow('30文字以内で入力してください')
    })
  })

  describe('equals', () => {
    it('同じ値の場合はtrueを返す', () => {
      const name1 = UnitName.create('グラム')
      const name2 = UnitName.create('グラム')
      expect(name1.equals(name2)).toBe(true)
    })

    it('異なる値の場合はfalseを返す', () => {
      const name1 = UnitName.create('グラム')
      const name2 = UnitName.create('キログラム')
      expect(name1.equals(name2)).toBe(false)
    })
  })
})
