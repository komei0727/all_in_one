# Vercel デプロイメント設定ガイド

## 📋 概要

このガイドでは、Vercelでの2環境（staging/production）デプロイメント設定を説明します。

## 🚀 初期セットアップ

### 1. Vercelプロジェクトの作成

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. 「Add New Project」をクリック
3. GitHubリポジトリをインポート

### 2. ブランチ設定

Vercel Dashboard → Settings → Git で以下を設定：

- **Production Branch**: `main`
- **Preview Branches**: `deploy`を含める

## 🔧 環境変数の設定

### 設定方法

1. Vercel Dashboard → Settings → Environment Variables
2. 各変数に対して適用環境を選択：
   - ✅ Production (mainブランチ)
   - ✅ Preview (deployブランチ)
   - ⬜ Development (ローカル開発)

### 環境別の変数設定

#### 共通設定（両環境に適用）

| 変数名     | 説明     | Production   | Preview      |
| ---------- | -------- | ------------ | ------------ |
| `NODE_ENV` | 実行環境 | `production` | `production` |

#### データベース設定

| 変数名         | Production             | Preview                |
| -------------- | ---------------------- | ---------------------- |
| `DATABASE_URL` | 本番Supabase接続文字列 | 検証Supabase接続文字列 |
| `DIRECT_URL`   | 本番Supabase直接接続   | 検証Supabase直接接続   |

#### Supabase設定

| 変数名                          | Production         | Preview            |
| ------------------------------- | ------------------ | ------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | 本番SupabaseのURL  | 検証SupabaseのURL  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 本番Supabaseのキー | 検証Supabaseのキー |

#### アプリケーション設定

| 変数名                | Production               | Preview                             |
| --------------------- | ------------------------ | ----------------------------------- |
| `NEXT_PUBLIC_APP_URL` | `https://app.vercel.app` | `https://app-deploy-xxx.vercel.app` |
| `NEXTAUTH_URL`        | `https://app.vercel.app` | `https://app-deploy-xxx.vercel.app` |
| `AUTH_SECRET`         | 本番用シークレット       | 検証用シークレット                  |

#### メール設定

| 変数名                  | Production               | Preview               |
| ----------------------- | ------------------------ | --------------------- |
| `EMAIL_SERVER_HOST`     | `smtp.sendgrid.net`      | `smtp.mailtrap.io`    |
| `EMAIL_SERVER_PORT`     | `587`                    | `2525`                |
| `EMAIL_SERVER_USER`     | `apikey`                 | Mailtrapユーザー      |
| `EMAIL_SERVER_PASSWORD` | SendGrid APIキー         | Mailtrapパスワード    |
| `EMAIL_FROM`            | `noreply@yourdomain.com` | `staging@example.com` |

#### フィーチャーフラグ

| 変数名                     | Production   | Preview   |
| -------------------------- | ------------ | --------- |
| `NEXT_PUBLIC_ENVIRONMENT`  | `production` | `staging` |
| `NEXT_PUBLIC_ENABLE_DEBUG` | `false`      | `true`    |

## 📝 vercel.json の設定説明

### 基本設定

```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "regions": ["hnd1"] // 東京リージョン
}
```

### Functions設定

```json
"functions": {
  "src/app/api/**/*": {
    "maxDuration": 30,  // 最大実行時間（秒）
    "memory": 1024      // メモリ（MB）
  }
}
```

### セキュリティヘッダー

```json
"headers": [
  {
    "source": "/(.*)",
    "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "X-XSS-Protection", "value": "1; mode=block" }
    ]
  }
]
```

## 🔄 デプロイフロー

### 自動デプロイ

1. **deployブランチへのプッシュ**

   - Preview環境に自動デプロイ
   - 固定URL: `https://all-in-one-deploy.vercel.app`

2. **mainブランチへのマージ**

   - Production環境に自動デプロイ
   - URL: `https://all-in-one.vercel.app`

3. **プルリクエスト**
   - 一時的なプレビュー環境を作成
   - URL: `https://all-in-one-pr-xxx.vercel.app`

## 🎯 環境別の挙動

### コードでの環境判定

```typescript
// 環境変数で判定
const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === 'production'
const isStaging = process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging'

// デバッグモード
const debugEnabled = process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true'
```

### 条件付き機能の実装例

```typescript
// src/lib/config.ts
export const config = {
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  debug: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  // 環境別の設定
  features: {
    // 本番環境のみ有効
    analytics: process.env.NEXT_PUBLIC_ENVIRONMENT === 'production',
    // 検証環境で有効
    debugPanel: process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging',
  },
}
```

## 🚨 注意事項

### 環境変数の管理

1. **シークレット値**

   - Vercel UIで直接入力
   - 絶対にコミットしない

2. **環境変数の変更**
   - 変更後は再デプロイが必要
   - Functions → Redeploy

### ドメイン設定

1. **カスタムドメイン（本番）**

   - Settings → Domains
   - DNSレコードを設定

2. **固定プレビューURL**
   - deployブランチ用に設定可能
   - Settings → Domains → Add

## 📊 モニタリング

### Vercel Analytics

1. **有効化**

   - Analytics タブから有効化
   - `@vercel/analytics`をインストール

2. **実装**

```tsx
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        {process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' && <Analytics />}
      </body>
    </html>
  )
}
```

### ログ確認

- Functions タブでリアルタイムログ
- エラーの詳細を確認可能

## 🔧 トラブルシューティング

### ビルドエラー

1. **Prismaエラー**

   ```bash
   # postinstallスクリプトを確認
   "postinstall": "prisma generate"
   ```

2. **型エラー**
   - strictモードの設定確認
   - 環境変数の型定義

### 環境変数エラー

1. **未定義エラー**

   - Vercel UIで設定確認
   - 環境選択を確認

2. **値の不一致**
   - プレビュー/本番で別々の値を確認

## ✅ チェックリスト

### デプロイ前

- [ ] 環境変数がすべて設定済み
- [ ] データベースマイグレーション完了
- [ ] ローカルでビルド成功

### デプロイ後

- [ ] 両環境でアプリケーション動作確認
- [ ] 環境変数が正しく反映
- [ ] メール送信テスト（該当する場合）
