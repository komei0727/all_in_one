import type { PrismaClient } from '@/generated/prisma'

import type { IngredientRepository } from './ingredient-repository.interface'

/**
 * リポジトリファクトリーインターフェース
 * トランザクション内でRepositoryインスタンスを生成するための抽象化
 */
export interface RepositoryFactory {
  /**
   * トランザクション内でIngredientRepositoryを作成
   * @param tx トランザクション実行コンテキスト
   * @returns IngredientRepositoryインスタンス
   */
  createIngredientRepository(tx: PrismaClient): IngredientRepository
}
