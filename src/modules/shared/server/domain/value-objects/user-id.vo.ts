import { ValueObject } from './value-object.base'

/**
 * ユーザーID値オブジェクト
 * ユーザーの一意識別子を表現する
 * 
 * 共有カーネルの一部として、すべてのコンテキストから利用可能
 * - 食材管理コンテキスト: 食材の所有者識別
 * - ユーザー認証コンテキスト: ユーザー集約のID
 * - 買い物サポートコンテキスト: 買い物リストの所有者識別
 */
export class UserId extends ValueObject<string> {
  private static readonly MAX_LENGTH = 255

  constructor(value: string) {
    super(value)
    this.validate(value)
  }

  protected validate(value: string): void {
    // 必須チェック
    if (value === null || value === undefined) {
      throw new Error('ユーザーIDは必須です')
    }

    // 空文字チェック
    if (value.trim() === '') {
      throw new Error('ユーザーIDは必須です')
    }

    // 最大長チェック
    if (value.length > UserId.MAX_LENGTH) {
      throw new Error('ユーザーIDの長さが不正です')
    }
  }

  /**
   * 値を取得
   */
  getValue(): string {
    return this.value
  }

  /**
   * 等価性を比較
   */
  equals(other: ValueObject<string> | null | undefined): boolean {
    if (!other || !(other instanceof UserId)) {
      return false
    }
    return this.value === other.value
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    return this.value
  }
}