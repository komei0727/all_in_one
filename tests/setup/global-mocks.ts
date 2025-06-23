import { vi } from 'vitest'

/**
 * グローバルなモックの設定
 */

// 必要に応じて、グローバルなモックを定義する
// 例: 環境変数のモック、外部APIのモックなど

// Next.js環境変数のモック例
vi.stubEnv('NODE_ENV', 'test')

// グローバルオブジェクトのモック例
// global.fetch = vi.fn()
