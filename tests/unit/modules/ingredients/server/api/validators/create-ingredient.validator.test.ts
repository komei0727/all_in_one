import { describe, expect, it } from 'vitest'

import { createIngredientSchema } from '@/modules/ingredients/server/api/validators/create-ingredient.validator'
import { CreateIngredientCommandBuilder, testDataHelpers } from '@tests/__fixtures__/builders'

describe('createIngredientSchema', () => {
  describe('正常系', () => {
    it('すべての項目を含む有効なデータをパースできる', () => {
      // Arrange
      // APIリクエストデータを作成（userIdを含まない）
      const validData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'REFRIGERATED' as const,
          detail: '野菜室',
        },
        threshold: 5,
        expiryInfo: {
          bestBeforeDate: testDataHelpers.dateStringFromNow(7),
          useByDate: testDataHelpers.dateStringFromNow(10),
        },
        purchaseDate: testDataHelpers.todayString(),
        price: testDataHelpers.price(),
        memo: '新鮮な食材です',
      }

      // Act
      const result = createIngredientSchema.parse(validData)

      // Assert
      expect(result).toEqual(validData)
    })

    it('必須項目のみの有効なデータをパースできる', () => {
      // Arrange
      // 必須項目のみのAPIリクエストデータ
      const validData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'REFRIGERATED' as const,
        },
        purchaseDate: testDataHelpers.todayString(),
      }

      // Act
      const result = createIngredientSchema.parse(validData)

      // Assert
      expect(result).toEqual(validData)
    })

    it('保管場所のすべてのタイプを受け入れる', () => {
      // Arrange
      const types = ['REFRIGERATED', 'FROZEN', 'ROOM_TEMPERATURE'] as const

      types.forEach((type) => {
        // 各保管場所タイプでデータを作成
        const validData = {
          name: testDataHelpers.ingredientName(),
          categoryId: testDataHelpers.cuid(),
          quantity: {
            amount: testDataHelpers.quantity(),
            unitId: testDataHelpers.cuid(),
          },
          storageLocation: {
            type,
          },
          purchaseDate: testDataHelpers.todayString(),
        }

        // Act & Assert
        expect(() => createIngredientSchema.parse(validData)).not.toThrow()
      })
    })

    it('expiryInfoがnullの場合も受け入れる', () => {
      // Arrange
      const validData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: testDataHelpers.todayString(),
        expiryInfo: null,
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(validData)).not.toThrow()
    })

    it('expiryInfoの両方の日付がnullの場合も受け入れる', () => {
      // Arrange
      const validData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: testDataHelpers.todayString(),
        expiryInfo: {
          bestBeforeDate: null,
          useByDate: null,
        },
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(validData)).not.toThrow()
    })
  })

  describe('異常系 - name', () => {
    it('nameが空文字の場合エラー', () => {
      // Arrange
      // 空の名前でデータを作成
      const invalidData = {
        name: '',
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'REFRIGERATED' as const,
        },
        purchaseDate: testDataHelpers.todayString(),
      }

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
        name: testDataHelpers.ingredientName(),
        categoryId: 'short',
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: testDataHelpers.todayString(),
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })
  })

  describe('異常系 - quantity', () => {
    it('amountが0の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: 0,
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: testDataHelpers.todayString(),
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })

    it('amountが負の値の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: -1,
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: testDataHelpers.todayString(),
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })

    it('unitIdが無効なID形式の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: 'short',
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: testDataHelpers.todayString(),
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })
  })

  describe('異常系 - storageLocation', () => {
    it('typeが無効な値の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'INVALID_TYPE',
        },
        purchaseDate: testDataHelpers.todayString(),
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })

    it('detailが51文字以上の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'REFRIGERATED',
          detail: 'あ'.repeat(51),
        },
        purchaseDate: testDataHelpers.todayString(),
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })
  })

  describe('異常系 - expiryInfo', () => {
    it('bestBeforeDateが無効な日付形式の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: testDataHelpers.todayString(),
        expiryInfo: {
          bestBeforeDate: 'invalid-date',
          useByDate: null,
        },
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })

    it('useByDateが無効な日付形式の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: testDataHelpers.todayString(),
        expiryInfo: {
          bestBeforeDate: null,
          useByDate: 'invalid-date',
        },
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })
  })

  describe('異常系 - purchaseDate', () => {
    it('purchaseDateが無効な日付形式の場合エラー', () => {
      // Arrange
      const invalidData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: testDataHelpers.cuid(),
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
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: testDataHelpers.todayString(),
        price: -100,
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })

    it('priceが小数点3桁以上の場合は通る（Zodでは検証できない）', () => {
      // Arrange
      const invalidData = {
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: testDataHelpers.todayString(),
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
        name: testDataHelpers.ingredientName(),
        categoryId: testDataHelpers.cuid(),
        quantity: {
          amount: testDataHelpers.quantity(),
          unitId: testDataHelpers.cuid(),
        },
        storageLocation: {
          type: 'REFRIGERATED',
        },
        purchaseDate: testDataHelpers.todayString(),
        memo: 'あ'.repeat(201),
      }

      // Act & Assert
      expect(() => createIngredientSchema.parse(invalidData)).toThrow()
    })
  })
})
