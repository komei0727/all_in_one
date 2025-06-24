import { randomBytes } from 'crypto'

import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'
import { ValidationException } from '../exceptions/validation.exception'

/**
 * 食材在庫ID値オブジェクト
 * CUID形式の識別子を表現する
 */
export class IngredientStockId extends ValueObject<string> {
  /**
   * CUID形式のバリデーション
   * @param value ID文字列
   * @throws {ValidationException} 無効なCUID形式の場合
   */
  protected validate(value: string): void {
    if (!value || value.trim() === '') {
      throw new ValidationException('食材在庫IDは必須です')
    }

    // CUID形式の簡易チェック（英数字のみ、8文字以上）
    if (!/^[a-zA-Z0-9]{8,}$/.test(value)) {
      throw new ValidationException('食材在庫IDの形式が正しくありません')
    }
  }

  /**
   * 新しいCUID形式のIDを生成
   * @returns 新しいIngredientStockId
   */
  static generate(): IngredientStockId {
    // 簡易的なCUID生成（実際のプロダクションではcuidライブラリを使用推奨）
    const timestamp = Date.now().toString(36)
    const randomPart = randomBytes(12).toString('base64').replace(/[+/=]/g, '')
    const id = `c${timestamp}${randomPart}`.slice(0, 25)
    return new IngredientStockId(id)
  }
}
