/**
 * サーバーサイドでの環境変数検証
 * このモジュールはサーバー起動時に一度だけ実行される
 */

import { validateEnv } from '../env'

// サーバーサイドでのみ実行
if (typeof window === 'undefined') {
  try {
    validateEnv()
    // 成功時のログはdevelopment環境でのみ出力
    if (process.env.NODE_ENV === 'development') {
      console.warn('✅ Environment variables validated successfully')
    }
  } catch (error) {
    console.error('❌ Environment validation failed:', error)
    // 本番環境では起動を停止
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
}
