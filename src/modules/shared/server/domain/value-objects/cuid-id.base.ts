import { StringId } from './string-id.base'
import { InvalidFieldException } from '../exceptions'

/**
 * CUID形式のID値オブジェクトの基底クラス
 *
 * このクラスを継承することで、CUID v2形式のIDを表現する値オブジェクトを
 * 簡単に作成できます。
 *
 * @example
 * ```typescript
 * export class OrderId extends CuidId {
 *   protected getFieldName(): string {
 *     return 'orderId'
 *   }
 * }
 * ```
 */
export abstract class CuidId extends StringId {
  /**
   * CUID v2の正規表現パターン
   * - 小文字の英数字のみ
   * - 20-30文字程度（通常は25文字）
   */
  private static readonly CUID_PATTERN = /^[a-z0-9]{20,30}$/

  /**
   * 値のバリデーション
   * @param value 検証する値
   */
  protected validate(value: string): void {
    // 親クラスのバリデーション（必須チェック）
    super.validate(value)

    // CUID形式チェック
    if (!CuidId.CUID_PATTERN.test(value)) {
      throw new InvalidFieldException('ID', value, 'CUID v2形式で入力してください')
    }
  }
}
