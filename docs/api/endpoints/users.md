# ユーザー管理API（NextAuth版）

## 概要

NextAuthを使用した認証基盤上で、ドメインユーザーのプロフィール管理、アカウント管理を行うAPIです。セッション管理はNextAuthに委譲しています。

### 認証・認可

- すべてのエンドポイントでNextAuthセッションが必要
- 認証方式: NextAuthセッション（Cookieベース）
- ユーザーは自分の情報のみアクセス可能

## エンドポイント一覧

### ユーザー情報

- `GET /api/v1/users/me` - 自分のドメインユーザー情報取得
- `PUT /api/v1/users/me` - プロフィール更新
- `PUT /api/v1/users/me/preferences` - ユーザー設定更新
- `DELETE /api/v1/users/me` - アカウント無効化

### 統合管理

- `GET /api/v1/users/me/integration-status` - NextAuth統合状態確認
- `POST /api/v1/users/me/sync` - ドメインユーザー同期

### アクティビティ

- `GET /api/v1/users/me/activity` - ユーザーアクティビティ取得

---

## 自分のドメインユーザー情報取得

### 概要

認証されているユーザーのドメインユーザー情報（プロフィール、設定等）を取得します。NextAuth情報とは別に管理されています。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/users/me`
- **認証**: 必要（NextAuthセッション）

### レスポンス

#### 成功時（200 OK）

```typescript
interface DomainUserResponse {
  data: {
    id: string // ドメインユーザーID
    nextAuthId: string // NextAuthユーザーID
    email: string // NextAuthと同期
    status: 'ACTIVE' | 'DEACTIVATED' // アカウント状態
    profile: {
      displayName: string
      timezone: string // デフォルト: "Asia/Tokyo"
      language: string // デフォルト: "ja"
    }
    preferences: {
      theme: 'light' | 'dark' | 'system' // UIテーマ
      notifications: boolean // 通知有効/無効
      emailFrequency: 'none' | 'weekly' | 'daily' // メール通知頻度
    }
    createdAt: string
    updatedAt: string
    lastLoginAt?: string
    integration: {
      status: 'INTEGRATED' | 'PENDING' | 'FAILED'
      lastSyncedAt?: string
    }
  }
  meta: {
    timestamp: string
  }
}
```

### 実装例

#### TypeScript (サーバーサイド)

```typescript
// pages/api/v1/users/me.ts
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

  const domainUser = await userRepository.findByNextAuthId(session.user.id)
  if (!domainUser) {
    return res.status(404).json({ error: 'Domain user not found' })
  }

  res.json({
    data: domainUser.toJSON(),
    meta: {
      timestamp: new Date().toISOString()
    }
  })
}
```

#### TypeScript (クライアントサイド)

```typescript
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

