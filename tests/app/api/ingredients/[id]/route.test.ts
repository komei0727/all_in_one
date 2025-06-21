import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, PUT, DELETE } from '@/app/api/ingredients/[id]/route'
import { NextRequest } from 'next/server'
import {
  getIngredientByIdUseCase,
  updateIngredientUseCase,
  deleteIngredientUseCase,
} from '@/modules/ingredients/server/api/container'
import { IngredientNotFoundError } from '@/modules/ingredients/server/application/errors'

// Mock the container
vi.mock('@/modules/ingredients/server/api/container', () => ({
  getAllIngredientsUseCase: {
    execute: vi.fn(),
  },
  getIngredientByIdUseCase: {
    execute: vi.fn(),
  },
  createIngredientUseCase: {
    execute: vi.fn(),
  },
  updateIngredientUseCase: {
    execute: vi.fn(),
  },
  deleteIngredientUseCase: {
    execute: vi.fn(),
  },
  getExpiringIngredientsUseCase: {
    execute: vi.fn(),
  },
}))

describe('GET /api/ingredients/[id]', () => {
  const mockGetUseCase = getIngredientByIdUseCase

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return ingredient when found', async () => {
    const mockIngredient = {
      id: '1',
      name: 'Tomato',
      quantity: 5,
      unit: 'kg',
      category: 'VEGETABLE',
      status: 'AVAILABLE' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    vi.mocked(mockGetUseCase.execute).mockResolvedValue(mockIngredient)

    const request = new NextRequest('http://localhost:3000/api/ingredients/1')
    const params = { params: { id: '1' } }
    const response = await GET(request, params)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(mockIngredient)
    expect(mockGetUseCase.execute).toHaveBeenCalledWith('1')
  })

  it('should return 404 when ingredient not found', async () => {
    vi.mocked(mockGetUseCase.execute).mockRejectedValue(new IngredientNotFoundError('not-found'))

    const request = new NextRequest('http://localhost:3000/api/ingredients/not-found')
    const params = { params: { id: 'not-found' } }
    const response = await GET(request, params)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.code).toBe('NOT_FOUND')
  })
})

describe('PUT /api/ingredients/[id]', () => {
  const mockUpdateUseCase = updateIngredientUseCase

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update ingredient with valid data', async () => {
    const mockUpdated = {
      id: '1',
      name: 'Updated Tomato',
      quantity: 10,
      unit: 'kg',
      category: 'VEGETABLE',
      status: 'LOW' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    }

    vi.mocked(mockUpdateUseCase.execute).mockResolvedValue(mockUpdated)

    const requestBody = {
      name: 'Updated Tomato',
      quantity: 10,
      status: 'LOW' as const,
    }

    const request = new NextRequest('http://localhost:3000/api/ingredients/1', {
      method: 'PUT',
      body: JSON.stringify(requestBody),
    })
    const params = { params: { id: '1' } }
    const response = await PUT(request, params)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(mockUpdated)
    expect(mockUpdateUseCase.execute).toHaveBeenCalledWith('1', requestBody)
  })

  it('should return 404 when ingredient not found', async () => {
    vi.mocked(mockUpdateUseCase.execute).mockRejectedValue(new IngredientNotFoundError('not-found'))

    const request = new NextRequest('http://localhost:3000/api/ingredients/not-found', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Test' }),
    })
    const params = { params: { id: 'not-found' } }
    const response = await PUT(request, params)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
  })
})

describe('DELETE /api/ingredients/[id]', () => {
  const mockDeleteUseCase = deleteIngredientUseCase

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete ingredient when exists', async () => {
    vi.mocked(mockDeleteUseCase.execute).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/ingredients/1')
    const params = { params: { id: '1' } }
    const response = await DELETE(request, params)

    expect(response.status).toBe(204)
    expect(mockDeleteUseCase.execute).toHaveBeenCalledWith('1')
  })

  it('should return 404 when ingredient not found', async () => {
    vi.mocked(mockDeleteUseCase.execute).mockRejectedValue(new IngredientNotFoundError('not-found'))

    const request = new NextRequest('http://localhost:3000/api/ingredients/not-found')
    const params = { params: { id: 'not-found' } }
    const response = await DELETE(request, params)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
  })
})
