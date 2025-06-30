import { faker } from '@faker-js/faker'
import { describe, it, expect } from 'vitest'

import {
  CategoryNotFoundException,
  UnitNotFoundException,
} from '@/modules/ingredients/server/domain/exceptions/not-found.exception'

describe('Not Found Exceptions', () => {
  describe('CategoryNotFoundException', () => {
    it('カテゴリIDを含むエラーメッセージを生成する', () => {
      // Arrange
      const categoryId = faker.string.nanoid()

      // Act
      const exception = new CategoryNotFoundException(categoryId)

      // Assert
      expect(exception).toBeInstanceOf(Error)
      expect(exception.message).toBe(`Category not found: ${categoryId}`)
      expect(exception.name).toBe('CategoryNotFoundException')
    })

    it('異なるカテゴリIDで異なるメッセージを生成する', () => {
      // Arrange
      const categoryId1 = 'cat_' + faker.string.nanoid()
      const categoryId2 = 'cat_' + faker.string.nanoid()

      // Act
      const exception1 = new CategoryNotFoundException(categoryId1)
      const exception2 = new CategoryNotFoundException(categoryId2)

      // Assert
      expect(exception1.message).toContain(categoryId1)
      expect(exception2.message).toContain(categoryId2)
      expect(exception1.message).not.toBe(exception2.message)
    })

    it('httpStatusCodeとerrorCodeが正しく設定される', () => {
      // Arrange & Act
      const exception = new CategoryNotFoundException('cat123')

      // Assert
      expect(exception.httpStatusCode).toBe(404)
      expect(exception.errorCode).toBe('RESOURCE_NOT_FOUND')
    })
  })

  describe('UnitNotFoundException', () => {
    it('単位IDを含むエラーメッセージを生成する', () => {
      // Arrange
      const unitId = faker.string.nanoid()

      // Act
      const exception = new UnitNotFoundException(unitId)

      // Assert
      expect(exception).toBeInstanceOf(Error)
      expect(exception.message).toBe(`Unit not found: ${unitId}`)
      expect(exception.name).toBe('UnitNotFoundException')
    })

    it('異なる単位IDで異なるメッセージを生成する', () => {
      // Arrange
      const unitId1 = 'unit_' + faker.string.nanoid()
      const unitId2 = 'unit_' + faker.string.nanoid()

      // Act
      const exception1 = new UnitNotFoundException(unitId1)
      const exception2 = new UnitNotFoundException(unitId2)

      // Assert
      expect(exception1.message).toContain(unitId1)
      expect(exception2.message).toContain(unitId2)
      expect(exception1.message).not.toBe(exception2.message)
    })

    it('httpStatusCodeとerrorCodeが正しく設定される', () => {
      // Arrange & Act
      const exception = new UnitNotFoundException('unit456')

      // Assert
      expect(exception.httpStatusCode).toBe(404)
      expect(exception.errorCode).toBe('RESOURCE_NOT_FOUND')
    })
  })

  describe('Inheritance', () => {
    it('両方の例外が基底のNotFoundExceptionを継承している', () => {
      // Arrange
      const categoryException = new CategoryNotFoundException('cat123')
      const unitException = new UnitNotFoundException('unit456')

      // Assert
      expect(categoryException.name).toBe('CategoryNotFoundException')
      expect(unitException.name).toBe('UnitNotFoundException')
      expect(categoryException).toHaveProperty('httpStatusCode', 404)
      expect(unitException).toHaveProperty('httpStatusCode', 404)
    })
  })
})
