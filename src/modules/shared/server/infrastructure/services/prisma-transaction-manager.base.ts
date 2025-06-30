import type { PrismaClient } from '@/generated/prisma'

import type { TransactionManager } from '../../application/services/transaction-manager.interface'

/**
 * Prismaを使用したトランザクション管理の基底実装
 * 各コンテキストで再利用可能な共通実装を提供
 */
export abstract class PrismaTransactionManagerBase implements TransactionManager {
  constructor(protected readonly prisma: PrismaClient) {}

  /**
   * Prismaトランザクション内で関数を実行
   * エラーが発生した場合は自動的にロールバックされる
   */
  async run<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // トランザクションコンテキストを渡して関数を実行
      return fn(tx as PrismaClient)
    })
  }
}
