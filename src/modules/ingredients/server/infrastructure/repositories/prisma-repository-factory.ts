import type { PrismaClient } from '@/generated/prisma'

import { PrismaIngredientRepository } from './prisma-ingredient-repository'

import type { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import type { RepositoryFactory } from '../../domain/repositories/repository-factory.interface'

/**
 * PrismaリポジトリファクトリーImpl
 * トランザクション内でPrismaRepositoryインスタンスを生成
 */
export class PrismaRepositoryFactory implements RepositoryFactory {
  /**
   * トランザクション内でIngredientRepositoryを作成
   * @param tx Prismaトランザクション実行コンテキスト
   * @returns PrismaIngredientRepositoryインスタンス
   */
  createIngredientRepository(tx: PrismaClient): IngredientRepository {
    return new PrismaIngredientRepository(tx)
  }
}
