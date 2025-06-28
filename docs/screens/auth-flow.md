# 認証フロー画面

## 概要

NextAuthのマジックリンク認証に最適化された認証フロー。パスワードレス認証により、セキュアで使いやすい認証体験を提供する。

## 認証フロー全体

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  ログイン   │ -> │ メール確認  │ -> │ ダッシュボード │
│   画面      │    │   画面      │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │
       v                   v
┌─────────────┐    ┌─────────────┐
│ 認証エラー  │    │ 認証処理中  │
│   画面      │    │   画面      │
└─────────────┘    └─────────────┘
```

## 1. ログイン画面

### UI要件

```
┌─────────────────────────┐
│                         │
│          🥗              │
│     食材管理アプリ        │
│                         │
│   一人暮らしの食材管理を   │
│     もっとシンプルに      │
│                         │
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │  📧                 │ │
│ │  メールアドレス      │ │
│ │  [example@gmail.com]│ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │  ログインリンクを送信  │ │
│ └─────────────────────┘ │
│                         │
│ パスワードは不要です✨     │
│                         │
│ ────────────────────── │
│                         │
│ 初めてご利用の方も        │
│ 同じ手順で始められます    │
│                         │
└─────────────────────────┘
```

### 詳細仕様

#### コンポーネント構成

```typescript
interface LoginPageProps {
  callbackUrl?: string
  error?: string
}

const LoginPage = ({ callbackUrl, error }: LoginPageProps) => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useNextAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('email', {
        email,
        callbackUrl: callbackUrl || '/dashboard',
        redirect: false
      })

      if (result?.ok) {
        router.push(`/auth/verify-request?email=${encodeURIComponent(email)}`)
      } else {
        router.push('/auth/error?error=Signin')
      }
    } catch (error) {
      console.error('Sign in error:', error)
      router.push('/auth/error?error=Signin')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* UI implementation */}
    </div>
  )
}
```

#### バリデーション

```typescript
const emailValidation = {
  required: true,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  message: '有効なメールアドレスを入力してください',
}

const validateEmail = (email: string): boolean => {
  return emailValidation.pattern.test(email)
}
```

#### UX配慮

- **シンプルなメッセージ**: パスワード不要の明確な説明
- **プレースホルダー**: 具体的なメール例を表示
- **エラーハンドリング**: 分かりやすいエラーメッセージ
- **ローディング状態**: 送信中の視覚的フィードバック

## 2. メール確認画面

### UI要件

```
┌─────────────────────────┐
│ Header                  │
│ [← 戻る] メール確認      │
├─────────────────────────┤
│                         │
│          📧              │
│                         │
│   メールを送信しました    │
│                         │
│  example@gmail.com に   │
│  ログインリンクを送信     │
│  しました。              │
│                         │
│  メールをご確認ください   │
│                         │
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │  メールを再送信      │ │
│ └─────────────────────┘ │
│                         │
│ メールが届かない場合：    │
│ • 迷惑メールフォルダを   │
│   確認してください      │
│ • 数分お待ちください     │
│                         │
│ ────────────────────── │
│                         │
│ 別のメールアドレスで     │
│ やり直す                │
│                         │
└─────────────────────────┘
```

### 詳細仕様

#### コンポーネント実装

```typescript
interface VerifyRequestPageProps {
  email?: string
}

const VerifyRequestPage = ({ email }: VerifyRequestPageProps) => {
  const [isResending, setIsResending] = useState(false)
  const [resendCount, setResendCount] = useState(0)
  const [lastResent, setLastResent] = useState<Date | null>(null)

  // 再送信制限（1分間に1回まで）
  const canResend = !lastResent ||
    (Date.now() - lastResent.getTime()) > 60000

  const handleResend = async () => {
    if (!email || !canResend || isResending) return

    setIsResending(true)
    try {
      await signIn('email', {
        email,
        redirect: false
      })
      setResendCount(prev => prev + 1)
      setLastResent(new Date())
      toast.success('メールを再送信しました')
    } catch (error) {
      toast.error('再送信に失敗しました')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* UI implementation */}
    </div>
  )
}
```

#### 自動リダイレクト

```typescript
// メール確認後の自動ログイン検知
useEffect(() => {
  const checkAuthStatus = () => {
    if (session?.user) {
      router.push('/dashboard')
    }
  }

  // 5秒間隔でセッション状態をチェック
  const interval = setInterval(checkAuthStatus, 5000)

  return () => clearInterval(interval)
}, [session, router])
```

## 3. 認証エラー画面

### UI要件

```
┌─────────────────────────┐
│ Header                  │
│ [← 戻る] エラー          │
├─────────────────────────┤
│                         │
│          ⚠️              │
│                         │
│   ログインに失敗しました  │
│                         │
│  申し訳ございません。     │
│  認証処理中にエラーが     │
│  発生しました。          │
│                         │
│  しばらく時間をおいて     │
│  再度お試しください。     │
│                         │
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │  もう一度ログイン    │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │  ヘルプセンター      │ │
│ └─────────────────────┘ │
│                         │
│ 問題が続く場合は         │
│ お問い合わせください     │
│                         │
└─────────────────────────┘
```

### エラー種別対応

```typescript
interface AuthErrorInfo {
  type: string
  title: string
  message: string
  actionText: string
  showHelp: boolean
}

