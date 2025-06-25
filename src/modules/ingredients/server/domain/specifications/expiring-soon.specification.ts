import { Specification } from '@/modules/shared/server/domain/specifications/specification.base'

import { Ingredient } from '../entities/ingredient.entity'

/**
 * 期限切れ間近仕様
 * 指定された日数以内に賞味期限が切れる食材を特定する
 */
export class ExpiringSoonSpecification extends Specification<Ingredient> {
  /**
   * @param days 期限切れまでの日数（0以上）
   * @throws {Error} 日数が負の場合
   */
  constructor(private readonly days: number) {
    super()
    if (days < 0) {
      throw new Error('Days must be non-negative')
    }
  }

  /**
   * 食材が期限切れ間近かどうかを判定
   * @param ingredient 判定対象の食材
   * @returns 指定日数以内に期限切れの場合true
   */
  isSatisfiedBy(ingredient: Ingredient): boolean {
    // 賞味期限情報がない場合は期限切れ間近ではない
    const expiryInfo = ingredient.getExpiryInfo()
    if (!expiryInfo) {
      return false
    }

    // 消費期限を優先し、なければ賞味期限を使用
    const useByDate = expiryInfo.getUseByDate()
    const bestBeforeDate = expiryInfo.getBestBeforeDate()
    const expiryDate = useByDate || bestBeforeDate

    // どちらの期限もない場合は期限切れ間近ではない
    if (!expiryDate) {
      return false
    }

    // 現在日時と期限日時を日付単位で比較するため、時刻をリセット
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)

    // ミリ秒差を計算
    const diffInMs = expiry.getTime() - now.getTime()

    // ミリ秒を日数に変換（1日 = 24時間 * 60分 * 60秒 * 1000ミリ秒）
    const diffInDays = Math.floor(diffInMs / (24 * 60 * 60 * 1000))

    // 期限切れまでの日数が指定日数以下の場合true
    // 負の値（すでに期限切れ）の場合もtrue
    return diffInDays <= this.days
  }
}
