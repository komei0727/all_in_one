import { PrismaClient } from '@prisma/client'

import { prisma } from '@/lib/prisma/client'

import { GetCategoriesQueryHandler } from '../server/application/queries/get-categories'
import { GetUnitsQueryHandler } from '../server/application/queries/get-units'
import { CategoryRepository } from '../server/domain/repositories/category-repository.interface'
import { UnitRepository } from '../server/domain/repositories/unit-repository.interface'
import { PrismaCategoryRepository } from '../server/infrastructure/repositories/prisma-category-repository'
import { PrismaUnitRepository } from '../server/infrastructure/repositories/prisma-unit-repository'

/**
 * Composition Root - Dependency Injection Container
 *
 * This class is responsible for composing the object graph and managing dependencies.
 * It follows the Composition Root pattern to centralize dependency injection.
 */
export class CompositionRoot {
  private static instance: CompositionRoot | null = null

  // Singleton instances for repositories
  private categoryRepository: CategoryRepository | null = null
  private unitRepository: UnitRepository | null = null

  constructor(private readonly prismaClient: PrismaClient) {}

  /**
   * Get singleton instance of CompositionRoot
   * Uses the global prisma client by default
   */
  public static getInstance(prismaClient?: PrismaClient): CompositionRoot {
    if (!CompositionRoot.instance) {
      const client = prismaClient || prisma
      CompositionRoot.instance = new CompositionRoot(client)
    }
    return CompositionRoot.instance
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    CompositionRoot.instance = null
  }

  /**
   * Get CategoryRepository instance (singleton)
   */
  public getCategoryRepository(): CategoryRepository {
    if (!this.categoryRepository) {
      this.categoryRepository = new PrismaCategoryRepository(this.prismaClient)
    }
    return this.categoryRepository
  }

  /**
   * Get UnitRepository instance (singleton)
   */
  public getUnitRepository(): UnitRepository {
    if (!this.unitRepository) {
      this.unitRepository = new PrismaUnitRepository(this.prismaClient)
    }
    return this.unitRepository
  }

  /**
   * Get GetCategoriesQueryHandler instance (new instance each time)
   */
  public getGetCategoriesQueryHandler(): GetCategoriesQueryHandler {
    return new GetCategoriesQueryHandler(this.getCategoryRepository())
  }

  /**
   * Get GetUnitsQueryHandler instance (new instance each time)
   */
  public getGetUnitsQueryHandler(): GetUnitsQueryHandler {
    return new GetUnitsQueryHandler(this.getUnitRepository())
  }
}
