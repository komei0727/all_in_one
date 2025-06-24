import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'

import { ValidationException } from '@/modules/ingredients/server/domain/exceptions/validation.exception'
import { UserId } from '@/modules/ingredients/server/domain/value-objects/user-id.vo'

import { faker } from '../../../../../../__fixtures__/builders/faker.config'

describe('UserId', () => {
  describe('constructor', () => {
    it('有効なCUID形式のユーザーIDで作成できる', () => {
      // CUID形式のIDでインスタンスを作成
      const validId = createId()
      const userId = new UserId(validId)
      expect(userId.getValue()).toBe(validId)
    })

    it('8文字以上の英数字とハイフン、アンダースコアを含むIDを許可する', () => {
      // 最小文字数（8文字）のテスト
      const minId = 'user1234'
      expect(() => new UserId(minId)).not.toThrow()

      // ハイフンを含むID
      const hyphenId = 'user-id-5678'
      expect(() => new UserId(hyphenId)).not.toThrow()

      // アンダースコアを含むID
      const underscoreId = 'user_id_9012'
      expect(() => new UserId(underscoreId)).not.toThrow()

      // 混合パターン
      const mixedId = 'user-id_3456-EFGH'
      expect(() => new UserId(mixedId)).not.toThrow()
    })

    it('UUID形式のIDを許可する', () => {
      // UUID v4形式（ハイフンを含む36文字）
      const uuid = faker.string.uuid()
      const userId = new UserId(uuid)
      expect(userId.getValue()).toBe(uuid)
    })
  })

  describe('validation', () => {
    it('空文字列の場合はエラーをスローする', () => {
      expect(() => new UserId('')).toThrow(ValidationException)
      expect(() => new UserId('')).toThrow('ユーザーIDは必須です')
    })

    it('空白文字のみの場合はエラーをスローする', () => {
      expect(() => new UserId('   ')).toThrow(ValidationException)
      expect(() => new UserId('\t\n')).toThrow('ユーザーIDは必須です')
    })

    it('8文字未満の場合はエラーをスローする', () => {
      expect(() => new UserId('user12')).toThrow(ValidationException)
      expect(() => new UserId('user12')).toThrow(
        'ユーザーIDは8文字以上の英数字、ハイフン、アンダースコアで構成される必要があります'
      )
    })

    it('許可されていない文字を含む場合はエラーをスローする', () => {
      // スペースを含む
      expect(() => new UserId('user id 1234')).toThrow(ValidationException)

      // 特殊文字を含む
      expect(() => new UserId('user@id#1234')).toThrow(ValidationException)

      // 日本語を含む
      expect(() => new UserId('userあいう1234')).toThrow(
        'ユーザーIDは8文字以上の英数字、ハイフン、アンダースコアで構成される必要があります'
      )
    })
  })

  describe('generate', () => {
    it('新しいユーザーIDを生成できる', () => {
      // 新しいIDを生成
      const userId = UserId.generate()

      expect(userId).toBeInstanceOf(UserId)
      // 生成されたIDは8文字以上
      expect(userId.getValue().length).toBeGreaterThanOrEqual(8)
      // 生成されたIDは許可された文字のみを含む
      expect(userId.getValue()).toMatch(/^[a-zA-Z0-9\-_]+$/)
    })

    it('生成されるIDは毎回異なる', () => {
      // Act
      const id1 = UserId.generate()
      const id2 = UserId.generate()

      // Assert
      expect(id1.getValue()).not.toBe(id2.getValue())
    })
  })

  describe('equals', () => {
    it('同じ値のユーザーIDは等しい', () => {
      // 同じ値で2つのユーザーIDを作成
      const cuidId = createId()
      const userId1 = new UserId(cuidId)
      const userId2 = new UserId(cuidId)

      // Act & Assert
      expect(userId1.equals(userId2)).toBe(true)
    })

    it('異なる値のユーザーIDは等しくない', () => {
      // 異なる値で2つのユーザーIDを作成
      const userId1 = new UserId(createId())
      const userId2 = new UserId(createId())

      // Act & Assert
      expect(userId1.equals(userId2)).toBe(false)
    })

    it('nullとの比較はfalse', () => {
      // ユーザーIDを作成
      const userId = new UserId(createId())

      // Act & Assert
      expect(userId.equals(null)).toBe(false)
    })
  })
})
