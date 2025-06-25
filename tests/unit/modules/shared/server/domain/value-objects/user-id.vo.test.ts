import { describe, it, expect } from 'vitest'
import { UserIdBuilder } from '../../../../../../__fixtures__/builders'

// テスト対象のUserIdクラス（共有カーネル）
import { UserId } from '@/modules/shared/server/domain/value-objects/user-id.vo'

describe('UserId値オブジェクト（共有カーネル）', () => {
  describe('正常な値での作成', () => {
    it('有効なCUID形式のIDで作成できる', () => {
      // Arrange（準備）
      const validId = 'clxxxx1234567890'

      // Act（実行）
      const userId = new UserId(validId)

      // Assert（検証）
      expect(userId.getValue()).toBe(validId)
    })

    it('テストデータビルダーで生成したIDで作成できる', () => {
      // Arrange（準備）
      const testIdData = new UserIdBuilder().withTestId().build()

      // Act（実行）
      const userId = new UserId(testIdData.value)

      // Assert（検証）
      expect(userId.getValue()).toBe('user_test_001')
    })
  })

  describe('不正な値での作成', () => {
    it('空文字で作成するとエラーが発生する', () => {
      // Arrange（準備）
      const emptyId = ''

      // Act & Assert（実行 & 検証）
      expect(() => new UserId(emptyId)).toThrow('ユーザーIDは必須です')
    })

    it('nullで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const nullId = null as any

      // Act & Assert（実行 & 検証）
      expect(() => new UserId(nullId)).toThrow('ユーザーIDは必須です')
    })

    it('undefinedで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const undefinedId = undefined as any

      // Act & Assert（実行 & 検証）
      expect(() => new UserId(undefinedId)).toThrow('ユーザーIDは必須です')
    })

    it('最大長を超える文字列で作成するとエラーが発生する', () => {
      // Arrange（準備） - 一般的にCUIDは25文字なので、それを超える長さをテスト
      const tooLongId = 'a'.repeat(256)

      // Act & Assert（実行 & 検証）
      expect(() => new UserId(tooLongId)).toThrow('ユーザーIDの長さが不正です')
    })
  })

  describe('等価性比較', () => {
    it('同じ値のUserIdは等しい', () => {
      // Arrange（準備）
      const id = 'clxxxx1234567890'

      // Act（実行）
      const userId1 = new UserId(id)
      const userId2 = new UserId(id)

      // Assert（検証）
      expect(userId1.equals(userId2)).toBe(true)
    })

    it('異なる値のUserIdは等しくない', () => {
      // Arrange（準備）
      const id1 = 'clxxxx1234567890'
      const id2 = 'clxxxx0987654321'

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
      const id = 'clxxxx1234567890'

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
      const id = 'clxxxx1234567890'

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
      const id = 'clxxxx1234567890'

      // Act（実行）
      const userId = new UserId(id)

      // Assert（検証）
      expect(userId.toString()).toBe(id)
    })
  })

  describe('共有カーネルとしての利用', () => {
    it('複数のコンテキストから利用できることを確認', () => {
      // Arrange（準備）
      const userId = 'clxxxx1234567890'

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
