import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GetAllIngredientsUseCase } from '@/modules/ingredients/server/application/use-cases/get-all-ingredients'
import { IngredientEntity } from '@/modules/ingredients/server/domain/entities/ingredient'
import type { IIngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import { INGREDIENT_STATUS } from '@/modules/ingredients/shared/constants'

// Mock repository
const mockRepository: IIngredientRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findExpiringWithinDays: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

describe('GetAllIngredientsUseCase', () => {
  let useCase: GetAllIngredientsUseCase

  beforeEach(() => {
    useCase = new GetAllIngredientsUseCase(mockRepository)
    vi.clearAllMocks()
  })

  it('should return ingredients with pagination info', async () => {
    const mockIngredients = [
      new IngredientEntity({
        id: '1',
        name: 'Tomato',
        quantity: 5,
        unit: 'kg',
        category: 'VEGETABLE',
        status: INGREDIENT_STATUS.AVAILABLE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }),
      new IngredientEntity({
        id: '2',
        name: 'Milk',
        quantity: 2,
        unit: 'l',
        category: 'DAIRY',
        status: INGREDIENT_STATUS.LOW,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }),
    ]

    vi.mocked(mockRepository.findAll).mockResolvedValue({
      items: mockIngredients,
      total: 10,
    })

    const result = await useCase.execute({ page: 1, limit: 20 })

    expect(result.data.items).toHaveLength(2)
    expect(result.data.pagination).toEqual({
      total: 10,
      page: 1,
      limit: 20,
      totalPages: 1,
    })
    expect(result.data.items[0].id).toBe('1')
    expect(result.data.items[0].name).toBe('Tomato')
  })

  it('should pass filter parameters to repository', async () => {
    vi.mocked(mockRepository.findAll).mockResolvedValue({
      items: [],
      total: 0,
    })

    const params = {
      page: 2,
      limit: 10,
      status: INGREDIENT_STATUS.AVAILABLE,
      category: 'VEGETABLE',
      sort: 'name' as const,
      order: 'desc' as const,
    }

    await useCase.execute(params)

    expect(mockRepository.findAll).toHaveBeenCalledWith(params)
  })

  it('should calculate total pages correctly', async () => {
    vi.mocked(mockRepository.findAll).mockResolvedValue({
      items: [],
      total: 45,
    })

    const result = await useCase.execute({ page: 1, limit: 10 })

    expect(result.data.pagination.totalPages).toBe(5)
  })

  it('should return 1 total page when total is 0', async () => {
    vi.mocked(mockRepository.findAll).mockResolvedValue({
      items: [],
      total: 0,
    })

    const result = await useCase.execute({ page: 1, limit: 10 })

    expect(result.data.pagination.totalPages).toBe(1)
  })

  it('should map entities to response DTOs', async () => {
    const mockIngredient = new IngredientEntity({
      id: '1',
      name: 'Tomato',
      quantity: 5,
      unit: 'kg',
      expirationDate: new Date('2024-12-31'),
      category: 'VEGETABLE',
      status: INGREDIENT_STATUS.AVAILABLE,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })

    vi.mocked(mockRepository.findAll).mockResolvedValue({
      items: [mockIngredient],
      total: 1,
    })

    const result = await useCase.execute({})

    const item = result.data.items[0]
    expect(item).toEqual({
      id: '1',
      name: 'Tomato',
      quantity: 5,
      unit: 'kg',
      expirationDate: '2024-12-31',
      category: 'VEGETABLE',
      status: INGREDIENT_STATUS.AVAILABLE,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    })
  })

  it('should handle optional fields correctly', async () => {
    const mockIngredient = new IngredientEntity({
      id: '1',
      name: 'Salt',
      status: INGREDIENT_STATUS.AVAILABLE,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })

    vi.mocked(mockRepository.findAll).mockResolvedValue({
      items: [mockIngredient],
      total: 1,
    })

    const result = await useCase.execute({})

    const item = result.data.items[0]
    expect(item.quantity).toBeUndefined()
    expect(item.unit).toBeUndefined()
    expect(item.expirationDate).toBeUndefined()
    expect(item.category).toBeUndefined()
  })
})