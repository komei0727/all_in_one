import { PrismaClient } from '@/generated/prisma'

/**
 * Prismaクライアントのシングルトンインスタンス
 *
 * 開発環境ではホットリロード時にコネクションが増加するのを防ぐため、
 * グローバル変数を使用してインスタンスを再利用する
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
