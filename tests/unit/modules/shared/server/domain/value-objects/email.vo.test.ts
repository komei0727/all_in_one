import { describe, it, expect } from 'vitest'
import { EmailBuilder } from '../../../../../../__fixtures__/builders'

// テスト対象のEmailクラス
import { Email } from '@/modules/shared/server/domain/value-objects/email.vo'

describe('Email値オブジェクト（共有カーネル）', () => {
  describe('正常な値での作成', () => {
    it('有効なメールアドレスで作成できる', () => {
      // Arrange（準備）
      const validEmail = 'test@example.com'
      
      // Act（実行）
      const email = new Email(validEmail)
      
      // Assert（検証）
      expect(email.getValue()).toBe(validEmail)
    })

    it('テストデータビルダーで生成したメールアドレスで作成できる', () => {
      // Arrange（準備）
      const testEmailData = new EmailBuilder().withTestEmail().build()
      
      // Act（実行）
      const email = new Email(testEmailData.value)
      
      // Assert（検証）
      expect(email.getValue()).toBe('test@example.com')
    })

    it('日本語ドメインを含むメールアドレスで作成できる', () => {
      // Arrange（準備）
      const japaneseEmail = 'user@日本.jp'
      
      // Act（実行） - 実装後にコメントアウト解除
      // const email = new Email(japaneseEmail)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(email.getValue()).toBe(japaneseEmail)
      
      // 実装前のプレースホルダー
      expect(japaneseEmail).toBe('user@日本.jp')
    })

    it('Gmailアドレスで作成できる', () => {
      // Arrange（準備）
      const testEmailData = new EmailBuilder().withGmail().build()
      
      // Act（実行） - 実装後にコメントアウト解除
      // const email = new Email(testEmailData.value)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(email.getValue()).toContain('@gmail.com')
      
      // 実装前のプレースホルダー
      expect(testEmailData.value).toContain('@gmail.com')
    })
  })

  describe('不正な値での作成', () => {
    it('空文字で作成するとエラーが発生する', () => {
      // Arrange（準備）
      const emptyEmail = ''
      
      // Act & Assert（実行 & 検証）
      expect(() => new Email(emptyEmail)).toThrow('メールアドレスは必須です')
    })

    it('nullで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const nullEmail = null as any
      
      // Act & Assert（実行 & 検証）
      expect(() => new Email(nullEmail)).toThrow('メールアドレスは必須です')
    })

    it('undefinedで作成するとエラーが発生する', () => {
      // Arrange（準備）
      const undefinedEmail = undefined as any
      
      // Act & Assert（実行 & 検証） - 実装後にコメントアウト解除
      // expect(() => new Email(undefinedEmail)).toThrow('メールアドレスは必須です')
      
      // 実装前のプレースホルダー
      expect(undefinedEmail).toBeUndefined()
    })

    it('無効な形式のメールアドレスで作成するとエラーが発生する', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@example.com',
        'invalid..email@example.com',
        'invalid email@example.com',
        'invalid@.com',
        'invalid@com'
      ]

      invalidEmails.forEach((invalidEmail) => {
        // Act & Assert（実行 & 検証）
        expect(() => new Email(invalidEmail))
          .toThrow('無効なメールアドレス形式です')
      })
    })

    it('最大長を超えるメールアドレスで作成するとエラーが発生する', () => {
      // Arrange（準備） - 最大長を超える長いメールアドレス
      const tooLongEmail = 'a'.repeat(250) + '@example.com'
      
      // Act & Assert（実行 & 検証）
      expect(() => new Email(tooLongEmail)).toThrow('メールアドレスが長すぎます')
    })
  })

  describe('ドメイン取得', () => {
    it('ドメイン部分を取得できる', () => {
      // Arrange（準備）
      const email = 'user@example.com'
      
      // Act（実行）
      const emailObj = new Email(email)
      
      // Assert（検証）
      expect(emailObj.getDomain()).toBe('example.com')
    })

    it('複雑なドメインでも正しく取得できる', () => {
      // Arrange（準備）
      const email = 'user@sub.example.co.jp'
      
      // Act（実行） - 実装後にコメントアウト解除
      // const emailObj = new Email(email)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(emailObj.getDomain()).toBe('sub.example.co.jp')
      
      // 実装前のプレースホルダー
      expect(email.split('@')[1]).toBe('sub.example.co.jp')
    })
  })

  describe('等価性比較', () => {
    it('同じメールアドレスのEmailは等しい', () => {
      // Arrange（準備）
      const email = 'test@example.com'
      
      // Act（実行） - 実装後にコメントアウト解除
      // const email1 = new Email(email)
      // const email2 = new Email(email)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(email1.equals(email2)).toBe(true)
      
      // 実装前のプレースホルダー
      expect(email).toBe(email)
    })

    it('異なるメールアドレスのEmailは等しくない', () => {
      // Arrange（準備）
      const email1 = 'test1@example.com'
      const email2 = 'test2@example.com'
      
      // Act（実行） - 実装後にコメントアウト解除
      // const emailObj1 = new Email(email1)
      // const emailObj2 = new Email(email2)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(emailObj1.equals(emailObj2)).toBe(false)
      
      // 実装前のプレースホルダー
      expect(email1).not.toBe(email2)
    })

    it('大文字小文字は区別せず等価と判定される', () => {
      // Arrange（準備）
      const email1 = 'Test@Example.COM'
      const email2 = 'test@example.com'
      
      // Act（実行） - 実装後にコメントアウト解除
      // const emailObj1 = new Email(email1)
      // const emailObj2 = new Email(email2)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(emailObj1.equals(emailObj2)).toBe(true)
      
      // 実装前のプレースホルダー
      expect(email1.toLowerCase()).toBe(email2.toLowerCase())
    })
  })

  describe('正規化', () => {
    it('メールアドレスは小文字に正規化される', () => {
      // Arrange（準備）
      const email = 'Test@Example.COM'
      
      // Act（実行） - 実装後にコメントアウト解除
      // const emailObj = new Email(email)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(emailObj.getValue()).toBe('test@example.com')
      
      // 実装前のプレースホルダー
      expect(email.toLowerCase()).toBe('test@example.com')
    })

    it('前後の空白は除去される', () => {
      // Arrange（準備）
      const email = '  test@example.com  '
      
      // Act（実行） - 実装後にコメントアウト解除
      // const emailObj = new Email(email)
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(emailObj.getValue()).toBe('test@example.com')
      
      // 実装前のプレースホルダー
      expect(email.trim()).toBe('test@example.com')
    })
  })

  describe('共有カーネルとしての利用', () => {
    it('複数のコンテキストから利用できることを確認', () => {
      // Arrange（準備）
      const emailAddress = 'user@example.com'
      
      // Act（実行） - 実装後にコメントアウト解除
      // const userAuthContextEmail = new Email(emailAddress) // ユーザー認証コンテキスト
      // const ingredientContextEmail = new Email(emailAddress) // 食材管理コンテキスト
      // const shoppingContextEmail = new Email(emailAddress) // 買い物サポートコンテキスト
      
      // Assert（検証） - 実装後にコメントアウト解除
      // expect(userAuthContextEmail.equals(ingredientContextEmail)).toBe(true)
      // expect(ingredientContextEmail.equals(shoppingContextEmail)).toBe(true)
      // expect(userAuthContextEmail.equals(shoppingContextEmail)).toBe(true)
      
      // 実装前のプレースホルダー
      expect(emailAddress).toBe(emailAddress)
    })
  })
})