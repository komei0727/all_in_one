/**
 * 環境変数の検証と型安全な取得
 */

// ビルド時にチェックが必要な環境変数（NEXT_PUBLIC_のみ）
const buildTimeEnvVars = {
  // Vercel環境では VERCEL_URL から自動生成される可能性があるため、
  // next.config.mjs で設定される値も考慮
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
  NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  NEXT_PUBLIC_ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
} as const

// ランタイム時にチェックが必要な環境変数
const runtimeEnvVars = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,

  // NextAuth
  AUTH_SECRET: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  // Vercel環境では VERCEL_URL から自動生成される可能性があるため、
  // next.config.mjs で設定される値も考慮
  NEXTAUTH_URL:
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),

  // Email
  EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
  EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
  EMAIL_FROM: process.env.EMAIL_FROM,
} as const

// 全ての必須環境変数
const requiredEnvVars = {
  ...buildTimeEnvVars,
  ...runtimeEnvVars,
} as const

// オプション環境変数
const optionalEnvVars = {
  // Email認証（条件付き必須）
  EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
  EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,

  // Supabase（条件付き必須）
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const

/**
 * ビルド時の環境変数検証（NEXT_PUBLIC_変数のみ）
 */
export function validateBuildTimeEnv() {
  const missingVars: string[] = []

  // ビルド時環境変数のチェック
  for (const [key, value] of Object.entries(buildTimeEnvVars)) {
    if (
      key.startsWith('NEXT_PUBLIC_') &&
      key !== 'NEXT_PUBLIC_ENVIRONMENT' &&
      key !== 'NEXT_PUBLIC_ENABLE_DEBUG' &&
      !value
    ) {
      missingVars.push(key)
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required build-time environment variables:\n${missingVars.map((v) => `  - ${v}`).join('\n')}\n\n` +
        `Please check your environment configuration.`
    )
  }
}

/**
 * ランタイム時の環境変数検証（サーバー側変数）
 */
export function validateRuntimeEnv() {
  const missingVars: string[] = []

  // ランタイム環境変数のチェック
  for (const [key, value] of Object.entries(runtimeEnvVars)) {
    if (!value) {
      missingVars.push(key)
    }
  }

  // 条件付き必須のチェック
  const needsAuth = process.env.EMAIL_SERVER_HOST !== 'localhost'

  if (needsAuth && (!optionalEnvVars.EMAIL_SERVER_USER || !optionalEnvVars.EMAIL_SERVER_PASSWORD)) {
    missingVars.push('EMAIL_SERVER_USER', 'EMAIL_SERVER_PASSWORD')
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required runtime environment variables:\n${missingVars.map((v) => `  - ${v}`).join('\n')}\n\n` +
        `Please check your environment configuration.`
    )
  }
}

/**
 * 全ての環境変数の検証
 * 注意: この関数は直接呼ばないでください。
 * - ビルド時: validateBuildTimeEnv() を使用
 * - ランタイム時: validateRuntimeEnv() を使用（src/lib/server/env-validation.tsで自動実行）
 */
export function validateEnv() {
  validateBuildTimeEnv()
  validateRuntimeEnv()
}

// 型安全な環境変数アクセス
export const env = {
  ...requiredEnvVars,
  ...optionalEnvVars,

  // 計算値
  isProduction: process.env.NEXT_PUBLIC_ENVIRONMENT === 'production',
  isStaging: process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const

// ランタイム時の自動検証
// サーバーサイドかつビルド時以外に実行
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  // 動的実行でランタイムのみ実行を保証
  void (async () => {
    // 少し待ってから実行（初期化完了を待つ）
    await new Promise((resolve) => setTimeout(resolve, 0))

    try {
      validateRuntimeEnv()
      // 成功時のログはdevelopment環境でのみ出力
      if (process.env.NODE_ENV === 'development') {
        console.warn('✅ Runtime environment variables validated successfully')
      }
    } catch (error) {
      console.error('❌ Runtime environment validation failed:', error)
      // 本番環境では警告のみ（起動は停止しない）
      if (process.env.NODE_ENV === 'production') {
        console.error(
          '⚠️  Application may not function properly without required environment variables'
        )
      }
    }
  })()
}
