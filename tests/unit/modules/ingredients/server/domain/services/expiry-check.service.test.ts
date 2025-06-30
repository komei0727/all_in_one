import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect } from 'vitest'

import { IngredientExpiringSoon } from '@/modules/ingredients/server/domain/events'
import { ExpiryCheckService } from '@/modules/ingredients/server/domain/services/expiry-check.service'
import { ExpiryInfo } from '@/modules/ingredients/server/domain/value-objects'
import { IngredientBuilder } from '@tests/__fixtures__/builders'

describe('ExpiryCheckService', () => {
  const expiryCheckService = new ExpiryCheckService()

  describe('checkAndNotifyExpiringSoon', () => {
    it('期限切れ間近の食材に対してイベントを発行する', () => {
      // 3日後に期限切れになる食材を作成
      const ingredient = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            useByDate: null,
          })
        )
        .build()
      ingredient.markEventsAsCommitted()

      // Act: 期限切れ間近をチェック（7日以内）
      const result = expiryCheckService.checkAndNotifyExpiringSoon(ingredient, 7)

      // Assert: trueを返し、イベントが発行される
      expect(result).toBe(true)
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(IngredientExpiringSoon)
    })

    it('期限情報がない食材は対象外', () => {
      // 期限情報なしの食材
      const ingredient = new IngredientBuilder().withExpiryInfo(null).build()

      // Act
      const result = expiryCheckService.checkAndNotifyExpiringSoon(ingredient)

      // Assert
      expect(result).toBe(false)
    })

    it('既に期限切れの食材は対象外', () => {
      // 期限切れの食材
      const ingredient = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: faker.date.past(),
            useByDate: null,
          })
        )
        .build()

      // Act
      const result = expiryCheckService.checkAndNotifyExpiringSoon(ingredient)

      // Assert
      expect(result).toBe(false)
    })

    it('閾値より先の期限の食材は対象外', () => {
      // 10日後に期限切れになる食材
      const ingredient = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            useByDate: null,
          })
        )
        .build()

      // Act: 7日以内をチェック
      const result = expiryCheckService.checkAndNotifyExpiringSoon(ingredient, 7)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('checkMultipleIngredients', () => {
    it('複数の食材から期限切れ間近のものを抽出してイベントを発行', () => {
      // 様々な期限の食材を作成
      const expiringSoon1 = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            useByDate: null,
          })
        )
        .build()

      const expiringSoon2 = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            useByDate: null,
          })
        )
        .build()

      const notExpiring = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            useByDate: null,
          })
        )
        .build()

      const ingredients = [expiringSoon1, expiringSoon2, notExpiring]
      ingredients.forEach((i) => i.markEventsAsCommitted())

      // Act
      const result = expiryCheckService.checkMultipleIngredients(ingredients, 7)

      // Assert
      expect(result).toHaveLength(2)
      expect(result).toContain(expiringSoon1)
      expect(result).toContain(expiringSoon2)

      // イベントが発行されたことを確認
      expect(expiringSoon1.getUncommittedEvents()).toHaveLength(1)
      expect(expiringSoon2.getUncommittedEvents()).toHaveLength(1)
      expect(notExpiring.getUncommittedEvents()).toHaveLength(0)
    })
  })

  describe('filterExpiredIngredients', () => {
    it('期限切れの食材のみを抽出', () => {
      // 期限切れと期限内の食材を作成
      const expired1 = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: faker.date.past(),
            useByDate: null,
          })
        )
        .build()

      const expired2 = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: null,
            useByDate: faker.date.past(),
          })
        )
        .build()

      const valid = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: faker.date.future(),
            useByDate: null,
          })
        )
        .build()

      const ingredients = [expired1, valid, expired2]

      // Act
      const result = expiryCheckService.filterExpiredIngredients(ingredients)

      // Assert
      expect(result).toHaveLength(2)
      expect(result).toContain(expired1)
      expect(result).toContain(expired2)
    })
  })

  describe('filterExpiringSoonIngredients', () => {
    it('期限切れ間近の食材を抽出（イベント発行なし）', () => {
      // 様々な期限の食材を作成
      const expiringSoon = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            useByDate: null,
          })
        )
        .build()

      const notExpiring = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            useByDate: null,
          })
        )
        .build()

      const expired = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: faker.date.past(),
            useByDate: null,
          })
        )
        .build()

      const ingredients = [expiringSoon, notExpiring, expired]
      ingredients.forEach((i) => i.markEventsAsCommitted())

      // Act
      const result = expiryCheckService.filterExpiringSoonIngredients(ingredients, 7)

      // Assert
      expect(result).toHaveLength(1)
      expect(result).toContain(expiringSoon)

      // イベントが発行されないことを確認
      expect(expiringSoon.getUncommittedEvents()).toHaveLength(0)
    })
  })

  describe('sortByExpiryDate', () => {
    it('期限の近い順にソート', () => {
      // 様々な期限の食材を作成
      const ingredient1 = new IngredientBuilder()
        .withName('10日後')
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            useByDate: null,
          })
        )
        .build()

      const ingredient2 = new IngredientBuilder()
        .withName('3日後')
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            useByDate: null,
          })
        )
        .build()

      const ingredient3 = new IngredientBuilder().withName('期限なし').withExpiryInfo(null).build()

      const ingredients = [ingredient1, ingredient2, ingredient3]

      // Act
      const sorted = expiryCheckService.sortByExpiryDate(ingredients)

      // Assert
      expect(sorted[0].getName().getValue()).toBe('3日後')
      expect(sorted[1].getName().getValue()).toBe('10日後')
      expect(sorted[2].getName().getValue()).toBe('期限なし')
    })

    it('元の配列を変更しない', () => {
      // 食材リストを作成
      const ingredients = [
        new IngredientBuilder()
          .withExpiryInfo(
            new ExpiryInfo({
              bestBeforeDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
              useByDate: null,
            })
          )
          .build(),
        new IngredientBuilder()
          .withExpiryInfo(
            new ExpiryInfo({
              bestBeforeDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
              useByDate: null,
            })
          )
          .build(),
      ]
      const originalOrder = [...ingredients]

      // Act
      const sorted = expiryCheckService.sortByExpiryDate(ingredients)

      // Assert
      expect(ingredients).toEqual(originalOrder)
      expect(sorted).not.toBe(ingredients)
    })
  })

  // 既存のテスト（メソッド名を修正）
  describe('getExpiredIngredients → filterExpiredIngredients', () => {
    it('期限切れの食材のみを返す', () => {
      // Given: 期限切れと期限内の食材が混在
      const expiredIngredient1 = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: faker.date.past(),
            useByDate: null,
          })
        )
        .build()

      const expiredIngredient2 = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: null,
            useByDate: faker.date.past(),
          })
        )
        .build()

      const validIngredient = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: faker.date.future(),
            useByDate: null,
          })
        )
        .build()

      const noExpiryIngredient = new IngredientBuilder().withExpiryInfo(null).build()

      const ingredients = [
        expiredIngredient1,
        validIngredient,
        expiredIngredient2,
        noExpiryIngredient,
      ]

      // When: 期限切れ食材を取得
      const expired = expiryCheckService.filterExpiredIngredients(ingredients)

      // Then: 期限切れの2つの食材のみが返される
      expect(expired).toHaveLength(2)
      expect(expired).toContain(expiredIngredient1)
      expect(expired).toContain(expiredIngredient2)
    })

    it('削除済みの食材は除外される', () => {
      // Given: 削除済みの期限切れ食材
      const deletedExpiredIngredient = new IngredientBuilder()
        .withUserId('user-123')
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: faker.date.past(),
            useByDate: null,
          })
        )
        .build()
      deletedExpiredIngredient.delete('user-123')

      const activeExpiredIngredient = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: faker.date.past(),
            useByDate: null,
          })
        )
        .build()

      const ingredients = [deletedExpiredIngredient, activeExpiredIngredient]

      // When: 期限切れ食材を取得
      const expired = expiryCheckService.filterExpiredIngredients(ingredients)

      // Then: 削除済みでない食材のみが返される
      expect(expired).toHaveLength(1)
      expect(expired[0]).toBe(activeExpiredIngredient)
    })

    it('期限切れ食材がない場合は空配列を返す', () => {
      // Given: すべて期限内の食材
      const ingredients = [
        new IngredientBuilder()
          .withExpiryInfo(
            new ExpiryInfo({
              bestBeforeDate: faker.date.future(),
              useByDate: null,
            })
          )
          .build(),
        new IngredientBuilder().withExpiryInfo(null).build(),
      ]

      // When: 期限切れ食材を取得
      const expired = expiryCheckService.filterExpiredIngredients(ingredients)

      // Then: 空配列が返される
      expect(expired).toHaveLength(0)
    })
  })

  describe('getExpiringSoonIngredients → filterExpiringSoonIngredients', () => {
    it('指定日数以内に期限切れになる食材を返す', () => {
      // Given: 様々な期限の食材
      const expiringSoon1 = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3日後
            useByDate: null,
          })
        )
        .build()

      const expiringSoon2 = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6日後
            useByDate: null,
          })
        )
        .build()

      const notExpiringSoon = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10日後
            useByDate: null,
          })
        )
        .build()

      const alreadyExpired = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: faker.date.past(),
            useByDate: null,
          })
        )
        .build()

      const ingredients = [expiringSoon1, notExpiringSoon, expiringSoon2, alreadyExpired]

      // When: 7日以内に期限切れになる食材を取得
      const expiringSoon = expiryCheckService.filterExpiringSoonIngredients(ingredients, 7)

      // Then: 7日以内に期限切れになる食材（期限切れは含まない）が返される
      expect(expiringSoon).toHaveLength(2)
      expect(expiringSoon).toContain(expiringSoon1)
      expect(expiringSoon).toContain(expiringSoon2)
    })

    it('デフォルトは7日以内', () => {
      // Given: 8日後に期限切れになる食材
      const ingredient = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
            useByDate: null,
          })
        )
        .build()

      // When: 日数を指定せずに取得
      const expiringSoon = expiryCheckService.filterExpiringSoonIngredients([ingredient])

      // Then: デフォルトの7日以内では含まれない
      expect(expiringSoon).toHaveLength(0)
    })

    it('削除済みの食材は除外される', () => {
      // Given: 削除済みの期限間近食材
      const deletedIngredient = new IngredientBuilder()
        .withUserId('user-123')
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            useByDate: null,
          })
        )
        .build()
      deletedIngredient.delete('user-123')

      const activeIngredient = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            useByDate: null,
          })
        )
        .build()

      const ingredients = [deletedIngredient, activeIngredient]

      // When: 期限間近食材を取得
      const expiringSoon = expiryCheckService.filterExpiringSoonIngredients(ingredients)

      // Then: 削除済みでない食材のみが返される
      expect(expiringSoon).toHaveLength(1)
      expect(expiringSoon[0]).toBe(activeIngredient)
    })
  })

  describe('sortByExpiry → sortByExpiryDate', () => {
    it('期限の近い順にソートする', () => {
      // Given: 様々な期限の食材
      const ingredient1 = new IngredientBuilder()
        .withName('食材1')
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date('2024-01-10'),
            useByDate: null,
          })
        )
        .build()

      const ingredient2 = new IngredientBuilder()
        .withName('食材2')
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date('2024-01-05'),
            useByDate: null,
          })
        )
        .build()

      const ingredient3 = new IngredientBuilder()
        .withName('食材3')
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date('2024-01-15'),
            useByDate: null,
          })
        )
        .build()

      const ingredient4 = new IngredientBuilder().withName('食材4').withExpiryInfo(null).build()

      const ingredients = [ingredient1, ingredient2, ingredient3, ingredient4]

      // When: 期限でソート
      const sorted = expiryCheckService.sortByExpiryDate(ingredients)

      // Then: 期限の近い順に並ぶ（期限なしは最後）
      expect(sorted[0]).toBe(ingredient2) // 1/5
      expect(sorted[1]).toBe(ingredient1) // 1/10
      expect(sorted[2]).toBe(ingredient3) // 1/15
      expect(sorted[3]).toBe(ingredient4) // 期限なし
    })

    it('期限がない食材は最後に配置される', () => {
      // Given: 期限ありとなしの食材
      const withExpiry = new IngredientBuilder()
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: faker.date.future(),
            useByDate: null,
          })
        )
        .build()

      const withoutExpiry1 = new IngredientBuilder().withExpiryInfo(null).build()

      const withoutExpiry2 = new IngredientBuilder().withExpiryInfo(null).build()

      const ingredients = [withoutExpiry1, withExpiry, withoutExpiry2]

      // When: 期限でソート
      const sorted = expiryCheckService.sortByExpiryDate(ingredients)

      // Then: 期限ありが先頭、期限なしが最後
      expect(sorted[0]).toBe(withExpiry)
      expect(sorted.slice(1)).toContain(withoutExpiry1)
      expect(sorted.slice(1)).toContain(withoutExpiry2)
    })

    it('元の配列を変更しない', () => {
      // Given: 食材リスト
      const ingredients = [
        new IngredientBuilder()
          .withExpiryInfo(
            new ExpiryInfo({
              bestBeforeDate: new Date('2024-01-10'),
              useByDate: null,
            })
          )
          .build(),
        new IngredientBuilder()
          .withExpiryInfo(
            new ExpiryInfo({
              bestBeforeDate: new Date('2024-01-05'),
              useByDate: null,
            })
          )
          .build(),
      ]
      const originalOrder = [...ingredients]

      // When: 期限でソート
      const sorted = expiryCheckService.sortByExpiryDate(ingredients)

      // Then: 元の配列は変更されない
      expect(ingredients).toEqual(originalOrder)
      expect(sorted).not.toBe(ingredients)
    })
  })
})
