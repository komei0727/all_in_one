import { describe, it, expect } from 'vitest'

import { ExpiryStatus } from '@/modules/ingredients/server/domain/value-objects/expiry-status.vo'

describe('ExpiryStatus', () => {
  describe('定数', () => {
    it('FRESHステータスが定義されている', () => {
      // Then: FRESHステータスが存在
      expect(ExpiryStatus.FRESH).toBeInstanceOf(ExpiryStatus)
      expect(ExpiryStatus.FRESH.getValue()).toBe('FRESH')
    })

    it('EXPIRING_SOONステータスが定義されている', () => {
      // Then: EXPIRING_SOONステータスが存在
      expect(ExpiryStatus.EXPIRING_SOON).toBeInstanceOf(ExpiryStatus)
      expect(ExpiryStatus.EXPIRING_SOON.getValue()).toBe('EXPIRING_SOON')
    })

    it('EXPIREDステータスが定義されている', () => {
      // Then: EXPIREDステータスが存在
      expect(ExpiryStatus.EXPIRED).toBeInstanceOf(ExpiryStatus)
      expect(ExpiryStatus.EXPIRED.getValue()).toBe('EXPIRED')
    })
  })

  describe('from', () => {
    it('有効なステータス文字列から作成できる', () => {
      // When: 文字列からステータスを作成
      const fresh = ExpiryStatus.from('FRESH')
      const expiringSoon = ExpiryStatus.from('EXPIRING_SOON')
      const expired = ExpiryStatus.from('EXPIRED')

      // Then: 正しいステータスが作成される
      expect(fresh.equals(ExpiryStatus.FRESH)).toBe(true)
      expect(expiringSoon.equals(ExpiryStatus.EXPIRING_SOON)).toBe(true)
      expect(expired.equals(ExpiryStatus.EXPIRED)).toBe(true)
    })

    it('無効なステータス文字列は拒否される', () => {
      // When/Then: 無効なステータスでエラー
      expect(() => ExpiryStatus.from('INVALID')).toThrow('無効な期限ステータス: INVALID')
    })

    it('空文字列は拒否される', () => {
      // When/Then: 空文字列でエラー
      expect(() => ExpiryStatus.from('')).toThrow('無効な期限ステータス: ')
    })

    it('nullやundefinedは拒否される', () => {
      // When/Then: nullやundefinedでエラー
      expect(() => ExpiryStatus.from(null as any)).toThrow()
      expect(() => ExpiryStatus.from(undefined as any)).toThrow()
    })
  })

  describe('fromDaysUntilExpiry', () => {
    it('日数から適切なステータスを判定できる', () => {
      // When/Then: 期限までの日数でステータス判定
      expect(ExpiryStatus.fromDaysUntilExpiry(10).equals(ExpiryStatus.FRESH)).toBe(true)
      expect(ExpiryStatus.fromDaysUntilExpiry(7).equals(ExpiryStatus.FRESH)).toBe(true)
      expect(ExpiryStatus.fromDaysUntilExpiry(3).equals(ExpiryStatus.EXPIRING_SOON)).toBe(true)
      expect(ExpiryStatus.fromDaysUntilExpiry(1).equals(ExpiryStatus.EXPIRING_SOON)).toBe(true)
      expect(ExpiryStatus.fromDaysUntilExpiry(0).equals(ExpiryStatus.EXPIRED)).toBe(true)
      expect(ExpiryStatus.fromDaysUntilExpiry(-1).equals(ExpiryStatus.EXPIRED)).toBe(true)
    })

    it('nullの場合はFRESHを返す', () => {
      // When/Then: 期限なしの場合
      expect(ExpiryStatus.fromDaysUntilExpiry(null).equals(ExpiryStatus.FRESH)).toBe(true)
    })
  })

  describe('状態判定メソッド', () => {
    describe('isFresh', () => {
      it('FRESHステータスの場合はtrueを返す', () => {
        // Then: FRESHの場合true
        expect(ExpiryStatus.FRESH.isFresh()).toBe(true)
        expect(ExpiryStatus.EXPIRING_SOON.isFresh()).toBe(false)
        expect(ExpiryStatus.EXPIRED.isFresh()).toBe(false)
      })
    })

    describe('isExpiringSoon', () => {
      it('EXPIRING_SOONステータスの場合はtrueを返す', () => {
        // Then: EXPIRING_SOONの場合true
        expect(ExpiryStatus.FRESH.isExpiringSoon()).toBe(false)
        expect(ExpiryStatus.EXPIRING_SOON.isExpiringSoon()).toBe(true)
        expect(ExpiryStatus.EXPIRED.isExpiringSoon()).toBe(false)
      })
    })

    describe('isExpired', () => {
      it('EXPIREDステータスの場合はtrueを返す', () => {
        // Then: EXPIREDの場合true
        expect(ExpiryStatus.FRESH.isExpired()).toBe(false)
        expect(ExpiryStatus.EXPIRING_SOON.isExpired()).toBe(false)
        expect(ExpiryStatus.EXPIRED.isExpired()).toBe(true)
      })
    })

    describe('needsAttention', () => {
      it('EXPIRING_SOONまたはEXPIREDの場合はtrueを返す', () => {
        // Then: 注意が必要な状態の判定
        expect(ExpiryStatus.FRESH.needsAttention()).toBe(false)
        expect(ExpiryStatus.EXPIRING_SOON.needsAttention()).toBe(true)
        expect(ExpiryStatus.EXPIRED.needsAttention()).toBe(true)
      })
    })
  })

  describe('優先度', () => {
    describe('getPriority', () => {
      it('各ステータスの優先度を返す', () => {
        // Then: EXPIRED > EXPIRING_SOON > FRESH
        expect(ExpiryStatus.EXPIRED.getPriority()).toBe(3)
        expect(ExpiryStatus.EXPIRING_SOON.getPriority()).toBe(2)
        expect(ExpiryStatus.FRESH.getPriority()).toBe(1)
      })
    })

    describe('hasHigherPriorityThan', () => {
      it('優先度を比較できる', () => {
        // Then: 優先度の比較
        expect(ExpiryStatus.EXPIRED.hasHigherPriorityThan(ExpiryStatus.EXPIRING_SOON)).toBe(true)
        expect(ExpiryStatus.EXPIRED.hasHigherPriorityThan(ExpiryStatus.FRESH)).toBe(true)
        expect(ExpiryStatus.EXPIRING_SOON.hasHigherPriorityThan(ExpiryStatus.FRESH)).toBe(true)
        expect(ExpiryStatus.FRESH.hasHigherPriorityThan(ExpiryStatus.EXPIRED)).toBe(false)
      })
    })
  })

  describe('equals', () => {
    it('同じステータスの場合はtrueを返す', () => {
      // Given: 同じステータス
      const status1 = ExpiryStatus.from('FRESH')
      const status2 = ExpiryStatus.from('FRESH')

      // Then: 等価と判定
      expect(status1.equals(status2)).toBe(true)
      expect(ExpiryStatus.FRESH.equals(status1)).toBe(true)
    })

    it('異なるステータスの場合はfalseを返す', () => {
      // Then: 非等価と判定
      expect(ExpiryStatus.FRESH.equals(ExpiryStatus.EXPIRING_SOON)).toBe(false)
      expect(ExpiryStatus.EXPIRING_SOON.equals(ExpiryStatus.EXPIRED)).toBe(false)
    })
  })

  describe('toString', () => {
    it('ステータス文字列を返す', () => {
      // Then: getValue()と同じ値を返す
      expect(ExpiryStatus.FRESH.toString()).toBe('FRESH')
      expect(ExpiryStatus.EXPIRING_SOON.toString()).toBe('EXPIRING_SOON')
      expect(ExpiryStatus.EXPIRED.toString()).toBe('EXPIRED')
    })
  })
})
