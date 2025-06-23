import { vi } from 'vitest'

import type { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import type { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import type { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'

/**
 * IngredientRepositoryのモックを作成する
 */
export const createMockIngredientRepository = (): IngredientRepository => ({
  save: vi.fn(),
  findById: vi.fn(),
  findByName: vi.fn(),
  findAll: vi.fn(),
  delete: vi.fn(),
})

/**
 * CategoryRepositoryのモックを作成する
 */
export const createMockCategoryRepository = (): CategoryRepository => ({
  findById: vi.fn(),
  findAllActive: vi.fn(),
})

/**
 * UnitRepositoryのモックを作成する
 */
export const createMockUnitRepository = (): UnitRepository => ({
  findById: vi.fn(),
  findAllActive: vi.fn(),
})
