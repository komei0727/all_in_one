import '@testing-library/jest-dom/vitest'
import { vi, beforeEach, afterEach } from 'vitest'

// 統合テスト用のDATABASE_URLを設定
if (process.env.VITEST_POOL_ID || process.env.TEST_ENV === 'integration') {
  process.env.DATABASE_URL = 'file:./test.db'
}

// console.errorをモックして、テスト中のエラーログを抑制
// これにより、意図的なエラーテスト時のログ出力がテスト失敗として扱われることを防ぐ
const originalConsoleError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalConsoleError
})
