import { describe, it, expect } from 'vitest'

import { RequiredFieldException } from '@/modules/ingredients/server/domain/exceptions'
import { UnitId } from '@/modules/ingredients/server/domain/value-objects'

import { testDataHelpers } from '../../../../../../__fixtures__/builders/faker.config'

describe('UnitId', () => {
  describe('create', () => {
    // 正常系のテスト
    it('有効なIDでインスタンスを生成できる', () => {
      // Arrange
      const id = testDataHelpers.cuid()

      // Act
      const unitId = UnitId.create(id)

      // Assert
      expect(unitId.getValue()).toBe(id)
    })

    it('CUID形式のIDを許可する', () => {
      // Arrange
      const id = testDataHelpers.cuid()

      // Act
      const unitId = UnitId.create(id)

      // Assert
      expect(unitId.getValue()).toBe(id)
      // CUIDは英数字で構成される
      expect(unitId.getValue()).toMatch(/^[a-zA-Z0-9]+$/)
    })

    // 異常系のテスト
    it('空文字の場合はRequiredFieldExceptionをスローする', () => {
      expect(() => UnitId.create('')).toThrow(RequiredFieldException)
      expect(() => UnitId.create('')).toThrow('単位IDは必須です')
    })

    it('空白のみの場合はRequiredFieldExceptionをスローする', () => {
      expect(() => UnitId.create('   ')).toThrow(RequiredFieldException)
    })

    it('undefinedの場合はRequiredFieldExceptionをスローする', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => UnitId.create(undefined as any)).toThrow(RequiredFieldException)
    })

    it('nullの場合はRequiredFieldExceptionをスローする', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => UnitId.create(null as any)).toThrow(RequiredFieldException)
    })
  })

  describe('equals', () => {
    it('同じ値の場合はtrueを返す', () => {
      // Arrange
      const id = testDataHelpers.cuid()
      const id1 = UnitId.create(id)
      const id2 = UnitId.create(id)

      // Act & Assert
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なる値の場合はfalseを返す', () => {
      // Arrange
      const id1 = UnitId.create(testDataHelpers.cuid())
      const id2 = UnitId.create(testDataHelpers.cuid())

      // Act & Assert
      expect(id1.equals(id2)).toBe(false)
    })
  })
})
