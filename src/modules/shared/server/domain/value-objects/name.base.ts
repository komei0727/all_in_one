import { ValueObject } from './value-object.base'
import { RequiredFieldException, InvalidFieldException } from '../exceptions'

/**
 * 名前値オブジェクトの基底クラス
 *
 * このクラスを継承することで、名前を表現する値オブジェクトを
 * 簡単に作成できます。自動的にトリミング処理が行われます。
 *
 * @example
 * ```typescript
 * export class ProductName extends Name {
 *   protected getFieldName(): string {
 *     return '商品名'
 *   }
 *
 *   protected getMaxLength(): number {
 *     return 100
 *   }
 *
 *   protected getMinLength(): number {
 *     return 1
 *   }
 * }
 * ```
 */
export abstract class Name extends ValueObject<string> {
  /**
   * コンストラクタ
   * @param value 名前の値（自動的にトリミングされます）
   */
  constructor(value: string) {
    // null/undefinedチェックを先に行う
    if (value === null || value === undefined) {
      // この時点では派生クラスのメソッドが使えないため、一時的な処理
      throw new RequiredFieldException('値')
    }
    // トリミング処理
    super(value.trim())
  }

  /**
   * フィールド名を取得する
   * エラーメッセージで使用されます
   * @returns フィールド名
   */
  protected abstract getFieldName(): string

  /**
   * 最大文字数を取得する
   * @returns 最大文字数
   */
  protected abstract getMaxLength(): number

  /**
   * 最小文字数を取得する（デフォルト: 1）
   * @returns 最小文字数
   */
  protected getMinLength(): number {
    return 1
  }

  /**
   * 値のバリデーション
   * @param value 検証する値（トリミング済み）
   */
  protected validate(value: string): void {
    const fieldName = this.getFieldName()
    const maxLength = this.getMaxLength()
    const minLength = this.getMinLength()

    // 必須チェック（空文字チェック）
    if (!value || value.length === 0) {
      throw new RequiredFieldException(fieldName)
    }

    // 最小文字数チェック
    if (value.length < minLength) {
      throw new InvalidFieldException(
        fieldName,
        value,
        `${fieldName}は${minLength}文字以上で入力してください`
      )
    }

    // 最大文字数チェック
    if (value.length > maxLength) {
      throw new InvalidFieldException(
        fieldName,
        value,
        `${fieldName}は${maxLength}文字以内で入力してください`
      )
    }
  }

  /**
   * 等価性を比較
   * @param other 比較対象
   * @returns 等しい場合はtrue
   */
  equals(other: Name): boolean {
    if (!(other instanceof Name)) {
      return false
    }
    return this.value === other.value
  }

  // Note: 派生クラスでは独自のcreateメソッドを実装してください
  // 例: static create(value: string): DerivedClass {
  //       return new DerivedClass(value)
  //     }
}
