import { describe, it, expect, beforeEach } from 'vitest'
import { ExpiringSoonSpecification } from '@/modules/ingredients/server/domain/specifications/expiring-soon.specification'
import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import { IngredientBuilder } from '../../../../../../__fixtures__/builders'

describe('ExpiringSoonSpecification', () => {
  let builder: IngredientBuilder

  beforeEach(() => {
    builder = new IngredientBuilder()
  })

  describe('コンストラクタ', () => {
    it('正の日数で作成できる', () => {
      // 正常な日数で仕様を作成できることを確認
      const spec = new ExpiringSoonSpecification(7)
      expect(spec).toBeInstanceOf(ExpiringSoonSpecification)
    })

    it('0日で作成できる', () => {
      // 0日（今日期限）で仕様を作成できることを確認
      const spec = new ExpiringSoonSpecification(0)
      expect(spec).toBeInstanceOf(ExpiringSoonSpecification)
    })

    it('負の日数で作成しようとするとエラーになる', () => {
      // 負の日数は不正な値としてエラーになることを確認
      expect(() => new ExpiringSoonSpecification(-1)).toThrow('Days must be non-negative')
    })
  })

  describe('期限切れ判定', () => {
    it('期限切れ間近の食材がtrueを返す', () => {
      // 指定日数以内に期限が切れる食材を正しく判定
      const spec = new ExpiringSoonSpecification(7)

      // 今日から5日後に期限切れ
      const expiringIn5Days = builder
        .withExpiryInfo({
          bestBeforeDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          useByDate: null,
        })
        .build()

      expect(spec.isSatisfiedBy(expiringIn5Days)).toBe(true)
    })

    it('期限切れまでの日数が閾値と同じ場合はtrueを返す', () => {
      // 境界値のテスト：ちょうど指定日数の場合
      const spec = new ExpiringSoonSpecification(7)

      // 今日から7日後に期限切れ（境界値）
      const expiringIn7Days = builder
        .withExpiryInfo({
          bestBeforeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          useByDate: null,
        })
        .build()

      expect(spec.isSatisfiedBy(expiringIn7Days)).toBe(true)
    })

    it('期限切れまでの日数が閾値より多い場合はfalseを返す', () => {
      // 指定日数より後に期限が切れる食材は対象外
      const spec = new ExpiringSoonSpecification(7)

      // 今日から10日後に期限切れ
      const expiringIn10Days = builder
        .withExpiryInfo({
          bestBeforeDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          useByDate: null,
        })
        .build()

      expect(spec.isSatisfiedBy(expiringIn10Days)).toBe(false)
    })

    it('すでに期限切れの食材はtrueを返す', () => {
      // 過去の日付（すでに期限切れ）も期限切れ間近として扱う
      const spec = new ExpiringSoonSpecification(7)

      // 昨日期限切れ
      const expiredYesterday = builder
        .withExpiryInfo({
          bestBeforeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          useByDate: null,
        })
        .build()

      expect(spec.isSatisfiedBy(expiredYesterday)).toBe(true)
    })

    it('期限情報がない食材はfalseを返す', () => {
      // 期限情報がnullの場合は期限切れ間近ではない
      const spec = new ExpiringSoonSpecification(7)

      const noExpiryInfo = builder.withExpiryInfo(null).build()

      expect(spec.isSatisfiedBy(noExpiryInfo)).toBe(false)
    })

    it('0日指定で今日期限の食材がtrueを返す', () => {
      // 0日指定は「今日期限切れ」を意味する
      const spec = new ExpiringSoonSpecification(0)

      // 今日の23:59:59に期限切れ
      const today = new Date()
      today.setHours(23, 59, 59, 999)

      const expiringToday = builder
        .withExpiryInfo({
          bestBeforeDate: today,
          useByDate: null,
        })
        .build()

      expect(spec.isSatisfiedBy(expiringToday)).toBe(true)
    })

    it('0日指定で明日期限の食材はfalseを返す', () => {
      // 0日指定で明日期限は対象外
      const spec = new ExpiringSoonSpecification(0)

      // 明日の00:00:00に期限切れ
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const expiringTomorrow = builder
        .withExpiryInfo({
          bestBeforeDate: tomorrow,
          useByDate: null,
        })
        .build()

      expect(spec.isSatisfiedBy(expiringTomorrow)).toBe(false)
    })
  })

  describe('時間を考慮した判定', () => {
    it('日付の時間部分を考慮して正確に判定する', () => {
      // 時間単位での境界値テスト
      const spec = new ExpiringSoonSpecification(1)

      // 現在時刻から正確に24時間後
      const exactly24HoursLater = new Date(Date.now() + 24 * 60 * 60 * 1000)

      const ingredient = builder
        .withExpiryInfo({
          bestBeforeDate: exactly24HoursLater,
          useByDate: null,
        })
        .build()

      // 24時間後は「1日以内」に含まれる
      expect(spec.isSatisfiedBy(ingredient)).toBe(true)
    })
  })
})
