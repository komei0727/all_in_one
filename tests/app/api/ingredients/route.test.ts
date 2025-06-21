import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '@/app/api/ingredients/route'
import { NextRequest } from 'next/server'
import { getAllIngredientsUseCase } from '@/modules/ingredients/server/api/container'

// Mock the container
vi.mock('@/modules/ingredients/server/api/container', () => ({
  getAllIngredientsUseCase: {
    execute: vi.fn(),
  },
  createIngredientUseCase: {
    execute: vi.fn(),
  },
}))

describe('GET /api/ingredients', () => {
  const mockUseCase = getAllIngredientsUseCase

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return ingredients with default pagination', async () => {
    const mockUseCaseResponse = {
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

    vi.mocked(mockUseCase.execute).mockResolvedValue(mockUseCaseResponse)

    const request = new NextRequest('http://localhost:3000/api/ingredients')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      data: mockUseCaseResponse,
      success: true,
    })
    expect(mockUseCase.execute).toHaveBeenCalledWith({})
  })

  it('should handle query parameters correctly', async () => {
    const mockUseCaseResponse = {
      items: [],
      pagination: {
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 1,
      },
    }

    vi.mocked(mockUseCase.execute).mockResolvedValue(mockUseCaseResponse)

    const request = new NextRequest(
      'http://localhost:3000/api/ingredients?page=2&limit=10&status=AVAILABLE&category=VEGETABLE&sort=name&order=desc'
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockUseCase.execute).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      status: 'AVAILABLE',
      category: 'VEGETABLE',
      sort: 'name',
      order: 'desc',
    })
  })

  it('should validate pagination parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/ingredients?page=0&limit=200')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Validation')
  })

  it('should handle invalid sort field', async () => {
    const request = new NextRequest('http://localhost:3000/api/ingredients?sort=invalid')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should handle server errors gracefully', async () => {
    vi.mocked(mockUseCase.execute).mockRejectedValue(new Error('Database connection failed'))

    const request = new NextRequest('http://localhost:3000/api/ingredients')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })
})
