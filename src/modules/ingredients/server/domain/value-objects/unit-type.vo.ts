import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'

import { RequiredFieldException, InvalidFieldException } from '../exceptions'

/**
 * 単位タイプ値オブジェクト
 *
 * 単位の種別を表す値オブジェクト（COUNT、WEIGHT、VOLUME）
 * ビジネスルール:
 * - 必須（null、undefined、空文字不可）
 * - COUNT（個数）、WEIGHT（重量）、VOLUME（容量）のいずれかのみ許可
 * - 同じタイプの単位間のみ変換可能
 */
export class UnitType extends ValueObject<string> {
  private static readonly VALID_TYPES = ['COUNT', 'WEIGHT', 'VOLUME'] as const
  private static readonly VALID_TYPES_STRINGS: readonly string[] = UnitType.VALID_TYPES

  constructor(value: string) {
    super(value)
  }

  protected validate(value: string): void {
    // null、undefined、空文字チェック
    if (!value || value.trim().length === 0) {
      throw new RequiredFieldException('単位タイプ')
    }

    // 有効な値かチェック
    if (!UnitType.VALID_TYPES_STRINGS.includes(value)) {
      throw new InvalidFieldException(
        '単位タイプ',
        value,
        'COUNT, WEIGHT, VOLUME のいずれかである必要があります'
      )
    }
  }

  /**
   * 個数タイプかどうかを判定
   * @returns 個数タイプの場合true
   */
  isCount(): boolean {
    return this.value === 'COUNT'
  }

  /**
   * 重量タイプかどうかを判定
   * @returns 重量タイプの場合true
   */
  isWeight(): boolean {
    return this.value === 'WEIGHT'
  }

  /**
   * 容量タイプかどうかを判定
   * @returns 容量タイプの場合true
   */
  isVolume(): boolean {
    return this.value === 'VOLUME'
  }

  /**
   * 指定された単位タイプに変換可能かどうかを判定
   * 同じタイプの単位間のみ変換可能
   * @param other 変換先の単位タイプ
   * @returns 変換可能な場合true
   */
  canConvertTo(other: UnitType): boolean {
    return this.equals(other)
  }

  /**
   * 日本語の表示名を取得
   * @returns 日本語の表示名
   */
  getDisplayName(): string {
    switch (this.value) {
      case 'COUNT':
        return '個数'
      case 'WEIGHT':
        return '重量'
      case 'VOLUME':
        return '容量'
      default:
        return this.value
    }
  }

  /**
   * 新しいUnitTypeインスタンスを生成
   *
   * @param value 単位タイプ（COUNT | WEIGHT | VOLUME）
   * @returns UnitTypeインスタンス
   */
  static create(value: string): UnitType {
    return new UnitType(value)
  }

  /**
   * 個数タイプのUnitTypeを生成
   * @returns COUNT タイプのUnitType
   */
  static createCount(): UnitType {
    return new UnitType('COUNT')
  }

  /**
   * 重量タイプのUnitTypeを生成
   * @returns WEIGHT タイプのUnitType
   */
  static createWeight(): UnitType {
    return new UnitType('WEIGHT')
  }

  /**
   * 容量タイプのUnitTypeを生成
   * @returns VOLUME タイプのUnitType
   */
  static createVolume(): UnitType {
    return new UnitType('VOLUME')
  }
}
