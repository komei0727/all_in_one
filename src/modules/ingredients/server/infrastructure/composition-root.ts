import type { PrismaClient } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'

import { PrismaCategoryRepository } from './repositories/prisma-category-repository'
import { PrismaIngredientRepository } from './repositories/prisma-ingredient-repository'
import { PrismaUnitRepository } from './repositories/prisma-unit-repository'
import { CreateIngredientApiHandler } from '../api/handlers/commands/create-ingredient.handler'
import { UpdateIngredientApiHandler } from '../api/handlers/commands/update-ingredient.handler'
import { CreateIngredientHandler } from '../application/commands/create-ingredient.handler'
import { DeleteIngredientHandler } from '../application/commands/delete-ingredient.handler'
import { UpdateIngredientHandler } from '../application/commands/update-ingredient.handler'
import { GetCategoriesQueryHandler } from '../application/queries/get-categories.handler'
import { GetIngredientByIdHandler } from '../application/queries/get-ingredient-by-id.handler'
import { GetIngredientsHandler } from '../application/queries/get-ingredients.handler'
import { GetUnitsQueryHandler } from '../application/queries/get-units.handler'

import type { CategoryRepository } from '../domain/repositories/category-repository.interface'
import type { IngredientRepository } from '../domain/repositories/ingredient-repository.interface'
import type { UnitRepository } from '../domain/repositories/unit-repository.interface'

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

  /**
   * Get GetIngredientsHandler instance (new instance each time)
   */
  public getGetIngredientsHandler(): GetIngredientsHandler {
    return new GetIngredientsHandler(this.getIngredientRepository())
  }

  /**
   * Get GetIngredientByIdHandler instance (new instance each time)
   */
  public getGetIngredientByIdHandler(): GetIngredientByIdHandler {
    return new GetIngredientByIdHandler(
      this.getIngredientRepository(),
      this.getCategoryRepository(),
      this.getUnitRepository()
    )
  }

  /**
   * Get UpdateIngredientHandler instance (new instance each time)
   */
  public getUpdateIngredientHandler(): UpdateIngredientHandler {
    return new UpdateIngredientHandler(
      this.getIngredientRepository(),
      this.getCategoryRepository(),
      this.getUnitRepository()
    )
  }

  /**
   * Get UpdateIngredientApiHandler instance (new instance each time)
   */
  public getUpdateIngredientApiHandler(): UpdateIngredientApiHandler {
    return new UpdateIngredientApiHandler(this.getUpdateIngredientHandler())
  }

  /**
   * Get DeleteIngredientHandler instance (new instance each time)
   */
  public getDeleteIngredientHandler(): DeleteIngredientHandler {
    return new DeleteIngredientHandler(this.getIngredientRepository())
  }
}
