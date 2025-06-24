import { describe, expect, it } from 'vitest'

import { createIngredientSchema } from '@/modules/ingredients/server/api/validators/create-ingredient.validator'

import { CreateIngredientCommandBuilder } from '../../../../../../__fixtures__/builders'

describe('createIngredientSchema', () => {
  describe('正常系', () => {
    it('すべての項目を含む有効なデータをパースできる', () => {
      // Arrange
      // ビルダーを使用して完全なデータを作成
      const validData = new CreateIngredientCommandBuilder().withFullData().build()

      // Act
      const result = createIngredientSchema.parse(validData)

      // Assert
      expect(result).toEqual(validData)
    })

    it('必須項目のみの有効なデータをパースできる', () => {
      // Arrange
      // ビルダーを使用して必須項目のみのデータを作成
      const validData = new CreateIngredientCommandBuilder().build()

      // Act
      const result = createIngredientSchema.parse(validData)

      // Assert
      expect(result).toEqual(validData)
    })

    it('保管場所のすべてのタイプを受け入れる', () => {
      // Arrange
      const types = ['REFRIGERATED', 'FROZEN', 'ROOM_TEMPERATURE']

      types.forEach((type) => {
        // 各保管場所タイプでコマンドを作成
        const validData = new CreateIngredientCommandBuilder().withStorageLocation({ type }).build()

        // Act & Assert
        expect(() => createIngredientSchema.parse(validData)).not.toThrow()
      })
    })
  })

  describe('異常系 - name', () => {
    it('nameが空文字の場合エラー', () => {
      // Arrange
      // 空の名前でコマンドを作成
      const invalidData = new CreateIngredientCommandBuilder().withName('').build()

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })

    it('nameが51文字以上の場合エラー', () => {
      // Arrange
      // 51文字の名前でコマンドを作成
      const invalidData = new CreateIngredientCommandBuilder().withName('あ'.repeat(51)).build()

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })
  })

  describe('異常系 - categoryId', () => {
    it('categoryIdが無効なID形式の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: 'トマト',
        categoryId: 'short',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: '2024-12-20',
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })
  })

  describe('異常系 - quantity', () => {
    it('amountが0の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 0,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: '2024-12-20',
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })

    it('amountが負の値の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: -1,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: '2024-12-20',
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })

    it('unitIdが無効なID形式の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: 'short',
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: '2024-12-20',
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })
  })

  describe('異常系 - storageLocation', () => {
    it('typeが無効な値の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: 'INVALID_TYPE',
        },
        purchaseDate: '2024-12-20',
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })

    it('detailが51文字以上の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: 'REFRIGERATED',
          detail: 'あ'.repeat(51),
        },
        purchaseDate: '2024-12-20',
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })
  })

  describe('異常系 - 日付', () => {
    it('bestBeforeDateが無効な日付形式の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: '2024-12-20',
        bestBeforeDate: 'invalid-date',
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })

    it('purchaseDateが無効な日付形式の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: 'invalid-date',
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })
  })

  describe('異常系 - price', () => {
    it('priceが負の値の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: '2024-12-20',
        price: -100,
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })

    it('priceが小数点3桁以上の場合は通る（Zodでは検証できない）', () => {
      // Arrange
      const invalidData = {
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: '2024-12-20',
        price: 100.555, // 小数点3桁
      }

      // Act & Assert
      // Zodのnumber型では小数点の桁数を検証できないため、
      // このテストは通ってしまう（ドメイン層で検証される）
      expect(() => createIngredientSchema.parse(invalidData)).not.toThrow()
    })
  })

  describe('異常系 - memo', () => {
    it('memoが201文字以上の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: 'トマト',
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: {
          amount: 3,
          unitId: '550e8400-e29b-41d4-a716-446655440001',
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: '2024-12-20',
        memo: 'あ'.repeat(201),
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })
  })
})
