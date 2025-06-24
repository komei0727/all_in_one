# ユーザー管理API

## 概要

ユーザープロフィール管理、セッション管理、アカウント管理を行うAPIです。すべてのエンドポイントは認証が必要で、ユーザーは自分の情報のみ操作できます。

### 認証・認可

- すべてのエンドポイントで認証が必要
- 認証方式: Bearer Token（Authorization ヘッダー）
- ユーザーは自分の情報のみアクセス可能

## エンドポイント一覧

### ユーザー情報

- `GET /api/v1/users/me` - 自分のユーザー情報取得
- `PUT /api/v1/users/me` - プロフィール更新
- `DELETE /api/v1/users/me` - アカウント削除

### セッション管理

- `GET /api/v1/users/me/sessions` - アクティブセッション一覧
- `DELETE /api/v1/users/me/sessions/:id` - 特定セッション無効化
- `DELETE /api/v1/users/me/sessions` - 全セッション無効化

### アクティビティ

- `GET /api/v1/users/me/login-history` - ログイン履歴取得

---

## 自分のユーザー情報取得

### 概要

認証されているユーザーの詳細情報を取得します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/users/me`
- **認証**: 必要

### レスポンス

#### 成功時（200 OK）

```typescript
interface UserResponse {
  data: {
    id: string
    email: string
    emailVerified: boolean
    profile: {
      displayName: string
      firstName?: string
      lastName?: string
    }
    createdAt: string
    updatedAt: string
    lastLoginAt?: string
    preferences: {
      language: string // デフォルト: "ja"
      timezone: string // デフォルト: "Asia/Tokyo"
      notifications: {
        email: boolean // デフォルト: true
        expiringSoon: boolean // デフォルト: true
        lowStock: boolean // デフォルト: true
      }
    }
    stats: {
      totalIngredients: number
      activeIngredients: number
      expiredIngredients: number
    }
  }
  meta: {
    timestamp: string
  }
}
```

### 実装例

#### TypeScript (TanStack Query)

```typescript
import { useQuery } from '@tanstack/react-query'

const useCurrentUser = () => {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const response = await fetch('/api/v1/users/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      if (!response.ok) throw new Error('Failed to fetch user')
      return response.json()
    },
  })
}
```

---

## プロフィール更新

### 概要

ユーザーのプロフィール情報と設定を更新します。

### エンドポイント情報

- **メソッド**: `PUT`
- **パス**: `/api/v1/users/me`
- **認証**: 必要

### リクエスト

#### リクエストボディ

```typescript
interface UpdateProfileRequest {
  profile?: {
    displayName?: string // 1-50文字
    firstName?: string // 0-50文字
    lastName?: string // 0-50文字
  }
  preferences?: {
    language?: string // "ja" | "en"
    timezone?: string // IANA timezone
    notifications?: {
      email?: boolean
      expiringSoon?: boolean
      lowStock?: boolean
    }
  }
}
```

#### バリデーションルール

- `displayName`: 1-50文字、特殊文字制限あり
- `firstName`, `lastName`: 各0-50文字
- `language`: サポートされている言語コードのみ
- `timezone`: 有効なIANAタイムゾーン

### レスポンス

#### 成功時（200 OK）

更新後の完全なユーザー情報を返します（GET /api/v1/users/meと同じ形式）。

#### エラーレスポンス

- `400 Bad Request`: バリデーションエラー
- `401 Unauthorized`: 認証エラー

### 実装例

#### TypeScript (Fetch API)

```typescript
const updateProfile = async (updates: UpdateProfileRequest) => {
  const response = await fetch('/api/v1/users/me', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    throw new Error('Failed to update profile')
  }

  return response.json()
}
```

---

## アカウント削除

### 概要

ユーザーアカウントを削除します。この操作は取り消せません。

### エンドポイント情報

- **メソッド**: `DELETE`
- **パス**: `/api/v1/users/me`
- **認証**: 必要

### リクエスト

#### リクエストボディ

```typescript
interface DeleteAccountRequest {
  password: string // 現在のパスワード（必須、確認用）
  reason?: string // 削除理由（任意、最大200文字）
  feedback?: string // フィードバック（任意、最大500文字）
}
```

### レスポンス

#### 成功時（200 OK）

```typescript
interface DeleteAccountResponse {
  data: {
    message: 'アカウントが削除されました'
    deletedAt: string
  }
  meta: {
    timestamp: string
  }
}
```

#### エラーレスポンス

- `401 Unauthorized`: パスワードが無効
- `403 Forbidden`: 削除権限がない

### 注意事項

- アカウント削除後、関連するすべてのデータが削除されます
- 食材データ、履歴データもすべて削除されます
- 削除は30日間の猶予期間後に実行されます（実装による）

---

## アクティブセッション一覧

### 概要

現在アクティブなすべてのセッションを取得します。複数デバイスからのログイン状況を確認できます。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/users/me/sessions`
- **認証**: 必要

