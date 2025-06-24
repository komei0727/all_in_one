import { createId } from '@paralleldrive/cuid2'
import { describe, it, expect } from 'vitest'

import { ValidationException } from '@/modules/ingredients/server/domain/exceptions/validation.exception'
import { UnitId } from '@/modules/ingredients/server/domain/value-objects'

import { faker } from '../../../../../../__fixtures__/builders/faker.config'

describe('UnitId', () => {
  describe('create', () => {
    // 正常系のテスト
    it('有効なCUID形式のIDでインスタンスを生成できる', () => {
      // CUID形式のIDでインスタンスを作成
      const id = createId()
      const unitId = UnitId.create(id)
      expect(unitId.getValue()).toBe(id)
    })

    it('8文字以上の英数字とハイフン、アンダースコアを含むIDを許可する', () => {
      // 最小文字数（8文字）のテスト
      const minId = 'unit1234'
      expect(() => UnitId.create(minId)).not.toThrow()

      // ハイフンを含むID
      const hyphenId = 'unit-id-5678'
      expect(() => UnitId.create(hyphenId)).not.toThrow()

      // アンダースコアを含むID
      const underscoreId = 'unit_id_9012'
      expect(() => UnitId.create(underscoreId)).not.toThrow()

      // 混合パターン
      const mixedId = 'unit-id_3456-WXYZ'
      expect(() => UnitId.create(mixedId)).not.toThrow()
    })

    it('UUID形式のIDを許可する', () => {
      // UUID v4形式（ハイフンを含む36文字）
      const uuid = faker.string.uuid()
      const unitId = UnitId.create(uuid)
      expect(unitId.getValue()).toBe(uuid)
    })

    // 異常系のテスト
    it('空文字の場合はValidationExceptionをスローする', () => {
      expect(() => UnitId.create('')).toThrow(ValidationException)
      expect(() => UnitId.create('')).toThrow('単位IDは必須です')
    })

    it('空白文字のみの場合はValidationExceptionをスローする', () => {
      expect(() => UnitId.create('   ')).toThrow(ValidationException)
      expect(() => UnitId.create('\t\n')).toThrow('単位IDは必須です')
    })

    it('8文字未満の場合はValidationExceptionをスローする', () => {
      expect(() => UnitId.create('uni123')).toThrow(ValidationException)
      expect(() => UnitId.create('uni123')).toThrow(
        '単位IDは8文字以上の英数字、ハイフン、アンダースコアで構成される必要があります'
      )
    })

    it('許可されていない文字を含む場合はValidationExceptionをスローする', () => {
      // スペースを含む
      expect(() => UnitId.create('unit id 1234')).toThrow(ValidationException)

      // 特殊文字を含む
      expect(() => UnitId.create('unit@id#1234')).toThrow(ValidationException)

      // 日本語を含む
      expect(() => UnitId.create('unitあいう1234')).toThrow(
        '単位IDは8文字以上の英数字、ハイフン、アンダースコアで構成される必要があります'
      )
    })
  })

  describe('generate', () => {
    it('新しい単位IDを生成できる', () => {
      // 新しいIDを生成
      const unitId = UnitId.generate()

      expect(unitId).toBeInstanceOf(UnitId)
      // 生成されたIDは8文字以上
      expect(unitId.getValue().length).toBeGreaterThanOrEqual(8)
      // 生成されたIDは許可された文字のみを含む
      expect(unitId.getValue()).toMatch(/^[a-zA-Z0-9\-_]+$/)
    })

    it('生成されるIDは毎回異なる', () => {
      // Act
      const id1 = UnitId.generate()
      const id2 = UnitId.generate()

      // Assert
      expect(id1.getValue()).not.toBe(id2.getValue())
    })
  })

  describe('equals', () => {
    it('同じ値の場合はtrueを返す', () => {
      // Arrange
      const id = createId()
      const id1 = UnitId.create(id)
      const id2 = UnitId.create(id)

      // Act & Assert
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なる値の場合はfalseを返す', () => {
      // Arrange
      const id1 = UnitId.create(createId())
      const id2 = UnitId.create(createId())

      // Act & Assert
      expect(id1.equals(id2)).toBe(false)
    })
  })
})
