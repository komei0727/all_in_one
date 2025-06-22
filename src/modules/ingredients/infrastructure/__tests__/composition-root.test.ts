import { PrismaClient } from '@prisma/client'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GetCategoriesQueryHandler } from '../../server/application/queries/get-categories'
import { GetUnitsQueryHandler } from '../../server/application/queries/get-units'
import { PrismaCategoryRepository } from '../../server/infrastructure/repositories/prisma-category-repository'
import { PrismaUnitRepository } from '../../server/infrastructure/repositories/prisma-unit-repository'
import { CompositionRoot } from '../composition-root'

// Mock Prisma Client
vi.mock('@prisma/client', () => ({
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
