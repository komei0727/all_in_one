# 認証API（NextAuth版）

## 概要

NextAuth.jsを使用した認証システムのAPIです。NextAuthが提供する標準エンドポイントと、アプリケーション固有のカスタムエンドポイントを組み合わせて実装しています。

### 認証・認可

- NextAuth標準エンドポイントは認証不要
- カスタムエンドポイントはNextAuthセッションが必要
- 認証方式: NextAuthセッション（Cookieベース）

## エンドポイント一覧

### NextAuth標準エンドポイント

- `GET/POST /api/auth/[...nextauth]` - NextAuth動的ルート
  - `GET /api/auth/signin` - サインインページ
  - `POST /api/auth/signin/email` - メールサインイン
  - `GET /api/auth/signout` - サインアウトページ
  - `POST /api/auth/signout` - サインアウト処理
  - `GET /api/auth/session` - セッション取得
  - `GET /api/auth/csrf` - CSRFトークン取得
  - `GET /api/auth/callback/email` - Email Providerコールバック
  - `GET /api/auth/verify-request` - 確認リクエストページ
  - `GET /api/auth/error` - エラーページ

### カスタムエンドポイント

- `GET /api/v1/auth/check-integration` - NextAuth統合状態確認
- `POST /api/v1/auth/sync-user` - ドメインユーザー同期

---

## NextAuthを使用した認証フロー

### 概要

NextAuth.jsのEmail Providerを使用したマジックリンク認証を実装しています。パスワードは使用せず、メールアドレスのみで認証を行います。

### 認証フロー

1. ユーザーがメールアドレスを入力
2. NextAuthがマジックリンクをメール送信
3. ユーザーがリンクをクリック
4. NextAuthがセッションを作成
5. ドメインユーザーが自動作成/同期

### NextAuth設定例

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { userIntegrationService } from '@/services/userIntegration'

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      maxAge: 24 * 60 * 60, // 24時間有効
    }),
  ],
  callbacks: {
    async signIn({ user, email }) {
      // ドメインユーザーの作成/同期
      try {
        await userIntegrationService.createOrSyncUser({
          nextAuthId: user.id,
          email: user.email!,
        })
        return true
      } catch (error) {
        console.error('User integration failed:', error)
        // UXを優先してログインは継続
        return true
      }
    },
    async session({ session, token }) {
      // セッションにドメインユーザーIDを追加
      const domainUser = await userRepository.findByNextAuthId(token.sub!)
      if (domainUser) {
        session.userId = domainUser.id.getValue()
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
    error: '/auth/error',
  },
}

export default NextAuth(authOptions)
```

---

## メールサインイン

### 概要

NextAuthのEmail Providerを使用してメールアドレスでサインインします。パスワードは不要で、メールに送信されたマジックリンクで認証します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/auth/signin/email`
- **認証**: 不要
- **レート制限**: 1 メールアドレスあたり 5回/時間

### リクエスト

#### リクエストボディ

```typescript
interface EmailSignInRequest {
  email: string // メールアドレス（必須）
  csrfToken: string // CSRFトークン（必須）
}
```

### レスポンス

#### 成功時（200 OK）

```typescript
interface EmailSignInResponse {
  ok: true
  url: string // リダイレクトURL（/auth/verify-request）
}
```

#### エラーレスポンス

- `400 Bad Request`: 無効なメールアドレス
- `429 Too Many Requests`: レート制限超過

### 実装例

#### TypeScript (Next.js)

```typescript
import { getCsrfToken, signIn } from 'next-auth/react'

const handleEmailSignIn = async (email: string) => {
  const csrfToken = await getCsrfToken()
  
  const result = await signIn('email', {
    email,
    redirect: false,
  })
  
  if (result?.ok) {
    // メール確認ページへリダイレクト
    router.push('/auth/verify-request')
  }
}
```

---

## サインアウト

### 概要

NextAuthのセッションを無効化し、サインアウトします。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/auth/signout`
- **認証**: 必要（NextAuthセッション）

### リクエスト

#### リクエストボディ

```typescript
interface SignOutRequest {
  csrfToken: string // CSRFトークン（必須）
}
```

### レスポンス

NextAuthはサインアウト後にリダイレクトします。

### 実装例

#### TypeScript (Next.js)

```typescript
import { signOut } from 'next-auth/react'

const handleSignOut = async () => {
  await signOut({
    redirect: true,
    callbackUrl: '/'
  })
}
```

---

## セッション取得

### 概要

現在のNextAuthセッション情報を取得します。クライアントサイドではuseSessionフックの使用を推奨します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/auth/session`
- **認証**: 不要（Cookieベース）

### レスポンス

#### 認証済み時（200 OK）

```typescript
interface NextAuthSession {
  user: {
    email: string
    id: string // NextAuthユーザーID
    userId?: string // ドメインユーザーID（カスタム）
  }
  expires: string // セッション有効期限
}
```

#### 未認証時（200 OK）

```typescript
null
```

### 実装例

#### TypeScript (クライアント)

```typescript
import { useSession } from 'next-auth/react'

function MyComponent() {
  const { data: session, status } = useSession()
  
  if (status === 'loading') {
    return <div>読み込み中...</div>
  }
  
  if (status === 'unauthenticated') {
    return <div>ログインしてください</div>
  }
  
  return <div>ようこそ、{session?.user?.email}</div>
}
```

#### TypeScript (サーバー)

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/pages/api/auth/[...nextauth]'

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions)
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }
  
  return {
    props: { session },
  }
}
```

---

## メール認証コールバック

### 概要

NextAuthのEmail Providerが送信したマジックリンクからのコールバックを処理します。このエンドポイントはNextAuthが自動的に処理します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/auth/callback/email`
- **認証**: 不要

