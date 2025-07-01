import type { PrismaClient } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import type { EventBus } from '@/modules/shared/server/application/services/event-bus.interface'
import type { TransactionManager } from '@/modules/shared/server/application/services/transaction-manager.interface'

import { PrismaIngredientQueryService } from './query-services/prisma-ingredient-query-service'
import { PrismaCategoryRepository } from './repositories/prisma-category-repository'
import { PrismaIngredientRepository } from './repositories/prisma-ingredient-repository'
import { PrismaRepositoryFactory } from './repositories/prisma-repository-factory'
import { PrismaUnitRepository } from './repositories/prisma-unit-repository'
import { PrismaTransactionManager } from './services/prisma-transaction-manager'
import { CreateIngredientApiHandler } from '../api/handlers/commands/create-ingredient.handler'
import { UpdateIngredientApiHandler } from '../api/handlers/commands/update-ingredient.handler'
import { CreateIngredientHandler } from '../application/commands/create-ingredient.handler'
import { DeleteIngredientHandler } from '../application/commands/delete-ingredient.handler'
import { UpdateIngredientHandler } from '../application/commands/update-ingredient.handler'
import { GetCategoriesQueryHandler } from '../application/queries/get-categories.handler'
import { GetIngredientByIdHandler } from '../application/queries/get-ingredient-by-id.handler'
import { GetIngredientsHandler } from '../application/queries/get-ingredients.handler'
import { GetUnitsQueryHandler } from '../application/queries/get-units.handler'

import type { IngredientQueryService } from '../application/query-services/ingredient-query-service.interface'
import type { CategoryRepository } from '../domain/repositories/category-repository.interface'
import type { IngredientRepository } from '../domain/repositories/ingredient-repository.interface'
import type { RepositoryFactory } from '../domain/repositories/repository-factory.interface'
import type { ShoppingSessionRepository } from '../domain/repositories/shopping-session-repository.interface'
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
  private shoppingSessionRepository: ShoppingSessionRepository | null = null
  private repositoryFactory: RepositoryFactory | null = null
  private ingredientQueryService: IngredientQueryService | null = null
  private transactionManager: TransactionManager | null = null
  private eventBus: EventBus | null = null

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
   * Get RepositoryFactory instance (singleton)
   */
  public getRepositoryFactory(): RepositoryFactory {
    if (!this.repositoryFactory) {
      this.repositoryFactory = new PrismaRepositoryFactory()
    }
    return this.repositoryFactory
  }

  /**
   * Get TransactionManager instance (singleton)
   */
  public getTransactionManager(): TransactionManager {
    if (!this.transactionManager) {
      this.transactionManager = new PrismaTransactionManager(this.prismaClient)
    }
    return this.transactionManager
  }

  /**
   * Get EventBus instance (singleton)
   * TODO: 実際のEventBus実装を追加する必要があります
   */
  public getEventBus(): EventBus {
    if (!this.eventBus) {
      // 現在はダミー実装を返す
      this.eventBus = {
        publish: async () => {},
        publishAll: async () => {},
      }
    }
    return this.eventBus
  }

  /**
   * Get CreateIngredientHandler instance (new instance each time)
   */
  public getCreateIngredientHandler(): CreateIngredientHandler {
    return new CreateIngredientHandler(
      this.getIngredientRepository(),
      this.getCategoryRepository(),
      this.getUnitRepository(),
      this.getRepositoryFactory(),
      this.getTransactionManager(),
      this.getEventBus()
    )
  }

  /**
   * Get CreateIngredientApiHandler instance (new instance each time)
   */
  public getCreateIngredientApiHandler(): CreateIngredientApiHandler {
    return new CreateIngredientApiHandler(this.getCreateIngredientHandler())
  }

  /**
   * Get GetIngredientsHandler instance (new instance each time)
   */
  public getGetIngredientsHandler(): GetIngredientsHandler {
    return new GetIngredientsHandler(
      this.getIngredientRepository(),
      this.getCategoryRepository(),
      this.getUnitRepository()
    )
  }

  /**
   * Get IngredientQueryService instance (singleton)
   */
  public getIngredientQueryService(): IngredientQueryService {
    if (!this.ingredientQueryService) {
      this.ingredientQueryService = new PrismaIngredientQueryService(this.prismaClient)
    }
    return this.ingredientQueryService
  }

  /**
   * Get GetIngredientByIdHandler instance (new instance each time)
   * Uses new QueryService-based implementation for improved performance
   */
  public getGetIngredientByIdHandler(): GetIngredientByIdHandler {
    return new GetIngredientByIdHandler(this.getIngredientQueryService())
  }

  /**
   * Get UpdateIngredientHandler instance (new instance each time)
   */
  public getUpdateIngredientHandler(): UpdateIngredientHandler {
    return new UpdateIngredientHandler(
      this.getIngredientRepository(),
      this.getCategoryRepository(),
      this.getUnitRepository(),
      this.getRepositoryFactory(),
      this.getTransactionManager()
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
    return new DeleteIngredientHandler(
      this.getIngredientRepository(),
      this.getRepositoryFactory(),
      this.getTransactionManager()
    )
  }

  /**
   * Get ShoppingSessionRepository instance (singleton)
   * TODO: Implement PrismaShoppingSessionRepository
   */
  public getShoppingSessionRepository(): ShoppingSessionRepository {
    if (!this.shoppingSessionRepository) {
      // TODO: Phase2で実装時にコメントアウトを解除
      // this.shoppingSessionRepository = new PrismaShoppingSessionRepository(this.prismaClient)
      throw new Error('ShoppingSessionRepository is not implemented yet')
    }
    return this.shoppingSessionRepository
  }
}
