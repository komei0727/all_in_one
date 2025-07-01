import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { CheckedItemDto } from '@/modules/ingredients/server/application/dtos/checked-item.dto'

describe('CheckedItemDto', () => {
  describe('constructor', () => {
    it('すべてのプロパティを正しく設定できる', () => {
      // Arrange
      const ingredientId = faker.string.uuid()
      const ingredientName = faker.commerce.productName()
      const categoryId = faker.string.uuid()
      const categoryName = faker.commerce.department()
      const stockStatus = 'LOW_STOCK'
      const expiryStatus = 'EXPIRING_SOON'
      const currentQuantity = {
        amount: faker.number.int({ min: 1, max: 100 }),
        unit: {
          id: faker.string.uuid(),
          name: '個',
          symbol: '個',
        },
      }
      const threshold = faker.number.int({ min: 1, max: 10 })
      const checkedAt = faker.date.recent().toISOString()

      // Act
      const dto = new CheckedItemDto(
        ingredientId,
        ingredientName,
        categoryId,
        categoryName,
        stockStatus,
        expiryStatus,
        currentQuantity,
        threshold,
        checkedAt
      )

      // Assert
      expect(dto.ingredientId).toBe(ingredientId)
      expect(dto.ingredientName).toBe(ingredientName)
      expect(dto.categoryId).toBe(categoryId)
      expect(dto.categoryName).toBe(categoryName)
      expect(dto.stockStatus).toBe(stockStatus)
      expect(dto.expiryStatus).toBe(expiryStatus)
      expect(dto.currentQuantity).toEqual(currentQuantity)
      expect(dto.threshold).toBe(threshold)
      expect(dto.checkedAt).toBe(checkedAt)
    })

    it('オプショナルなプロパティをnullで設定できる', () => {
      // Arrange
      const ingredientId = faker.string.uuid()
      const ingredientName = faker.commerce.productName()
      const categoryId = faker.string.uuid()
      const categoryName = faker.commerce.department()
      const stockStatus = 'IN_STOCK'
      const currentQuantity = {
        amount: faker.number.int({ min: 1, max: 100 }),
        unit: {
          id: faker.string.uuid(),
          name: 'g',
          symbol: 'g',
        },
      }
      const checkedAt = faker.date.recent().toISOString()

      // Act
      const dto = new CheckedItemDto(
        ingredientId,
        ingredientName,
        categoryId,
        categoryName,
        stockStatus,
        null, // expiryStatus
        currentQuantity,
        null, // threshold
        checkedAt
      )

      // Assert
      expect(dto.ingredientId).toBe(ingredientId)
      expect(dto.ingredientName).toBe(ingredientName)
      expect(dto.categoryId).toBe(categoryId)
      expect(dto.categoryName).toBe(categoryName)
      expect(dto.stockStatus).toBe(stockStatus)
      expect(dto.expiryStatus).toBeNull()
      expect(dto.currentQuantity).toEqual(currentQuantity)
      expect(dto.threshold).toBeNull()
      expect(dto.checkedAt).toBe(checkedAt)
    })
  })

  describe('toJSON', () => {
    it('DTOをJSON形式に変換できる', () => {
      // Arrange
      const ingredientId = faker.string.uuid()
      const ingredientName = faker.commerce.productName()
      const categoryId = faker.string.uuid()
      const categoryName = faker.commerce.department()
      const stockStatus = 'OUT_OF_STOCK'
      const expiryStatus = 'EXPIRED'
      const currentQuantity = {
        amount: 0,
        unit: {
          id: faker.string.uuid(),
          name: 'ml',
          symbol: 'ml',
        },
      }
      const threshold = faker.number.int({ min: 100, max: 500 })
      const checkedAt = faker.date.recent().toISOString()

      const dto = new CheckedItemDto(
        ingredientId,
        ingredientName,
        categoryId,
        categoryName,
        stockStatus,
        expiryStatus,
        currentQuantity,
        threshold,
        checkedAt
      )

      // Act
      const json = dto.toJSON()

      // Assert
      expect(json).toEqual({
        ingredientId,
        ingredientName,
        categoryId,
        categoryName,
        stockStatus,
        expiryStatus,
        currentQuantity,
        threshold,
        checkedAt,
      })
    })

    it('nullプロパティを含むDTOを正しくJSON変換できる', () => {
      // Arrange
      const ingredientId = faker.string.uuid()
      const ingredientName = faker.commerce.productName()
      const categoryId = faker.string.uuid()
      const categoryName = faker.commerce.department()
      const stockStatus = 'IN_STOCK'
      const currentQuantity = {
        amount: faker.number.int({ min: 1, max: 100 }),
        unit: {
          id: faker.string.uuid(),
          name: '本',
          symbol: '本',
        },
      }
      const checkedAt = faker.date.recent().toISOString()

      const dto = new CheckedItemDto(
        ingredientId,
        ingredientName,
        categoryId,
        categoryName,
        stockStatus,
        null,
        currentQuantity,
        null,
        checkedAt
      )

      // Act
      const json = dto.toJSON()

      // Assert
      expect(json.expiryStatus).toBeNull()
      expect(json.threshold).toBeNull()
    })
  })

  describe('バリデーション', () => {
    it('有効な在庫ステータスを受け入れる', () => {
      // Arrange
      const validStockStatuses = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']
      const baseProps = {
        ingredientId: faker.string.uuid(),
        ingredientName: faker.commerce.productName(),
        categoryId: faker.string.uuid(),
        categoryName: faker.commerce.department(),
        expiryStatus: null,
        currentQuantity: {
          amount: faker.number.int({ min: 1, max: 100 }),
          unit: {
            id: faker.string.uuid(),
            name: '個',
            symbol: '個',
          },
        },
        threshold: null,
        checkedAt: faker.date.recent().toISOString(),
      }

      // Act & Assert
      validStockStatuses.forEach((stockStatus) => {
        const dto = new CheckedItemDto(
          baseProps.ingredientId,
          baseProps.ingredientName,
          baseProps.categoryId,
          baseProps.categoryName,
          stockStatus,
          baseProps.expiryStatus,
          baseProps.currentQuantity,
          baseProps.threshold,
          baseProps.checkedAt
        )
        expect(dto.stockStatus).toBe(stockStatus)
      })
    })

    it('有効な期限ステータスを受け入れる', () => {
      // Arrange
      const validExpiryStatuses = ['FRESH', 'NEAR_EXPIRY', 'EXPIRING_SOON', 'CRITICAL', 'EXPIRED']
      const baseProps = {
        ingredientId: faker.string.uuid(),
        ingredientName: faker.commerce.productName(),
        categoryId: faker.string.uuid(),
        categoryName: faker.commerce.department(),
        stockStatus: 'IN_STOCK',
        currentQuantity: {
          amount: faker.number.int({ min: 1, max: 100 }),
          unit: {
            id: faker.string.uuid(),
            name: '個',
            symbol: '個',
          },
        },
        threshold: null,
        checkedAt: faker.date.recent().toISOString(),
      }

      // Act & Assert
      validExpiryStatuses.forEach((expiryStatus) => {
        const dto = new CheckedItemDto(
          baseProps.ingredientId,
          baseProps.ingredientName,
          baseProps.categoryId,
          baseProps.categoryName,
          baseProps.stockStatus,
          expiryStatus,
          baseProps.currentQuantity,
          baseProps.threshold,
          baseProps.checkedAt
        )
        expect(dto.expiryStatus).toBe(expiryStatus)
      })
    })
  })
})
