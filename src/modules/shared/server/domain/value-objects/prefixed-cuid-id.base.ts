import { StringId } from './string-id.base'
import { InvalidFieldException } from '../exceptions'

/**
 * プレフィックス付きCUID形式のID値オブジェクトの基底クラス
 *
 * このクラスを継承することで、プレフィックス付きのCUID v2形式のIDを表現する
 * 値オブジェクトを簡単に作成できます。
 *
 * @example
 * ```typescript
 * export class IngredientId extends PrefixedCuidId {
 *   protected getFieldName(): string {
 *     return '食材ID'
 *   }
 *
 *   protected getPrefix(): string {
 *     return 'ing_'
 *   }
 * }
 * ```
 */
export abstract class PrefixedCuidId extends StringId {
  /**
   * CUID v2の正規表現パターン（プレフィックスを除く部分）
   * - 小文字の英数字のみ
   * - 20-30文字程度（通常は25文字）
   */
  private static readonly CUID_PATTERN = /^[a-z0-9]{20,30}$/

  /**
   * IDのプレフィックスを取得する
   * @returns プレフィックス文字列
   */
  protected abstract getPrefix(): string

  /**
   * 値のバリデーション
   * @param value 検証する値
   */
  protected validate(value: string): void {
    // 親クラスのバリデーション（必須チェック）
    super.validate(value)

    const prefix = this.getPrefix()

    // プレフィックスチェック
    if (!value.startsWith(prefix)) {
      throw new InvalidFieldException(this.getFieldName(), value, `${prefix}で始まる必要があります`)
    }

    // CUID部分の取得と検証
    const cuidPart = value.substring(prefix.length)
    if (!PrefixedCuidId.CUID_PATTERN.test(cuidPart)) {
      throw new InvalidFieldException('ID', value, 'CUID v2形式で入力してください')
    }
  }

  /**
   * プレフィックスを除いたCUID部分を取得する
   * @returns CUID部分
   */
  getCoreId(): string {
    return this.value.substring(this.getPrefix().length)
  }
}
