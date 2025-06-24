import { ValueObject } from './value-object.base'

/**
 * Email値オブジェクト
 * メールアドレスを表現する
 * 
 * 共有カーネルの一部として、すべてのコンテキストから利用可能
 * - ユーザー認証コンテキスト: ログイン時のメールアドレス
 * - 食材管理コンテキスト: ユーザーの連絡先情報
 * - 買い物サポートコンテキスト: 共有時の連絡先情報
 */
export class Email extends ValueObject<string> {
  private static readonly MAX_LENGTH = 254 // RFC 5321準拠
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  constructor(value: string) {
    // null/undefinedチェックを先に行う
    if (value === null || value === undefined) {
      throw new Error('メールアドレスは必須です')
    }
    
    // 正規化（小文字化・トリミング）
    const normalizedValue = value.trim().toLowerCase()
    super(normalizedValue)
  }

  private validate(value: string): void {
    // 空文字チェック
    if (value.trim() === '') {
      throw new Error('メールアドレスは必須です')
    }

    // 形式チェック（長さチェックよりも先に実行）
    if (!Email.EMAIL_REGEX.test(value)) {
      throw new Error('無効なメールアドレス形式です')
    }

    // @が含まれているかチェック
    if (!value.includes('@')) {
      throw new Error('無効なメールアドレス形式です')
    }

    const parts = value.split('@')
    if (parts.length !== 2) {
      throw new Error('無効なメールアドレス形式です')
    }

    const [localPart, domainPart] = parts

    // ローカル部分・ドメイン部分の二重ドット防止
    if (localPart.includes('..') || domainPart.includes('..')) {
      throw new Error('無効なメールアドレス形式です')
    }

    // 最大長チェック（形式チェック後）
    if (value.length > Email.MAX_LENGTH) {
      throw new Error('メールアドレスが長すぎます')
    }
  }

  /**
   * ドメイン部分を取得
   */
  getDomain(): string {
    const parts = this.value.split('@')
    return parts[1]
  }

  /**
   * ローカル部分を取得
   */
  getLocalPart(): string {
    const parts = this.value.split('@')
    return parts[0]
  }

  /**
   * 等価性を比較（大文字小文字を区別しない）
   */
  equals(other: Email): boolean {
    if (!(other instanceof Email)) {
      return false
    }
    return this.value === other.value
  }

  /**
   * メールアドレスが有効かどうかを検証
   */
  isValid(): boolean {
    try {
      this.validate(this.value)
      return true
    } catch {
      return false
    }
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    return this.value
  }
}