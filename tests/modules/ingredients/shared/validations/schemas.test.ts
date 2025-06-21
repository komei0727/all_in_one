import { describe, it, expect } from 'vitest'
import {
  createIngredientSchema,
  updateIngredientSchema,
  getIngredientsParamsSchema,
  getExpiringIngredientsParamsSchema,
} from '@/modules/ingredients/shared/validations/schemas'

describe('Ingredient Validation Schemas', () => {
  describe('createIngredientSchema', () => {
    it('should validate required name field', () => {
      const validData = {
        name: 'Tomato',
      }
      const result = createIngredientSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
      }
      const result = createIngredientSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('1 character')
      }
    })

    it('should reject name longer than 100 characters', () => {
      const invalidData = {
        name: 'a'.repeat(101),
      }
      const result = createIngredientSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('100 character')
      }
    })

    it('should validate optional quantity', () => {
      const validData = {
        name: 'Tomato',
        quantity: 100,
      }
      const result = createIngredientSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject negative quantity', () => {
      const invalidData = {
        name: 'Tomato',
        quantity: -1,
      }
      const result = createIngredientSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('0')
      }
    })

    it('should validate unit from predefined list', () => {
      const validData = {
        name: 'Tomato',
        unit: 'g',
      }
      const result = createIngredientSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid unit', () => {
      const invalidData = {
        name: 'Tomato',
        unit: 'invalid-unit',
      }
      const result = createIngredientSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate ISO date for expirationDate', () => {
      const validData = {
        name: 'Tomato',
        expirationDate: '2024-12-31',
      }
      const result = createIngredientSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid date format', () => {
      const invalidData = {
        name: 'Tomato',
        expirationDate: '31-12-2024',
      }
      const result = createIngredientSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate category from predefined list', () => {
      const validData = {
        name: 'Tomato',
        category: 'VEGETABLE',
      }
      const result = createIngredientSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('updateIngredientSchema', () => {
    it('should allow empty object', () => {
      const validData = {}
      const result = updateIngredientSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate partial updates', () => {
      const validData = {
        quantity: 50,
        status: 'LOW',
      }
      const result = updateIngredientSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate status from predefined values', () => {
      const validData = {
        status: 'AVAILABLE',
      }
      const result = updateIngredientSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const invalidData = {
        status: 'INVALID',
      }
      const result = updateIngredientSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('getIngredientsParamsSchema', () => {
    it('should validate pagination params', () => {
      const validData = {
        page: 2,
        limit: 50,
      }
      const result = getIngredientsParamsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject page less than 1', () => {
      const invalidData = {
        page: 0,
      }
      const result = getIngredientsParamsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject limit greater than 100', () => {
      const invalidData = {
        limit: 101,
      }
      const result = getIngredientsParamsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate sort and order params', () => {
      const validData = {
        sort: 'expirationDate',
        order: 'desc',
      }
      const result = getIngredientsParamsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid sort field', () => {
      const invalidData = {
        sort: 'invalid',
      }
      const result = getIngredientsParamsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate status filter', () => {
      const validData = {
        status: 'OUT',
      }
      const result = getIngredientsParamsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('getExpiringIngredientsParamsSchema', () => {
    it('should validate days parameter', () => {
      const validData = {
        days: 14,
      }
      const result = getExpiringIngredientsParamsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject negative days', () => {
      const invalidData = {
        days: -1,
      }
      const result = getExpiringIngredientsParamsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should allow empty object (use default)', () => {
      const validData = {}
      const result = getExpiringIngredientsParamsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})