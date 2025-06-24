import { ExpiryInfo } from '@/modules/ingredients/server/domain/value-objects/expiry-info.vo'

import { BaseBuilder } from '../base.builder'
import { faker } from '../faker.config'

interface ExpiryInfoProps {
  bestBeforeDate?: Date | null
  useByDate?: Date | null
}

/**
 * ExpiryInfo値オブジェクトのテストデータビルダー
 */
export class ExpiryInfoBuilder extends BaseBuilder<ExpiryInfoProps, ExpiryInfo> {
  constructor() {
    super()
    // デフォルト値: 両方null
    this.props = {
      bestBeforeDate: null,
      useByDate: null,
    }
  }

  /**
   * 賞味期限を設定
   */
  withBestBeforeDate(date: Date | null): this {
    return this.with('bestBeforeDate', date)
  }

  /**
   * 消費期限を設定
   */
  withUseByDate(date: Date | null): this {
    return this.with('useByDate', date)
  }

  /**
   * 指定日数後の賞味期限を設定
   */
  withBestBeforeDaysFromNow(days: number): this {
    const date = new Date()
    date.setDate(date.getDate() + days)
    date.setHours(0, 0, 0, 0)
    return this.with('bestBeforeDate', date)
  }

  /**
   * 指定日数後の消費期限を設定
   */
  withUseByDaysFromNow(days: number): this {
    const date = new Date()
    date.setDate(date.getDate() + days)
    date.setHours(0, 0, 0, 0)
    return this.with('useByDate', date)
  }

  /**
   * ランダムな将来の賞味期限を設定
   */
  withRandomFutureBestBeforeDate(minDays: number = 1, maxDays: number = 365): this {
    const days = faker.number.int({ min: minDays, max: maxDays })
    return this.withBestBeforeDaysFromNow(days)
  }

  /**
   * ランダムな将来の消費期限を設定
   */
  withRandomFutureUseByDate(minDays: number = 1, maxDays: number = 365): this {
    const days = faker.number.int({ min: minDays, max: maxDays })
    return this.withUseByDaysFromNow(days)
  }

  /**
   * ランダムな過去の賞味期限を設定
   */
  withRandomPastBestBeforeDate(minDays: number = 1, maxDays: number = 365): this {
    const days = faker.number.int({ min: minDays, max: maxDays })
    return this.withBestBeforeDaysFromNow(-days)
  }

  /**
   * ランダムな過去の消費期限を設定
   */
  withRandomPastUseByDate(minDays: number = 1, maxDays: number = 365): this {
    const days = faker.number.int({ min: minDays, max: maxDays })
    return this.withUseByDaysFromNow(-days)
  }

  /**
   * 有効な期限情報を設定（消費期限は賞味期限より前）
   */
  withValidDates(bestBeforeDays: number = 10, useByDays: number = 5): this {
    return this.withBestBeforeDaysFromNow(bestBeforeDays).withUseByDaysFromNow(useByDays)
  }

  /**
   * ランダムな有効な期限情報を設定
   */
  withRandomValidDates(): this {
    const bestBeforeDays = faker.number.int({ min: 7, max: 365 })
    const useByDays = faker.number.int({ min: 1, max: bestBeforeDays - 1 })
    return this.withBestBeforeDaysFromNow(bestBeforeDays).withUseByDaysFromNow(useByDays)
  }

  /**
   * 無効な期限情報を設定（消費期限が賞味期限より後）
   */
  withInvalidDates(bestBeforeDays: number = 5, useByDays: number = 10): this {
    return this.withBestBeforeDaysFromNow(bestBeforeDays).withUseByDaysFromNow(useByDays)
  }

  /**
   * ランダムな無効な期限情報を設定
   */
  withRandomInvalidDates(): this {
    const bestBeforeDays = faker.number.int({ min: 1, max: 10 })
    const useByDays = faker.number.int({ min: bestBeforeDays + 1, max: 20 })
    return this.withBestBeforeDaysFromNow(bestBeforeDays).withUseByDaysFromNow(useByDays)
  }

  /**
   * 期限切れの期限情報を設定
   */
  withExpiredDates(): this {
    const bestBeforeDays = faker.number.int({ min: -30, max: -1 })
    const useByDays = faker.number.int({ min: -60, max: bestBeforeDays - 1 })
    return this.withBestBeforeDaysFromNow(bestBeforeDays).withUseByDaysFromNow(useByDays)
  }

  /**
   * 今日が期限の期限情報を設定
   */
  withTodayAsExpiry(): this {
    return this.withBestBeforeDaysFromNow(0)
  }

  build(): ExpiryInfo {
    return new ExpiryInfo({
      bestBeforeDate: this.props.bestBeforeDate ?? null,
      useByDate: this.props.useByDate ?? null,
    })
  }
}
