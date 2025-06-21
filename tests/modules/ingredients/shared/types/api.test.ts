import { describe, it, expect } from 'vitest'
import type {
  IngredientStatus,
  IngredientCategory,
  IngredientUnit,
  IngredientResponse,
  CreateIngredientInput,
  UpdateIngredientInput,
  GetIngredientsParams,
  GetIngredientsResponse,
  GetExpiringIngredientsParams,
  GetExpiringIngredientsResponse,
  SuccessResponse,
  ErrorResponse,
} from '@/modules/ingredients/shared/types/api'

describe('Ingredient API Types', () => {
  describe('IngredientStatus', () => {
    it('should have correct status values', () => {
      const validStatuses: IngredientStatus[] = ['AVAILABLE', 'LOW', 'OUT']
      expect(validStatuses).toHaveLength(3)
    })
  })

  describe('IngredientResponse', () => {
    it('should have all required fields', () => {
      const ingredient: IngredientResponse = {
        id: 'test-id',
        name: 'Test Ingredient',
        quantity: 1,
        unit: 'g',
        expirationDate: '2024-12-31',
        category: 'VEGETABLE',
        status: 'AVAILABLE',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      expect(ingredient.id).toBeDefined()
      expect(ingredient.name).toBeDefined()
      expect(ingredient.status).toBeDefined()
    })

    it('should allow optional fields', () => {
      const minimalIngredient: IngredientResponse = {
        id: 'test-id',
        name: 'Test Ingredient',
        status: 'AVAILABLE',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      expect(minimalIngredient.quantity).toBeUndefined()
      expect(minimalIngredient.unit).toBeUndefined()
      expect(minimalIngredient.expirationDate).toBeUndefined()
      expect(minimalIngredient.category).toBeUndefined()
    })
  })

  describe('CreateIngredientInput', () => {
    it('should require only name field', () => {
      const input: CreateIngredientInput = {
        name: 'New Ingredient',
      }

      expect(input.name).toBeDefined()
    })

    it('should allow optional fields', () => {
      const input: CreateIngredientInput = {
        name: 'New Ingredient',
        quantity: 100,
        unit: 'g',
        expirationDate: '2024-12-31',
        category: 'VEGETABLE',
      }

      expect(input.quantity).toBe(100)
      expect(input.unit).toBe('g')
      expect(input.expirationDate).toBe('2024-12-31')
      expect(input.category).toBe('VEGETABLE')
    })
  })

  describe('UpdateIngredientInput', () => {
    it('should allow all fields to be optional', () => {
      const emptyUpdate: UpdateIngredientInput = {}
      expect(emptyUpdate).toEqual({})
    })

    it('should allow partial updates', () => {
      const update: UpdateIngredientInput = {
        quantity: 50,
        status: 'LOW',
      }

      expect(update.quantity).toBe(50)
      expect(update.status).toBe('LOW')
      expect(update.name).toBeUndefined()
    })
  })

  describe('GetIngredientsParams', () => {
    it('should have pagination parameters', () => {
      const params: GetIngredientsParams = {
        page: 1,
        limit: 20,
      }

      expect(params.page).toBe(1)
      expect(params.limit).toBe(20)
    })

    it('should have filter parameters', () => {
      const params: GetIngredientsParams = {
        status: 'AVAILABLE',
        category: 'VEGETABLE',
      }

      expect(params.status).toBe('AVAILABLE')
      expect(params.category).toBe('VEGETABLE')
    })

    it('should have sort parameters', () => {
      const params: GetIngredientsParams = {
        sort: 'expirationDate',
        order: 'asc',
      }

      expect(params.sort).toBe('expirationDate')
      expect(params.order).toBe('asc')
    })
  })

  describe('Response Types', () => {
    it('should have correct success response structure', () => {
      const response: SuccessResponse<IngredientResponse> = {
        data: {
          id: 'test-id',
          name: 'Test',
          status: 'AVAILABLE',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        success: true,
      }

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
    })

    it('should have correct error response structure', () => {
      const response: ErrorResponse = {
        error: 'Not found',
        success: false,
        code: 'NOT_FOUND',
      }

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.code).toBe('NOT_FOUND')
    })

    it('should have correct paginated response structure', () => {
      const response: GetIngredientsResponse = {
        data: {
          items: [],
          pagination: {
            total: 100,
            page: 1,
            limit: 20,
            totalPages: 5,
          },
        },
        success: true,
      }

      expect(response.data.pagination.total).toBe(100)
      expect(response.data.pagination.totalPages).toBe(5)
    })
  })
})
