import { describe, it, expect } from 'vitest'
import { successResponse, errorResponse } from '@/modules/ingredients/server/api/utils/response'
import { ZodError } from 'zod'
import { IngredientNotFoundError } from '@/modules/ingredients/server/application/errors'

describe('Response Utils', () => {
  describe('successResponse', () => {
    it('should return success response with data', async () => {
      const data = { id: '1', name: 'Test' }
      const response = successResponse(data)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toEqual({
        data,
        success: true,
      })
    })

    it('should return success response with custom status', async () => {
      const data = { id: '1', name: 'Test' }
      const response = successResponse(data, 201)
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body).toEqual({
        data,
        success: true,
      })
    })

    it('should handle data already in success response format', async () => {
      const data = {
        data: { id: '1', name: 'Test' },
        success: true,
      }
      const response = successResponse(data)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toEqual(data)
    })
  })

  describe('errorResponse', () => {
    it('should handle ZodError', async () => {
      const zodError = new ZodError([
        {
          code: 'too_small',
          minimum: 1,
          type: 'string',
          inclusive: true,
          exact: false,
          message: 'String must contain at least 1 character(s)',
          path: ['name'],
        },
      ])

      const response = errorResponse(zodError)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body).toEqual({
        error: 'Validation failed',
        success: false,
        code: 'VALIDATION_ERROR',
        details: {
          name: ['String must contain at least 1 character(s)'],
        },
      })
    })

    it('should handle IngredientNotFoundError', async () => {
      const error = new IngredientNotFoundError('test-id')
      const response = errorResponse(error)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body).toEqual({
        error: 'Ingredient with id test-id not found',
        success: false,
        code: 'NOT_FOUND',
      })
    })

    it('should handle generic Error', async () => {
      const error = new Error('Something went wrong')
      const response = errorResponse(error)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body).toEqual({
        error: 'Internal server error',
        success: false,
      })
    })

    it('should handle custom status for generic Error', async () => {
      const error = new Error('Bad request')
      const response = errorResponse(error, 400)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body).toEqual({
        error: 'Bad request',
        success: false,
      })
    })

    it('should handle non-Error values', async () => {
      const response = errorResponse('Something went wrong')
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body).toEqual({
        error: 'Internal server error',
        success: false,
      })
    })
  })
})
