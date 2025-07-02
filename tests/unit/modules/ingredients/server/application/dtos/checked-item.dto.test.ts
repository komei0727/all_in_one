import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import { CheckedItemDto } from '@/modules/ingredients/server/application/dtos/checked-item.dto'

describe('CheckedItemDto', () => {
  describe('constructor', () => {
    it('すべてのプロパティを正しく設定できる', () => {
      // Arrange
      const ingredientId = faker.string.uuid()
      const ingredientName = faker.commerce.productName()
      const stockStatus = 'LOW_STOCK'
      const expiryStatus = 'EXPIRING_SOON'
      const checkedAt = faker.date.recent().toISOString()

      // Act
      const dto = new CheckedItemDto(
        ingredientId,
        ingredientName,
        stockStatus,
        expiryStatus,
        checkedAt
      )

      // Assert
      expect(dto.ingredientId).toBe(ingredientId)
      expect(dto.ingredientName).toBe(ingredientName)
      expect(dto.stockStatus).toBe(stockStatus)
      expect(dto.expiryStatus).toBe(expiryStatus)
      expect(dto.checkedAt).toBe(checkedAt)
    })

    it('オプショナルなプロパティをnullで設定できる', () => {
      // Arrange
      const ingredientId = faker.string.uuid()
      const ingredientName = faker.commerce.productName()
      const stockStatus = 'IN_STOCK'
      const checkedAt = faker.date.recent().toISOString()

      // Act
      const dto = new CheckedItemDto(
        ingredientId,
        ingredientName,
        stockStatus,
        null, // expiryStatus
        checkedAt
      )

      // Assert
      expect(dto.ingredientId).toBe(ingredientId)
      expect(dto.ingredientName).toBe(ingredientName)
      expect(dto.stockStatus).toBe(stockStatus)
      expect(dto.expiryStatus).toBeNull()
      expect(dto.checkedAt).toBe(checkedAt)
    })
  })

  describe('toJSON', () => {
    it('DTOをJSON形式に変換できる', () => {
      // Arrange
      const ingredientId = faker.string.uuid()
      const ingredientName = faker.commerce.productName()
      const stockStatus = 'OUT_OF_STOCK'
      const expiryStatus = 'EXPIRED'
      const checkedAt = faker.date.recent().toISOString()

      const dto = new CheckedItemDto(
        ingredientId,
        ingredientName,
        stockStatus,
        expiryStatus,
        checkedAt
      )

      // Act
      const json = dto.toJSON()

      // Assert
      expect(json).toEqual({
        data: {
          ingredientId,
          ingredientName,
          stockStatus,
          expiryStatus,
          checkedAt,
        },
      })
    })

    it('nullプロパティを含むDTOを正しくJSON変換できる', () => {
      // Arrange
      const ingredientId = faker.string.uuid()
      const ingredientName = faker.commerce.productName()
      const stockStatus = 'IN_STOCK'
      const checkedAt = faker.date.recent().toISOString()

      const dto = new CheckedItemDto(
        ingredientId,
        ingredientName,
        stockStatus,
        null, // expiryStatus
        checkedAt
      )

      // Act
      const json = dto.toJSON()

      // Assert
      expect(json).toEqual({
        data: {
          ingredientId,
          ingredientName,
          stockStatus,
          expiryStatus: null,
          checkedAt,
        },
      })
    })
  })

  describe('バリデーション', () => {
    it('すべての必須プロパティが存在する場合は正常に作成される', () => {
      // Arrange & Act
      const dto = new CheckedItemDto(
        faker.string.uuid(),
        faker.commerce.productName(),
        'IN_STOCK',
        'FRESH',
        faker.date.recent().toISOString()
      )

      // Assert
      expect(dto).toBeInstanceOf(CheckedItemDto)
      expect(dto.ingredientId).toBeDefined()
      expect(dto.ingredientName).toBeDefined()
      expect(dto.stockStatus).toBeDefined()
      expect(dto.checkedAt).toBeDefined()
    })

    it('空の文字列プロパティでも作成できる', () => {
      // Arrange & Act
      const dto = new CheckedItemDto('', '', '', null, '')

      // Assert
      expect(dto).toBeInstanceOf(CheckedItemDto)
      expect(dto.ingredientId).toBe('')
      expect(dto.ingredientName).toBe('')
      expect(dto.stockStatus).toBe('')
      expect(dto.expiryStatus).toBeNull()
      expect(dto.checkedAt).toBe('')
    })
  })

  describe('イミュータビリティ', () => {
    it('DTOのプロパティは読み取り専用である', () => {
      // Arrange
      const dto = new CheckedItemDto(
        faker.string.uuid(),
        faker.commerce.productName(),
        'IN_STOCK',
        'FRESH',
        faker.date.recent().toISOString()
      )

      // Act & Assert
      // TypeScriptのreadonly修飾子によりコンパイル時にエラーになるはず
      // ランタイムでは実際に変更を試みて例外をキャッチする
      expect(() => {
        // @ts-expect-error プロパティは読み取り専用のためエラーになる
        dto.ingredientId = 'new-id'
      }).not.toThrow() // 実際にはJavaScriptなので変更はできてしまう

      // しかし、TypeScriptレベルでは保護されている
    })
  })
})
