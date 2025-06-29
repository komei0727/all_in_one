import { PrismaClient, type Prisma } from '@/generated/prisma'

/**
 * Prismaクライアントのシングルトンインスタンス
 *
 * 開発環境ではホットリロード時にコネクションが増加するのを防ぐため、
 * グローバル変数を使用してインスタンスを再利用する
 *
 * Supabase使用時の注意:
 * - DATABASE_URL: PgBouncer経由の接続（トランザクションプーリング）
 * - DIRECT_URL: 直接接続（マイグレーション用）
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ログレベルの設定
const logLevel: Prisma.LogLevel[] =
  process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevel,
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
