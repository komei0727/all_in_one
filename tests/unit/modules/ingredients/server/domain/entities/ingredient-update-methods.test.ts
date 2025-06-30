import { describe, it, expect, beforeEach } from 'vitest'

import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import { type IngredientUpdated } from '@/modules/ingredients/server/domain/events'
import { BusinessRuleException } from '@/modules/ingredients/server/domain/exceptions'
import {
  IngredientId,
  IngredientName,
  CategoryId,
  Price,
  ExpiryInfo,
  IngredientStock,
  UnitId,
  StorageLocation,
  StorageType,
} from '@/modules/ingredients/server/domain/value-objects'

describe('Ingredient - Update Methods', () => {
  let ingredient: Ingredient

  beforeEach(() => {
    // テスト用の食材を作成
    ingredient = new Ingredient({
      id: IngredientId.generate(),
      userId: 'user-123',
      name: new IngredientName('トマト'),
      categoryId: new CategoryId('cat_xxxxxxxxxxxxxxxxxxxxxxxx'),
      purchaseDate: new Date('2024-01-15'),
      ingredientStock: new IngredientStock({
        quantity: 5,
        unitId: new UnitId('unt_xxxxxxxxxxxxxxxxxxxxxxxx'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
        threshold: 2,
      }),
      price: new Price(150),
      expiryInfo: new ExpiryInfo({
        bestBeforeDate: new Date('2024-01-25'),
        useByDate: null,
      }),
    })
  })

  describe('updatePrice', () => {
    it('価格を更新できる', () => {
      // Given: 新しい価格
      const newPrice = new Price(200)

      // When: 価格を更新
      ingredient.updatePrice(newPrice)

      // Then: 価格が更新される
      expect(ingredient.getPrice()?.getValue()).toBe(200)
    })

    it('価格をnullに更新できる', () => {
      // When: 価格をnullに更新
      ingredient.updatePrice(null)

      // Then: 価格がnullになる
      expect(ingredient.getPrice()).toBeNull()
    })

    it('価格更新時にIngredientUpdatedイベントが発行される', () => {
      // Given: 新しい価格
      const newPrice = new Price(200)

      // When: 価格を更新
      ingredient.updatePrice(newPrice, 'user-123')

      // Then: イベントが発行される
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(1)

      const event = events[0] as IngredientUpdated
      expect(event.constructor.name).toBe('IngredientUpdated')
      expect(event.changes).toEqual({
        price: { from: 150, to: 200 },
      })
    })

    it('削除済みの食材の価格は更新できない', () => {
      // Given: 削除済みの食材
      ingredient.delete('user-123')

      // When/Then: 更新が拒否される
      expect(() => ingredient.updatePrice(new Price(200))).toThrow(BusinessRuleException)
      expect(() => ingredient.updatePrice(new Price(200))).toThrow('削除済みの食材は更新できません')
    })

    it('他のユーザーの食材の価格は更新できない', () => {
      // When/Then: 他のユーザーによる更新が拒否される
      expect(() => ingredient.updatePrice(new Price(200), 'other-user')).toThrow(
        BusinessRuleException
      )
      expect(() => ingredient.updatePrice(new Price(200), 'other-user')).toThrow(
        '他のユーザーの食材は更新できません'
      )
    })
  })

  describe('updateExpiryInfo', () => {
    it('期限情報を更新できる', () => {
      // Given: 新しい期限情報
      const newExpiryInfo = new ExpiryInfo({
        bestBeforeDate: new Date('2024-02-01'),
        useByDate: new Date('2024-01-30'),
      })

      // When: 期限情報を更新
      ingredient.updateExpiryInfo(newExpiryInfo)

      // Then: 期限情報が更新される
      expect(ingredient.getExpiryInfo()?.getBestBeforeDate()).toEqual(new Date('2024-02-01'))
      expect(ingredient.getExpiryInfo()?.getUseByDate()).toEqual(new Date('2024-01-30'))
    })

    it('期限情報をnullに更新できる', () => {
      // When: 期限情報をnullに更新
      ingredient.updateExpiryInfo(null)

      // Then: 期限情報がnullになる
      expect(ingredient.getExpiryInfo()).toBeNull()
    })

    it('期限情報更新時にIngredientUpdatedイベントが発行される', () => {
      // Given: 新しい期限情報
      const newExpiryInfo = new ExpiryInfo({
        bestBeforeDate: new Date('2024-02-01'),
        useByDate: new Date('2024-01-30'),
      })

      // When: 期限情報を更新
      ingredient.updateExpiryInfo(newExpiryInfo, 'user-123')

      // Then: イベントが発行される
      const events = ingredient.getUncommittedEvents()
      expect(events).toHaveLength(1)

      const event = events[0] as IngredientUpdated
      expect(event.constructor.name).toBe('IngredientUpdated')
      expect(event.changes).toEqual({
        expiryInfo: {
          from: {
            bestBeforeDate: new Date('2024-01-25').toISOString(),
            useByDate: null,
          },
          to: {
            bestBeforeDate: new Date('2024-02-01').toISOString(),
            useByDate: new Date('2024-01-30').toISOString(),
          },
        },
      })
    })

    it('削除済みの食材の期限情報は更新できない', () => {
      // Given: 削除済みの食材
      ingredient.delete('user-123')

      // When/Then: 更新が拒否される
      const newExpiryInfo = new ExpiryInfo({
        bestBeforeDate: new Date('2024-01-30'),
        useByDate: null,
      })
      expect(() => ingredient.updateExpiryInfo(newExpiryInfo)).toThrow(BusinessRuleException)
      expect(() => ingredient.updateExpiryInfo(newExpiryInfo)).toThrow(
        '削除済みの食材は更新できません'
      )
    })

    it('他のユーザーの食材の期限情報は更新できない', () => {
      // Given: 新しい期限情報
      const newExpiryInfo = new ExpiryInfo({
        bestBeforeDate: new Date('2024-01-30'),
        useByDate: null,
      })

      // When/Then: 他のユーザーによる更新が拒否される
      expect(() => ingredient.updateExpiryInfo(newExpiryInfo, 'other-user')).toThrow(
        BusinessRuleException
      )
      expect(() => ingredient.updateExpiryInfo(newExpiryInfo, 'other-user')).toThrow(
        '他のユーザーの食材は更新できません'
      )
    })
  })
})
