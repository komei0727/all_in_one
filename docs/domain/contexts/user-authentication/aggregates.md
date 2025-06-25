# ユーザー認証コンテキスト - 集約設計（NextAuth版）

## 概要

このドキュメントでは、NextAuth.jsとの統合を前提としたユーザー認証コンテキストの集約（Aggregate）設計を定義します。
NextAuthが認証・セッション・トークン管理を担当するため、ドメイン層はビジネスロジックに特化した簡潔な集約設計となります。

## NextAuth統合における集約設計の原則

1. **責任分離** - 認証処理はNextAuth、ビジネスロジックはドメイン層
2. **シンプルさの追求** - NextAuthが管理する領域は集約から除外
3. **統合境界の明確化** - NextAuthとドメインの境界を明確に定義
4. **最小限の集約** - 食材管理アプリに必要な最小限の集約のみ定義

## 責任範囲の明確化

### NextAuthが管理（集約設計から除外）

- 認証情報（パスワード、認証プロバイダー情報）
- セッション（作成、更新、無効化）
- トークン（アクセストークン、リフレッシュトークン、検証トークン）
- ログイン履歴

### ドメインが管理（本設計の対象）

- ユーザープロフィール
- ユーザー状態（アクティブ/非アクティブ）
- ユーザー設定・プリファレンス
- NextAuthとの統合情報

## 集約一覧（NextAuth統合版）

| 集約名       | 集約ルート | 責務                                   |
| ------------ | ---------- | -------------------------------------- |
| ユーザー集約 | User       | ユーザー情報、プロフィール、状態の管理 |

## 削除された集約（NextAuthに委譲）

以下の集約はNextAuthが標準機能として提供するため削除：

- ~~`ユーザー認証情報集約`~~: NextAuthが認証情報を管理
- ~~`認証セッション集約`~~: NextAuthがセッションを管理
- ~~`パスワードリセットトークン集約`~~: NextAuthがトークンを管理
- ~~`メール確認トークン集約`~~: NextAuthがトークンを管理

## ユーザー集約（User Aggregate）

### 概要

NextAuthとの統合を前提としたユーザー集約。認証・セッション・トークン管理をNextAuthに委譲し、アプリケーション固有のビジネスロジックとプロフィール管理に特化しています。

### 集約ルート

**User** エンティティ

### 集約に含まれるオブジェクト

- **エンティティ**
  - User（集約ルート）
- **値オブジェクト**
  - UserId（ドメイン内の一意識別子）
  - Email（NextAuthと同期）
  - UserProfile（プロフィール情報）
  - UserPreferences（ユーザー設定）
  - UserStatus（アカウント状態）

### 集約境界

```
┌─────────────────────────────────────────┐
│ User Aggregate                          │
│                                         │
│ ┌─────────────┐                         │
│ │    User     │ ← 集約ルート            │
│ │ nextAuthId  │ ← NextAuth統合キー      │
│ └──────┬──────┘                         │
│        │                                │
│ ┌──────┴───────┬────────────┬──────────┐│
│ │    Email     │UserProfile │UserStatus││
│ └──────────────┴────────────┴──────────┘│
└─────────────────────────────────────────┘
```

### NextAuth統合設計

1. **責任分離**

   - NextAuth: 認証、セッション、トークン管理
   - ドメイン: プロフィール、設定、ビジネスロジック

2. **データ同期**

   - nextAuthIdによる1:1マッピング
   - emailはNextAuthと常に同期
   - 認証状態はNextAuthが管理

3. **統合ポイント**
   ```typescript
   // NextAuthコールバックでの統合
   callbacks: {
     signIn: async ({ user }) => {
       await userService.createOrSyncUser(user)
       return true
     }
   }
   ```

### 不変条件（Invariants）

1. **NextAuthとの一貫性**

   - nextAuthIdは必須かつ不変
   - NextAuthユーザーと1:1対応を維持
   - emailはNextAuthと常に一致

2. **プロフィール必須性**

   - UserProfileは必ず存在
   - displayNameは必須（1-50文字）

