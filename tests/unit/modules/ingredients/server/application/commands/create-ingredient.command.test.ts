import { describe, expect, it } from 'vitest'

import { StorageType } from '@/modules/ingredients/server/domain/value-objects'

import { CreateIngredientCommandBuilder } from '../../../../../../__fixtures__/builders'

describe('CreateIngredientCommand', () => {
  describe('constructor', () => {
    it('すべての必須項目とオプション項目を含むコマンドを作成できる', () => {
      // Arrange & Act
      const command = new CreateIngredientCommandBuilder().withFullData().build()

      // Assert
      expect(command.name).toBeTruthy()
      expect(command.categoryId).toBeTruthy()
      expect(command.quantity.amount).toBeGreaterThan(0)
      expect(command.quantity.unitId).toBeTruthy()
      expect(command.storageLocation.type).toBe(StorageType.REFRIGERATED)
      expect(command.storageLocation.detail).toBe('野菜室')
      expect(command.bestBeforeDate).toBeTruthy()
      expect(command.expiryDate).toBeTruthy()
      expect(command.purchaseDate).toBeTruthy()
      expect(command.price).toBeGreaterThan(0)
      expect(command.memo).toBeTruthy()
    })

    it('必須項目のみでコマンドを作成できる', () => {
      // Arrange & Act
      const command = new CreateIngredientCommandBuilder().build()

      // Assert
      expect(command.name).toBeTruthy()
      expect(command.categoryId).toBeTruthy()
      expect(command.quantity.amount).toBeGreaterThan(0)
      expect(command.quantity.unitId).toBeTruthy()
      expect(command.storageLocation.type).toBe(StorageType.REFRIGERATED)
      expect(command.storageLocation.detail).toBeUndefined()
      expect(command.bestBeforeDate).toBeUndefined()
      expect(command.expiryDate).toBeUndefined()
      expect(command.purchaseDate).toBeTruthy()
      expect(command.price).toBeUndefined()
      expect(command.memo).toBeUndefined()
    })
  })
})
