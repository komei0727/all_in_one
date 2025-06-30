import type { TransactionManager } from '@/modules/shared/server/application/services/transaction-manager.interface'

import { IngredientNotFoundException } from '../../domain/exceptions'
import { IngredientId } from '../../domain/value-objects'

import type { DeleteIngredientCommand } from './delete-ingredient.command'
import type { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import type { RepositoryFactory } from '../../domain/repositories/repository-factory.interface'

/**
 * 食材削除ハンドラー
 */
export class DeleteIngredientHandler {
  constructor(
    private readonly ingredientRepository: IngredientRepository,
    private readonly repositoryFactory: RepositoryFactory,
    private readonly transactionManager: TransactionManager
  ) {}

  async execute(command: DeleteIngredientCommand): Promise<void> {
    // 食材IDの値オブジェクトを作成
    const ingredientId = new IngredientId(command.id)

    // 食材を取得
    const ingredient = await this.ingredientRepository.findById(command.userId, ingredientId)

    if (!ingredient) {
      throw new IngredientNotFoundException()
    }

    // 論理削除を実行（エンティティのdeleteメソッドを使用）
    ingredient.delete(command.userId)

    // 削除された食材を保存
    await this.transactionManager.run(async (tx) => {
      const txIngredientRepository = this.repositoryFactory.createIngredientRepository(tx)
      return txIngredientRepository.update(ingredient)
    })
  }
}