3. **状態遷移の制約**
   - ACTIVE → DEACTIVATED（論理削除）
   - DEACTIVATED → 復活不可

### ビジネスルール（NextAuth統合版）

- 認証状態の確認はNextAuthセッションに委譲
- プロフィール更新は本人のみ可能（NextAuth認証済み）
- アカウント無効化後もNextAuthユーザーは残存
- メール変更はNextAuth側でも同期が必要

### 集約の操作

```typescript
// NextAuthユーザーからの作成
const user = User.createFromNextAuth({
  nextAuthId: 'clxxxx1234',
  email: 'user@example.com',
  profile: UserProfile.createDefault('ユーザー名'),
})

// プロフィール更新
user.updateProfile({
  displayName: '新しい名前',
  timezone: 'Asia/Tokyo',
  language: 'ja',
})

// 設定更新
user.updatePreferences({
  theme: 'dark',
  notifications: true,
})

// アカウント無効化
user.deactivate('USER_REQUEST')

// NextAuthとの同期
user.syncWithNextAuth(nextAuthUser)
```

## 削除された集約の詳細（NextAuthに委譲）

以下の集約はNextAuthが標準機能として提供するため、ドメイン層からは削除されました：

### ~~ユーザー認証情報集約（UserCredential Aggregate）~~

**削除理由**: NextAuthがCredentialsProviderまたはEmailProviderで認証情報を管理

- パスワードハッシュ化: NextAuthが自動処理
- 認証検証: NextAuthのsignInメソッドで処理
- パスワードポリシー: NextAuthのカスタムバリデーションで実装可能

### ~~認証セッション集約（AuthSession Aggregate）~~

**削除理由**: NextAuthがsessionsテーブルでセッション管理

- セッション作成: NextAuthが自動生成
- セッション検証: useSession()フックで処理
- マルチデバイス対応: NextAuthが標準サポート
- セッション無効化: signOut()メソッドで処理

### ~~パスワードリセットトークン集約（PasswordResetToken Aggregate）~~

**削除理由**: NextAuthのEmailProviderがマジックリンクで対応

- トークン生成: NextAuthが自動処理
- 有効期限管理: NextAuthの設定で制御
- ワンタイム使用: NextAuthが保証

### ~~メール確認トークン集約（EmailVerificationToken Aggregate）~~

**削除理由**: NextAuthのverification_tokensテーブルで管理

- トークン生成: NextAuthが自動処理
- メール送信: NextAuthのsendVerificationRequestで処理
- 確認処理: NextAuthのコールバックで自動処理

## 集約間の関係（NextAuth統合版）

### 単一集約アーキテクチャ

NextAuth統合により、認証関連の集約が削除され、シンプルな単一集約アーキテクチャとなりました：

```
┌─────────────────┐     ┌─────────────────┐
│ NextAuth Layer  │     │  Domain Layer   │
├─────────────────┤     ├─────────────────┤
│ • User          │<--->│ • User Aggregate│
│ • Account       │  1:1│   - nextAuthId  │
│ • Session       │     │   - profile     │
│ • VerifyToken   │     │   - preferences │
└─────────────────┘     └─────────────────┘
```

### 整合性保証

1. **即時整合性（User集約内）**

   - プロフィール更新は単一トランザクション
   - 不変条件は常に満たされる
   - NextAuthIDの一意性は必須

2. **NextAuthとの同期**
   - emailフィールドは常に同期
   - NextAuthコールバックでリアルタイム同期
   - 整合性チェックは定期バッチで実行

## リポジトリとの対応（NextAuth統合版）

### ドメイン層のリポジトリ

| 集約         | リポジトリ     | 責務                           |
| ------------ | -------------- | ------------------------------ |
| ユーザー集約 | UserRepository | ドメインユーザーの永続化と検索 |

### NextAuth管理テーブル（直接アクセス禁止）

