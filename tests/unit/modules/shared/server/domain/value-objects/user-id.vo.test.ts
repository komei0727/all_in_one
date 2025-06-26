import { describe, it, expect, vi } from 'vitest'

// テスト対象のUserIdクラス（共有カーネル）
import {
  RequiredFieldException,
  InvalidFieldException,
} from '@/modules/shared/server/domain/exceptions'
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'

// createIdのモック
vi.mock('@paralleldrive/cuid2', () => ({
  createId: vi.fn(() => 'clh7qp8kg0000qzrm5b8j5n8k'),
}))

describe('UserId値オブジェクト（共有カーネル）', () => {
  describe('正常な値での作成', () => {
    it('有効なプレフィックス付きCUIDで作成できる', () => {
      // Arrange（準備）
      const validId = 'usr_clh7qp8kg0000qzrm5b8j5n8k'

      // Act（実行）
      const userId = new UserId(validId)

      // Assert（検証）
      expect(userId.getValue()).toBe(validId)
    })

    it('新しいユーザーIDを生成できる', () => {
      // Act（実行）
      const userId = UserId.generate()

      // Assert（検証）
      expect(userId).toBeInstanceOf(UserId)
      expect(userId.getValue()).toBe('usr_clh7qp8kg0000qzrm5b8j5n8k')
      expect(userId.getValue().startsWith('usr_')).toBe(true)
    })
  })

  describe('不正な値での作成', () => {
    it('空文字で作成するとエラーが発生する', () => {
      // Arrange（準備）
      const emptyId = ''

      // Act & Assert（実行 & 検証）
      expect(() => new UserId(emptyId)).toThrow(RequiredFieldException)
      expect(() => new UserId(emptyId)).toThrow('ユーザーIDは必須です')
    })

    it('nullで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const nullId = null as any

      // Act & Assert（実行 & 検証）
      expect(() => new UserId(nullId)).toThrow(RequiredFieldException)
    })

    it('undefinedで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const undefinedId = undefined as any

      // Act & Assert（実行 & 検証）
      expect(() => new UserId(undefinedId)).toThrow(RequiredFieldException)
    })

    it('プレフィックスが異なる場合エラーをスローする', () => {
      // Arrange（準備）
      const wrongPrefixId = 'ing_clh7qp8kg0000qzrm5b8j5n8k'

      // Act & Assert（実行 & 検証）
      expect(() => new UserId(wrongPrefixId)).toThrow(InvalidFieldException)
      expect(() => new UserId(wrongPrefixId)).toThrow('usr_で始まる必要があります')
    })

    it('CUID形式でない場合エラーをスローする', () => {
      // Arrange（準備）
      const invalidCuid = 'usr_invalid-format'

      // Act & Assert（実行 & 検証）
      expect(() => new UserId(invalidCuid)).toThrow(InvalidFieldException)
      expect(() => new UserId(invalidCuid)).toThrow('CUID v2形式で入力してください')
    })
  })

  describe('等価性比較', () => {
    it('同じ値のUserIdは等しい', () => {
      // Arrange（準備）
      const id = 'usr_clh7qp8kg0000qzrm5b8j5n8k'

      // Act（実行）
      const userId1 = new UserId(id)
      const userId2 = new UserId(id)

      // Assert（検証）
      expect(userId1.equals(userId2)).toBe(true)
    })

    it('異なる値のUserIdは等しくない', () => {
      // Arrange（準備）
      const id1 = 'usr_clh7qp8kg0000qzrm5b8j5n8k'
      const id2 = 'usr_clh7qp8kg0001qzrm5b8j5n8l'

      // Act（実行）
      const userId1 = new UserId(id1)
      const userId2 = new UserId(id2)

      // Assert（検証）
      expect(userId1.equals(userId2)).toBe(false)
    })
  })

  describe('値オブジェクトの不変性', () => {
    it('作成後に値を変更できない', () => {
      // Arrange（準備）
      const id = 'usr_clh7qp8kg0000qzrm5b8j5n8k'

      // Act（実行）
      const userId = new UserId(id)
      const originalValue = userId.getValue()

      // Assert（検証）
      // 値オブジェクトは常に同じ値を返すことを確認
      expect(userId.getValue()).toBe(originalValue)
      expect(userId.getValue()).toBe(id)

      // 複数回呼び出しても同じ値を返すことを確認
      expect(userId.getValue()).toBe(userId.getValue())
    })

    it('値オブジェクトは参照による比較ではなく値による比較をする', () => {
      // Arrange（準備）
      const id = 'usr_clh7qp8kg0000qzrm5b8j5n8k'

      // Act（実行）
      const userId1 = new UserId(id)
      const userId2 = new UserId(id)

      // Assert（検証）
      // 異なるインスタンスだが同じ値を持つ場合、等価と判定される
      expect(userId1 === userId2).toBe(false) // 参照比較はfalse
      expect(userId1.equals(userId2)).toBe(true) // 値比較はtrue
    })
  })

  describe('文字列化', () => {
    it('toString()で値が返される', () => {
      // Arrange（準備）
      const id = 'usr_clh7qp8kg0000qzrm5b8j5n8k'

      // Act（実行）
      const userId = new UserId(id)

      // Assert（検証）
      expect(userId.toString()).toBe(id)
    })
  })

  describe('getCoreId', () => {
    it('プレフィックスを除いたCUID部分を取得できる', () => {
      // Arrange（準備）
      const fullId = 'usr_clh7qp8kg0000qzrm5b8j5n8k'
      const id = new UserId(fullId)

      // Act（実行）
      const coreId = id.getCoreId()

      // Assert（検証）
      expect(coreId).toBe('clh7qp8kg0000qzrm5b8j5n8k')
    })
  })

  describe('共有カーネルとしての利用', () => {
    it('複数のコンテキストから利用できることを確認', () => {
      // Arrange（準備）
      const userId = 'usr_clh7qp8kg0000qzrm5b8j5n8k'

      // Act（実行） - 異なるコンテキストでの利用を想定
      const userAuthContextUserId = new UserId(userId) // ユーザー認証コンテキスト
      const ingredientContextUserId = new UserId(userId) // 食材管理コンテキスト
      const shoppingContextUserId = new UserId(userId) // 買い物サポートコンテキスト

      // Assert（検証） - すべて同じ値を持つ
      expect(userAuthContextUserId.equals(ingredientContextUserId)).toBe(true)
      expect(ingredientContextUserId.equals(shoppingContextUserId)).toBe(true)
      expect(userAuthContextUserId.equals(shoppingContextUserId)).toBe(true)
    })
  })
})
