import { PrismaTransactionManagerBase } from '@/modules/shared/server/infrastructure/services/prisma-transaction-manager.base'

/**
 * 食材管理コンテキスト用のPrismaトランザクション管理実装
 * 共有カーネルの基底実装を継承し、必要に応じてカスタマイズ可能
 */
export class PrismaTransactionManager extends PrismaTransactionManagerBase {
  // 現時点では基底実装をそのまま使用
  // 将来的にコンテキスト固有の要件があれば、ここでオーバーライド可能
}
