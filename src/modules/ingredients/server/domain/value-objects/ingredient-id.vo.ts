import { randomUUID } from 'crypto'

import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'

import { ValidationException } from '../exceptions/validation.exception'

/**
 * 食材ID値オブジェクト
 * UUID形式の識別子を表現する
 */
export class IngredientId extends ValueObject<string> {
  /**
   * UUID形式のバリデーション
   * @param value UUID文字列
   * @throws {ValidationException} 無効なUUID形式の場合
   */
  protected validate(value: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(value)) {
      throw new ValidationException('Invalid UUID format')
    }
  }

  /**
   * 新しい食材IDを生成
   * @returns 新しい食材ID
   */
  static generate(): IngredientId {
    return new IngredientId(randomUUID())
  }
}
