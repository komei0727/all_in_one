import { describe, expect, it } from 'vitest'

import { CreateIngredientCommand } from '@/modules/ingredients/server/application/commands/create-ingredient.command'
import { StorageType } from '@/modules/ingredients/server/domain/value-objects'

describe('CreateIngredientCommand', () => {
  describe('constructor', () => {
    it('すべての必須項目とオプション項目を含むコマンドを作成できる', () => {
      // Arrange
      const command = new CreateIngredientCommand({
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: StorageType.REFRIGERATED,
          detail: '野菜室',
        },
        bestBeforeDate: '2024-12-31',
        expiryDate: '2025-01-05',
        purchaseDate: '2024-12-20',
        price: 300,
        memo: '新鮮なトマト',
      })

      // Assert
      expect(command.name).toBe('トマト')
      expect(command.categoryId).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(command.quantity.amount).toBe(3)
      expect(command.quantity.unitId).toBe('550e8400-e29b-41d4-a716-446655440001')
      expect(command.storageLocation.type).toBe(StorageType.REFRIGERATED)
      expect(command.storageLocation.detail).toBe('野菜室')
      expect(command.bestBeforeDate).toBe('2024-12-31')
      expect(command.expiryDate).toBe('2025-01-05')
      expect(command.purchaseDate).toBe('2024-12-20')
      expect(command.price).toBe(300)
      expect(command.memo).toBe('新鮮なトマト')
    })

    it('必須項目のみでコマンドを作成できる', () => {
      // Arrange
      const command = new CreateIngredientCommand({
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: StorageType.REFRIGERATED,
        },
        purchaseDate: '2024-12-20',
      })

      // Assert
      expect(command.name).toBe('トマト')
      expect(command.categoryId).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(command.quantity.amount).toBe(3)
      expect(command.quantity.unitId).toBe('550e8400-e29b-41d4-a716-446655440001')
      expect(command.storageLocation.type).toBe(StorageType.REFRIGERATED)
      expect(command.storageLocation.detail).toBeUndefined()
      expect(command.bestBeforeDate).toBeUndefined()
      expect(command.expiryDate).toBeUndefined()
      expect(command.purchaseDate).toBe('2024-12-20')
      expect(command.price).toBeUndefined()
      expect(command.memo).toBeUndefined()
    })
  })
})
