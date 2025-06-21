import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '@/app/api/ingredients/expiring/route'
import { NextRequest } from 'next/server'
import { getExpiringIngredientsUseCase } from '@/modules/ingredients/server/api/container'

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

describe('GET /api/ingredients/expiring', () => {
  const mockUseCase = getExpiringIngredientsUseCase

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return expiring ingredients with default days', async () => {
    const mockResponse = [
      {
        id: '1',
        name: 'Milk',
        quantity: 1,
        unit: 'L',
        expirationDate: '2024-01-05T00:00:00.000Z',
        category: 'DAIRY',
        status: 'LOW' as const,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        name: 'Yogurt',
        quantity: 2,
        unit: 'pcs',
        expirationDate: '2024-01-03T00:00:00.000Z',
        category: 'DAIRY',
        status: 'AVAILABLE' as const,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]

    vi.mocked(mockUseCase.execute).mockResolvedValue(mockResponse)

    const request = new NextRequest('http://localhost:3000/api/ingredients/expiring')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      data: mockResponse,
      success: true,
    })
    expect(mockUseCase.execute).toHaveBeenCalledWith({ days: 7 })
  })

  it('should handle custom days parameter', async () => {
    const mockResponse: any[] = []

    vi.mocked(mockUseCase.execute).mockResolvedValue(mockResponse)

    const request = new NextRequest('http://localhost:3000/api/ingredients/expiring?days=3')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual(mockResponse)
    expect(mockUseCase.execute).toHaveBeenCalledWith({ days: 3 })
  })

  it('should validate days parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/ingredients/expiring?days=0')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Validation')
  })

  it('should reject days parameter over 365', async () => {
    const request = new NextRequest('http://localhost:3000/api/ingredients/expiring?days=366')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Validation')
  })

  it('should handle invalid days parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/ingredients/expiring?days=abc')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should handle server errors', async () => {
    vi.mocked(mockUseCase.execute).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/ingredients/expiring')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })
})
