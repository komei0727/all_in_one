import type { PrismaClient } from '@/generated/prisma'

/**
 * トランザクション管理インターフェース
 * データベーストランザクションを抽象化し、テスタビリティを確保
 */
export interface TransactionManager {
  /**
   * トランザクション内で関数を実行する
   * @param fn トランザクション内で実行する関数
   * @returns 関数の実行結果
   * @throws トランザクション内でエラーが発生した場合は自動的にロールバック
   */
  run<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T>
}
