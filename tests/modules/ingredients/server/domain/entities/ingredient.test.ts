import { describe, it, expect } from 'vitest'
import {
  IngredientEntity,
  IngredientStatus,
} from '@/modules/ingredients/server/domain/entities/ingredient'
import { INGREDIENT_STATUS } from '@/modules/ingredients/shared/constants'

describe('IngredientEntity', () => {
  describe('constructor', () => {
    it('should create an ingredient entity with all properties', () => {
      const props = {
        id: 'test-id',
        name: 'Tomato',
        quantity: 5,
        unit: 'kg',
        expirationDate: new Date('2024-12-31'),
        category: 'VEGETABLE',
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      const ingredient = new IngredientEntity(props)

      expect(ingredient.id).toBe(props.id)
      expect(ingredient.name).toBe(props.name)
      expect(ingredient.quantity).toBe(props.quantity)
      expect(ingredient.unit).toBe(props.unit)
      expect(ingredient.expirationDate).toEqual(props.expirationDate)
      expect(ingredient.category).toBe(props.category)
      expect(ingredient.status).toBe(props.status)
      expect(ingredient.createdAt).toEqual(props.createdAt)
      expect(ingredient.updatedAt).toEqual(props.updatedAt)
    })

    it('should create an ingredient entity with minimal properties', () => {
      const props = {
        id: 'test-id',
        name: 'Tomato',
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const ingredient = new IngredientEntity(props)

      expect(ingredient.id).toBe(props.id)
      expect(ingredient.name).toBe(props.name)
      expect(ingredient.status).toBe(props.status)
      expect(ingredient.quantity).toBeUndefined()
      expect(ingredient.unit).toBeUndefined()
      expect(ingredient.expirationDate).toBeUndefined()
      expect(ingredient.category).toBeUndefined()
    })
  })

  describe('isExpired', () => {
    it('should return true when expiration date is in the past', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const ingredient = new IngredientEntity({
        id: 'test-id',
        name: 'Tomato',
        expirationDate: yesterday,
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(ingredient.isExpired()).toBe(true)
    })

    it('should return false when expiration date is in the future', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const ingredient = new IngredientEntity({
        id: 'test-id',
        name: 'Tomato',
        expirationDate: tomorrow,
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(ingredient.isExpired()).toBe(false)
    })

    it('should return false when no expiration date', () => {
      const ingredient = new IngredientEntity({
        id: 'test-id',
        name: 'Tomato',
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(ingredient.isExpired()).toBe(false)
    })
  })

  describe('isExpiringSoon', () => {
    it('should return true when expiring within specified days', () => {
      const inThreeDays = new Date()
      inThreeDays.setDate(inThreeDays.getDate() + 3)

      const ingredient = new IngredientEntity({
        id: 'test-id',
        name: 'Tomato',
        expirationDate: inThreeDays,
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(ingredient.isExpiringSoon(7)).toBe(true)
      expect(ingredient.isExpiringSoon(2)).toBe(false)
    })

    it('should return false when no expiration date', () => {
      const ingredient = new IngredientEntity({
        id: 'test-id',
        name: 'Tomato',
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(ingredient.isExpiringSoon(7)).toBe(false)
    })

    it('should return true for already expired items', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const ingredient = new IngredientEntity({
        id: 'test-id',
        name: 'Tomato',
        expirationDate: yesterday,
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(ingredient.isExpiringSoon(7)).toBe(true)
    })
  })

  describe('updateStatus', () => {
    it('should update the status', () => {
      const ingredient = new IngredientEntity({
        id: 'test-id',
        name: 'Tomato',
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      ingredient.updateStatus(INGREDIENT_STATUS.LOW as IngredientStatus)

      expect(ingredient.status).toBe(INGREDIENT_STATUS.LOW)
    })
  })

  describe('toObject', () => {
    it('should convert entity to plain object', () => {
      const props = {
        id: 'test-id',
        name: 'Tomato',
        quantity: 5,
        unit: 'kg',
        expirationDate: new Date('2024-12-31'),
        category: 'VEGETABLE',
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      const ingredient = new IngredientEntity(props)
      const obj = ingredient.toObject()

      expect(obj).toEqual({
        id: props.id,
        name: props.name,
        quantity: props.quantity,
        unit: props.unit,
        expirationDate: props.expirationDate,
        category: props.category,
        status: props.status,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      })
    })
  })

  describe('calculateStatus', () => {
    it('should return AVAILABLE when quantity is undefined', () => {
      const ingredient = new IngredientEntity({
        id: 'test-id',
        name: 'Tomato',
        quantity: undefined,
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(ingredient.calculateStatus()).toBe('AVAILABLE')
    })

    it('should return AVAILABLE when quantity is null', () => {
      const ingredient = new IngredientEntity({
        id: 'test-id',
        name: 'Tomato',
        quantity: null as any,
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(ingredient.calculateStatus()).toBe('AVAILABLE')
    })

    it('should return OUT when quantity is 0', () => {
      const ingredient = new IngredientEntity({
        id: 'test-id',
        name: 'Tomato',
        quantity: 0,
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(ingredient.calculateStatus()).toBe('OUT')
    })

    it('should return LOW when quantity is less than 5', () => {
      const ingredient = new IngredientEntity({
        id: 'test-id',
        name: 'Tomato',
        quantity: 4,
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(ingredient.calculateStatus()).toBe('LOW')
    })

    it('should return AVAILABLE when quantity is 5 or more', () => {
      const ingredient = new IngredientEntity({
        id: 'test-id',
        name: 'Tomato',
        quantity: 5,
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(ingredient.calculateStatus()).toBe('AVAILABLE')
    })
  })

  describe('updateStatusBasedOnQuantity', () => {
    it('should update status based on quantity', () => {
      const ingredient = new IngredientEntity({
        id: 'test-id',
        name: 'Tomato',
        quantity: 0,
        status: INGREDIENT_STATUS.AVAILABLE as IngredientStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      ingredient.updateStatusBasedOnQuantity()

      expect(ingredient.status).toBe('OUT')
    })
  })

  describe('static create', () => {
    it('should create ingredient with calculated status', () => {
      const props = {
        id: 'test-id',
        name: 'Tomato',
        quantity: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const ingredient = IngredientEntity.create(props)

      expect(ingredient.status).toBe('LOW')
    })

    it('should create ingredient with AVAILABLE status when quantity is undefined', () => {
      const props = {
        id: 'test-id',
        name: 'Tomato',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const ingredient = IngredientEntity.create(props)

      expect(ingredient.status).toBe('AVAILABLE')
    })
  })
})