const authErrors: Record<string, AuthErrorInfo> = {
  Signin: {
    type: 'signin',
    title: 'ログインに失敗しました',
    message: 'メールアドレスをご確認いただき、再度お試しください。',
    actionText: 'もう一度ログイン',
    showHelp: true,
  },
  OAuthSignin: {
    type: 'oauth',
    title: '認証に失敗しました',
    message: '認証プロバイダーとの連携でエラーが発生しました。',
    actionText: 'もう一度試す',
    showHelp: true,
  },
  OAuthCallback: {
    type: 'callback',
    title: '認証の完了に失敗しました',
    message: '認証情報の処理中にエラーが発生しました。',
    actionText: 'やり直す',
    showHelp: true,
  },
  OAuthCreateAccount: {
    type: 'create',
    title: 'アカウント作成に失敗しました',
    message: 'アカウントの作成でエラーが発生しました。',
    actionText: 'もう一度試す',
    showHelp: true,
  },
  EmailCreateAccount: {
    type: 'email',
    title: 'メール認証に失敗しました',
    message: 'メールアドレスが正しいかご確認ください。',
    actionText: 'ログインに戻る',
    showHelp: true,
  },
  Callback: {
    type: 'callback',
    title: '認証処理でエラーが発生しました',
    message: 'しばらく時間をおいて再度お試しください。',
    actionText: 'やり直す',
    showHelp: true,
  },
  OAuthAccountNotLinked: {
    type: 'link',
    title: 'アカウントの連携に失敗しました',
    message: '別の認証方法で既に登録されているメールアドレスです。',
    actionText: 'ログインに戻る',
    showHelp: true,
  },
  EmailSignin: {
    type: 'email',
    title: 'メール送信に失敗しました',
    message: 'メールアドレスが正しいかご確認の上、再度お試しください。',
    actionText: 'もう一度試す',
    showHelp: true,
  },
  CredentialsSignin: {
    type: 'credentials',
    title: 'ログイン情報が正しくありません',
    message: 'メールアドレスをご確認ください。',
    actionText: 'ログインに戻る',
    showHelp: true,
  },
  SessionRequired: {
    type: 'session',
    title: 'ログインが必要です',
    message: 'このページを表示するにはログインしてください。',
    actionText: 'ログイン',
    showHelp: false,
  },
  default: {
    type: 'unknown',
    title: '予期しないエラーが発生しました',
    message: 'しばらく時間をおいて再度お試しください。',
    actionText: 'やり直す',
    showHelp: true,
  },
}
```

## 4. 認証処理中画面

### UI要件（ローディング画面）

```
┌─────────────────────────┐
│                         │
│                         │
│          🔄              │
│                         │
│     認証処理中...        │
│                         │
│   しばらくお待ちください  │
│                         │
│                         │
│  ●●●○○ (loading dots)   │
│                         │
│                         │
└─────────────────────────┘
```

### 実装仕様

```typescript
const AuthLoadingPage = () => {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return ''
        return prev + '●'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-6">🔄</div>
        <h1 className="text-xl font-semibold mb-2">認証処理中</h1>
        <p className="text-gray-600 mb-6">しばらくお待ちください</p>
        <div className="text-2xl text-primary">
          {dots}
          <span className="text-gray-300">
            {'○'.repeat(3 - dots.length)}
          </span>
        </div>
      </div>
    </div>
  )
}
```

## 認証フロー統合

### ルーティング設計

```typescript
// pages/auth/signin.tsx
export default function SignIn() {
  return <LoginPage />
}

// pages/auth/verify-request.tsx
export default function VerifyRequest() {
  const router = useRouter()
  const { email } = router.query

  return <VerifyRequestPage email={email as string} />
}

// pages/auth/error.tsx
export default function AuthError() {
  const router = useRouter()
  const { error } = router.query

  return <AuthErrorPage error={error as string} />
}
```

### NextAuth設定連携

```typescript
// auth.config.ts
export const authConfig = {
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
    error: '/auth/error',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard')

      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl))
      }

      return true
    },
  },
}
```

### 共通レイアウト

```typescript
const AuthLayout = ({ children, title }: {
  children: React.ReactNode
  title: string
}) => (
  <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🥗</div>
          <h1 className="text-2xl font-bold text-gray-900">
            食材管理アプリ
          </h1>
          <p className="text-gray-600 mt-2">
            {title}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {children}
        </div>

        <div className="text-center mt-6 text-xs text-gray-500">
          © 2025 食材管理アプリ
        </div>
      </div>
    </div>
  </div>
)
```

## アクセシビリティ

### フォーカス管理

- **初期フォーカス**: メール入力フィールドに自動フォーカス
- **エラー時**: エラーメッセージに適切なフォーカス移動
- **キーボードナビゲーション**: Tab順序の最適化

### スクリーンリーダー対応

- **動的コンテンツ**: aria-live でステータス変更を通知
- **エラーメッセージ**: aria-describedby で入力フィールドと関連付け
- **ローディング状態**: aria-busy でローディング状態を通知

## セキュリティ考慮

### CSRF対策

- NextAuth標準のCSRF保護を活用
- フォーム送信時のCSRFトークン検証

### レート制限

```typescript
const rateLimiter = new Map()

const checkRateLimit = (email: string): boolean => {
  const now = Date.now()
  const attempts = rateLimiter.get(email) || []

  // 過去1時間の試行回数をチェック
  const recentAttempts = attempts.filter(
    (time: number) => now - time < 3600000 // 1 hour
  )

  if (recentAttempts.length >= 5) {
    return false // Rate limit exceeded
  }

  rateLimiter.set(email, [...recentAttempts, now])
  return true
}
```

## 今後の拡張

### フェーズ2機能

- **ソーシャルログイン**: Google、Apple認証の追加
- **2要素認証**: SMS認証の追加オプション
- **生体認証**: Face ID、Touch ID対応

### フェーズ3機能

- **SSO連携**: 企業向けSSO対応
- **アカウント連携**: 複数認証方法の統合管理
- **セキュリティログ**: ログイン履歴の詳細表示
