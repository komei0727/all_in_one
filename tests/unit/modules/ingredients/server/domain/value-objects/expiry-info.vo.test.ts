import { describe, it, expect } from 'vitest'

import { ValidationException } from '@/modules/ingredients/server/domain/exceptions'
import { ExpiryInfo } from '@/modules/ingredients/server/domain/value-objects'

import { ExpiryInfoBuilder } from '../../../../../../__fixtures__/builders'

describe('ExpiryInfo', () => {
  // 正常系のテスト
  describe('正常な値での作成', () => {
    it('賞味期限と消費期限の両方を持つ場合', () => {
      // ビルダーを使用してランダムな有効な期限情報を作成
      const expiryInfo = new ExpiryInfoBuilder().withRandomValidDates().build()

      expect(expiryInfo.getBestBeforeDate()).toBeInstanceOf(Date)
      expect(expiryInfo.getUseByDate()).toBeInstanceOf(Date)
      // 消費期限は賞味期限より前
      expect(expiryInfo.getUseByDate()!.getTime()).toBeLessThanOrEqual(
        expiryInfo.getBestBeforeDate()!.getTime()
      )
    })

    it('賞味期限のみを持つ場合', () => {
      const expiryInfo = new ExpiryInfoBuilder()
        .withRandomFutureBestBeforeDate()
        .withUseByDate(null)
        .build()

      expect(expiryInfo.getBestBeforeDate()).toBeInstanceOf(Date)
      expect(expiryInfo.getUseByDate()).toBeNull()
    })

    it('消費期限のみを持つ場合', () => {
      const expiryInfo = new ExpiryInfoBuilder()
        .withBestBeforeDate(null)
        .withRandomFutureUseByDate()
        .build()

      expect(expiryInfo.getBestBeforeDate()).toBeNull()
      expect(expiryInfo.getUseByDate()).toBeInstanceOf(Date)
    })

    it('両方nullの場合', () => {
      const expiryInfo = new ExpiryInfoBuilder().build()

      expect(expiryInfo.getBestBeforeDate()).toBeNull()
      expect(expiryInfo.getUseByDate()).toBeNull()
    })

    it('様々な日付の組み合わせで正常に作成できる', () => {
      // 複数回テスト
      for (let i = 0; i < 10; i++) {
        expect(() => {
          new ExpiryInfoBuilder().withRandomValidDates().build()
        }).not.toThrow()
      }
    })
  })

  // 異常系のテスト
  describe('バリデーション', () => {
    it('消費期限が賞味期限より後の場合はエラー', () => {
      expect(() => {
        new ExpiryInfoBuilder().withRandomInvalidDates().build()
      }).toThrow(ValidationException)

      // 固定値でも確認
      expect(() => {
        new ExpiryInfoBuilder().withInvalidDates(5, 10).build()
      }).toThrow('消費期限は賞味期限以前でなければなりません')
    })

    it('様々な無効な日付の組み合わせでエラーになる', () => {
      // 複数回テスト
      for (let i = 0; i < 5; i++) {
        expect(() => {
          new ExpiryInfoBuilder().withRandomInvalidDates().build()
        }).toThrow(ValidationException)
      }
    })
  })

  // ビジネスロジックのテスト
  describe('isExpired', () => {
    it('賞味期限が過ぎている場合はtrue', () => {
      const expiryInfo = new ExpiryInfoBuilder()
        .withRandomPastBestBeforeDate()
        .withUseByDate(null)
        .build()

      expect(expiryInfo.isExpired()).toBe(true)
    })

    it('消費期限が過ぎている場合はtrue', () => {
      const expiryInfo = new ExpiryInfoBuilder()
        .withBestBeforeDate(null)
        .withRandomPastUseByDate()
        .build()

      expect(expiryInfo.isExpired()).toBe(true)
    })

    it('賞味期限が今日の場合はfalse', () => {
      const expiryInfo = new ExpiryInfoBuilder().withTodayAsExpiry().withUseByDate(null).build()

      expect(expiryInfo.isExpired()).toBe(false)
    })

    it('賞味期限が未来の場合はfalse', () => {
      const expiryInfo = new ExpiryInfoBuilder()
        .withRandomFutureBestBeforeDate()
        .withUseByDate(null)
        .build()

      expect(expiryInfo.isExpired()).toBe(false)
    })

    it('期限が設定されていない場合はfalse', () => {
      const expiryInfo = new ExpiryInfoBuilder().build()

      expect(expiryInfo.isExpired()).toBe(false)
    })

    it('両方の期限がある場合、賞味期限で判定する', () => {
      // 消費期限が過ぎているが、賞味期限は過ぎていない場合
      const expiryInfo = new ExpiryInfoBuilder()
        .withBestBeforeDaysFromNow(10) // 10日後
        .withUseByDaysFromNow(-5) // 5日前
        .build()

      // 賞味期限がまだ未来なのでfalse
      expect(expiryInfo.isExpired()).toBe(false)
    })
  })

  describe('getDaysUntilExpiry', () => {
    it('賞味期限までの日数を返す', () => {
      const days = 10
      const expiryInfo = new ExpiryInfoBuilder()
        .withBestBeforeDaysFromNow(days)
        .withUseByDate(null)
        .build()

      expect(expiryInfo.getDaysUntilExpiry()).toBe(days)
    })

    it('消費期限までの日数を返す（賞味期限がない場合）', () => {
      const days = 15
      const expiryInfo = new ExpiryInfoBuilder()
        .withBestBeforeDate(null)
        .withUseByDaysFromNow(days)
        .build()

      expect(expiryInfo.getDaysUntilExpiry()).toBe(days)
    })

    it('賞味期限を優先して返す（両方ある場合）', () => {
      const bestBeforeDays = 20
      const useByDays = 10
      const expiryInfo = new ExpiryInfoBuilder()
        .withBestBeforeDaysFromNow(bestBeforeDays)
        .withUseByDaysFromNow(useByDays)
        .build()

      expect(expiryInfo.getDaysUntilExpiry()).toBe(bestBeforeDays)
    })

    it('期限が過ぎている場合は負の値を返す', () => {
      const daysAgo = -5
      const expiryInfo = new ExpiryInfoBuilder()
        .withBestBeforeDaysFromNow(daysAgo)
        .withUseByDate(null)
        .build()

      expect(expiryInfo.getDaysUntilExpiry()).toBe(daysAgo)
    })

    it('期限が設定されていない場合はnullを返す', () => {
      const expiryInfo = new ExpiryInfoBuilder().build()

      expect(expiryInfo.getDaysUntilExpiry()).toBeNull()
    })
  })

  describe('getEffectiveExpiryDate', () => {
    it('賞味期限を返す（賞味期限のみの場合）', () => {
      const expiryInfo = new ExpiryInfoBuilder()
        .withRandomFutureBestBeforeDate()
        .withUseByDate(null)
        .build()

      expect(expiryInfo.getEffectiveExpiryDate()).toEqual(expiryInfo.getBestBeforeDate())
    })

    it('消費期限を返す（消費期限のみの場合）', () => {
      const expiryInfo = new ExpiryInfoBuilder()
        .withBestBeforeDate(null)
        .withRandomFutureUseByDate()
        .build()

      expect(expiryInfo.getEffectiveExpiryDate()).toEqual(expiryInfo.getUseByDate())
    })

    it('賞味期限を優先して返す（両方ある場合）', () => {
      const expiryInfo = new ExpiryInfoBuilder().withRandomValidDates().build()

      expect(expiryInfo.getEffectiveExpiryDate()).toEqual(expiryInfo.getBestBeforeDate())
    })

    it('期限が設定されていない場合はnullを返す', () => {
      const expiryInfo = new ExpiryInfoBuilder().build()

      expect(expiryInfo.getEffectiveExpiryDate()).toBeNull()
    })
  })

  describe('equals', () => {
    it('同じ値の場合はtrue', () => {
      const builder = new ExpiryInfoBuilder().withValidDates(10, 5)
      const expiryInfo1 = builder.build()
      const expiryInfo2 = builder.build()

      expect(expiryInfo1.equals(expiryInfo2)).toBe(true)
    })

    it('異なる値の場合はfalse', () => {
      const expiryInfo1 = new ExpiryInfoBuilder().withBestBeforeDaysFromNow(10).build()
      const expiryInfo2 = new ExpiryInfoBuilder().withBestBeforeDaysFromNow(20).build()

      // 異なる日付で作成したので異なるはず
      expect(expiryInfo1.equals(expiryInfo2)).toBe(false)
    })

    it('nullとの比較はfalse', () => {
      const expiryInfo = new ExpiryInfoBuilder().withRandomFutureBestBeforeDate().build()

      expect(expiryInfo.equals(null)).toBe(false)
    })

    it('null値の比較も正しく動作する', () => {
      const expiryInfo1 = new ExpiryInfoBuilder().build()
      const expiryInfo2 = new ExpiryInfoBuilder().build()

      expect(expiryInfo1.equals(expiryInfo2)).toBe(true)
    })
  })

  describe('isExpiringSoon', () => {
    it('期限が指定日数以内の場合はtrue', () => {
      const expiryInfo = new ExpiryInfoBuilder()
        .withBestBeforeDaysFromNow(3)
        .withUseByDate(null)
        .build()

      expect(expiryInfo.isExpiringSoon(7)).toBe(true)
      expect(expiryInfo.isExpiringSoon(3)).toBe(true)
      expect(expiryInfo.isExpiringSoon(2)).toBe(false)
    })

    it('期限が過ぎている場合もtrue', () => {
      const expiryInfo = new ExpiryInfoBuilder()
        .withBestBeforeDaysFromNow(-1)
        .withUseByDate(null)
        .build()

      expect(expiryInfo.isExpiringSoon(7)).toBe(true)
    })

    it('期限が設定されていない場合はfalse', () => {
      const expiryInfo = new ExpiryInfoBuilder().build()

      expect(expiryInfo.isExpiringSoon(7)).toBe(false)
    })

    it('消費期限で判定（賞味期限がない場合）', () => {
      const expiryInfo = new ExpiryInfoBuilder()
        .withBestBeforeDate(null)
        .withUseByDaysFromNow(2)
        .build()

      expect(expiryInfo.isExpiringSoon(3)).toBe(true)
      expect(expiryInfo.isExpiringSoon(1)).toBe(false)
    })
  })

  describe('getDisplayDate', () => {
    it('消費期限を優先して返す（両方ある場合）', () => {
      const expiryInfo = new ExpiryInfoBuilder()
        .withBestBeforeDaysFromNow(10)
        .withUseByDaysFromNow(5)
        .build()

      expect(expiryInfo.getDisplayDate()).toEqual(expiryInfo.getUseByDate())
    })

    it('賞味期限を返す（賞味期限のみの場合）', () => {
      const expiryInfo = new ExpiryInfoBuilder()
        .withRandomFutureBestBeforeDate()
        .withUseByDate(null)
        .build()

      expect(expiryInfo.getDisplayDate()).toEqual(expiryInfo.getBestBeforeDate())
    })

    it('消費期限を返す（消費期限のみの場合）', () => {
      const expiryInfo = new ExpiryInfoBuilder()
        .withBestBeforeDate(null)
        .withRandomFutureUseByDate()
        .build()

      expect(expiryInfo.getDisplayDate()).toEqual(expiryInfo.getUseByDate())
    })

    it('期限が設定されていない場合はnullを返す', () => {
      const expiryInfo = new ExpiryInfoBuilder().build()

      expect(expiryInfo.getDisplayDate()).toBeNull()
    })
  })

  describe('toObject/fromObject', () => {
    it('toObject()でプレーンオブジェクトに変換できる', () => {
      const builder = new ExpiryInfoBuilder().withValidDates(10, 5)
      const expiryInfo = builder.build()

      const obj = expiryInfo.toObject()

      expect(obj.bestBeforeDate).toEqual(expiryInfo.getBestBeforeDate()?.toISOString() ?? null)
      expect(obj.useByDate).toEqual(expiryInfo.getUseByDate()?.toISOString() ?? null)
    })

    it('toObject()でnull値も正しく変換される', () => {
      const expiryInfo = new ExpiryInfoBuilder().build()

      const obj = expiryInfo.toObject()

      expect(obj.bestBeforeDate).toBeNull()
      expect(obj.useByDate).toBeNull()
    })

    it('fromObject()でプレーンオブジェクトから復元できる', () => {
      const now = new Date()
      const bestBeforeDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)
      const useByDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)

      const obj = {
        bestBeforeDate: bestBeforeDate.toISOString(),
        useByDate: useByDate.toISOString(),
      }

      const expiryInfo = ExpiryInfo.fromObject(obj)

      expect(expiryInfo.getBestBeforeDate()?.toISOString()).toBe(bestBeforeDate.toISOString())
      expect(expiryInfo.getUseByDate()?.toISOString()).toBe(useByDate.toISOString())
    })

    it('fromObject()でnull値も復元できる', () => {
      const obj = {
        bestBeforeDate: null,
        useByDate: null,
      }

      const expiryInfo = ExpiryInfo.fromObject(obj)

      expect(expiryInfo.getBestBeforeDate()).toBeNull()
      expect(expiryInfo.getUseByDate()).toBeNull()
    })
  })
})