### クエリパラメータ

| パラメータ | 型     | 必須 | 説明                           |
| ---------- | ------ | ---- | ------------------------------ |
| token      | string | ○    | メールリンクに含まれるトークン |
| email      | string | ○    | メールアドレス                 |

### 処理フロー

1. NextAuthがトークンを検証
2. 有効な場合、セッションを作成
3. signInコールバックでドメインユーザーを作成/同期
4. アプリケーションへリダイレクト

---

## NextAuth統合状態確認

### 概要

NextAuthユーザーとドメインユーザーの統合状態を確認します。データ整合性の確認やデバッグに使用します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/auth/check-integration`
- **認証**: 必要（NextAuthセッション）

### レスポンス

#### 成功時（200 OK）

```typescript
interface IntegrationCheckResponse {
  data: {
    integrated: boolean // 統合状態
    nextAuthUser: {
      id: string
      email: string
      emailVerified: Date | null
    }
    domainUser?: {
      id: string
      email: string
      profile: UserProfile
      status: string
      createdAt: Date
    }
    issues: string[] // 問題がある場合のリスト
  }
  meta: {
    timestamp: string
  }
}
```

### 実装例

```typescript
// pages/api/v1/auth/check-integration.ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { userRepository } from '@/repositories/user'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const nextAuthUser = await prisma.user.findUnique({
    where: { id: session.user.id }
  })

  const domainUser = await userRepository.findByNextAuthId(session.user.id)

  const issues = []
  if (!domainUser) {
    issues.push('Domain user not found')
  } else if (domainUser.email !== nextAuthUser.email) {
    issues.push('Email mismatch')
  }

  res.json({
    data: {
      integrated: !!domainUser && issues.length === 0,
      nextAuthUser,
      domainUser,
      issues
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  })
}
```

---

## ドメインユーザー同期

### 概要

NextAuthユーザーとドメインユーザーを手動で同期します。通常は自動で同期されますが、エラー復旧時に使用します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/auth/sync-user`
- **認証**: 必要（NextAuthセッション）

### レスポンス

#### 成功時（200 OK）