### レスポンス

#### 成功時（200 OK）

```typescript
interface SessionsResponse {
  data: Array<{
    id: string
    isCurrent: boolean // 現在のリクエストで使用中のセッション
    createdAt: string // セッション作成日時
    lastActiveAt: string // 最終アクティビティ日時
    expiresAt: string // 有効期限
    ipAddress: string // IPアドレス（一部マスク）
    location?: {
      // GeoIP情報（利用可能な場合）
      country: string
      city: string
    }
    device: {
      // ユーザーエージェントから解析
      type: string // "desktop" | "mobile" | "tablet"
      browser: string // "Chrome 120"
      os: string // "Windows 11"
    }
  }>
  meta: {
    timestamp: string
    totalCount: number
  }
}
```

---

## 特定セッション無効化

### 概要

指定したセッションを無効化します。不審なセッションを個別に終了させることができます。

### エンドポイント情報

- **メソッド**: `DELETE`
- **パス**: `/api/v1/users/me/sessions/:id`
- **認証**: 必要

### パスパラメータ

- `id`: セッションID

### レスポンス

#### 成功時（200 OK）

```typescript
interface RevokeSessionResponse {
  data: {
    message: 'セッションが無効化されました'
    sessionId: string
  }
  meta: {
    timestamp: string
  }
}
```

#### エラーレスポンス

- `404 Not Found`: セッションが見つからない
- `400 Bad Request`: 現在使用中のセッションは無効化できない

---

## 全セッション無効化

### 概要

現在のセッション以外のすべてのセッションを無効化します。セキュリティ上の理由で全デバイスからログアウトさせる場合に使用します。

### エンドポイント情報

- **メソッド**: `DELETE`
- **パス**: `/api/v1/users/me/sessions`
- **認証**: 必要

### レスポンス

#### 成功時（200 OK）

```typescript
interface RevokeAllSessionsResponse {
  data: {
    message: 'すべてのセッションが無効化されました'
    revokedCount: number // 無効化されたセッション数
  }
  meta: {
    timestamp: string
  }
}
```

---

## ログイン履歴取得

### 概要

過去のログイン履歴を取得します。セキュリティ監査用途で使用できます。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/users/me/login-history`
- **認証**: 必要

### クエリパラメータ

| パラメータ | 型     | 必須 | デフォルト | 説明                    |
| ---------- | ------ | ---- | ---------- | ----------------------- |
| page       | number | No   | 1          | ページ番号（1から開始） |
| limit      | number | No   | 20         | 1ページあたりの件数     |
| days       | number | No   | 30         | 過去何日分を取得するか  |

### レスポンス

#### 成功時（200 OK）

```typescript
interface LoginHistoryResponse {
  data: Array<{
    id: string
    timestamp: string
    success: boolean // ログイン成功/失敗
    ipAddress: string // IPアドレス（一部マスク）
    location?: {
      country: string
      city: string
    }
    device: {
      type: string
      browser: string
      os: string
    }
    failureReason?: string // 失敗時の理由
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  meta: {
    timestamp: string
  }
}
```

---

## 共通エラーレスポンス

認証APIと同じエラー形式を使用します。

```typescript
interface ErrorResponse {
  error: {
    code: string
    message: string
    type: string
    details?: {
      field?: string
      reason?: string
    }
  }
  meta: {
    timestamp: string
    correlationId: string
  }
}
```

### ユーザー管理固有のエラーコード

| コード                  | 説明                         |
| ----------------------- | ---------------------------- |
| `USER_NOT_FOUND`        | ユーザーが見つからない       |
| `SESSION_NOT_FOUND`     | セッションが見つからない     |
| `CANNOT_REVOKE_CURRENT` | 現在のセッションは無効化不可 |
| `PROFILE_UPDATE_FAILED` | プロフィール更新失敗         |

## 実装上の注意事項

1. **プライバシー保護**

   - IPアドレスは下位オクテットをマスク
   - 位置情報は都市レベルまで
   - ユーザーエージェントは一般化

2. **パフォーマンス**

   - ユーザー情報は5分間キャッシュ
   - 統計情報は非同期で計算

3. **セキュリティ**
   - アカウント削除は再認証必須
   - セッション操作は監査ログ記録

## 更新履歴

| 日付       | 内容     | 作成者 |
| ---------- | -------- | ------ |
| 2025-06-24 | 初版作成 | Claude |
