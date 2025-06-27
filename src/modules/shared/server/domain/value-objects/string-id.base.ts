import { ValueObject } from './value-object.base'
import { RequiredFieldException } from '../exceptions'

/**
 * 文字列ID値オブジェクトの基底クラス
 *
 * このクラスを継承することで、文字列ベースのIDを表現する値オブジェクトを
 * 簡単に作成できます。
 *
 * @example
 * ```typescript
 * export class ProductId extends StringId {
 *   protected getFieldName(): string {
 *     return 'productId'
 *   }
 * }
 * ```
 */
export abstract class StringId extends ValueObject<string> {
  /**
   * コンストラクタ
   * @param value ID値
   */
  constructor(value: string) {
    super(value)
  }

  /**
   * フィールド名を取得する
   * エラーメッセージで使用されます
   * @returns フィールド名
   */
  protected abstract getFieldName(): string

  /**
   * 値のバリデーション
   * @param value 検証する値
   */
  protected validate(value: string): void {
    // 必須チェック（トリミング後の空文字もチェック）
    if (value === null || value === undefined || value.trim() === '') {
      throw new RequiredFieldException(this.getFieldName())
    }
  }

  /**
   * 等価性を比較
   * @param other 比較対象
   * @returns 等しい場合はtrue
   */
  equals(other: StringId): boolean {
    if (!(other instanceof StringId)) {
      return false
    }
    return this.value === other.value
  }

  // Note: 派生クラスでは独自のcreateメソッドを実装してください
  // 例: static create(value: string): DerivedClass {
  //       return new DerivedClass(value)
  //     }
}
