import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  getAllIngredientsHandler,
  createIngredientHandler,
  getIngredientByIdHandler,
  updateIngredientHandler,
  deleteIngredientHandler,
  getExpiringIngredientsHandler,
} from '@/modules/ingredients/server/api/handlers'
import {
  getAllIngredientsUseCase,
  getIngredientByIdUseCase,
  createIngredientUseCase,
  updateIngredientUseCase,
  deleteIngredientUseCase,
  getExpiringIngredientsUseCase,
} from '@/modules/ingredients/server/api/container'
import { IngredientNotFoundError } from '@/modules/ingredients/server/application/errors'
import { ZodError } from 'zod'

// Mock the container
vi.mock('@/modules/ingredients/server/api/container', () => ({
  getAllIngredientsUseCase: { execute: vi.fn() },
  getIngredientByIdUseCase: { execute: vi.fn() },
  createIngredientUseCase: { execute: vi.fn() },
  updateIngredientUseCase: { execute: vi.fn() },
  deleteIngredientUseCase: { execute: vi.fn() },
  getExpiringIngredientsUseCase: { execute: vi.fn() },
}))

describe('API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllIngredientsHandler', () => {
    it('should return ingredients with default parameters', async () => {
      const mockResult = {
        items: [
          {
            id: '1',
            name: 'Tomato',
            quantity: 5,
            unit: 'kg',
            status: 'AVAILABLE' as const,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      }

      vi.mocked(getAllIngredientsUseCase.execute).mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/ingredients')
      const response = await getAllIngredientsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockResult)
      expect(getAllIngredientsUseCase.execute).toHaveBeenCalledWith({})
    })

    it('should handle query parameters', async () => {
      const mockResult = {
        items: [],
        pagination: {
          total: 0,
          page: 2,
          limit: 10,
          totalPages: 1,
        },
      }
      vi.mocked(getAllIngredientsUseCase.execute).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/ingredients?page=2&limit=10&category=VEGETABLE'
      )
      await getAllIngredientsHandler(request)

      expect(getAllIngredientsUseCase.execute).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        category: 'VEGETABLE',
      })
    })

    it('should handle validation errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/ingredients?page=0')
      const response = await getAllIngredientsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('createIngredientHandler', () => {
    it('should create ingredient successfully', async () => {
      const mockResult = {
        id: 'new-id',
        name: 'New Ingredient',
        quantity: 10,
        unit: 'kg',
        status: 'AVAILABLE' as const,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      vi.mocked(createIngredientUseCase.execute).mockResolvedValue(mockResult)

      const requestBody = {
        name: 'New Ingredient',
        quantity: 10,
        unit: 'kg',
      }

      const request = new NextRequest('http://localhost:3000/api/ingredients', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await createIngredientHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockResult)
      expect(createIngredientUseCase.execute).toHaveBeenCalledWith(requestBody)
    })

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/ingredients', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await createIngredientHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid request body')
    })

    it('should handle validation errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/ingredients', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await createIngredientHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('getIngredientByIdHandler', () => {
    it('should return ingredient when found', async () => {
      const mockResult = {
        id: '1',
        name: 'Tomato',
        quantity: 5,
        unit: 'kg',
        status: 'AVAILABLE' as const,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      vi.mocked(getIngredientByIdUseCase.execute).mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/ingredients/1')
      const response = await getIngredientByIdHandler(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockResult)
      expect(getIngredientByIdUseCase.execute).toHaveBeenCalledWith('1')
    })

    it('should handle not found error', async () => {
      vi.mocked(getIngredientByIdUseCase.execute).mockRejectedValue(
        new IngredientNotFoundError('not-found')
      )

      const request = new NextRequest('http://localhost:3000/api/ingredients/not-found')
      const response = await getIngredientByIdHandler(request, { params: { id: 'not-found' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.code).toBe('NOT_FOUND')
    })
  })

  describe('updateIngredientHandler', () => {
    it('should update ingredient successfully', async () => {
      const mockResult = {
        id: '1',
        name: 'Updated Tomato',
        quantity: 10,
        unit: 'kg',
        status: 'LOW' as const,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      }

      vi.mocked(updateIngredientUseCase.execute).mockResolvedValue(mockResult)

      const requestBody = {
        name: 'Updated Tomato',
        quantity: 10,
      }

      const request = new NextRequest('http://localhost:3000/api/ingredients/1', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      })

      const response = await updateIngredientHandler(request, { params: { id: '1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockResult)
      expect(updateIngredientUseCase.execute).toHaveBeenCalledWith('1', requestBody)
    })

    it('should handle not found error', async () => {
      vi.mocked(updateIngredientUseCase.execute).mockRejectedValue(
        new IngredientNotFoundError('not-found')
      )

      const request = new NextRequest('http://localhost:3000/api/ingredients/not-found', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Test' }),
      })

      const response = await updateIngredientHandler(request, { params: { id: 'not-found' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.code).toBe('NOT_FOUND')
    })
  })

  describe('deleteIngredientHandler', () => {
    it('should delete ingredient successfully', async () => {
      vi.mocked(deleteIngredientUseCase.execute).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/ingredients/1')
      const response = await deleteIngredientHandler(request, { params: { id: '1' } })

      expect(response.status).toBe(204)
      expect(deleteIngredientUseCase.execute).toHaveBeenCalledWith('1')
    })

    it('should handle not found error', async () => {
      vi.mocked(deleteIngredientUseCase.execute).mockRejectedValue(
        new IngredientNotFoundError('not-found')
      )

      const request = new NextRequest('http://localhost:3000/api/ingredients/not-found')
      const response = await deleteIngredientHandler(request, { params: { id: 'not-found' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.code).toBe('NOT_FOUND')
    })
  })

  describe('getExpiringIngredientsHandler', () => {
    it('should return expiring ingredients with default days', async () => {
      const mockResult = [
        {
          id: '1',
          name: 'Milk',
          quantity: 1,
          unit: 'L',
          expirationDate: '2024-01-05T00:00:00.000Z',
          status: 'LOW' as const,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ]

      vi.mocked(getExpiringIngredientsUseCase.execute).mockResolvedValue(mockResult)

      const request = new NextRequest('http://localhost:3000/api/ingredients/expiring')
      const response = await getExpiringIngredientsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockResult)
      expect(getExpiringIngredientsUseCase.execute).toHaveBeenCalledWith({ days: 7 })
    })

    it('should handle custom days parameter', async () => {
      vi.mocked(getExpiringIngredientsUseCase.execute).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/ingredients/expiring?days=3')
      await getExpiringIngredientsHandler(request)

      expect(getExpiringIngredientsUseCase.execute).toHaveBeenCalledWith({ days: 3 })
    })

    it('should handle invalid days parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/ingredients/expiring?days=0')
      const response = await getExpiringIngredientsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.code).toBe('VALIDATION_ERROR')
    })
  })
})