```typescript
interface SyncUserResponse {
  data: {
    message: 'ユーザー情報を同期しました'
    domainUser: {
      id: string
      email: string
      profile: UserProfile
      status: string
    }
    syncedFields: string[] // 同期されたフィールド
  }
  meta: {
    timestamp: string
  }
}
```

#### エラーレスポンス

- `401 Unauthorized`: 認証エラー
- `500 Internal Server Error`: 同期処理エラー

### 実装例

```typescript
// pages/api/v1/auth/sync-user.ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { userIntegrationService } from '@/services/userIntegration'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const result = await userIntegrationService.syncUser({
      nextAuthId: session.user.id,
      email: session.user.email!
    })

    res.json({
      data: {
        message: 'ユーザー情報を同期しました',
        domainUser: result.user,
        syncedFields: result.syncedFields
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'SYNC_FAILED',
        message: '同期処理に失敗しました'
      }
    })
  }
}
```

---

## NextAuthページ説明

### サインインページ

- **パス**: `/auth/signin`
- **説明**: メールアドレス入力フォームを表示

### 確認リクエストページ

- **パス**: `/auth/verify-request`
- **説明**: マジックリンク送信後の確認画面

### エラーページ

- **パス**: `/auth/error`
- **説明**: 認証エラー時の表示

### カスタムページの実装例

```typescript
// pages/auth/signin.tsx
import { getCsrfToken } from 'next-auth/react'

export default function SignIn({ csrfToken }) {
  return (
    <form method="post" action="/api/auth/signin/email">
      <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
      <label>
        メールアドレス
        <input name="email" type="email" required />
      </label>
      <button type="submit">マジックリンクを送信</button>
    </form>
  )
}

export async function getServerSideProps(context) {
  const csrfToken = await getCsrfToken(context)
  return {
    props: { csrfToken },
  }
}
```

---


---


---


---

## 共通エラーレスポンス

すべてのエンドポイントで共通のエラー形式を使用します。

```typescript
interface ErrorResponse {
  error: {
    code: string // エラーコード
    message: string // エラーメッセージ
    type: string // エラータイプ
    details?: {
      // 詳細情報（バリデーションエラー時など）
      field?: string
      reason?: string
    }
  }
  meta: {
    timestamp: string
    correlationId: string // トラブルシューティング用ID
  }
}
```

### エラーコード一覧

| コード                 | 説明                           |
| ---------------------- | ------------------------------ |
| `VALIDATION_ERROR`     | リクエストバリデーションエラー |
| `INVALID_CREDENTIALS`  | 認証情報が無効                 |
| `EMAIL_NOT_VERIFIED`   | メールアドレス未確認           |
| `ACCOUNT_DISABLED`     | アカウントが無効化されている   |
| `SESSION_EXPIRED`      | セッション期限切れ             |
| `TOKEN_INVALID`        | 無効なトークン                 |
| `TOKEN_EXPIRED`        | 期限切れのトークン             |
| `EMAIL_ALREADY_EXISTS` | メールアドレスが既に使用中     |
| `TOO_MANY_ATTEMPTS`    | 試行回数超過                   |
| `RATE_LIMIT_EXCEEDED`  | レート制限超過                 |

## 実装上の注意事項

1. **NextAuthとの統合**

   - NextAuthの標準機能を最大限活用
   - カスタマイズは必要最小限に留める
   - ドメインユーザーとの整合性を保つ

2. **セキュリティ**

   - NextAuthのセキュリティベストプラクティスに従う
   - CSRF保護を必ず有効化
   - セッションCookieはhttpOnly、secure、sameSiteを設定

3. **パフォーマンス**
   - NextAuthセッションはCookieベースで高速
   - ドメインユーザーの統合は非同期で実行
   - useSessionフックのキャッシュを活用

## 更新履歴

| 日付       | 内容                               | 作成者 |
| ---------- | ---------------------------------- | ------ |
| 2025-06-24 | 初版作成                           | Claude |
| 2025-06-24 | NextAuth統合前提での全面再設計更新 | Claude |
