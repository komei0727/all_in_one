import { describe, it, expect, vi, beforeEach } from 'vitest'

import { PrismaClient } from '@/generated/prisma'
import { InfrastructureCompositionRoot } from '@/modules/ingredients/server/infrastructure/infrastructure-composition-root'
import { PrismaCategoryRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-category-repository'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'
import { PrismaShoppingSessionRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-shopping-session-repository'
import { PrismaUnitRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-unit-repository'

// Mock Prisma Client
vi.mock('@/generated/prisma', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({})),
}))

describe('InfrastructureCompositionRoot', () => {
  let infraRoot: InfrastructureCompositionRoot
  let mockPrismaClient: PrismaClient

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    mockPrismaClient = new PrismaClient()
    infraRoot = new InfrastructureCompositionRoot(mockPrismaClient)
  })

  describe('Repository creation', () => {
    it('カテゴリリポジトリのシングルトンインスタンスを作成・取得できる', () => {
      // Act
      const repo1 = infraRoot.getCategoryRepository()
      const repo2 = infraRoot.getCategoryRepository()

      // Assert
      expect(repo1).toBeInstanceOf(PrismaCategoryRepository)
      expect(repo1).toBe(repo2) // Should return the same instance (singleton)
    })

    it('単位リポジトリのシングルトンインスタンスを作成・取得できる', () => {
      // Act
      const repo1 = infraRoot.getUnitRepository()
      const repo2 = infraRoot.getUnitRepository()

      // Assert
      expect(repo1).toBeInstanceOf(PrismaUnitRepository)
      expect(repo1).toBe(repo2) // Should return the same instance (singleton)
    })

    it('食材リポジトリのシングルトンインスタンスを作成・取得できる', () => {
      // Act
      const repo1 = infraRoot.getIngredientRepository()
      const repo2 = infraRoot.getIngredientRepository()

      // Assert
      expect(repo1).toBeInstanceOf(PrismaIngredientRepository)
      expect(repo1).toBe(repo2) // Should return the same instance (singleton)
    })

    it('買い物セッションリポジトリのシングルトンインスタンスを作成・取得できる', () => {
      // Act
      const repo1 = infraRoot.getShoppingSessionRepository()
      const repo2 = infraRoot.getShoppingSessionRepository()

      // Assert
      expect(repo1).toBeInstanceOf(PrismaShoppingSessionRepository)
      expect(repo1).toBe(repo2) // Should return the same instance (singleton)
    })
  })

  describe('Query service creation', () => {
    it('食材クエリサービスのシングルトンインスタンスを作成・取得できる', () => {
      // Act
      const service1 = infraRoot.getIngredientQueryService()
      const service2 = infraRoot.getIngredientQueryService()

      // Assert
      expect(service1).toBe(service2) // Should return the same instance (singleton)
    })

    it('買い物クエリサービスのシングルトンインスタンスを作成・取得できる', () => {
      // Act
      const service1 = infraRoot.getShoppingQueryService()
      const service2 = infraRoot.getShoppingQueryService()

      // Assert
      expect(service1).toBe(service2) // Should return the same instance (singleton)
    })
  })

  describe('Infrastructure services creation', () => {
    it('トランザクションマネージャーのシングルトンインスタンスを作成・取得できる', () => {
      // Act
      const manager1 = infraRoot.getTransactionManager()
      const manager2 = infraRoot.getTransactionManager()

      // Assert
      expect(manager1).toBe(manager2) // Should return the same instance (singleton)
    })

    it('イベントバスのシングルトンインスタンスを作成・取得できる', () => {
      // Act
      const bus1 = infraRoot.getEventBus()
      const bus2 = infraRoot.getEventBus()

      // Assert
      expect(bus1).toBe(bus2) // Should return the same instance (singleton)
    })

    it('リポジトリファクトリーのシングルトンインスタンスを作成・取得できる', () => {
      // Act
      const factory1 = infraRoot.getRepositoryFactory()
      const factory2 = infraRoot.getRepositoryFactory()

      // Assert
      expect(factory1).toBe(factory2) // Should return the same instance (singleton)
    })
  })
})