const useDomainUser = () => {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['domainUser', 'me'],
    queryFn: async () => {
      const response = await fetch('/api/v1/users/me')
      if (!response.ok) throw new Error('Failed to fetch user')
      return response.json()
    },
    enabled: !!session,
  })
}
```

---

## プロフィール更新

### 概要

ドメインユーザーのプロフィール情報を更新します。メールアドレスはNextAuth側で管理されるため更新できません。

### エンドポイント情報

- **メソッド**: `PUT`
- **パス**: `/api/v1/users/me`
- **認証**: 必要（NextAuthセッション）

### リクエスト

#### リクエストボディ

```typescript
interface UpdateProfileRequest {
  profile?: {
    displayName?: string // 1-50文字
    timezone?: string // IANA timezone
    language?: string // "ja" | "en"
  }
}
```

#### バリデーションルール

- `displayName`: 1-50文字、特殊文字制限あり
- `language`: サポートされている言語コードのみ
- `timezone`: 有効なIANAタイムゾーン

### レスポンス

#### 成功時（200 OK）

更新後の完全なユーザー情報を返します（GET /api/v1/users/meと同じ形式）。

#### エラーレスポンス

- `400 Bad Request`: バリデーションエラー
- `401 Unauthorized`: 認証エラー

### 実装例

#### TypeScript (サーバーサイド)

```typescript
// pages/api/v1/users/me.ts
export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).end()
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const domainUser = await userRepository.findByNextAuthId(session.user.id)
  if (!domainUser) {
    return res.status(404).json({ error: 'Domain user not found' })
  }

  try {
    const updatedUser = await userProfileService.updateProfile(
      domainUser.id,
      req.body.profile
    )
    
    res.json({
      data: updatedUser.toJSON(),
      meta: {
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    res.status(400).json({
      error: {
        code: 'PROFILE_UPDATE_FAILED',
        message: error.message
      }
    })
  }
}
```

---

## ユーザー設定更新

### 概要

ドメインユーザーの設定（テーマ、通知等）を更新します。

### エンドポイント情報

- **メソッド**: `PUT`
- **パス**: `/api/v1/users/me/preferences`
- **認証**: 必要（NextAuthセッション）

### リクエスト

#### リクエストボディ

```typescript
interface UpdatePreferencesRequest {
  theme?: 'light' | 'dark' | 'system'
  notifications?: boolean
  emailFrequency?: 'none' | 'weekly' | 'daily'
}
```

### レスポンス

#### 成功時（200 OK）

更新後の完全なユーザー情報を返します（GET /api/v1/users/meと同じ形式）。

#### エラーレスポンス

- `400 Bad Request`: バリデーションエラー
- `401 Unauthorized`: 認証エラー

## アカウント無効化

### 概要

ドメインユーザーを論理削除（無効化）します。NextAuthユーザーは残存しますが、ドメイン機能は使用できなくなります。

### エンドポイント情報

- **メソッド**: `DELETE`
- **パス**: `/api/v1/users/me`
- **認証**: 必要（NextAuthセッション）

### リクエスト

#### リクエストボディ

```typescript
interface DeactivateAccountRequest {
  reason?: 'USER_REQUEST' | 'POLICY_VIOLATION' | 'OTHER' // 無効化理由
  feedback?: string // フィードバック（任意、最大500文字）
}
```

### レスポンス

#### 成功時（200 OK）

```typescript
interface DeactivateAccountResponse {
  data: {
    message: 'アカウントが無効化されました'
    deactivatedAt: string
  }
  meta: {
    timestamp: string
  }
}
```

### 注意事項

- ドメインユーザーのstatusがDEACTIVATEDに変更
- NextAuthユーザーは残存し、再ログイン可能
- 関連データ（食材等）の処理はアプリケーションポリシーに従う

---

## NextAuth統合状態確認

### 概要

現在のユーザーのNextAuthとドメインユーザーの統合状態を確認します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/users/me/integration-status`
- **認証**: 必要（NextAuthセッション）

### レスポンス

#### 成功時（200 OK）

```typescript
interface IntegrationStatusResponse {
  data: {
    status: 'INTEGRATED' | 'PENDING' | 'FAILED'
    nextAuthUser: {
      id: string
      email: string
      emailVerified: Date | null
    }
    domainUser?: {
      id: string
      status: string
      lastSyncedAt?: string
    }
    issues: string[] // 問題がある場合のリスト
    recommendations: string[] // 推奨アクション
  }
  meta: {
    timestamp: string
  }
}
```

---

## ドメインユーザー同期

### 概要

NextAuthユーザーとドメインユーザーを手動で同期します。通常は自動で同期されますが、エラー復旧時に使用します。

### エンドポイント情報

- **メソッド**: `POST`
- **パス**: `/api/v1/users/me/sync`
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
      status: string
    }
    syncedFields: string[] // 同期されたフィールド
    created: boolean // 新規作成か更新か
  }
  meta: {
    timestamp: string
  }
}
```

---

## ユーザーアクティビティ取得

### 概要

ユーザーのアクティビティ履歴を取得します。ログイン履歴はNextAuthが管理するため、ドメイン固有のアクティビティのみを返します。

### エンドポイント情報

- **メソッド**: `GET`
- **パス**: `/api/v1/users/me/activity`
- **認証**: 必要（NextAuthセッション）

### クエリパラメータ

| パラメータ | 型     | 必須 | デフォルト | 説明                    |
| ---------- | ------ | ---- | ---------- | ----------------------- |
| page       | number | No   | 1          | ページ番号（1から開始） |
| limit      | number | No   | 20         | 1ページあたりの件数     |
| type       | string | No   | all        | アクティビティタイプ       |

### レスポンス

#### 成功時（200 OK）

```typescript
interface UserActivityResponse {
  data: Array<{
    id: string
    type: 'PROFILE_UPDATED' | 'PREFERENCES_CHANGED' | 'ACCOUNT_DEACTIVATED' | 'ACCOUNT_REACTIVATED'
    timestamp: string
    details: {
      changes?: any // 変更内容
      reason?: string // 理由
    }
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

| コード                      | 説明                              |
| --------------------------- | --------------------------------- |
| `DOMAIN_USER_NOT_FOUND`     | ドメインユーザーが見つからない   |
| `INTEGRATION_FAILED`        | NextAuth統合エラー              |
| `SYNC_FAILED`               | 同期処理エラー                  |
| `PROFILE_UPDATE_FAILED`     | プロフィール更新失敗             |
| `ACCOUNT_ALREADY_DEACTIVATED` | アカウントは既に無効化されている |

## 実装上の注意事項

1. **NextAuthとの統合**

   - セッション管理はNextAuthに完全に委譲
   - ドメインユーザーとNextAuthユーザーの1:1マッピングを維持
   - 統合エラーはユーザー体験を阻害しない

2. **パフォーマンス**

   - ドメインユーザー情報は適切にキャッシュ
   - NextAuthセッションはCookieベースで高速
   - 統合処理は非同期で実行

3. **セキュリティ**
   - NextAuthのセキュリティベストプラクティスに従う
   - ドメイン固有の操作は監査ログ記録
   - 個人情報の最小限の取得と保護

## 更新履歴

| 日付       | 内容                               | 作成者 |
| ---------- | ---------------------------------- | ------ |
| 2025-06-24 | 初版作成                           | Claude |
| 2025-06-24 | NextAuth統合前提での全面再設計更新 | Claude |
