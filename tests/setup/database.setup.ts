import { execSync } from 'child_process'
import { unlink } from 'fs/promises'
import { resolve } from 'path'

// テスト用データベースファイルのパス
const TEST_DB_PATH = resolve(process.cwd(), 'test.db')
const TEST_DB_JOURNAL_PATH = `${TEST_DB_PATH}-journal`

/**
 * テスト用データベースのセットアップ
 * 各テストスイート実行前に呼ばれる
 */
export async function setupTestDatabase(): Promise<void> {
  try {
    // 既存のテストDBを削除
    await cleanupTestDatabase()

    // Prismaクライアントの生成（テスト用スキーマから）
    execSync('npx prisma generate --schema=./prisma/schema.test.prisma', {
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || 'file:./test.db',
      },
    })

    // データベースのマイグレーション実行
    execSync('npx prisma db push --schema=./prisma/schema.test.prisma --skip-generate', {
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || 'file:./test.db',
      },
    })

    console.log('✅ Test database setup completed')
  } catch (error) {
    console.error('❌ Failed to setup test database:', error)
    throw error
  }
}

/**
 * テスト用データベースのクリーンアップ
 * 各テストスイート終了後に呼ばれる
 */
export async function cleanupTestDatabase(): Promise<void> {
  try {
    // SQLiteファイルを削除
    await unlink(TEST_DB_PATH).catch(() => {
      // ファイルが存在しない場合は無視
    })
    await unlink(TEST_DB_JOURNAL_PATH).catch(() => {
      // ジャーナルファイルが存在しない場合は無視
    })
  } catch (error) {
    console.error('Failed to cleanup test database:', error)
    // クリーンアップの失敗はテストを止めない
  }
}

/**
 * グローバルセットアップ
 * すべてのテスト実行前に一度だけ呼ばれる
 */
export async function setup(): Promise<void> {
  console.log('🚀 Setting up test environment...')

  // 環境変数の設定
  // NODE_ENVは既にvitestで設定されているため、DATABASE_URLのみ設定
  process.env.DATABASE_URL = 'file:./test.db'

  // 初回のデータベースセットアップ
  await setupTestDatabase()
}

/**
 * グローバルティアダウン
 * すべてのテスト実行後に一度だけ呼ばれる
 */
export async function teardown(): Promise<void> {
  console.log('🧹 Cleaning up test environment...')
  await cleanupTestDatabase()
}
