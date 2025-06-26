import { describe, it, expect, vi } from 'vitest'

import {
  RequiredFieldException,
  InvalidFieldException,
} from '@/modules/ingredients/server/domain/exceptions'
import { UnitId } from '@/modules/ingredients/server/domain/value-objects'

// createIdのモック
vi.mock('@paralleldrive/cuid2', () => ({
  createId: vi.fn(() => 'clh7qp8kg0000qzrm5b8j5n8k'),
}))

describe('UnitId', () => {
  describe('constructor', () => {
    // 正常系のテスト
    it('有効なプレフィックス付きCUIDでインスタンスを生成できる', () => {
      // Arrange
      const id = 'unt_clh7qp8kg0000qzrm5b8j5n8k'

      // Act
      const unitId = new UnitId(id)

      // Assert
      expect(unitId.getValue()).toBe(id)
    })

    it('プレフィックスが異なる場合エラーをスローする', () => {
      // Arrange
      const wrongPrefixId = 'cat_clh7qp8kg0000qzrm5b8j5n8k'

      // Act & Assert
      expect(() => new UnitId(wrongPrefixId)).toThrow(InvalidFieldException)
      expect(() => new UnitId(wrongPrefixId)).toThrow('unt_で始まる必要があります')
    })

    it('プレフィックスがない場合エラーをスローする', () => {
      // Arrange
      const noPrefixId = 'clh7qp8kg0000qzrm5b8j5n8k'

      // Act & Assert
      expect(() => new UnitId(noPrefixId)).toThrow(InvalidFieldException)
      expect(() => new UnitId(noPrefixId)).toThrow('unt_で始まる必要があります')
    })

    // 異常系のテスト
    it('空文字の場合はRequiredFieldExceptionをスローする', () => {
      expect(() => new UnitId('')).toThrow(RequiredFieldException)
      expect(() => new UnitId('')).toThrow('単位IDは必須です')
    })

    it('空白のみの場合はRequiredFieldExceptionをスローする', () => {
      expect(() => new UnitId('   ')).toThrow(RequiredFieldException)
    })

    it('CUID形式でない場合エラーをスローする', () => {
      const invalidCuid = 'unt_invalid-format'
      expect(() => new UnitId(invalidCuid)).toThrow(InvalidFieldException)
      expect(() => new UnitId(invalidCuid)).toThrow('CUID v2形式で入力してください')
    })
  })

  describe('generate', () => {
    it('新しい単位IDを生成できる', () => {
      // Act
      const unitId = UnitId.generate()

      // Assert
      expect(unitId).toBeInstanceOf(UnitId)
      expect(unitId.getValue()).toBe('unt_clh7qp8kg0000qzrm5b8j5n8k')
      expect(unitId.getValue().startsWith('unt_')).toBe(true)
    })
  })

  describe('equals', () => {
    it('同じ値の場合はtrueを返す', () => {
      // Arrange
      const id = 'unt_clh7qp8kg0000qzrm5b8j5n8k'
      const id1 = new UnitId(id)
      const id2 = new UnitId(id)

      // Act & Assert
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なる値の場合はfalseを返す', () => {
      // Arrange
      const id1 = new UnitId('unt_clh7qp8kg0000qzrm5b8j5n8k')
      const id2 = new UnitId('unt_clh7qp8kg0001qzrm5b8j5n8l')

      // Act & Assert
      expect(id1.equals(id2)).toBe(false)
    })
  })

  describe('getCoreId', () => {
    it('プレフィックスを除いたCUID部分を取得できる', () => {
      // Arrange
      const fullId = 'unt_clh7qp8kg0000qzrm5b8j5n8k'
      const id = new UnitId(fullId)

      // Act
      const coreId = id.getCoreId()

      // Assert
      expect(coreId).toBe('clh7qp8kg0000qzrm5b8j5n8k')
    })
  })
})
