import { StringId } from './string-id.base'
import { InvalidFieldException } from '../exceptions'

/**
 * UUID形式のID値オブジェクトの基底クラス
 *
 * このクラスを継承することで、UUID v4形式のIDを表現する値オブジェクトを
 * 簡単に作成できます。
 *
 * @example
 * ```typescript
 * export class OrderId extends UuidId {
 *   protected getFieldName(): string {
 *     return 'orderId'
 *   }
 * }
 * ```
 */
export abstract class UuidId extends StringId {
  /**
   * UUID v4の正規表現パターン
   */
  private static readonly UUID_V4_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  /**
   * 値のバリデーション
   * @param value 検証する値
   */
  protected validate(value: string): void {
    // 親クラスのバリデーション（必須チェック）
    super.validate(value)

    // UUID形式チェック
    if (!UuidId.UUID_V4_PATTERN.test(value)) {
      // validateメソッドは基底クラスのコンストラクタから呼ばれるため、
      // この時点ではthisが完全に初期化されていない可能性がある
      throw new InvalidFieldException('ID', value, 'UUID v4形式で入力してください')
    }
  }

  // Note: 派生クラスでは独自のgenerateメソッドを実装してください
  // 例: static generate(): DerivedClass {
  //       return new DerivedClass(uuidv4())
  //     }
}
