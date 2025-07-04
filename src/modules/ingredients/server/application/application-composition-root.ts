import { UserApplicationService } from '@/modules/user-authentication/server/application/services/user-application.service'
import { UserIntegrationService } from '@/modules/user-authentication/server/domain/services/user-integration.service'
import { PrismaUserRepository } from '@/modules/user-authentication/server/infrastructure/repositories/prisma-user.repository'

import { AbandonShoppingSessionHandler } from './commands/abandon-shopping-session.handler'
import { CheckIngredientHandler } from './commands/check-ingredient.handler'
import { CompleteShoppingSessionHandler } from './commands/complete-shopping-session.handler'
import { CreateIngredientHandler } from './commands/create-ingredient.handler'
import { DeleteIngredientHandler } from './commands/delete-ingredient.handler'
import { StartShoppingSessionHandler } from './commands/start-shopping-session.handler'
import { UpdateIngredientHandler } from './commands/update-ingredient.handler'
import { GetActiveShoppingSessionHandler } from './queries/get-active-shopping-session.handler'
import { GetCategoriesQueryHandler } from './queries/get-categories.handler'
import { GetIngredientByIdHandler } from './queries/get-ingredient-by-id.handler'
import { GetIngredientCheckStatisticsHandler } from './queries/get-ingredient-check-statistics.handler'
import { GetIngredientsByCategoryHandler } from './queries/get-ingredients-by-category.handler'
import { GetIngredientsHandler } from './queries/get-ingredients.handler'
import { GetQuickAccessIngredientsHandler } from './queries/get-quick-access-ingredients.handler'
import { GetRecentSessionsHandler } from './queries/get-recent-sessions.handler'
import { GetSessionHistoryHandler } from './queries/get-session-history.handler'
import { GetShoppingStatisticsHandler } from './queries/get-shopping-statistics.handler'
import { GetUnitsQueryHandler } from './queries/get-units.handler'
import { ShoppingSessionFactory } from '../domain/factories/shopping-session.factory'

import type { InfrastructureCompositionRoot } from '../infrastructure/infrastructure-composition-root'

/**
 * Application層のComposition Root
 * ビジネスロジック（Handler、Service等）の組み立てを担当
 */
export class ApplicationCompositionRoot {
  // Domain層のファクトリー
  private shoppingSessionFactory: ShoppingSessionFactory | null = null

  // 他モジュールのサービス
  private userApplicationService: UserApplicationService | null = null

  constructor(private readonly infrastructure: InfrastructureCompositionRoot) {}

  // コマンドハンドラー
  getCreateIngredientHandler(): CreateIngredientHandler {
    return new CreateIngredientHandler(
      this.infrastructure.getIngredientRepository(),
      this.infrastructure.getCategoryRepository(),
      this.infrastructure.getUnitRepository(),
      this.infrastructure.getRepositoryFactory(),
      this.infrastructure.getTransactionManager(),
      this.infrastructure.getEventBus()
    )
  }

  getUpdateIngredientHandler(): UpdateIngredientHandler {
    return new UpdateIngredientHandler(
      this.infrastructure.getIngredientRepository(),
      this.infrastructure.getCategoryRepository(),
      this.infrastructure.getUnitRepository(),
      this.infrastructure.getRepositoryFactory(),
      this.infrastructure.getTransactionManager()
    )
  }

  getDeleteIngredientHandler(): DeleteIngredientHandler {
    return new DeleteIngredientHandler(
      this.infrastructure.getIngredientRepository(),
      this.infrastructure.getRepositoryFactory(),
      this.infrastructure.getTransactionManager()
    )
  }

  getStartShoppingSessionHandler(): StartShoppingSessionHandler {
    return new StartShoppingSessionHandler(
      this.getShoppingSessionFactory(),
      this.infrastructure.getShoppingSessionRepository()
    )
  }

  getCompleteShoppingSessionHandler(): CompleteShoppingSessionHandler {
    return new CompleteShoppingSessionHandler(this.infrastructure.getShoppingSessionRepository())
  }

  getAbandonShoppingSessionHandler(): AbandonShoppingSessionHandler {
    return new AbandonShoppingSessionHandler(this.infrastructure.getShoppingSessionRepository())
  }

  getCheckIngredientHandler(): CheckIngredientHandler {
    return new CheckIngredientHandler(
      this.infrastructure.getShoppingSessionRepository(),
      this.infrastructure.getIngredientRepository(),
      this.infrastructure.getUnitRepository()
    )
  }

  // クエリハンドラー
  getGetCategoriesQueryHandler(): GetCategoriesQueryHandler {
    return new GetCategoriesQueryHandler(this.infrastructure.getCategoryRepository())
  }

  getGetUnitsQueryHandler(): GetUnitsQueryHandler {
    return new GetUnitsQueryHandler(this.infrastructure.getUnitRepository())
  }

  getGetIngredientsHandler(): GetIngredientsHandler {
    return new GetIngredientsHandler(
      this.infrastructure.getIngredientRepository(),
      this.infrastructure.getCategoryRepository(),
      this.infrastructure.getUnitRepository()
    )
  }

  getGetIngredientByIdHandler(): GetIngredientByIdHandler {
    return new GetIngredientByIdHandler(this.infrastructure.getIngredientQueryService())
  }

  getGetActiveShoppingSessionHandler(): GetActiveShoppingSessionHandler {
    return new GetActiveShoppingSessionHandler(this.infrastructure.getShoppingSessionRepository())
  }

  getGetRecentSessionsHandler(): GetRecentSessionsHandler {
    return new GetRecentSessionsHandler(this.infrastructure.getShoppingQueryService())
  }

  getGetShoppingStatisticsHandler(): GetShoppingStatisticsHandler {
    return new GetShoppingStatisticsHandler(this.infrastructure.getShoppingQueryService())
  }

  getGetQuickAccessIngredientsHandler(): GetQuickAccessIngredientsHandler {
    return new GetQuickAccessIngredientsHandler(this.infrastructure.getShoppingQueryService())
  }

  getGetIngredientCheckStatisticsHandler(): GetIngredientCheckStatisticsHandler {
    return new GetIngredientCheckStatisticsHandler(this.infrastructure.getShoppingQueryService())
  }

  getGetIngredientsByCategoryHandler(): GetIngredientsByCategoryHandler {
    return new GetIngredientsByCategoryHandler(
      this.infrastructure.getCategoryRepository(),
      this.infrastructure.getIngredientRepository(),
      this.infrastructure.getUnitRepository(),
      this.infrastructure.getShoppingSessionRepository()
    )
  }

  getGetSessionHistoryHandler(): GetSessionHistoryHandler {
    return new GetSessionHistoryHandler(this.infrastructure.getShoppingQueryService())
  }

  // Domain層のファクトリー
  getShoppingSessionFactory(): ShoppingSessionFactory {
    if (!this.shoppingSessionFactory) {
      this.shoppingSessionFactory = new ShoppingSessionFactory(
        this.infrastructure.getShoppingSessionRepository()
      )
    }
    return this.shoppingSessionFactory
  }

  // 他モジュールのサービス
  getUserApplicationService(): UserApplicationService {
    if (!this.userApplicationService) {
      // UserRepositoryとUserIntegrationServiceを作成
      const userRepository = new PrismaUserRepository(this.infrastructure.getPrismaClient())
      const userIntegrationService = new UserIntegrationService(userRepository)

      this.userApplicationService = new UserApplicationService(userIntegrationService)
    }
    return this.userApplicationService
  }
}
