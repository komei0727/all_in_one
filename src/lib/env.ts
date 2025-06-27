/**
 * 環境変数の検証と型安全な取得
 */

// 必須環境変数のリスト
const requiredEnvVars = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  
  // NextAuth
  AUTH_SECRET: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  
  // Email
  EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
  EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
  EMAIL_FROM: process.env.EMAIL_FROM,
  
  // App
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
} as const

// オプション環境変数
const optionalEnvVars = {
  // Email認証（条件付き必須）
  EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
  EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
  
  // Supabase（条件付き必須）
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  
  // Feature flags
  NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  NEXT_PUBLIC_ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
} as const

/**
 * 環境変数の検証
 */
export function validateEnv() {
  const missingVars: string[] = []
  
  // 必須環境変数のチェック
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missingVars.push(key)
    }
  }
  
  // 条件付き必須のチェック
  const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production'
  const needsAuth = process.env.EMAIL_SERVER_HOST !== 'localhost'
  
  if (needsAuth && (!optionalEnvVars.EMAIL_SERVER_USER || !optionalEnvVars.EMAIL_SERVER_PASSWORD)) {
    missingVars.push('EMAIL_SERVER_USER', 'EMAIL_SERVER_PASSWORD')
  }
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missingVars.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please check your environment configuration.`
    )
  }
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

// アプリケーション起動時に検証
if (typeof window === 'undefined') {
  validateEnv()
}