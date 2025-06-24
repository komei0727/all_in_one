import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'
import { ValidationException } from '../exceptions/validation.exception'

/**
 * メモ値オブジェクト
 * 食材に関するメモを表現する
 */
export class Memo extends ValueObject<string> {
  constructor(value: string) {
    // 前後の空白をトリム
    super(value.trim())
  }

  /**
   * メモのバリデーション
   * @param value メモ
   * @throws {ValidationException} 無効なメモの場合
   */
  protected validate(value: string): void {
    if (value.length > 200) {
      throw new ValidationException('メモは200文字以内で入力してください')
    }
  }
}
