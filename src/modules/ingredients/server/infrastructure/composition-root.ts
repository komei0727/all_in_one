import type { PrismaClient } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import type { EventBus } from '@/modules/shared/server/application/services/event-bus.interface'
import type { TransactionManager } from '@/modules/shared/server/application/services/transaction-manager.interface'
import { GetProfileApiHandler } from '@/modules/user-authentication/server/api/handlers/get-profile.handler'
import { UpdateProfileApiHandler } from '@/modules/user-authentication/server/api/handlers/update-profile.handler'
import { UserApplicationService } from '@/modules/user-authentication/server/application/services/user-application.service'
import { UserIntegrationService } from '@/modules/user-authentication/server/domain/services/user-integration.service'
import { PrismaUserRepository } from '@/modules/user-authentication/server/infrastructure/repositories/prisma-user.repository'

import { PrismaIngredientQueryService } from './query-services/prisma-ingredient-query-service'
import { PrismaShoppingQueryService } from './query-services/prisma-shopping-query-service'
import { PrismaCategoryRepository } from './repositories/prisma-category-repository'
import { PrismaIngredientRepository } from './repositories/prisma-ingredient-repository'
import { PrismaRepositoryFactory } from './repositories/prisma-repository-factory'
import { PrismaShoppingSessionRepository } from './repositories/prisma-shopping-session-repository'
import { PrismaUnitRepository } from './repositories/prisma-unit-repository'
import { PrismaTransactionManager } from './services/prisma-transaction-manager'
import { AbandonShoppingSessionApiHandler } from '../api/handlers/commands/abandon-shopping-session.handler'
import { CheckIngredientApiHandler } from '../api/handlers/commands/check-ingredient.handler'
import { CompleteShoppingSessionApiHandler } from '../api/handlers/commands/complete-shopping-session.handler'
import { CreateIngredientApiHandler } from '../api/handlers/commands/create-ingredient.handler'
import { DeleteIngredientApiHandler } from '../api/handlers/commands/delete-ingredient.handler'
import { StartShoppingSessionApiHandler } from '../api/handlers/commands/start-shopping-session.handler'
import { UpdateIngredientApiHandler } from '../api/handlers/commands/update-ingredient.handler'
import { GetActiveShoppingSessionApiHandler } from '../api/handlers/queries/get-active-shopping-session.handler'
import { GetCategoriesApiHandler } from '../api/handlers/queries/get-categories.handler'
import { GetIngredientByIdApiHandler } from '../api/handlers/queries/get-ingredient-by-id.handler'
import { GetIngredientCheckStatisticsApiHandler } from '../api/handlers/queries/get-ingredient-check-statistics.handler'
import { GetIngredientsByCategoryApiHandler } from '../api/handlers/queries/get-ingredients-by-category.handler'
import { GetIngredientsApiHandler } from '../api/handlers/queries/get-ingredients.handler'
import { GetQuickAccessIngredientsApiHandler } from '../api/handlers/queries/get-quick-access-ingredients.handler'
import { GetRecentSessionsApiHandler } from '../api/handlers/queries/get-recent-sessions.handler'
import { GetSessionHistoryApiHandler } from '../api/handlers/queries/get-session-history.handler'
import { GetShoppingStatisticsApiHandler } from '../api/handlers/queries/get-shopping-statistics.handler'
import { GetUnitsApiHandler } from '../api/handlers/queries/get-units.handler'
import { AbandonShoppingSessionHandler } from '../application/commands/abandon-shopping-session.handler'
import { CheckIngredientHandler } from '../application/commands/check-ingredient.handler'
import { CompleteShoppingSessionHandler } from '../application/commands/complete-shopping-session.handler'
import { CreateIngredientHandler } from '../application/commands/create-ingredient.handler'
import { DeleteIngredientHandler } from '../application/commands/delete-ingredient.handler'
import { StartShoppingSessionHandler } from '../application/commands/start-shopping-session.handler'
import { UpdateIngredientHandler } from '../application/commands/update-ingredient.handler'
import { GetActiveShoppingSessionHandler } from '../application/queries/get-active-shopping-session.handler'
import { GetCategoriesQueryHandler } from '../application/queries/get-categories.handler'
import { GetIngredientByIdHandler } from '../application/queries/get-ingredient-by-id.handler'
import { GetIngredientCheckStatisticsHandler } from '../application/queries/get-ingredient-check-statistics.handler'
import { GetIngredientsByCategoryHandler } from '../application/queries/get-ingredients-by-category.handler'
import { GetIngredientsHandler } from '../application/queries/get-ingredients.handler'
import { GetQuickAccessIngredientsHandler } from '../application/queries/get-quick-access-ingredients.handler'
import { GetRecentSessionsHandler } from '../application/queries/get-recent-sessions.handler'
import { GetSessionHistoryHandler } from '../application/queries/get-session-history.handler'
import { GetShoppingStatisticsHandler } from '../application/queries/get-shopping-statistics.handler'
import { GetUnitsQueryHandler } from '../application/queries/get-units.handler'
import { ShoppingSessionFactory } from '../domain/factories/shopping-session.factory'

