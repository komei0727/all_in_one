import type { PrismaClient } from '@/generated/prisma'
import type { EventBus } from '@/modules/shared/server/application/services/event-bus.interface'
import type { TransactionManager } from '@/modules/shared/server/application/services/transaction-manager.interface'

import { PrismaIngredientQueryService } from './query-services/prisma-ingredient-query-service'
import { PrismaShoppingQueryService } from './query-services/prisma-shopping-query-service'
import { PrismaCategoryRepository } from './repositories/prisma-category-repository'
import { PrismaIngredientRepository } from './repositories/prisma-ingredient-repository'
import { PrismaRepositoryFactory } from './repositories/prisma-repository-factory'
import { PrismaShoppingSessionRepository } from './repositories/prisma-shopping-session-repository'
import { PrismaUnitRepository } from './repositories/prisma-unit-repository'
import { PrismaTransactionManager } from './services/prisma-transaction-manager'

import type { IngredientQueryService } from '../application/query-services/ingredient-query-service.interface'
import type { ShoppingQueryService } from '../application/query-services/shopping-query-service.interface'
import type { CategoryRepository } from '../domain/repositories/category-repository.interface'
import type { IngredientRepository } from '../domain/repositories/ingredient-repository.interface'
import type { RepositoryFactory } from '../domain/repositories/repository-factory.interface'
import type { ShoppingSessionRepository } from '../domain/repositories/shopping-session-repository.interface'
import type { UnitRepository } from '../domain/repositories/unit-repository.interface'

/**
 * Infrastructure層のComposition Root
 * 技術的実装（Repository、TransactionManager等）の生成と管理を担当
 */
export class InfrastructureCompositionRoot {
  // シングルトンインスタンスの管理
  private categoryRepository: CategoryRepository | null = null
  private unitRepository: UnitRepository | null = null
  private ingredientRepository: IngredientRepository | null = null
  private shoppingSessionRepository: ShoppingSessionRepository | null = null
  private repositoryFactory: RepositoryFactory | null = null
  private transactionManager: TransactionManager | null = null
  private eventBus: EventBus | null = null
  private ingredientQueryService: IngredientQueryService | null = null
  private shoppingQueryService: ShoppingQueryService | null = null

  constructor(private readonly prisma: PrismaClient) {}

  // PrismaClientの取得
  getPrismaClient(): PrismaClient {
    return this.prisma
  }

  // リポジトリ関連
  getCategoryRepository(): CategoryRepository {
    if (!this.categoryRepository) {
      this.categoryRepository = new PrismaCategoryRepository(this.prisma)
    }
    return this.categoryRepository
  }

  getUnitRepository(): UnitRepository {
    if (!this.unitRepository) {
      this.unitRepository = new PrismaUnitRepository(this.prisma)
    }
    return this.unitRepository
  }

  getIngredientRepository(): IngredientRepository {
    if (!this.ingredientRepository) {
      this.ingredientRepository = new PrismaIngredientRepository(this.prisma)
    }
    return this.ingredientRepository
  }

  getShoppingSessionRepository(): ShoppingSessionRepository {
    if (!this.shoppingSessionRepository) {
      this.shoppingSessionRepository = new PrismaShoppingSessionRepository(this.prisma)
    }
    return this.shoppingSessionRepository
  }

  getRepositoryFactory(): RepositoryFactory {
    if (!this.repositoryFactory) {
      this.repositoryFactory = new PrismaRepositoryFactory()
    }
    return this.repositoryFactory
  }

  // インフラサービス関連
  getTransactionManager(): TransactionManager {
    if (!this.transactionManager) {
      this.transactionManager = new PrismaTransactionManager(this.prisma)
    }
    return this.transactionManager
  }

  getEventBus(): EventBus {
    if (!this.eventBus) {
      // 将来的にはイベントバスの実装を提供
      // 現在はダミー実装を返す
      this.eventBus = {
        publish: async () => {
          // 現時点では何もしない
        },
        publishAll: async () => {
          // 現時点では何もしない
        },
      }
    }
    return this.eventBus as EventBus
  }

  // クエリサービス関連
  getIngredientQueryService(): IngredientQueryService {
    if (!this.ingredientQueryService) {
      this.ingredientQueryService = new PrismaIngredientQueryService(this.prisma)
    }
    return this.ingredientQueryService
  }

  getShoppingQueryService(): ShoppingQueryService {
    if (!this.shoppingQueryService) {
      this.shoppingQueryService = new PrismaShoppingQueryService(this.prisma)
    }
    return this.shoppingQueryService
  }
}
