/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode を有効化（開発時の問題検出）
  reactStrictMode: true,

  // TypeScriptとESLintのエラーでビルドを失敗させる
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // 画像最適化の設定
  images: {
    domains: [
      // Supabaseストレージのドメイン（使用する場合）
      process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').split('/')[0] || '',
    ].filter(Boolean),
  },

  // 実験的機能
  experimental: {
    // サーバーアクションのボディサイズ制限
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // 環境変数の露出制御
  env: {
    // アプリケーションバージョン（package.jsonから取得）
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '0.1.0',

    // Vercel環境で自動的にURLを設定
    // 既に設定されている場合はそちらを優先
    NEXTAUTH_URL:
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
  },

  // セキュリティヘッダー（Vercelでは vercel.json で設定するため、ここでは設定しない）

  // Sentryなどのソースマップアップロード用（必要に応じて）
  productionBrowserSourceMaps: false,
}

export default nextConfig
