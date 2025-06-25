import '@testing-library/jest-dom/vitest'

// 統合テスト用のDATABASE_URLを設定
if (process.env.VITEST_POOL_ID || process.env.TEST_ENV === 'integration') {
  process.env.DATABASE_URL = 'file:./test.db'
}
