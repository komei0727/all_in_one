# 認証API

## 概要

ユーザー認証、セッション管理、パスワード管理を行うAPIです。Supabase Authenticationを基盤として、アプリケーション固有のビジネスロジックを実装しています。

### 認証・認可

- 一部のエンドポイント（ログイン、登録、パスワードリセット要求）は認証不要
- その他のエンドポイントは認証が必要
- 認証方式: Bearer Token（Authorization ヘッダー）

## エンドポイント一覧

### 認証

- `POST /api/v1/auth/register` - 新規ユーザー登録
- `POST /api/v1/auth/login` - ログイン
- `POST /api/v1/auth/logout` - ログアウト
- `GET /api/v1/auth/session` - 現在のセッション確認
- `POST /api/v1/auth/refresh` - セッションリフレッシュ

### メール確認

- `POST /api/v1/auth/verify-email` - メールアドレス確認
- `POST /api/v1/auth/resend-verification` - 確認メール再送信

### パスワード管理

- `POST /api/v1/auth/password/reset-request` - パスワードリセット要求
- `POST /api/v1/auth/password/reset` - パスワードリセット実行
- `PUT /api/v1/auth/password` - パスワード変更

---

## 新規ユーザー登録

### 概要

新規ユーザーアカウントを作成します。登録後、メールアドレス確認が必要です。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/auth/register`
- **認証**: 不要
- **レート制限**: 1 IPあたり 5回/時間

### リクエスト

#### リクエストボディ

```typescript
interface RegisterRequest {
  email: string // メールアドレス（必須、RFC5322準拠）
  password: string // パスワード（必須、8文字以上、大小英数字含む）
  displayName: string // 表示名（必須、1-50文字）
  firstName?: string // 名（任意、0-50文字）
  lastName?: string // 姓（任意、0-50文字）
}
```

#### バリデーションルール

- `email`: 有効なメールアドレス形式、システム内で一意
- `password`: 8-128文字、大文字・小文字・数字を含む、一般的な脆弱パスワードは拒否
- `displayName`: 1-50文字、特殊文字制限あり

### レスポンス

#### 成功時（201 Created）

```typescript
interface RegisterResponse {
  data: {
    userId: string
    email: string
    displayName: string
    emailVerified: false
    createdAt: string
  }
  meta: {
    timestamp: string
    message: 'ユーザー登録が完了しました。メールアドレスの確認をお願いします。'
  }
}
```

#### エラーレスポンス

- `400 Bad Request`: バリデーションエラー
- `409 Conflict`: メールアドレスが既に使用されている
- `429 Too Many Requests`: レート制限超過

### 実装例

#### cURL

```bash
curl -X POST https://api.example.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "displayName": "田中太郎"
  }'
```

#### TypeScript (Fetch API)

```typescript
const response = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123',
    displayName: '田中太郎',
  }),
})
```

---

## ログイン

### 概要

メールアドレスとパスワードでログインし、認証セッションを作成します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/auth/login`
- **認証**: 不要
- **レート制限**: 1 IPあたり 10回/分

### リクエスト

#### リクエストボディ

```typescript
interface LoginRequest {
  email: string // メールアドレス（必須）
  password: string // パスワード（必須）
}
```

### レスポンス

#### 成功時（200 OK）

```typescript
interface LoginResponse {
  data: {
    session: {
      accessToken: string // アクセストークン
      refreshToken: string // リフレッシュトークン
      expiresAt: string // 有効期限（ISO 8601形式）
    }
    user: {
      id: string
      email: string
      displayName: string
      emailVerified: boolean
      lastLoginAt: string
    }
  }
  meta: {
    timestamp: string
  }
}
```

#### エラーレスポンス

- `401 Unauthorized`: 認証情報が無効
- `403 Forbidden`: アカウントが無効化されている
- `422 Unprocessable Entity`: メールアドレスが未確認
- `429 Too Many Requests`: ログイン試行回数超過

