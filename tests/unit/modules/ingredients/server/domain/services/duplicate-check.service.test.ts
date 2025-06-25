import { describe, it, expect } from 'vitest'
import { faker } from '@faker-js/faker/locale/ja'

import { DuplicateCheckService } from '@/modules/ingredients/server/domain/services/duplicate-check.service'
import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import {
  IngredientName,
  StorageLocation,
  StorageType,
  ExpiryInfo,
} from '@/modules/ingredients/server/domain/value-objects'

import { IngredientBuilder } from '../../../../../../__fixtures__/builders'

describe('DuplicateCheckService', () => {
  const duplicateCheckService = new DuplicateCheckService()

  describe('isDuplicate', () => {
    it('同じユーザー、名前、期限、保存場所の場合は重複と判定する', () => {
      // Given: 同じ属性を持つ2つの食材
      const userId = 'user-123'
      const name = new IngredientName('トマト')
      const expiryInfo = new ExpiryInfo({
        bestBeforeDate: faker.date.future(),
        useByDate: null,
      })
      const storageLocation = new StorageLocation(StorageType.REFRIGERATED, '野菜室')

      const existingIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withName(name)
        .withExpiryInfo(expiryInfo)
        .withIngredientStock({
          quantity: 5,
          unitId: { getValue: () => 'unit1' },
          storageLocation,
          threshold: null,
        })
        .build()

      const newIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withName(name)
        .withExpiryInfo(expiryInfo)
        .withIngredientStock({
          quantity: 3,
          unitId: { getValue: () => 'unit1' },
          storageLocation,
          threshold: null,
        })
        .build()

      // When: 重複チェック
      const result = duplicateCheckService.isDuplicate(newIngredient, [existingIngredient])

      // Then: 重複と判定される
      expect(result).toBe(true)
    })

    it('異なるユーザーの場合は重複と判定しない', () => {
      // Given: 異なるユーザーの食材
      const name = new IngredientName('トマト')
      const expiryInfo = new ExpiryInfo({
        bestBeforeDate: faker.date.future(),
        useByDate: null,
      })
      const storageLocation = new StorageLocation(StorageType.REFRIGERATED)

      const existingIngredient = new IngredientBuilder()
        .withUserId('user-123')
        .withName(name)
        .withExpiryInfo(expiryInfo)
        .withIngredientStock({
          quantity: 5,
          unitId: { getValue: () => 'unit1' },
          storageLocation,
          threshold: null,
        })
        .build()

      const newIngredient = new IngredientBuilder()
        .withUserId('user-456')
        .withName(name)
        .withExpiryInfo(expiryInfo)
        .withIngredientStock({
          quantity: 3,
          unitId: { getValue: () => 'unit1' },
          storageLocation,
          threshold: null,
        })
        .build()

      // When: 重複チェック
      const result = duplicateCheckService.isDuplicate(newIngredient, [existingIngredient])

      // Then: 重複と判定されない
      expect(result).toBe(false)
    })

    it('異なる名前の場合は重複と判定しない', () => {
      // Given: 異なる名前の食材
      const userId = 'user-123'
      const expiryInfo = new ExpiryInfo({
        bestBeforeDate: faker.date.future(),
        useByDate: null,
      })
      const storageLocation = new StorageLocation(StorageType.REFRIGERATED)

      const existingIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withName('トマト')
        .withExpiryInfo(expiryInfo)
        .withIngredientStock({
          quantity: 5,
          unitId: { getValue: () => 'unit1' },
          storageLocation,
          threshold: null,
        })
        .build()

      const newIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withName('キャベツ')
        .withExpiryInfo(expiryInfo)
        .withIngredientStock({
          quantity: 3,
          unitId: { getValue: () => 'unit1' },
          storageLocation,
          threshold: null,
        })
        .build()

      // When: 重複チェック
      const result = duplicateCheckService.isDuplicate(newIngredient, [existingIngredient])

      // Then: 重複と判定されない
      expect(result).toBe(false)
    })

    it('異なる期限の場合は重複と判定しない', () => {
      // Given: 異なる期限の食材
      const userId = 'user-123'
      const name = new IngredientName('トマト')
      const storageLocation = new StorageLocation(StorageType.REFRIGERATED)

      const existingIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withName(name)
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date('2024-01-01'),
            useByDate: null,
          })
        )
        .withIngredientStock({
          quantity: 5,
          unitId: { getValue: () => 'unit1' },
          storageLocation,
          threshold: null,
        })
        .build()

      const newIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withName(name)
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: new Date('2024-02-01'),
            useByDate: null,
          })
        )
        .withIngredientStock({
          quantity: 3,
          unitId: { getValue: () => 'unit1' },
          storageLocation,
          threshold: null,
        })
        .build()

      // When: 重複チェック
      const result = duplicateCheckService.isDuplicate(newIngredient, [existingIngredient])

      // Then: 重複と判定されない
      expect(result).toBe(false)
    })

    it('異なる保存場所の場合は重複と判定しない', () => {
      // Given: 異なる保存場所の食材
      const userId = 'user-123'
      const name = new IngredientName('トマト')
      const expiryInfo = new ExpiryInfo({
        bestBeforeDate: faker.date.future(),
        useByDate: null,
      })

      const existingIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withName(name)
        .withExpiryInfo(expiryInfo)
        .withIngredientStock({
          quantity: 5,
          unitId: { getValue: () => 'unit1' },
          storageLocation: new StorageLocation(StorageType.REFRIGERATED),
          threshold: null,
        })
        .build()

      const newIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withName(name)
        .withExpiryInfo(expiryInfo)
        .withIngredientStock({
          quantity: 3,
          unitId: { getValue: () => 'unit1' },
          storageLocation: new StorageLocation(StorageType.FROZEN),
          threshold: null,
        })
        .build()

      // When: 重複チェック
      const result = duplicateCheckService.isDuplicate(newIngredient, [existingIngredient])

      // Then: 重複と判定されない
      expect(result).toBe(false)
    })

    it('期限情報がnullの場合も正しく比較する', () => {
      // Given: 期限情報がnullの食材
      const userId = 'user-123'
      const name = new IngredientName('塩')
      const storageLocation = new StorageLocation(StorageType.ROOM_TEMPERATURE)

      const existingIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withName(name)
        .withExpiryInfo(null)
        .withIngredientStock({
          quantity: 500,
          unitId: { getValue: () => 'unit1' },
          storageLocation,
          threshold: null,
        })
        .build()

      const newIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withName(name)
        .withExpiryInfo(null)
        .withIngredientStock({
          quantity: 300,
          unitId: { getValue: () => 'unit1' },
          storageLocation,
          threshold: null,
        })
        .build()

      // When: 重複チェック
      const result = duplicateCheckService.isDuplicate(newIngredient, [existingIngredient])

      // Then: 重複と判定される
      expect(result).toBe(true)
    })

    it('削除済みの食材は重複判定から除外される', () => {
      // Given: 削除済みの食材
      const userId = 'user-123'
      const name = new IngredientName('トマト')
      const expiryInfo = new ExpiryInfo({
        bestBeforeDate: faker.date.future(),
        useByDate: null,
      })
      const storageLocation = new StorageLocation(StorageType.REFRIGERATED)

      const existingIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withName(name)
        .withExpiryInfo(expiryInfo)
        .withIngredientStock({
          quantity: 5,
          unitId: { getValue: () => 'unit1' },
          storageLocation,
          threshold: null,
        })
        .build()

      // 削除済みにする
      existingIngredient.delete(userId)

      const newIngredient = new IngredientBuilder()
        .withUserId(userId)
        .withName(name)
        .withExpiryInfo(expiryInfo)
        .withIngredientStock({
          quantity: 3,
          unitId: { getValue: () => 'unit1' },
          storageLocation,
          threshold: null,
        })
        .build()

      // When: 重複チェック
      const result = duplicateCheckService.isDuplicate(newIngredient, [existingIngredient])

      // Then: 重複と判定されない（削除済みなので）
      expect(result).toBe(false)
    })
  })

  describe('findDuplicates', () => {
    it('重複する食材のリストを返す', () => {
      // Given: 複数の食材（一部重複）
      const userId = 'user-123'
      const tomatoName = new IngredientName('トマト')
      const cabbageName = new IngredientName('キャベツ')
      const expiryInfo = new ExpiryInfo({
        bestBeforeDate: faker.date.future(),
        useByDate: null,
      })
      const refrigeratedLocation = new StorageLocation(StorageType.REFRIGERATED)

      const ingredient1 = new IngredientBuilder()
        .withUserId(userId)
        .withName(tomatoName)
        .withExpiryInfo(expiryInfo)
        .withIngredientStock({
          quantity: 5,
          unitId: { getValue: () => 'unit1' },
          storageLocation: refrigeratedLocation,
          threshold: null,
        })
        .build()

      const ingredient2 = new IngredientBuilder()
        .withUserId(userId)
        .withName(tomatoName)
        .withExpiryInfo(expiryInfo)
        .withIngredientStock({
          quantity: 3,
          unitId: { getValue: () => 'unit1' },
          storageLocation: refrigeratedLocation,
          threshold: null,
        })
        .build()

      const ingredient3 = new IngredientBuilder()
        .withUserId(userId)
        .withName(cabbageName)
        .withExpiryInfo(expiryInfo)
        .withIngredientStock({
          quantity: 1,
          unitId: { getValue: () => 'unit1' },
          storageLocation: refrigeratedLocation,
          threshold: null,
        })
        .build()

      const existingIngredients = [ingredient1, ingredient3]

      // When: 重複する食材を検索
      const duplicates = duplicateCheckService.findDuplicates(ingredient2, existingIngredients)

      // Then: 重複する食材1つが返される
      expect(duplicates).toHaveLength(1)
      expect(duplicates[0]).toBe(ingredient1)
    })

    it('重複がない場合は空配列を返す', () => {
      // Given: 重複しない食材
      const userId = 'user-123'
      const existingIngredients = [
        new IngredientBuilder().withUserId(userId).withName('トマト').build(),
        new IngredientBuilder().withUserId(userId).withName('キャベツ').build(),
      ]

      const newIngredient = new IngredientBuilder().withUserId(userId).withName('にんじん').build()

      // When: 重複する食材を検索
      const duplicates = duplicateCheckService.findDuplicates(newIngredient, existingIngredients)

      // Then: 空配列が返される
      expect(duplicates).toHaveLength(0)
    })
  })
})
