import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/ingredients/route'
import { NextRequest } from 'next/server'
import { createIngredientUseCase } from '@/modules/ingredients/server/api/container'

// Mock the container
vi.mock('@/modules/ingredients/server/api/container', () => ({
  getAllIngredientsUseCase: {
    execute: vi.fn(),
  },
  createIngredientUseCase: {
    execute: vi.fn(),
  },
}))

describe('POST /api/ingredients', () => {
  const mockUseCase = createIngredientUseCase

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create ingredient with valid data', async () => {
    const mockResponse = {
      id: 'new-id',
      name: 'New Ingredient',
      quantity: 10,
      unit: 'kg',
      category: 'VEGETABLE',
      status: 'AVAILABLE' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    vi.mocked(mockUseCase.execute).mockResolvedValue(mockResponse)

    const requestBody = {
      name: 'New Ingredient',
      quantity: 10,
      unit: 'kg',
      category: 'VEGETABLE',
    }

    const request = new NextRequest('http://localhost:3000/api/ingredients', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(mockResponse)
    expect(mockUseCase.execute).toHaveBeenCalledWith(requestBody)
  })

  it('should create ingredient with minimal data', async () => {
    const mockResponse = {
      id: 'new-id',
      name: 'Salt',
      status: 'AVAILABLE' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    vi.mocked(mockUseCase.execute).mockResolvedValue(mockResponse)

    const requestBody = {
      name: 'Salt',
    }

    const request = new NextRequest('http://localhost:3000/api/ingredients', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
  })

  it('should validate required fields', async () => {
    const requestBody = {}

    const request = new NextRequest('http://localhost:3000/api/ingredients', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Validation')
  })

  it('should validate name length', async () => {
    const requestBody = {
      name: 'a'.repeat(101),
    }

    const request = new NextRequest('http://localhost:3000/api/ingredients', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should handle invalid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/ingredients', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Invalid request')
  })

  it('should handle server errors', async () => {
    vi.mocked(mockUseCase.execute).mockRejectedValue(new Error('Database error'))

    const requestBody = {
      name: 'Test',
    }

    const request = new NextRequest('http://localhost:3000/api/ingredients', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })
})
