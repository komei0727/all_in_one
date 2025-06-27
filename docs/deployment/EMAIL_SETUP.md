# メールサーバー設定ガイド

## 📋 概要

このガイドでは、各環境でのメールサーバー設定方法を説明します。

## 🔧 環境別設定

### ローカル開発環境

1. **MailHogの起動**
```bash
# Docker Composeで起動
pnpm mail:up

# メールUIを確認
open http://localhost:8025
```

2. **環境変数設定（.env.local）**
```bash
EMAIL_SERVER_HOST="localhost"
EMAIL_SERVER_PORT="1025"
EMAIL_FROM="noreply@localhost"
```

### 検証環境（Staging）

#### オプション1: Mailtrap（推奨）

1. [Mailtrap](https://mailtrap.io)でアカウント作成
2. Inboxを作成
3. SMTP設定を取得
4. 環境変数に設定

```bash
EMAIL_SERVER_HOST="smtp.mailtrap.io"
EMAIL_SERVER_PORT="2525"
EMAIL_SERVER_USER="your_mailtrap_username"
EMAIL_SERVER_PASSWORD="your_mailtrap_password"
EMAIL_FROM="staging@example.com"
```

### 本番環境（Production）

#### SendGrid設定（推奨）

1. **SendGridアカウント作成**
   - [SendGrid](https://sendgrid.com)でアカウント作成
   - 無料枠: 100通/日

2. **APIキー生成**
   - Settings → API Keys → Create API Key
   - 権限: Mail Send（最小権限）

3. **ドメイン認証**
   - Settings → Sender Authentication
   - ドメインを追加してDNS設定

4. **環境変数設定**
```bash
EMAIL_SERVER_HOST="smtp.sendgrid.net"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="apikey"
EMAIL_SERVER_PASSWORD="SG.xxxxxxxxxxxx"  # SendGrid APIキー
EMAIL_FROM="noreply@yourdomain.com"
```

#### Resend設定（シンプル）

1. **Resendアカウント作成**
   - [Resend](https://resend.com)でアカウント作成
   - 無料枠: 100通/日

2. **APIキー生成とドメイン追加**
   - APIキーを生成
   - ドメインを追加してDNS設定

3. **環境変数設定**
```bash
EMAIL_SERVER_HOST="smtp.resend.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="resend"
EMAIL_SERVER_PASSWORD="re_xxxxxxxxxxxx"  # Resend APIキー
EMAIL_FROM="noreply@yourdomain.com"
```

## 📝 NextAuthメール設定

`src/lib/auth.ts`での設定例：

```typescript
import nodemailer from 'nodemailer'

export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  // その他の設定...
}
```

## 🚨 セキュリティ注意事項

1. **APIキーの管理**
   - 環境変数で管理
   - 絶対にコードにハードコーディングしない
   - Vercelの環境変数機能を使用

2. **送信元アドレス**
   - SPF/DKIM/DMARCを設定
   - 独自ドメインを使用

3. **レート制限**
   - 各サービスの制限を確認
   - 必要に応じて有料プランへ

## 🔍 トラブルシューティング

### メールが届かない場合

1. **環境変数の確認**
```bash
# Vercelで設定確認
vercel env ls
```

2. **ログ確認**
   - Vercel Functions Log
   - メールサービスのダッシュボード

3. **スパムフォルダ確認**
   - SPF/DKIM設定が不完全な場合

### 接続エラー

1. **ポート番号確認**
   - 587: TLS（推奨）
   - 465: SSL
   - 25: 非推奨

2. **認証情報確認**
   - APIキーの有効性
   - ユーザー名の形式

## 📊 推奨サービス比較

| サービス | 無料枠 | 設定難易度 | 信頼性 | 価格 |
|---------|--------|-----------|--------|------|
| SendGrid | 100通/日 | 中 | 高 | $19.95/月〜 |
| Resend | 100通/日 | 低 | 高 | $20/月〜 |
| Amazon SES | 62,000通/月 | 高 | 最高 | $0.10/1000通 |
| Mailtrap | 500通/月 | 低 | - | $15/月〜 |

## 🎯 推奨構成

- **開発**: MailHog（ローカル）
- **検証**: Mailtrap
- **本番**: SendGrid または Resend

この構成により、開発効率と本番環境の信頼性を両立できます。