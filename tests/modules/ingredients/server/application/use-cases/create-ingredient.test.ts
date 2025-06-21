import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreateIngredientUseCase } from '@/modules/ingredients/server/application/use-cases/create-ingredient'
import { IngredientEntity } from '@/modules/ingredients/server/domain/entities/ingredient'
import type { IIngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import { INGREDIENT_STATUS } from '@/modules/ingredients/shared/constants'
import type { CreateIngredientInput } from '@/modules/ingredients/shared/validations/schemas'

// Mock repository
const mockRepository: IIngredientRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findExpiringWithinDays: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

// Mock ID generator
const mockGenerateId = vi.fn(() => 'generated-id')

describe('CreateIngredientUseCase', () => {
  let useCase: CreateIngredientUseCase

  beforeEach(() => {
    useCase = new CreateIngredientUseCase(mockRepository, mockGenerateId)
    vi.clearAllMocks()
  })

  it('should create ingredient with all fields', async () => {
    const input: CreateIngredientInput = {
      name: 'Tomato',
      quantity: 5,
      unit: 'kg',
      expirationDate: '2024-12-31',
      category: 'VEGETABLE',
    }

    const createdEntity = new IngredientEntity({
      id: 'generated-id',
      name: 'Tomato',
      quantity: 5,
      unit: 'kg',
      expirationDate: new Date('2024-12-31'),
      category: 'VEGETABLE',
      status: INGREDIENT_STATUS.AVAILABLE,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    vi.mocked(mockRepository.create).mockResolvedValue(createdEntity)

    const result = await useCase.execute(input)

    expect(result.id).toBe('generated-id')
    expect(result.name).toBe('Tomato')
    expect(result.quantity).toBe(5)
    expect(result.unit).toBe('kg')
    expect(result.expirationDate).toBe('2024-12-31')
    expect(result.category).toBe('VEGETABLE')
    expect(result.status).toBe(INGREDIENT_STATUS.AVAILABLE)

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'generated-id',
        name: 'Tomato',
        quantity: 5,
        unit: 'kg',
        category: 'VEGETABLE',
        status: INGREDIENT_STATUS.AVAILABLE,
      })
    )
  })

  it('should create ingredient with minimal fields', async () => {
    const input: CreateIngredientInput = {
      name: 'Salt',
    }

    const createdEntity = new IngredientEntity({
      id: 'generated-id',
      name: 'Salt',
      status: INGREDIENT_STATUS.AVAILABLE,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    vi.mocked(mockRepository.create).mockResolvedValue(createdEntity)

    const result = await useCase.execute(input)

    expect(result.id).toBe('generated-id')
    expect(result.name).toBe('Salt')
    expect(result.quantity).toBeUndefined()
    expect(result.unit).toBeUndefined()
    expect(result.expirationDate).toBeUndefined()
    expect(result.category).toBeUndefined()
    expect(result.status).toBe(INGREDIENT_STATUS.AVAILABLE)
  })

  it('should determine initial status based on quantity', async () => {
    const testCases = [
      { quantity: 0, expectedStatus: INGREDIENT_STATUS.OUT },
      { quantity: 3, expectedStatus: INGREDIENT_STATUS.LOW },
      { quantity: 10, expectedStatus: INGREDIENT_STATUS.AVAILABLE },
      { quantity: undefined, expectedStatus: INGREDIENT_STATUS.AVAILABLE },
    ]

    for (const { quantity, expectedStatus } of testCases) {
      vi.clearAllMocks()

      const input: CreateIngredientInput = {
        name: 'Test',
        quantity,
      }

      vi.mocked(mockRepository.create).mockImplementation(async (entity) => entity)

      await useCase.execute(input)

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expectedStatus,
        })
      )
    }
  })

  it('should convert date string to Date object', async () => {
    const input: CreateIngredientInput = {
      name: 'Milk',
      expirationDate: '2024-12-31',
    }

    vi.mocked(mockRepository.create).mockImplementation(async (entity) => entity)

    await useCase.execute(input)

    const createCall = vi.mocked(mockRepository.create).mock.calls[0][0]
    expect(createCall.expirationDate).toBeInstanceOf(Date)
    expect(createCall.expirationDate?.toISOString()).toBe('2024-12-31T00:00:00.000Z')
  })
})