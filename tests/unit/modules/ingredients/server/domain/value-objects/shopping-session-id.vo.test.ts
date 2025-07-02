import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { ShoppingSessionId } from '@/modules/ingredients/server/domain/value-objects/shopping-session-id.vo'

describe('ShoppingSessionId', () => {
  describe('create', () => {
    it('新しいショッピングセッションIDを生成できる', () => {
      // When: 新しいIDを生成
      const sessionId = ShoppingSessionId.create()

      // Then: 正しいフォーマットのIDが生成される
      expect(sessionId).toBeInstanceOf(ShoppingSessionId)
      expect(sessionId.getValue()).toMatch(/^ses_[a-z0-9]{24}$/)
    })
  })

  describe('constructor', () => {
    it('有効なIDで作成できる', () => {
      // Given: 有効なセッションID
      const validId = `ses_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`

      // When: IDでインスタンスを作成
      const sessionId = new ShoppingSessionId(validId)

      // Then: 正しく作成される
      expect(sessionId.getValue()).toBe(validId)
    })

    it('空のIDは拒否される', () => {
      // When/Then: 空のIDでエラー
      expect(() => new ShoppingSessionId('')).toThrow('買い物セッションIDは必須です')
    })

    it('無効なプレフィックスのIDは拒否される', () => {
      // Given: 間違ったプレフィックス
      const invalidId = `ing_${faker.string.alphanumeric({ length: 25, casing: 'lower' })}`

      // When/Then: エラーが発生
      expect(() => new ShoppingSessionId(invalidId)).toThrow(
        '買い物セッションIDはses_で始まる必要があります'
      )
    })

    it('無効な長さのIDは拒否される', () => {
      // Given: 短すぎるID
      const shortId = `ses_${faker.string.alphanumeric({ length: 10, casing: 'lower' })}`

      // When/Then: エラーが発生
      expect(() => new ShoppingSessionId(shortId)).toThrow('IDはCUID v2形式で入力してください')
    })

    it('大文字を含むIDは拒否される', () => {
      // Given: 大文字を含むID
      const uppercaseId = `ses_${faker.string.alphanumeric({ length: 24, casing: 'upper' })}`

      // When/Then: エラーが発生
      expect(() => new ShoppingSessionId(uppercaseId)).toThrow('IDはCUID v2形式で入力してください')
    })
  })

  describe('equals', () => {
    it('同じIDの場合はtrueを返す', () => {
      // Given: 同じID文字列
      const idString = `ses_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`
      const sessionId1 = new ShoppingSessionId(idString)
      const sessionId2 = new ShoppingSessionId(idString)

      // When/Then: 等価と判定
      expect(sessionId1.equals(sessionId2)).toBe(true)
    })

    it('異なるIDの場合はfalseを返す', () => {
      // Given: 異なるID
      const sessionId1 = ShoppingSessionId.create()
      const sessionId2 = ShoppingSessionId.create()

      // When/Then: 非等価と判定
      expect(sessionId1.equals(sessionId2)).toBe(false)
    })

    it('nullやundefinedと比較した場合はfalseを返す', () => {
      // Given: セッションID
      const sessionId = ShoppingSessionId.create()

      // When/Then: nullやundefinedとは非等価
      expect(sessionId.equals(null as any)).toBe(false)
      expect(sessionId.equals(undefined as any)).toBe(false)
    })
  })

  describe('toString', () => {
    it('ID文字列を返す', () => {
      // Given: セッションID
      const sessionId = ShoppingSessionId.create()

      // When/Then: getValue()と同じ値を返す
      expect(sessionId.toString()).toBe(sessionId.getValue())
    })
  })
})