| テーブル            | 管理者         | アクセス方法       |
| ------------------- | -------------- | ------------------ |
| users               | Prisma Adapter | NextAuth API経由   |
| accounts            | Prisma Adapter | NextAuth API経由   |
| sessions            | Prisma Adapter | useSession()フック |
| verification_tokens | Prisma Adapter | NextAuth内部処理   |

## 集約設計のベストプラクティス（NextAuth統合版）

### 1. 責任の明確な分離

- **NextAuthの責任**: 認証、セッション、トークン管理
- **ドメインの責任**: ビジネスロジック、プロフィール管理
- 重複実装を避け、各層の強みを活かす

### 2. 統合ポイントの最小化

- NextAuthとの統合はコールバックに集約
- nextAuthIdによる疎結合な連携
- 同期処理は必要最小限に留める

### 3. ドメインイベントの活用

- NextAuth統合の成功/失敗を記録
- プロフィール変更の監査ログ
- 他コンテキストへの通知

### 4. エラーハンドリング戦略

- NextAuth統合エラーはユーザー体験を阻害しない
- 非同期での復旧処理
- データ整合性の定期チェック

## パフォーマンス考慮（NextAuth統合版）

### 読み込み戦略

1. **User集約の最適化**

   - プロフィール情報は完全読み込み（小さいデータ）
   - NextAuthIDによる高速検索（インデックス必須）
   - 頻繁なアクセスパターンに対応

2. **NextAuth統合の最適化**
   - コールバック処理は50ms以内
   - 重い処理は非同期実行
   - 統合チェックはバックグラウンド

### キャッシュ戦略

| 対象               | キャッシュ期間 | 無効化タイミング   |
| ------------------ | -------------- | ------------------ |
| ユーザー基本情報   | 10分           | プロフィール更新時 |
| NextAuthID検索結果 | 5分            | ユーザー作成時     |
| プロフィール       | 5分            | 更新時即座に無効化 |

### 統合パフォーマンス指標

- NextAuth統合処理: 目標100ms以内
- プロフィール更新: 目標50ms以内
- 整合性チェック: 1日1回のバッチ処理

## 実装例（NextAuth統合）

### User集約の実装

```typescript
// ドメインエンティティ
export class User {
  private constructor(
    private readonly id: UserId,
    private readonly nextAuthId: string,
    private email: Email,
    private profile: UserProfile,
    private preferences: UserPreferences,
    private status: UserStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private lastLoginAt?: Date
  ) {}

  // NextAuthユーザーから作成
  static createFromNextAuth(params: { nextAuthId: string; email: string; name?: string }): User {
    return new User(
      new UserId(generateUUID()),
      params.nextAuthId,
      new Email(params.email),
      UserProfile.createDefault(params.name),
      UserPreferences.default(),
      UserStatus.active(),
      new Date(),
      new Date()
    )
  }

  // NextAuthとの同期
  syncWithNextAuth(nextAuthUser: NextAuthUser): void {
    if (this.email.getValue() !== nextAuthUser.email) {
      this.email = new Email(nextAuthUser.email)
      this.updatedAt = new Date()
    }
  }

  // プロフィール更新
  updateProfile(newProfile: UserProfile): void {
    this.profile = newProfile
    this.updatedAt = new Date()
  }

  // アカウント無効化
  deactivate(reason: string): void {
    if (this.status.isDeactivated()) {
      throw new Error('Already deactivated')
    }
    this.status = UserStatus.deactivated()
    this.updatedAt = new Date()
  }
}
```

### NextAuthコールバック統合

```typescript
// pages/api/auth/[...nextauth].ts
export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      // Email Provider設定
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // ドメインユーザーの作成または同期
        await userIntegrationService.createOrSyncUser({
          nextAuthId: user.id,
          email: user.email!,
          name: user.name,
        })
        return true
      } catch (error) {
        // エラーでもログインは継続（UX優先）
        console.error('User integration failed:', error)
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
}
```

## 更新履歴

| 日付       | 内容                               | 作成者 |
| ---------- | ---------------------------------- | ------ |
| 2025-06-24 | 初版作成                           | Claude |
| 2025-06-24 | NextAuth統合前提での全面再設計更新 | Claude |
