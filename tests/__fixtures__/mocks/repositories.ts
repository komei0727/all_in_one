import { vi } from 'vitest'

import type { CategoryRepository } from '@/modules/ingredients/server/domain/repositories/category-repository.interface'
import type { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import type { UnitRepository } from '@/modules/ingredients/server/domain/repositories/unit-repository.interface'
import type { TransactionManager } from '@/modules/shared/server/application/services/transaction-manager.interface'

/**
 * IngredientRepositoryのモックを作成する
 */
export const createMockIngredientRepository = (): IngredientRepository => ({
  save: vi.fn(),
  findById: vi.fn(),
  findByName: vi.fn(),
  findByUserId: vi.fn(),
  findAll: vi.fn(),
  findExpiringSoon: vi.fn(),
  findExpired: vi.fn(),
  findByCategory: vi.fn(),
  findByStorageLocation: vi.fn(),
  findOutOfStock: vi.fn(),
  findLowStock: vi.fn(),
  existsByUserAndNameAndExpiryAndLocation: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  findDuplicates: vi.fn(),
  update: vi.fn(),
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

/**
 * TransactionManagerのモックを作成する
 */
export const createMockTransactionManager = (): TransactionManager => ({
  run: vi.fn().mockImplementation(async (fn) => {
    // デフォルトではそのまま関数を実行
    return fn({})
  }),
})