### セキュリティ考慮事項

- 連続ログイン失敗時は指数バックオフを適用
- 5回連続失敗で一時的にアカウントロック（15分間）
- ログイン成功/失敗はすべて監査ログに記録

---

## ログアウト

### 概要

現在のセッションを無効化し、ログアウトします。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/auth/logout`
- **認証**: 必要

### リクエスト

ヘッダーに認証トークンのみ必要。ボディは不要。

### レスポンス

#### 成功時（200 OK）

```typescript
interface LogoutResponse {
  data: {
    message: 'ログアウトしました'
  }
  meta: {
    timestamp: string
  }
}
```

---

## 現在のセッション確認

### 概要

現在の認証セッションの状態と、認証されているユーザーの情報を取得します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/auth/session`
- **認証**: 必要

### レスポンス

#### 成功時（200 OK）

```typescript
interface SessionResponse {
  data: {
    session: {
      id: string
      userId: string
      expiresAt: string
      createdAt: string
      ipAddress: string
      userAgent: string
    }
    user: {
      id: string
      email: string
      displayName: string
      emailVerified: boolean
      profile: {
        firstName?: string
        lastName?: string
      }
    }
  }
  meta: {
    timestamp: string
  }
}
```

#### エラーレスポンス

- `401 Unauthorized`: 無効または期限切れのセッション

---

## メールアドレス確認

### 概要

登録時に送信された確認トークンを使用して、メールアドレスを確認します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/auth/verify-email`
- **認証**: 不要

### リクエスト

#### リクエストボディ

```typescript
interface VerifyEmailRequest {
  token: string // メール確認トークン（必須）
}
```

### レスポンス

#### 成功時（200 OK）

```typescript
interface VerifyEmailResponse {
  data: {
    message: 'メールアドレスが確認されました'
    userId: string
    email: string
  }
  meta: {
    timestamp: string
  }
}
```

#### エラーレスポンス

- `400 Bad Request`: 無効なトークン
- `410 Gone`: 期限切れのトークン
- `409 Conflict`: 既に確認済み

---

## 確認メール再送信

### 概要

メールアドレス確認メールを再送信します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/auth/resend-verification`
- **認証**: 必要
- **レート制限**: 1ユーザーあたり 3回/時間

### レスポンス

#### 成功時（200 OK）

```typescript
interface ResendVerificationResponse {
  data: {
    message: '確認メールを送信しました'
    email: string
  }
  meta: {
    timestamp: string
  }
}
```

#### エラーレスポンス

- `409 Conflict`: 既にメールアドレス確認済み
- `429 Too Many Requests`: 送信制限超過

---

## パスワードリセット要求

### 概要

パスワードリセット用のトークンを生成し、メールで送信します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/auth/password/reset-request`
- **認証**: 不要
- **レート制限**: 1メールアドレスあたり 3回/時間

### リクエスト

#### リクエストボディ

```typescript
interface PasswordResetRequestRequest {
  email: string // メールアドレス（必須）
}
```

### レスポンス

#### 成功時（200 OK）

セキュリティのため、メールアドレスの存在有無に関わらず同じレスポンスを返します。

```typescript
interface PasswordResetRequestResponse {
  data: {
    message: 'パスワードリセット用のメールを送信しました（登録されている場合）'
  }
  meta: {
    timestamp: string
  }
}
```

#### エラーレスポンス

- `429 Too Many Requests`: リクエスト制限超過

---

## パスワードリセット実行

### 概要

メールで送信されたトークンを使用して、新しいパスワードを設定します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/auth/password/reset`
- **認証**: 不要

### リクエスト

#### リクエストボディ

```typescript
interface PasswordResetRequest {
  token: string // リセットトークン（必須）
  newPassword: string // 新しいパスワード（必須、バリデーションルールは登録時と同じ）
}
```

### レスポンス

#### 成功時（200 OK）

