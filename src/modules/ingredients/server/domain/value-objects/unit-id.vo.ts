import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'

import { RequiredFieldException } from '../exceptions'

/**
 * 単位ID値オブジェクト
 *
 * 単位の識別子を表す値オブジェクト
 * ビジネスルール:
 * - 必須（空文字不可）
 * - 一意性はリポジトリ層で保証
 */
export class UnitId extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new RequiredFieldException('単位ID')
    }
  }

  /**
   * 新しいUnitIdインスタンスを生成
   *
   * @param value 単位IDの値
   * @returns UnitIdインスタンス
   */
  static create(value: string): UnitId {
    return new UnitId(value)
  }
}
