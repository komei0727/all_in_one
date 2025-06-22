import type { PrismaClient } from '@prisma/client'

import { prisma } from '@/lib/prisma/client'

import { PrismaCategoryRepository } from './repositories/prisma-category-repository'
import { PrismaIngredientRepository } from './repositories/prisma-ingredient-repository'
import { PrismaUnitRepository } from './repositories/prisma-unit-repository'
import { CreateIngredientApiHandler } from '../api/handlers/commands/create-ingredient.handler'
import { CreateIngredientHandler } from '../application/commands/create-ingredient.handler'
import { GetCategoriesQueryHandler } from '../application/queries/get-categories'
import { GetUnitsQueryHandler } from '../application/queries/get-units'
import { CategoryRepository } from '../domain/repositories/category-repository.interface'
import { IngredientRepository } from '../domain/repositories/ingredient-repository.interface'
import { UnitRepository } from '../domain/repositories/unit-repository.interface'

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
  private ingredientRepository: IngredientRepository | null = null

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

  /**
   * Get IngredientRepository instance (singleton)
   */
  public getIngredientRepository(): IngredientRepository {
    if (!this.ingredientRepository) {
      this.ingredientRepository = new PrismaIngredientRepository(this.prismaClient)
    }
    return this.ingredientRepository
  }

  /**
   * Get CreateIngredientHandler instance (new instance each time)
   */
  public getCreateIngredientHandler(): CreateIngredientHandler {
    return new CreateIngredientHandler(
      this.getIngredientRepository(),
      this.getCategoryRepository(),
      this.getUnitRepository()
    )
  }

  /**
   * Get CreateIngredientApiHandler instance (new instance each time)
   */
  public getCreateIngredientApiHandler(): CreateIngredientApiHandler {
    return new CreateIngredientApiHandler(
      this.getCreateIngredientHandler(),
      this.getCategoryRepository(),
      this.getUnitRepository()
    )
  }
}