```typescript
interface PasswordResetResponse {
  data: {
    message: 'パスワードがリセットされました'
  }
  meta: {
    timestamp: string
  }
}
```

#### エラーレスポンス

- `400 Bad Request`: 無効なトークンまたはパスワード
- `410 Gone`: 期限切れのトークン

### セキュリティ考慮事項

- パスワードリセット完了時、全セッションを無効化
- 確認メールを送信

---

## パスワードリセットトークン検証

### 概要

パスワードリセット画面表示前に、トークンの有効性を確認します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/auth/verify-reset-token`
- **認証**: 不要

### リクエスト

#### クエリパラメータ

| パラメータ | 型     | 必須 | 説明             |
| ---------- | ------ | ---- | ---------------- |
| token      | string | ○    | リセットトークン |

### レスポンス

#### 成功時（200 OK）

```typescript
interface VerifyResetTokenResponse {
  data: {
    valid: boolean // トークンの有効性
    email?: string // 有効な場合のみ、マスクされたメールアドレス（例: "u***@example.com"）
  }
  meta: {
    timestamp: string
  }
}
```

#### エラーレスポンス

- `400 Bad Request`: トークンパラメータが不足

---

## メールアドレス重複チェック

### 概要

新規登録時に、メールアドレスが既に使用されているかをチェックします。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/auth/check-email`
- **認証**: 不要
- **レート制限**: 1IPあたり 10回/分

### リクエスト

#### クエリパラメータ

| パラメータ | 型     | 必須 | 説明                       |
| ---------- | ------ | ---- | -------------------------- |
| email      | string | ○    | チェックするメールアドレス |

### レスポンス

#### 成功時（200 OK）

```typescript
interface CheckEmailResponse {
  data: {
    available: boolean // true: 使用可能、false: 既に使用中
  }
  meta: {
    timestamp: string
  }
}
```

#### エラーレスポンス

- `400 Bad Request`: 無効なメールアドレス形式
- `429 Too Many Requests`: レート制限超過

### セキュリティ考慮事項

- タイミング攻撃を防ぐため、レスポンス時間を一定に保つ
- 過度な情報開示を防ぐため、最小限の情報のみ返す

---

## パスワード変更

### 概要

現在のパスワードを確認した上で、新しいパスワードに変更します。

### エンドポイント情報

- **メソッド**: `PUT`
- **パス**: `/api/v1/auth/password`
- **認証**: 必要

### リクエスト

#### リクエストボディ

```typescript
interface ChangePasswordRequest {
  currentPassword: string // 現在のパスワード（必須）
  newPassword: string // 新しいパスワード（必須、バリデーションルールは登録時と同じ）
}
```

### レスポンス

#### 成功時（200 OK）

```typescript
interface ChangePasswordResponse {
  data: {
    message: 'パスワードが変更されました'
  }
  meta: {
    timestamp: string
  }
}
```

#### エラーレスポンス

- `401 Unauthorized`: 現在のパスワードが無効
- `400 Bad Request`: 新しいパスワードがバリデーションエラー

### セキュリティ考慮事項

- パスワード変更後、現在のセッション以外を無効化
- 変更通知メールを送信

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

1. **Supabase Authとの統合**

   - すべての認証操作はSupabase Authを通じて実行
   - ローカルDBとSupabaseの整合性を保つ

2. **セキュリティ**

   - パスワードは絶対にログに記録しない
   - センシティブな情報は最小限に
   - タイミング攻撃対策の実装

3. **パフォーマンス**
   - セッション検証結果は短時間キャッシュ
   - 認証チェックは非同期で実行

## 更新履歴

| 日付       | 内容                                               | 作成者 |
| ---------- | -------------------------------------------------- | ------ |
| 2025-06-24 | 初版作成                                           | Claude |
| 2025-06-24 | メールアドレス重複チェックAPIとトークン検証API追加 | Claude |
