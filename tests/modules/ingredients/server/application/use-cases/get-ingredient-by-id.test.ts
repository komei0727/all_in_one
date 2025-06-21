import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GetIngredientByIdUseCase } from '@/modules/ingredients/server/application/use-cases/get-ingredient-by-id'
import { IngredientEntity } from '@/modules/ingredients/server/domain/entities/ingredient'
import type { IIngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import { INGREDIENT_STATUS } from '@/modules/ingredients/shared/constants'
import { IngredientNotFoundError } from '@/modules/ingredients/server/application/errors'

// Mock repository
const mockRepository: IIngredientRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findExpiringWithinDays: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

describe('GetIngredientByIdUseCase', () => {
  let useCase: GetIngredientByIdUseCase

  beforeEach(() => {
    useCase = new GetIngredientByIdUseCase(mockRepository)
    vi.clearAllMocks()
  })

  it('should return ingredient when found', async () => {
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

    vi.mocked(mockRepository.findById).mockResolvedValue(mockIngredient)

    const result = await useCase.execute('1')

    expect(result).toEqual({
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

    expect(mockRepository.findById).toHaveBeenCalledWith('1')
  })

  it('should throw IngredientNotFoundError when not found', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null)

    await expect(useCase.execute('non-existent')).rejects.toThrow(
      IngredientNotFoundError
    )

    expect(mockRepository.findById).toHaveBeenCalledWith('non-existent')
  })

  it('should handle optional fields correctly', async () => {
    const mockIngredient = new IngredientEntity({
      id: '1',
      name: 'Salt',
      status: INGREDIENT_STATUS.AVAILABLE,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })

    vi.mocked(mockRepository.findById).mockResolvedValue(mockIngredient)

    const result = await useCase.execute('1')

    expect(result.quantity).toBeUndefined()
    expect(result.unit).toBeUndefined()
    expect(result.expirationDate).toBeUndefined()
    expect(result.category).toBeUndefined()
  })
})