import type { IngredientQueryService } from '../application/query-services/ingredient-query-service.interface'
import type { ShoppingQueryService } from '../application/query-services/shopping-query-service.interface'
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
  private shoppingQueryService: ShoppingQueryService | null = null
  private transactionManager: TransactionManager | null = null
  private eventBus: EventBus | null = null
  private userApplicationService: UserApplicationService | null = null

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
   * Get GetCategoriesApiHandler instance (new instance each time)
   */
  public getGetCategoriesApiHandler(): GetCategoriesApiHandler {
    return new GetCategoriesApiHandler(this.getGetCategoriesQueryHandler())
  }

  /**
   * Get GetUnitsQueryHandler instance (new instance each time)
   */
  public getGetUnitsQueryHandler(): GetUnitsQueryHandler {
    return new GetUnitsQueryHandler(this.getUnitRepository())
  }

  /**
   * Get GetUnitsApiHandler instance (new instance each time)
   */
  public getGetUnitsApiHandler(): GetUnitsApiHandler {
    return new GetUnitsApiHandler(this.getGetUnitsQueryHandler())
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
   * Get GetIngredientsApiHandler instance (new instance each time)
   */
  public getGetIngredientsApiHandler(): GetIngredientsApiHandler {
    return new GetIngredientsApiHandler(this.getGetIngredientsHandler())
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
   * Get GetIngredientByIdApiHandler instance (new instance each time)
   */
  public getGetIngredientByIdApiHandler(): GetIngredientByIdApiHandler {
    return new GetIngredientByIdApiHandler(this.getGetIngredientByIdHandler())
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
   * Get DeleteIngredientApiHandler instance (new instance each time)
   */
  public getDeleteIngredientApiHandler(): DeleteIngredientApiHandler {
    return new DeleteIngredientApiHandler(this.getDeleteIngredientHandler())
  }

  /**
   * Get ShoppingSessionRepository instance (singleton)
   */
  public getShoppingSessionRepository(): ShoppingSessionRepository {
    if (!this.shoppingSessionRepository) {
      this.shoppingSessionRepository = new PrismaShoppingSessionRepository(this.prismaClient)
    }
    return this.shoppingSessionRepository
  }

  /**
   * Get ShoppingSessionFactory instance (new instance each time)
   */
  public getShoppingSessionFactory(): ShoppingSessionFactory {
    return new ShoppingSessionFactory(this.getShoppingSessionRepository())
  }

  /**
   * Get StartShoppingSessionHandler instance (new instance each time)
   */
  public getStartShoppingSessionHandler(): StartShoppingSessionHandler {
    return new StartShoppingSessionHandler(
      this.getShoppingSessionFactory(),
      this.getShoppingSessionRepository()
    )
  }

  /**
   * Get StartShoppingSessionApiHandler instance (new instance each time)
   */
  public getStartShoppingSessionApiHandler(): StartShoppingSessionApiHandler {
    return new StartShoppingSessionApiHandler(this.getStartShoppingSessionHandler())
  }

  /**
   * Get GetActiveShoppingSessionHandler instance (new instance each time)
   */
  public getGetActiveShoppingSessionHandler(): GetActiveShoppingSessionHandler {
    return new GetActiveShoppingSessionHandler(this.getShoppingSessionRepository())
  }

  /**
   * Get GetActiveShoppingSessionApiHandler instance (new instance each time)
   */
  public getGetActiveShoppingSessionApiHandler(): GetActiveShoppingSessionApiHandler {
    return new GetActiveShoppingSessionApiHandler(this.getGetActiveShoppingSessionHandler())
  }

  /**
   * Get CompleteShoppingSessionHandler instance (new instance each time)
   */
  public getCompleteShoppingSessionHandler(): CompleteShoppingSessionHandler {
    return new CompleteShoppingSessionHandler(this.getShoppingSessionRepository())
  }

  /**
   * Get CompleteShoppingSessionApiHandler instance (new instance each time)
   */
  public getCompleteShoppingSessionApiHandler(): CompleteShoppingSessionApiHandler {
    return new CompleteShoppingSessionApiHandler(this.getCompleteShoppingSessionHandler())
  }

  /**
   * Get AbandonShoppingSessionHandler instance (new instance each time)
   */
  public getAbandonShoppingSessionHandler(): AbandonShoppingSessionHandler {
    return new AbandonShoppingSessionHandler(this.getShoppingSessionRepository())
  }

  /**
   * Get AbandonShoppingSessionApiHandler instance (new instance each time)
   */
  public getAbandonShoppingSessionApiHandler(): AbandonShoppingSessionApiHandler {
    return new AbandonShoppingSessionApiHandler(this.getAbandonShoppingSessionHandler())
  }

  /**
   * Get CheckIngredientHandler instance (new instance each time)
   */
  public getCheckIngredientHandler(): CheckIngredientHandler {
    return new CheckIngredientHandler(
      this.getShoppingSessionRepository(),
      this.getIngredientRepository(),
      this.getUnitRepository()
    )
  }

  /**
   * Get CheckIngredientApiHandler instance (new instance each time)
   */
  public getCheckIngredientApiHandler(): CheckIngredientApiHandler {
    return new CheckIngredientApiHandler(this.getCheckIngredientHandler())
  }

  /**
   * Get ShoppingQueryService instance (singleton)
   */
  public getShoppingQueryService(): ShoppingQueryService {
    if (!this.shoppingQueryService) {
      this.shoppingQueryService = new PrismaShoppingQueryService(this.prismaClient)
    }
    return this.shoppingQueryService
  }

  /**
   * Get GetRecentSessionsHandler instance (new instance each time)
   */
  public getGetRecentSessionsHandler(): GetRecentSessionsHandler {
    return new GetRecentSessionsHandler(this.getShoppingQueryService())
  }

  /**
   * Get GetShoppingStatisticsHandler instance (new instance each time)
   */
  public getGetShoppingStatisticsHandler(): GetShoppingStatisticsHandler {
    return new GetShoppingStatisticsHandler(this.getShoppingQueryService())
  }

  /**
   * Get GetRecentSessionsApiHandler instance (new instance each time)
   */
  public getGetRecentSessionsApiHandler(): GetRecentSessionsApiHandler {
    return new GetRecentSessionsApiHandler(this.getGetRecentSessionsHandler())
  }

  /**
   * Get GetShoppingStatisticsApiHandler instance (new instance each time)
   */
  public getGetShoppingStatisticsApiHandler(): GetShoppingStatisticsApiHandler {
    return new GetShoppingStatisticsApiHandler(this.getGetShoppingStatisticsHandler())
  }

  /**
   * Get GetQuickAccessIngredientsApiHandler instance (new instance each time)
   */
  public getGetQuickAccessIngredientsApiHandler(): GetQuickAccessIngredientsApiHandler {
    return new GetQuickAccessIngredientsApiHandler(this.getGetQuickAccessIngredientsHandler())
  }

  /**
   * Get GetQuickAccessIngredientsHandler instance (new instance each time)
   */
  public getGetQuickAccessIngredientsHandler(): GetQuickAccessIngredientsHandler {
    return new GetQuickAccessIngredientsHandler(this.getShoppingQueryService())
  }

  /**
   * Get GetIngredientCheckStatisticsApiHandler instance (new instance each time)
   */
  public getGetIngredientCheckStatisticsApiHandler(): GetIngredientCheckStatisticsApiHandler {
    return new GetIngredientCheckStatisticsApiHandler(this.getGetIngredientCheckStatisticsHandler())
  }

  /**
   * Get GetIngredientCheckStatisticsHandler instance (new instance each time)
   */
  public getGetIngredientCheckStatisticsHandler(): GetIngredientCheckStatisticsHandler {
    return new GetIngredientCheckStatisticsHandler(this.getShoppingQueryService())
  }

  /**
   * Get GetIngredientsByCategoryHandler instance (new instance each time)
   */
  public getGetIngredientsByCategoryHandler(): GetIngredientsByCategoryHandler {
    return new GetIngredientsByCategoryHandler(
      this.getCategoryRepository(),
      this.getIngredientRepository(),
      this.getUnitRepository(),
      this.getShoppingSessionRepository()
    )
  }

  /**
   * Get GetIngredientsByCategoryApiHandler instance (new instance each time)
   */
  public getIngredientsByCategoryApiHandler(): GetIngredientsByCategoryApiHandler {
    return new GetIngredientsByCategoryApiHandler(this.getGetIngredientsByCategoryHandler())
  }

  /**
   * Get GetSessionHistoryHandler instance (new instance each time)
   */
  public getGetSessionHistoryHandler(): GetSessionHistoryHandler {
    return new GetSessionHistoryHandler(this.getShoppingQueryService())
  }

  /**
   * Get GetSessionHistoryApiHandler instance (new instance each time)
   */
  public getGetSessionHistoryApiHandler(): GetSessionHistoryApiHandler {
    return new GetSessionHistoryApiHandler(this.getGetSessionHistoryHandler())
  }

  /**
   * Get UserApplicationService instance (singleton)
   */
  public getUserApplicationService(): UserApplicationService {
    if (!this.userApplicationService) {
      const userRepository = new PrismaUserRepository(this.prismaClient)
      const userIntegrationService = new UserIntegrationService(userRepository)
      this.userApplicationService = new UserApplicationService(userIntegrationService)
    }
    return this.userApplicationService
  }

  /**
   * Get GetProfileApiHandler instance (new instance each time)
   */
  public getGetProfileApiHandler(): GetProfileApiHandler {
    return new GetProfileApiHandler(this.getUserApplicationService())
  }

  /**
   * Get UpdateProfileApiHandler instance (new instance each time)
   */
  public getUpdateProfileApiHandler(): UpdateProfileApiHandler {
    return new UpdateProfileApiHandler(this.getUserApplicationService())
  }
}
