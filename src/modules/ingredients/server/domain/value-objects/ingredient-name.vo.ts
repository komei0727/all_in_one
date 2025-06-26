import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'

import { ValidationException } from '../exceptions'

/**
 * 食材名値オブジェクト
 * 食材の名前を表現する
 */
export class IngredientName extends ValueObject<string> {
  constructor(value: string) {
    // 前後の空白をトリム
    super(value.trim())
  }

  /**
   * 食材名のバリデーション
   * @param value 食材名
   * @throws {ValidationException} 無効な食材名の場合
   */
  protected validate(value: string): void {
    if (!value) {
      throw new ValidationException('食材名は必須です')
    }

    if (value.length > 50) {
      throw new ValidationException('食材名は50文字以内で入力してください')
    }
  }
}
