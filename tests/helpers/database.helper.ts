import { execSync } from 'child_process'

import { PrismaClient } from '../../src/generated/prisma-test'

let prismaClient: PrismaClient | null = null

/**
 * テスト用Prismaクライアントの取得
 * シングルトンパターンで実装
 */
export function getTestPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./test.db',
        },
      },
      log: process.env.DEBUG ? ['query', 'info', 'warn', 'error'] : [],
    })
  }
  return prismaClient
}

/**
 * Prismaクライアントのクリーンアップ
 */
export async function cleanupPrismaClient(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect()
    prismaClient = null
  }
}

/**
 * データベースのリセット
 * 全テーブルのデータを削除
 */
export async function resetDatabase(): Promise<void> {
  const prisma = getTestPrismaClient()

  // トランザクションで全テーブルをクリア
  await prisma.$transaction([
    // 履歴テーブルから削除（外部キー制約のため）
    prisma.ingredientStockHistory.deleteMany(),
    prisma.domainEvent.deleteMany(),

    // 在庫テーブル
    prisma.ingredientStock.deleteMany(),

    // メインテーブル
    prisma.ingredient.deleteMany(),

    // マスターテーブル
    prisma.category.deleteMany(),
    prisma.unit.deleteMany(),
  ])
}

/**
 * テストトランザクションの実行
 * 各テスト後に自動的にロールバックされる
 */
export async function withTransaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  const prisma = getTestPrismaClient()

  // SQLiteはネストしたトランザクションをサポートしないため、
  // テスト用に別の方法でトランザクション管理を行う
  try {
    // トランザクション開始前の状態を保存
    await prisma.$executeRaw`BEGIN`

    // テスト実行
    const result = await fn(prisma)

    // ロールバック
    await prisma.$executeRaw`ROLLBACK`

    return result
  } catch (error) {
    // エラー時もロールバック
    await prisma.$executeRaw`ROLLBACK`
    throw error
  }
}

/**
 * テストデータのシード
 * 基本的なマスターデータを投入
 */
export async function seedTestData(): Promise<void> {
  const prisma = getTestPrismaClient()

  // カテゴリーの作成
  await prisma.category.createMany({
    data: [
      { id: 'cat00001', name: '野菜', displayOrder: 1 },
      { id: 'cat00002', name: '肉・魚', displayOrder: 2 },
      { id: 'cat00003', name: '調味料', displayOrder: 3 },
    ],
  })

  // 単位の作成
  await prisma.unit.createMany({
    data: [
      { id: 'unit0001', name: '個', symbol: '個', type: 'COUNT', displayOrder: 1 },
      { id: 'unit0002', name: 'グラム', symbol: 'g', type: 'WEIGHT', displayOrder: 2 },
      { id: 'unit0003', name: 'ミリリットル', symbol: 'ml', type: 'VOLUME', displayOrder: 3 },
    ],
  })
}

/**
 * 統合テスト用のセットアップ
 * beforeEachで使用
 */
export async function setupIntegrationTest(): Promise<void> {
  await resetDatabase()
  await seedTestData()
}

/**
 * 統合テスト用のクリーンアップ
 * afterEachで使用
 */
export async function cleanupIntegrationTest(): Promise<void> {
  await resetDatabase()
}

/**
 * E2Eテスト用のセットアップ
 * beforeAllで使用
 */
export async function setupE2ETest(): Promise<void> {
  // データベースの再作成
  execSync(
    'npx prisma db push --schema=./prisma/schema.test.prisma --force-reset --skip-generate',
    {
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || 'file:./test.db',
      },
    }
  )

  await seedTestData()
}

/**
 * E2Eテスト用のクリーンアップ
 * afterAllで使用
 */
export async function cleanupE2ETest(): Promise<void> {
  await cleanupPrismaClient()
}
