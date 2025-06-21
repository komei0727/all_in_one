import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UpdateIngredientUseCase } from '@/modules/ingredients/server/application/use-cases/update-ingredient'
import { IngredientEntity } from '@/modules/ingredients/server/domain/entities/ingredient'
import type { IIngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import { INGREDIENT_STATUS } from '@/modules/ingredients/shared/constants'
import type { UpdateIngredientInput } from '@/modules/ingredients/shared/validations/schemas'
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

describe('UpdateIngredientUseCase', () => {
  let useCase: UpdateIngredientUseCase

  beforeEach(() => {
    useCase = new UpdateIngredientUseCase(mockRepository)
    vi.clearAllMocks()
  })

  it('should update ingredient with all fields', async () => {
    const existingIngredient = new IngredientEntity({
      id: '1',
      name: 'Tomato',
      quantity: 5,
      unit: 'kg',
      category: 'VEGETABLE',
      status: INGREDIENT_STATUS.AVAILABLE,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })

    const input: UpdateIngredientInput = {
      name: 'Fresh Tomato',
      quantity: 10,
      unit: 'piece',
      expirationDate: '2024-12-31',
      category: 'FRUIT',
      status: INGREDIENT_STATUS.LOW,
    }

    const updatedEntity = new IngredientEntity({
      id: '1',
      name: 'Fresh Tomato',
      quantity: 10,
      unit: 'piece',
      expirationDate: new Date('2024-12-31'),
      category: 'FRUIT',
      status: INGREDIENT_STATUS.LOW,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
    })

    vi.mocked(mockRepository.findById).mockResolvedValue(existingIngredient)
    vi.mocked(mockRepository.update).mockResolvedValue(updatedEntity)

    const result = await useCase.execute('1', input)

    expect(result.name).toBe('Fresh Tomato')
    expect(result.quantity).toBe(10)
    expect(result.unit).toBe('piece')
    expect(result.expirationDate).toBe('2024-12-31')
    expect(result.category).toBe('FRUIT')
    expect(result.status).toBe(INGREDIENT_STATUS.LOW)
  })

  it('should update only specified fields', async () => {
    const existingIngredient = new IngredientEntity({
      id: '1',
      name: 'Tomato',
      quantity: 5,
      unit: 'kg',
      category: 'VEGETABLE',
      status: INGREDIENT_STATUS.AVAILABLE,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })

    const input: UpdateIngredientInput = {
      quantity: 2,
      status: INGREDIENT_STATUS.LOW,
    }

    vi.mocked(mockRepository.findById).mockResolvedValue(existingIngredient)
    vi.mocked(mockRepository.update).mockImplementation(async (entity) => entity)

    await useCase.execute('1', input)

    const updateCall = vi.mocked(mockRepository.update).mock.calls[0][0]
    expect(updateCall.name).toBe('Tomato') // Unchanged
    expect(updateCall.quantity).toBe(2) // Updated
    expect(updateCall.unit).toBe('kg') // Unchanged
    expect(updateCall.category).toBe('VEGETABLE') // Unchanged
    expect(updateCall.status).toBe(INGREDIENT_STATUS.LOW) // Updated
  })

  it('should throw IngredientNotFoundError when ingredient not found', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null)

    const input: UpdateIngredientInput = {
      name: 'New Name',
    }

    await expect(useCase.execute('non-existent', input)).rejects.toThrow(
      IngredientNotFoundError
    )

    expect(mockRepository.update).not.toHaveBeenCalled()
  })

  it('should handle empty update input', async () => {
    const existingIngredient = new IngredientEntity({
      id: '1',
      name: 'Tomato',
      quantity: 5,
      status: INGREDIENT_STATUS.AVAILABLE,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })

    vi.mocked(mockRepository.findById).mockResolvedValue(existingIngredient)
    vi.mocked(mockRepository.update).mockImplementation(async (entity) => entity)

    const result = await useCase.execute('1', {})

    // Should return unchanged ingredient
    expect(result.name).toBe('Tomato')
    expect(result.quantity).toBe(5)
    expect(result.status).toBe(INGREDIENT_STATUS.AVAILABLE)
  })

  it('should convert date string to Date object', async () => {
    const existingIngredient = new IngredientEntity({
      id: '1',
      name: 'Milk',
      status: INGREDIENT_STATUS.AVAILABLE,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })

    const input: UpdateIngredientInput = {
      expirationDate: '2024-12-31',
    }

    vi.mocked(mockRepository.findById).mockResolvedValue(existingIngredient)
    vi.mocked(mockRepository.update).mockImplementation(async (entity) => entity)

    await useCase.execute('1', input)

    const updateCall = vi.mocked(mockRepository.update).mock.calls[0][0]
    expect(updateCall.expirationDate).toBeInstanceOf(Date)
    expect(updateCall.expirationDate?.toISOString()).toBe('2024-12-31T00:00:00.000Z')
  })
})