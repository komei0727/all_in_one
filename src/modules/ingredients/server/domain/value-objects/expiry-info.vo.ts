import { ValueObject } from '@/modules/shared/server/domain/value-objects/value-object.base'

import { ValidationException } from '../exceptions/validation.exception'

/**
 * 期限情報値オブジェクト
 * 賞味期限と消費期限を統合的に管理し、期限に関するビジネスロジックを提供する
 */
export class ExpiryInfo extends ValueObject<{
  bestBeforeDate: Date | null
  useByDate: Date | null
}> {
  /**
   * 期限情報のバリデーション
   * @param value 期限情報
   * @throws {ValidationException} 無効な期限情報の場合
   */
  protected validate(value: { bestBeforeDate: Date | null; useByDate: Date | null }): void {
    // 両方の日付が存在する場合、消費期限は賞味期限以前でなければならない
    if (value.bestBeforeDate && value.useByDate) {
      const bestBefore = new Date(value.bestBeforeDate)
      const useBy = new Date(value.useByDate)

      // 時刻を0:00:00にリセットして日付のみで比較
      bestBefore.setHours(0, 0, 0, 0)
      useBy.setHours(0, 0, 0, 0)

      if (useBy > bestBefore) {
        throw new ValidationException('消費期限は賞味期限以前でなければなりません')
      }
    }
  }

  /**
   * 賞味期限を取得
   */
  getBestBeforeDate(): Date | null {
    return this.value.bestBeforeDate
  }

  /**
   * 消費期限を取得
   */
  getUseByDate(): Date | null {
    return this.value.useByDate
  }

  /**
   * 期限切れかどうかを判定
   * @returns 期限切れの場合true
   */
  isExpired(): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 賞味期限を優先的にチェック
    if (this.value.bestBeforeDate) {
      const bestBefore = new Date(this.value.bestBeforeDate)
      bestBefore.setHours(0, 0, 0, 0)
      return bestBefore < today
    }

    // 賞味期限がない場合は消費期限をチェック
    if (this.value.useByDate) {
      const useBy = new Date(this.value.useByDate)
      useBy.setHours(0, 0, 0, 0)
      return useBy < today
    }

    // どちらもない場合は期限切れではない
    return false
  }

  /**
   * 期限までの日数を取得
   * @returns 期限までの日数（過ぎている場合は負の値）、期限がない場合はnull
   */
  getDaysUntilExpiry(): number | null {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 賞味期限を優先的に使用
    const targetDate = this.value.bestBeforeDate || this.value.useByDate
    if (!targetDate) {
      return null
    }

    const target = new Date(targetDate)
    target.setHours(0, 0, 0, 0)

    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  }

  /**
   * 有効な期限日を取得（賞味期限を優先）
   * @returns 賞味期限または消費期限、どちらもない場合はnull
   */
  getEffectiveExpiryDate(): Date | null {
    return this.value.bestBeforeDate || this.value.useByDate
  }

  /**
   * 期限切れが間近かどうかを判定
   * @param days 判定する日数
   * @returns 指定日数以内に期限切れになる場合true
   */
  isExpiringSoon(days: number): boolean {
    const daysUntilExpiry = this.getDaysUntilExpiry()
    if (daysUntilExpiry === null) {
      return false
    }
    return daysUntilExpiry <= days
  }

  /**
   * 表示用の期限日付を取得（消費期限優先）
   * @returns 消費期限または賞味期限、どちらもない場合はnull
   */
  getDisplayDate(): Date | null {
    // 消費期限を優先
    return this.value.useByDate || this.value.bestBeforeDate
  }

  /**
   * プレーンオブジェクトに変換
   */
  toObject(): { bestBeforeDate: string | null; useByDate: string | null } {
    return {
      bestBeforeDate: this.value.bestBeforeDate?.toISOString() ?? null,
      useByDate: this.value.useByDate?.toISOString() ?? null,
    }
  }

  /**
   * プレーンオブジェクトから作成
   */
  static fromObject(obj: { bestBeforeDate: string | null; useByDate: string | null }): ExpiryInfo {
    return new ExpiryInfo({
      bestBeforeDate: obj.bestBeforeDate ? new Date(obj.bestBeforeDate) : null,
      useByDate: obj.useByDate ? new Date(obj.useByDate) : null,
    })
  }

  /**
   * 等価性の判定
   * @param other 比較対象の値オブジェクト
   * @returns 値が等しい場合はtrue
   */
  equals(other: ExpiryInfo | null | undefined): boolean {
    if (!other) {
      return false
    }

    const isBestBeforeDateEqual =
      (this.value.bestBeforeDate === null && other.value.bestBeforeDate === null) ||
      (this.value.bestBeforeDate !== null &&
        other.value.bestBeforeDate !== null &&
        this.value.bestBeforeDate.getTime() === other.value.bestBeforeDate.getTime())

    const isUseByDateEqual =
      (this.value.useByDate === null && other.value.useByDate === null) ||
      (this.value.useByDate !== null &&
        other.value.useByDate !== null &&
        this.value.useByDate.getTime() === other.value.useByDate.getTime())

    return isBestBeforeDateEqual && isUseByDateEqual
  }
}
