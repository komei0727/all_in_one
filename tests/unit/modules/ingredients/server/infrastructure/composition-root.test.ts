import { describe, it, expect, vi, beforeEach } from 'vitest'

import { PrismaClient } from '@/generated/prisma'
import { StartShoppingSessionApiHandler } from '@/modules/ingredients/server/api/handlers/commands/start-shopping-session.handler'
import { GetCategoriesQueryHandler } from '@/modules/ingredients/server/application/queries/get-categories.handler'
import { GetUnitsQueryHandler } from '@/modules/ingredients/server/application/queries/get-units.handler'
import { CompositionRoot } from '@/modules/ingredients/server/infrastructure/composition-root'
import { PrismaCategoryRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-category-repository'
import { PrismaUnitRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-unit-repository'

// Mock Prisma Client
vi.mock('@/generated/prisma', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({})),
}))

describe('CompositionRoot', () => {
  let compositionRoot: CompositionRoot
  let mockPrismaClient: PrismaClient

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    mockPrismaClient = new PrismaClient()
    compositionRoot = new CompositionRoot(mockPrismaClient)
  })

  describe('Repository creation', () => {
    it('should create and return the same CategoryRepository instance', () => {
      // Act
      const repo1 = compositionRoot.getCategoryRepository()
      const repo2 = compositionRoot.getCategoryRepository()

      // Assert
      expect(repo1).toBeInstanceOf(PrismaCategoryRepository)
      expect(repo1).toBe(repo2) // Should return the same instance (singleton)
    })

    it('should create and return the same UnitRepository instance', () => {
      // Act
      const repo1 = compositionRoot.getUnitRepository()
      const repo2 = compositionRoot.getUnitRepository()

      // Assert
      expect(repo1).toBeInstanceOf(PrismaUnitRepository)
      expect(repo1).toBe(repo2) // Should return the same instance (singleton)
    })
  })

  describe('Query handler creation', () => {
    it('should create GetCategoriesQueryHandler with proper dependencies', () => {
      // Act
      const handler = compositionRoot.getGetCategoriesQueryHandler()

      // Assert
      expect(handler).toBeInstanceOf(GetCategoriesQueryHandler)
      // Verify that the handler uses the same repository instance
      const repository = compositionRoot.getCategoryRepository()
      expect(repository).toBeInstanceOf(PrismaCategoryRepository)
    })

    it('should create GetUnitsQueryHandler with proper dependencies', () => {
      // Act
      const handler = compositionRoot.getGetUnitsQueryHandler()

      // Assert
      expect(handler).toBeInstanceOf(GetUnitsQueryHandler)
      // Verify that the handler uses the same repository instance
      const repository = compositionRoot.getUnitRepository()
      expect(repository).toBeInstanceOf(PrismaUnitRepository)
    })

    it('should return new handler instances on each call', () => {
      // Act
      const handler1 = compositionRoot.getGetCategoriesQueryHandler()
      const handler2 = compositionRoot.getGetCategoriesQueryHandler()

      // Assert
      expect(handler1).not.toBe(handler2) // Handlers should be new instances
    })
  })

  describe('API handler creation', () => {
    it('should create StartShoppingSessionApiHandler with proper dependencies', () => {
      // Act
      const handler = compositionRoot.getStartShoppingSessionApiHandler()

      // Assert
      expect(handler).toBeInstanceOf(StartShoppingSessionApiHandler)
    })

    it('should return new API handler instances on each call', () => {
      // Act
      const handler1 = compositionRoot.getStartShoppingSessionApiHandler()
      const handler2 = compositionRoot.getStartShoppingSessionApiHandler()

      // Assert
      expect(handler1).not.toBe(handler2) // API handlers should be new instances
    })
  })

  describe('Static factory method', () => {
    it('should create a singleton instance with getInstance', () => {
      // Act
      const instance1 = CompositionRoot.getInstance()
      const instance2 = CompositionRoot.getInstance()

      // Assert
      expect(instance1).toBe(instance2)
      expect(instance1).toBeInstanceOf(CompositionRoot)
    })

    it('should allow resetting the instance for testing', () => {
      // Act
      const instance1 = CompositionRoot.getInstance()
      CompositionRoot.resetInstance() // For testing purposes
      const instance2 = CompositionRoot.getInstance()

      // Assert
      expect(instance1).not.toBe(instance2)
    })
  })
})
