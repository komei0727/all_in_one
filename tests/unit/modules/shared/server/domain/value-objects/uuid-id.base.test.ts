import { describe, it, expect } from 'vitest'

import {
  InvalidFieldException,
  RequiredFieldException,
} from '@/modules/shared/server/domain/exceptions'
import { UuidId } from '@/modules/shared/server/domain/value-objects'

// テスト用の具象クラス
class TestUuidId extends UuidId {
  protected getFieldName(): string {
    return 'テストUUID'
  }
}

describe('UuidId基底クラス', () => {
  describe('正常な値での作成', () => {
    it('有効なUUID v4で作成できる', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const id = new TestUuidId(validUuid)

      // Assert
      expect(id.getValue()).toBe(validUuid)
    })

    it('コンストラクタで作成できる', () => {
      // Arrange
      const validUuid2 = '660f9500-f39c-42e5-b827-557766550011'

      // Act
      const id = new TestUuidId(validUuid2)

      // Assert
      expect(id).toBeInstanceOf(TestUuidId)
      expect(id.getValue()).toBe(validUuid2)
    })
  })

  describe('不正な値での作成', () => {
    it('無効なUUID形式で作成するとエラーが発生する', () => {
      // Arrange
      const invalidUuids = [
        'not-a-uuid',
        '12345678-1234-1234-1234-123456789012', // v4ではない
        '550e8400-e29b-51d4-a716-446655440000', // version部分が5
        '550e8400-e29b-41d4-c716-446655440000', // variant部分が無効
        '550e8400e29b41d4a716446655440000', // ハイフンなし
        '550e8400-e29b-41d4-a716', // 短すぎる
      ]

      invalidUuids.forEach((invalidUuid) => {
        // Act & Assert
        expect(() => new TestUuidId(invalidUuid)).toThrow(InvalidFieldException)
        expect(() => new TestUuidId(invalidUuid)).toThrow('UUID v4形式で入力してください')
      })
    })

    it('空文字で作成するとエラーが発生する', () => {
      // Arrange
      const emptyValue = ''

      // Act & Assert
      expect(() => new TestUuidId(emptyValue)).toThrow(RequiredFieldException)
    })

    it('nullで作成するとエラーが発生する', () => {
      // Arrange
      const nullValue = null as any

      // Act & Assert
      expect(() => new TestUuidId(nullValue)).toThrow(RequiredFieldException)
    })
  })

  describe('等価性比較', () => {
    it('同じUUIDのインスタンスは等しい', () => {
      // Arrange
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      const id1 = new TestUuidId(uuid)
      const id2 = new TestUuidId(uuid)

      // Act & Assert
      expect(id1.equals(id2)).toBe(true)
    })

    it('異なるUUIDのインスタンスは等しくない', () => {
      // Arrange
      const id1 = new TestUuidId('550e8400-e29b-41d4-a716-446655440000')
      const id2 = new TestUuidId('660f9500-f39c-42e5-b827-557766550011')

      // Act & Assert
      expect(id1.equals(id2)).toBe(false)
    })
  })

  describe('大文字小文字の扱い', () => {
    it('大文字のUUIDでも作成できる', () => {
      // Arrange
      const upperCaseUuid = '550E8400-E29B-41D4-A716-446655440000'

      // Act
      const id = new TestUuidId(upperCaseUuid)

      // Assert
      expect(id.getValue()).toBe(upperCaseUuid)
    })

    it('大文字小文字混在のUUIDでも作成できる', () => {
      // Arrange
      const mixedCaseUuid = '550e8400-E29B-41d4-A716-446655440000'

      // Act
      const id = new TestUuidId(mixedCaseUuid)

      // Assert
      expect(id.getValue()).toBe(mixedCaseUuid)
    })
  })
})
