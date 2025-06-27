# NextAuth メール認証のデプロイ設定ガイド

## 📋 概要

NextAuth v5のメール認証機能を、開発・検証・本番の各環境で適切に動作させるための設定ガイドです。

## 🔧 実装内容

### 1. 環境別設定ファイル（auth.config.ts）

環境に応じてメールサーバーと認証設定を自動調整：

- **開発環境**: MailHog（認証なし）
- **検証環境**: Mailtrap（SMTP認証）
- **本番環境**: SendGrid（SMTP認証）

### 2. メール送信のカスタマイズ

- 日本語のメールテンプレート
- 環境識別（検証環境は【検証環境】表示）
- レスポンシブHTMLメール

## 📝 環境変数の設定

### 開発環境（.env.local）
```bash
# NextAuth設定
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="development-secret-change-in-production"

# メール設定（MailHog）
EMAIL_SERVER_HOST="localhost"
EMAIL_SERVER_PORT="1025"
EMAIL_FROM="noreply@localhost"
# ユーザー名/パスワードは不要
```

### 検証環境（Vercel Preview）
```bash
# NextAuth設定
NEXTAUTH_URL="https://app-deploy-xxx.vercel.app"
AUTH_SECRET="[検証環境用のランダムな文字列]"

# メール設定（Mailtrap）
EMAIL_SERVER_HOST="smtp.mailtrap.io"
EMAIL_SERVER_PORT="2525"
EMAIL_SERVER_USER="[Mailtrapのユーザー名]"
EMAIL_SERVER_PASSWORD="[Mailtrapのパスワード]"
EMAIL_FROM="staging@example.com"

# 環境識別
NEXT_PUBLIC_ENVIRONMENT="staging"
NEXT_PUBLIC_APP_URL="https://app-deploy-xxx.vercel.app"
```

### 本番環境（Vercel Production）
```bash
# NextAuth設定
NEXTAUTH_URL="https://app.vercel.app"
AUTH_SECRET="[本番環境用のランダムな文字列]"  # openssl rand -base64 32

# メール設定（SendGrid）
EMAIL_SERVER_HOST="smtp.sendgrid.net"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="apikey"
EMAIL_SERVER_PASSWORD="SG.xxxxxxxxxxxxx"  # SendGrid APIキー
EMAIL_FROM="noreply@yourdomain.com"

# 環境識別
NEXT_PUBLIC_ENVIRONMENT="production"
NEXT_PUBLIC_APP_URL="https://app.vercel.app"
```

## 🚀 デプロイ時の確認事項

### 1. AUTH_SECRETの生成

```bash
# 各環境で異なるシークレットを生成
openssl rand -base64 32
```

### 2. Vercelでの環境変数設定

1. Vercel Dashboard → Settings → Environment Variables
2. 各変数に対して適用環境を選択：
   - Production（mainブランチ）
   - Preview（deployブランチ）

### 3. メール送信テスト

#### 開発環境
```bash
# MailHogを起動
pnpm mail:up

# ブラウザで確認
open http://localhost:8025
```

#### 検証環境
- Mailtrapのダッシュボードで受信確認
- メール内の【検証環境】表示を確認

#### 本番環境
- 実際のメールアドレスで受信確認
- SPF/DKIM設定の確認

## 🔒 セキュリティ設定

### 1. Cookieの設定

本番環境では自動的にSecure Cookieが有効化：

```typescript
// auth.config.ts
cookies: {
  sessionToken: {
    name: `${isProduction ? '__Secure-' : ''}next-auth.session-token`,
    options: {
      secure: isProduction,
      httpOnly: true,
      sameSite: 'lax',
    },
  },
}
```

### 2. デバッグモード

- 本番環境: 無効
- 検証環境: 有効
- 開発環境: 有効

## 📊 環境別の動作確認

### チェックリスト

#### 開発環境
- [ ] MailHogでメール受信確認
- [ ] ログインリンクが`http://localhost:3000`を指している
- [ ] デバッグログが表示される

#### 検証環境
- [ ] Mailtrapでメール受信確認
- [ ] メールに【検証環境】が表示される
- [ ] ログインリンクが検証環境URLを指している
- [ ] HTTPSで動作している

#### 本番環境
- [ ] 実際のメールアドレスで受信確認
- [ ] メールに環境表示がない
- [ ] ログインリンクが本番URLを指している
- [ ] Secure Cookieが設定される
- [ ] デバッグログが表示されない

## 🚨 トラブルシューティング

### メールが届かない

1. **環境変数の確認**
```bash
# Vercelで確認
vercel env ls
```

2. **SMTPエラーの場合**
- ポート番号（587 for TLS, 465 for SSL）
- 認証情報の確認
- ファイアウォール設定

3. **スパムフォルダの確認**
- 特に本番環境でSPF/DKIM未設定の場合

### ログインリンクが無効

1. **NEXTAUTH_URLの確認**
- 各環境で正しいURLが設定されているか

2. **リンクの有効期限**
- デフォルト24時間
- データベースの`VerificationToken`テーブルを確認

### セッションが保持されない

1. **Cookieドメインの確認**
- サブドメイン間でのCookie共有設定

2. **HTTPSの確認**
- 本番環境でHTTPSが有効か

## 📚 参考リンク

- [NextAuth.js Email Provider](https://next-auth.js.org/providers/email)
- [Nodemailer Configuration](https://nodemailer.com/smtp/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)