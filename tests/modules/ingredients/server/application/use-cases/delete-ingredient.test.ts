import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DeleteIngredientUseCase } from '@/modules/ingredients/server/application/use-cases/delete-ingredient'
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

describe('DeleteIngredientUseCase', () => {
  let useCase: DeleteIngredientUseCase

  beforeEach(() => {
    useCase = new DeleteIngredientUseCase(mockRepository)
    vi.clearAllMocks()
  })

  it('should delete ingredient when it exists', async () => {
    const existingIngredient = new IngredientEntity({
      id: '1',
      name: 'Tomato',
      status: INGREDIENT_STATUS.AVAILABLE,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    vi.mocked(mockRepository.findById).mockResolvedValue(existingIngredient)
    vi.mocked(mockRepository.delete).mockResolvedValue(undefined)

    await useCase.execute('1')

    expect(mockRepository.findById).toHaveBeenCalledWith('1')
    expect(mockRepository.delete).toHaveBeenCalledWith('1')
  })

  it('should throw IngredientNotFoundError when ingredient not found', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null)

    await expect(useCase.execute('non-existent')).rejects.toThrow(IngredientNotFoundError)

    expect(mockRepository.findById).toHaveBeenCalledWith('non-existent')
    expect(mockRepository.delete).not.toHaveBeenCalled()
  })

  it('should handle repository errors', async () => {
    const existingIngredient = new IngredientEntity({
      id: '1',
      name: 'Tomato',
      status: INGREDIENT_STATUS.AVAILABLE,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    vi.mocked(mockRepository.findById).mockResolvedValue(existingIngredient)
    vi.mocked(mockRepository.delete).mockRejectedValue(new Error('Database error'))

    await expect(useCase.execute('1')).rejects.toThrow('Database error')
  })
})
