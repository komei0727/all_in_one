import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { IngredientDto } from '@/modules/ingredients/server/application/dtos/ingredient.dto'

describe('IngredientDto', () => {
  // テスト用のDTOデータを生成
  const createTestData = () => ({
    id: faker.string.nanoid(),
    userId: faker.string.nanoid(),
    name: faker.commerce.productName(),
    category: {
      id: faker.string.nanoid(),
      name: faker.commerce.department(),
    },
    price: faker.number.int({ min: 100, max: 1000 }),
    purchaseDate: faker.date.recent().toISOString(),
    expiryInfo: {
      bestBeforeDate: faker.date.future().toISOString(),
      useByDate: faker.date.future().toISOString(),
    },
    stock: {
      quantity: faker.number.int({ min: 1, max: 10 }),
      unit: {
        id: faker.string.nanoid(),
        name: 'グラム',
        symbol: 'g',
      },
      storageLocation: {
        type: 'REFRIGERATOR',
        detail: '冷蔵庫の野菜室',
      },
      threshold: faker.number.int({ min: 1, max: 5 }),
    },
    memo: faker.lorem.sentence(),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
  })

  describe('constructor', () => {
    it('すべてのプロパティを持つDTOを作成できる', () => {
      // Arrange
      const data = createTestData()

      // Act
      const dto = new IngredientDto(
        data.id,
        data.userId,
        data.name,
        data.category,
        data.price,
        data.purchaseDate,
        data.expiryInfo,
        data.stock,
        data.memo,
        data.createdAt,
        data.updatedAt
      )

      // Assert
      expect(dto.id).toBe(data.id)
      expect(dto.userId).toBe(data.userId)
      expect(dto.name).toBe(data.name)
      expect(dto.category).toEqual(data.category)
      expect(dto.price).toBe(data.price)
      expect(dto.purchaseDate).toBe(data.purchaseDate)
      expect(dto.expiryInfo).toEqual(data.expiryInfo)
      expect(dto.stock).toEqual(data.stock)
      expect(dto.memo).toBe(data.memo)
      expect(dto.createdAt).toBe(data.createdAt)
      expect(dto.updatedAt).toBe(data.updatedAt)
    })

    it('nullableなプロパティにnullを設定できる', () => {
      // Arrange
      const data = createTestData()

      // Act
      const dto = new IngredientDto(
        data.id,
        data.userId,
        data.name,
        null, // category
        null, // price
        data.purchaseDate,
        null, // expiryInfo
        {
          ...data.stock,
          threshold: null,
          storageLocation: {
            type: 'OTHER',
            detail: null,
          },
        },
        null, // memo
        data.createdAt,
        data.updatedAt
      )

      // Assert
      expect(dto.category).toBeNull()
      expect(dto.price).toBeNull()
      expect(dto.expiryInfo).toBeNull()
      expect(dto.memo).toBeNull()
      expect(dto.stock.threshold).toBeNull()
      expect(dto.stock.storageLocation.detail).toBeNull()
    })
  })

  describe('toJSON', () => {
    it('DTOをJSON形式に変換できる', () => {
      // Arrange
      const data = createTestData()
      const dto = new IngredientDto(
        data.id,
        data.userId,
        data.name,
        data.category,
        data.price,
        data.purchaseDate,
        data.expiryInfo,
        data.stock,
        data.memo,
        data.createdAt,
        data.updatedAt
      )

      // Act
      const json = dto.toJSON()

      // Assert
      expect(json).toEqual({
        ingredient: {
          id: data.id,
          userId: data.userId,
          name: data.name,
          category: data.category,
          price: data.price,
          purchaseDate: data.purchaseDate,
          expiryInfo: data.expiryInfo,
          stock: data.stock,
          memo: data.memo,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
      })
    })

    it('nullableなプロパティを含むDTOをJSON形式に変換できる', () => {
      // Arrange
      const data = createTestData()
      const dto = new IngredientDto(
        data.id,
        data.userId,
        data.name,
        null,
        null,
        data.purchaseDate,
        null,
        {
          ...data.stock,
          threshold: null,
        },
        null,
        data.createdAt,
        data.updatedAt
      )

      // Act
      const json = dto.toJSON()

      // Assert
      expect(json.ingredient.category).toBeNull()
      expect(json.ingredient.price).toBeNull()
      expect(json.ingredient.expiryInfo).toBeNull()
      expect(json.ingredient.memo).toBeNull()
      expect(json.ingredient.stock.threshold).toBeNull()
    })

    it('複雑なネストされた構造を正しく変換できる', () => {
      // Arrange
      const data = createTestData()
      const dto = new IngredientDto(
        data.id,
        data.userId,
        data.name,
        data.category,
        data.price,
        data.purchaseDate,
        data.expiryInfo,
        data.stock,
        data.memo,
        data.createdAt,
        data.updatedAt
      )

      // Act
      const json = dto.toJSON()

      // Assert - ネストされた構造の確認
      expect(json.ingredient.stock.unit).toEqual({
        id: data.stock.unit.id,
        name: data.stock.unit.name,
        symbol: data.stock.unit.symbol,
      })
      expect(json.ingredient.stock.storageLocation).toEqual({
        type: data.stock.storageLocation.type,
        detail: data.stock.storageLocation.detail,
      })
    })
  })
})
