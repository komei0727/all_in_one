/**
 * 値オブジェクトの基底クラス（共有カーネル）
 *
 * DDDにおける値オブジェクトの共通機能を提供します。
 * すべてのコンテキストで利用可能な基底クラスとして共有カーネルに配置。
 * 
 * 特徴:
 * - 不変性（Immutable）
 * - 値による等価性判定
 * - 自己検証
 *
 * @template T 値の型
 */
export abstract class ValueObject<T> {
  protected readonly value: T

  constructor(value: T) {
    this.validate(value)
    this.value = value
  }

  /**
   * 値のバリデーション
   * サブクラスでビジネスルールに基づいた検証を実装します
   *
   * @param value 検証する値
   * @throws {Error} バリデーションエラー
   */
  protected abstract validate(value: T): void

  /**
   * 値を取得
   *
   * @returns 保持している値
   */
  getValue(): T {
    return this.value
  }

  /**
   * 等価性の判定
   * 同じ型の値オブジェクトと値が等しいかを判定します
   *
   * @param other 比較対象の値オブジェクト
   * @returns 値が等しい場合はtrue
   */
  equals(other: ValueObject<T> | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false
    }
    if (!(other instanceof ValueObject)) {
      return false
    }
    return this.value === other.value
  }

  /**
   * 文字列表現を取得
   *
   * @returns 値の文字列表現
   */
  toString(): string {
    return String(this.value)
  }
}