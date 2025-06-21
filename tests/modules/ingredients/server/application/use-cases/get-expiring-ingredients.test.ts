import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GetExpiringIngredientsUseCase } from '@/modules/ingredients/server/application/use-cases/get-expiring-ingredients'
import { IngredientEntity } from '@/modules/ingredients/server/domain/entities/ingredient'
import type { IIngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import { INGREDIENT_STATUS, DEFAULT_EXPIRING_DAYS } from '@/modules/ingredients/shared/constants'

// Mock repository
const mockRepository: IIngredientRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findExpiringWithinDays: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

describe('GetExpiringIngredientsUseCase', () => {
  let useCase: GetExpiringIngredientsUseCase

  beforeEach(() => {
    useCase = new GetExpiringIngredientsUseCase(mockRepository)
    vi.clearAllMocks()
  })

  it('should return expiring ingredients within specified days', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const inThreeDays = new Date()
    inThreeDays.setDate(inThreeDays.getDate() + 3)

    const mockIngredients = [
      new IngredientEntity({
        id: '1',
        name: 'Milk',
        expirationDate: tomorrow,
        status: INGREDIENT_STATUS.AVAILABLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new IngredientEntity({
        id: '2',
        name: 'Yogurt',
        expirationDate: inThreeDays,
        status: INGREDIENT_STATUS.AVAILABLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ]

    vi.mocked(mockRepository.findExpiringWithinDays).mockResolvedValue(mockIngredients)

    const result = await useCase.execute({ days: 7 })

    expect(result.data.items).toHaveLength(2)
    expect(result.data.count).toBe(2)
    expect(result.data.items[0].name).toBe('Milk')
    expect(result.data.items[1].name).toBe('Yogurt')

    expect(mockRepository.findExpiringWithinDays).toHaveBeenCalledWith(7)
  })

  it('should use default days when not specified', async () => {
    vi.mocked(mockRepository.findExpiringWithinDays).mockResolvedValue([])

    await useCase.execute({})

    expect(mockRepository.findExpiringWithinDays).toHaveBeenCalledWith(
      DEFAULT_EXPIRING_DAYS
    )
  })

  it('should return empty array when no ingredients are expiring', async () => {
    vi.mocked(mockRepository.findExpiringWithinDays).mockResolvedValue([])

    const result = await useCase.execute({ days: 3 })

    expect(result.data.items).toHaveLength(0)
    expect(result.data.count).toBe(0)
  })

  it('should map entities to response DTOs correctly', async () => {
    const expirationDate = new Date('2024-12-31')

    const mockIngredient = new IngredientEntity({
      id: '1',
      name: 'Milk',
      quantity: 1,
      unit: 'l',
      expirationDate,
      category: 'DAIRY',
      status: INGREDIENT_STATUS.LOW,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    })

    vi.mocked(mockRepository.findExpiringWithinDays).mockResolvedValue([mockIngredient])

    const result = await useCase.execute({ days: 30 })

    expect(result.data.items[0]).toEqual({
      id: '1',
      name: 'Milk',
      quantity: 1,
      unit: 'l',
      expirationDate: '2024-12-31',
      category: 'DAIRY',
      status: INGREDIENT_STATUS.LOW,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    })
  })

  it('should handle optional fields correctly', async () => {
    const mockIngredient = new IngredientEntity({
      id: '1',
      name: 'Salt',
      expirationDate: new Date('2024-12-31'),
      status: INGREDIENT_STATUS.AVAILABLE,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    vi.mocked(mockRepository.findExpiringWithinDays).mockResolvedValue([mockIngredient])

    const result = await useCase.execute({ days: 365 })

    const item = result.data.items[0]
    expect(item.quantity).toBeUndefined()
    expect(item.unit).toBeUndefined()
    expect(item.category).toBeUndefined()
  })
})