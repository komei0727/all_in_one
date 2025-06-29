import { faker } from '@faker-js/faker/locale/ja'
import { describe, it, expect } from 'vitest'

import { ExpiryCheckService } from '@/modules/ingredients/server/domain/services/expiry-check.service'
import { ExpiryInfo } from '@/modules/ingredients/server/domain/value-objects'

import { IngredientBuilder } from '../../../../../../__fixtures__/builders'

describe('ExpiryCheckService', () => {
  const expiryCheckService = new ExpiryCheckService()

  describe('getExpiredIngredients', () => {
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
      const expired = expiryCheckService.getExpiredIngredients(ingredients)

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
      const expired = expiryCheckService.getExpiredIngredients(ingredients)

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
      const expired = expiryCheckService.getExpiredIngredients(ingredients)

      // Then: 空配列が返される
      expect(expired).toHaveLength(0)
    })
  })

  describe('getExpiringSoonIngredients', () => {
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
      const expiringSoon = expiryCheckService.getExpiringSoonIngredients(ingredients, 7)

      // Then: 7日以内に期限切れになる食材（期限切れ含む）が返される
      expect(expiringSoon).toHaveLength(3)
      expect(expiringSoon).toContain(expiringSoon1)
      expect(expiringSoon).toContain(expiringSoon2)
      expect(expiringSoon).toContain(alreadyExpired)
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
      const expiringSoon = expiryCheckService.getExpiringSoonIngredients([ingredient])

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
      const expiringSoon = expiryCheckService.getExpiringSoonIngredients(ingredients)

      // Then: 削除済みでない食材のみが返される
      expect(expiringSoon).toHaveLength(1)
      expect(expiringSoon[0]).toBe(activeIngredient)
    })
  })

  describe('sortByExpiry', () => {
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
      const sorted = expiryCheckService.sortByExpiry(ingredients)

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
      const sorted = expiryCheckService.sortByExpiry(ingredients)

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
      const sorted = expiryCheckService.sortByExpiry(ingredients)

      // Then: 元の配列は変更されない
      expect(ingredients).toEqual(originalOrder)
      expect(sorted).not.toBe(ingredients)
    })
  })
})
