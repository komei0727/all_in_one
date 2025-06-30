import { execSync } from 'child_process'

import { createId } from '@paralleldrive/cuid2'

import { PrismaClient } from '@/generated/prisma-test'

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

    // 買い物セッション関連（外部キー制約のため先に削除）
    prisma.shoppingSessionItem.deleteMany(),
    prisma.shoppingSession.deleteMany(),

    // メインテーブル
    prisma.ingredient.deleteMany(),

    // ユーザー関連テーブル（外部キー制約を考慮した順序）
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.domainUser.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.user.deleteMany(),

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
 * テストデータのIDを保持
 */
export interface TestDataIds {
  categories: {
    vegetable: string
    meatFish: string
    seasoning: string
  }
  units: {
    piece: string
    gram: string
    milliliter: string
  }
  users: {
    defaultUser: {
      nextAuthId: string
      domainUserId: string
      email: string
    }
  }
}

let testDataIds: TestDataIds | null = null

/**
 * テストデータのIDを取得
 */
export function getTestDataIds(): TestDataIds {
  if (!testDataIds) {
    throw new Error('Test data has not been seeded yet. Call seedTestData() first.')
  }
  return testDataIds
}

/**
 * テストデータのシード
 * 基本的なマスターデータを投入
 */
export async function seedTestData(): Promise<TestDataIds> {
  const prisma = getTestPrismaClient()

  // ID生成（新しいID形式）
  const categoryIds = {
    vegetable: `cat_${createId()}`,
    meatFish: `cat_${createId()}`,
    seasoning: `cat_${createId()}`,
  }

  const unitIds = {
    piece: `unt_${createId()}`,
    gram: `unt_${createId()}`,
    milliliter: `unt_${createId()}`,
  }

  // ユーザーID生成
  const userIds = {
    nextAuthId: `nextauth_${createId()}`,
    domainUserId: `usr_${createId()}`,
    email: 'test@example.com',
  }

  // カテゴリーの作成
  await prisma.category.createMany({
    data: [
      { id: categoryIds.vegetable, name: '野菜', displayOrder: 1 },
      { id: categoryIds.meatFish, name: '肉・魚', displayOrder: 2 },
      { id: categoryIds.seasoning, name: '調味料', displayOrder: 3 },
    ],
  })

  // 単位の作成
  await prisma.unit.createMany({
    data: [
      { id: unitIds.piece, name: '個', symbol: '個', type: 'COUNT', displayOrder: 1 },
      { id: unitIds.gram, name: 'グラム', symbol: 'g', type: 'WEIGHT', displayOrder: 2 },
      {
        id: unitIds.milliliter,
        name: 'ミリリットル',
        symbol: 'ml',
        type: 'VOLUME',
        displayOrder: 3,
      },
    ],
  })

  // テストユーザーの作成
  // NextAuthユーザーを先に作成
  await prisma.user.create({
    data: {
      id: userIds.nextAuthId,
      email: userIds.email,
      emailVerified: new Date(),
    },
  })

  // ドメインユーザーを作成
  await prisma.domainUser.create({
    data: {
      id: userIds.domainUserId,
      nextAuthId: userIds.nextAuthId,
      email: userIds.email,
      displayName: 'Test User',
    },
  })

  testDataIds = {
    categories: categoryIds,
    units: unitIds,
    users: {
      defaultUser: userIds,
    },
  }

  return testDataIds
}

/**
 * テスト用ユーザーを作成
 */
export async function createTestUser(userData?: {
  email?: string
  displayName?: string
}): Promise<{ nextAuthId: string; domainUserId: string; email: string }> {
  const prisma = getTestPrismaClient()

  const nextAuthId = `nextauth_${createId()}`
  const domainUserId = `usr_${createId()}`
  const email = userData?.email || `test-${createId()}@example.com`

  // NextAuthユーザーを先に作成
  await prisma.user.create({
    data: {
      id: nextAuthId,
      email,
      emailVerified: new Date(),
    },
  })

  // ドメインユーザーを作成
  await prisma.domainUser.create({
    data: {
      id: domainUserId,
      nextAuthId,
      email,
      displayName: userData?.displayName || 'Test User',
    },
  })

  return { nextAuthId, domainUserId, email }
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
  testDataIds = null // IDをリセット
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
