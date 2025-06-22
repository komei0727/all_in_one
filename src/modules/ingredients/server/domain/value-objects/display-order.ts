import { ValueObject } from './value-object'

/**
 * 表示順序値オブジェクト
 *
 * エンティティの表示順序を表す値オブジェクト
 * ビジネスルール:
 * - 0以上の整数
 * - デフォルト値は0
 */
export class DisplayOrder extends ValueObject<number> {
  protected validate(value: number): void {
    if (value < 0) {
      throw new Error('表示順序は0以上の整数である必要があります')
    }
    if (!Number.isInteger(value)) {
      throw new Error('表示順序は整数である必要があります')
    }
  }

  /**
   * デフォルトの表示順序を生成
   *
   * @returns 値が0のDisplayOrderインスタンス
   */
  static default(): DisplayOrder {
    return new DisplayOrder(0)
  }

  /**
   * 新しいDisplayOrderインスタンスを生成
   *
   * @param value 表示順序の値
   * @returns DisplayOrderインスタンス
   */
  static create(value: number): DisplayOrder {
    return new DisplayOrder(value)
  }

  /**
   * 他の表示順序より小さいかを判定
   *
   * @param other 比較対象の表示順序
   * @returns この値が小さい場合はtrue
   */
  isLessThan(other: DisplayOrder): boolean {
    return this.value < other.value
  }
}
