# SUDOモデリング - ユーザー認証コンテキスト（NextAuth版）

## 概要

本ドキュメントは、NextAuth.jsを中核とするユーザー認証コンテキスト（User Authentication Context）のSUDOモデリング成果物です。
このコンテキストは、NextAuthが提供する標準的な認証基盤に、アプリケーション固有のユーザー管理機能を統合した支援サブドメインです。

## 設計原則

- **認証はNextAuthに委譲**: セッション管理、トークン管理、パスワードハッシュ化等
- **ドメインはビジネスロジックに特化**: ユーザープロフィール、ビジネルール、統合ロジック
- **最小限の複雑性**: 食材管理アプリに必要な機能のみ実装

## 1. システム関連図（System Context Diagram）

NextAuthを中核とした認証システムと外部アクター、他コンテキストとの関係を示します。

```mermaid
graph TB
    subgraph "アクター"
        USER[ユーザー<br/>- 田中健太<br/>- 佐藤美咲<br/>- 山田・鈴木]
        ADMIN[管理者<br/>将来拡張]
    end

    subgraph "ユーザー認証コンテキスト"
        subgraph "NextAuth層"
            NEXTAUTH[NextAuth.js<br/>認証エンジン]
            ADAPTER[Prisma Adapter<br/>永続化]
        end

        subgraph "ドメイン層"
            USER_MGMT[ユーザー管理<br/>ドメイン]
            PROFILE_MGMT[プロフィール管理<br/>ドメイン]
        end

        subgraph "統合層"
            CALLBACKS[NextAuth<br/>コールバック統合]
        end
    end

    subgraph "他のコンテキスト"
        IM[食材管理<br/>コンテキスト]
        SS[買い物サポート<br/>コンテキスト]
        SK[共有カーネル]
        SM[共有管理<br/>コンテキスト<br/>Phase 2]
    end

    subgraph "外部システム"
        EMAIL[メール配信<br/>サービス]
        OAUTH[OAuth Provider<br/>Google/GitHub<br/>将来拡張]
    end

    %% アクターとの関係
    USER -->|マジックリンク認証| NEXTAUTH
    NEXTAUTH -->|認証状態| USER
    ADMIN -->|ユーザー管理| USER_MGMT

    %% NextAuth内部の関係
    NEXTAUTH --> ADAPTER
    NEXTAUTH --> CALLBACKS
    CALLBACKS --> USER_MGMT
    CALLBACKS --> PROFILE_MGMT

    %% 他コンテキストとの関係
    IM -->|セッション確認| NEXTAUTH
    SS -->|セッション確認| NEXTAUTH
    SM -->|認証・認可確認| USER_MGMT
    USER_MGMT -->|UserId提供| IM
    USER_MGMT -->|UserId提供| SS
    USER_MGMT -->|基本型使用| SK

    %% 外部システムとの関係
    NEXTAUTH -->|メール送信| EMAIL
    NEXTAUTH <-->|OAuth認証| OAUTH

    style NEXTAUTH fill:#22c55e,stroke:#16a34a,stroke-width:4px
    style USER_MGMT fill:#74c0fc,stroke:#339af0,stroke-width:4px
    style PROFILE_MGMT fill:#74c0fc,stroke:#339af0,stroke-width:4px
    style IM fill:#ff8787,stroke:#c92a2a,stroke-width:2px
    style SS fill:#ff8787,stroke:#c92a2a,stroke-width:2px
    style SM fill:#ffa8a8,stroke:#c92a2a,stroke-width:1px,stroke-dasharray: 5 5
    style SK fill:#ffd43b,stroke:#fab005,stroke-width:2px
```

## 2. ユースケース図（Use Case Diagram）

NextAuth中心の認証システムにおける主要ユースケースを示します。

```mermaid
graph TB
    subgraph "アクター"
        USER((ユーザー))
        SYSTEM((システム))
        ADMIN((管理者))
        NEXTAUTH((NextAuth.js))
    end

    subgraph "NextAuth標準ユースケース"
        NA1[マジックリンクでログインする]
        NA2[ログアウトする]
        NA3[セッションを管理する]
        NA4[メール認証を処理する]
        NA5[OAuth認証する<br/>将来拡張]
    end

    subgraph "ドメイン固有ユースケース"
        UC1[プロフィールを設定する]
        UC2[プロフィールを更新する]
        UC3[アカウントを削除する]
        UC4[ユーザー情報を統合する]
        UC5[ビジネスルールを適用する]
    end

    subgraph "システム統合ユースケース"
        SU1[セッションを検証する]
        SU2[ユーザーIDを提供する]
        SU3[認証状態を確認する]
        SU4[ユーザーを管理する<br/>Phase 2]
    end

    %% ユーザーのユースケース
    USER --> NA1
    USER --> NA2
    USER --> UC1
    USER --> UC2
    USER --> UC3

    %% NextAuthの処理
    NEXTAUTH --> NA3
    NEXTAUTH --> NA4
    NEXTAUTH --> NA5

    %% システムのユースケース
    SYSTEM --> SU1
    SYSTEM --> SU2
    SYSTEM --> SU3

    %% 管理者のユースケース
    ADMIN --> SU4

    %% 統合関係
    NA1 -.->|triggers| UC4
    NA3 -.->|enables| SU1
    UC4 -.->|applies| UC5
    SU1 -.->|provides| SU2

    %% スタイル
    style NA1 fill:#22c55e,stroke:#16a34a
    style NA2 fill:#22c55e,stroke:#16a34a
    style NA3 fill:#22c55e,stroke:#16a34a
    style NA4 fill:#22c55e,stroke:#16a34a
    style NA5 fill:#86efac,stroke:#16a34a,stroke-dasharray: 5 5
```

## 3. ドメインモデル図（Domain Model Diagram）

NextAuth統合を前提とした簡素化されたドメインモデルを示します。

```mermaid
classDiagram
    %% NextAuth標準エンティティ（外部管理）
    class NextAuthUser {
        <<NextAuth Entity>>
        -id: string
        -email: string
        -emailVerified: Date
        -name: string
        -image: string
        -createdAt: Date
        -updatedAt: Date
        +[NextAuthが管理]
    }

    class NextAuthSession {
        <<NextAuth Entity>>
        -id: string
        -sessionToken: string
        -userId: string
        -expires: Date
        +[NextAuthが管理]
    }

    class NextAuthAccount {
        <<NextAuth Entity>>
        -id: string
        -userId: string
        -type: string
        -provider: string
        -providerAccountId: string
        +[NextAuthが管理]
    }

    %% ドメイン固有エンティティ
    class User {
        -UserId id
        -Email email
        -UserProfile profile
        -UserStatus status
        -CreatedAt createdAt
        -UpdatedAt updatedAt
        -LastLoginAt lastLoginAt
        +createFromNextAuth(nextAuthUser: NextAuthUser): User
        +updateProfile(profile: UserProfile): void
        +recordLogin(): void
        +deactivate(): void
        +canAccessFeature(feature: string): boolean
    }

    %% 値オブジェクト
    class UserId {
        <<value object>>
        -value: string
        +getValue(): string
        +equals(other: UserId): boolean
    }

    class Email {
        <<value object>>
        -value: string
        +getValue(): string
        +isValid(): boolean
        +getDomain(): string
    }

    class UserProfile {
        <<value object>>
        -displayName: string
        -timezone: string
        -language: string
        -preferences: UserPreferences
        +updateDisplayName(name: string): UserProfile
        +updatePreferences(prefs: UserPreferences): UserProfile
    }

    class UserPreferences {
        <<value object>>
        -theme: string
        -notifications: boolean
        -emailFrequency: string
        +isValidTheme(theme: string): boolean
    }

    class UserStatus {
        <<value object>>
        -status: string
        +isActive(): boolean
        +isDeactivated(): boolean
        +canLogin(): boolean
    }

    %% リポジトリ
    class UserRepository {
        <<interface>>
        +save(user: User): void
        +findById(id: UserId): User
        +findByEmail(email: Email): User
        +findByNextAuthId(nextAuthId: string): User
        +exists(email: Email): boolean
        +delete(id: UserId): void
    }

    %% ドメインサービス
    class UserIntegrationService {
        <<domain service>>
        +createFromNextAuth(nextAuthUser: NextAuthUser): User
        +syncWithNextAuth(user: User, nextAuthUser: NextAuthUser): User
        +handleFirstLogin(user: User): void
    }

    class UserProfileService {
        <<domain service>>
        +validateProfile(profile: UserProfile): boolean
        +applyBusinessRules(user: User): void
        +canUpdateProfile(user: User): boolean
    }

    %% NextAuth統合
    class NextAuthCallbacks {
        <<integration>>
        +signIn(account, profile): boolean
        +session(session, user): Session
        +jwt(token, user): Token
        +redirect(url, baseUrl): string
    }

    %% 関連
    NextAuthUser "1" --> "0..*" NextAuthSession : has
    NextAuthUser "1" --> "0..*" NextAuthAccount : has
    NextAuthUser "1" --> "1" User : maps to

    User --> UserId : has
    User --> Email : has
    User --> UserProfile : has
    User --> UserStatus : has
    UserProfile --> UserPreferences : contains

    UserRepository ..> User : manages
    UserIntegrationService ..> User : creates/syncs
    UserIntegrationService ..> NextAuthUser : uses
    UserProfileService ..> User : validates
    UserProfileService ..> UserProfile : validates

    NextAuthCallbacks ..> UserIntegrationService : delegates to
    NextAuthCallbacks ..> NextAuthUser : receives
    NextAuthCallbacks ..> User : creates/updates

    %% スタイル
    style NextAuthUser fill:#86efac,stroke:#16a34a
    style NextAuthSession fill:#86efac,stroke:#16a34a
    style NextAuthAccount fill:#86efac,stroke:#16a34a
    style User fill:#74c0fc,stroke:#339af0
    style UserIntegrationService fill:#fbbf24,stroke:#f59e0b
    style UserProfileService fill:#fbbf24,stroke:#f59e0b
    style NextAuthCallbacks fill:#a78bfa,stroke:#7c3aed
```

## 4. オブジェクト図（Object Diagram）

NextAuth統合シナリオでの具体的なオブジェクト状態を示します。

### シナリオ1: 田中健太のマジックリンク認証とユーザー統合

```mermaid
graph TB
    subgraph "初回ログイン（NextAuth処理）"
        NA_USER1["nextAuthUser:NextAuthUser<br/>id='clxxxx1234'<br/>email='tanaka@example.com'<br/>emailVerified='2025-01-24T09:00'<br/>name=null<br/>image=null"]
        NA_SESSION1["nextAuthSession:NextAuthSession<br/>id='sess_tanaka'<br/>sessionToken='next-auth.session-token.xxx'<br/>userId='clxxxx1234'<br/>expires='2025-02-24T09:00'"]
        NA_ACCOUNT1["nextAuthAccount:NextAuthAccount<br/>id='acc_tanaka'<br/>userId='clxxxx1234'<br/>type='email'<br/>provider='email'<br/>providerAccountId='tanaka@example.com'"]
    end

    subgraph "ドメイン統合後"
        USER1["user:User<br/>id=UserId('user_tanaka_001')<br/>email=Email('tanaka@example.com')<br/>profile=UserProfile(displayName='田中健太')<br/>status=UserStatus('ACTIVE')<br/>lastLoginAt='2025-01-24T09:00'"]
        PROFILE1["profile:UserProfile<br/>displayName='田中健太'<br/>timezone='Asia/Tokyo'<br/>language='ja'<br/>preferences=UserPreferences(...)"]
        PREFS1["preferences:UserPreferences<br/>theme='light'<br/>notifications=true<br/>emailFrequency='weekly'"]
    end

    subgraph "統合処理"
        INTEGRATION["integration:UserIntegrationService<br/>createFromNextAuth()<br/>handleFirstLogin()"]
    end

    NA_USER1 --> NA_SESSION1
    NA_USER1 --> NA_ACCOUNT1
    NA_USER1 -->|triggers| INTEGRATION
    INTEGRATION -->|creates| USER1
    USER1 --> PROFILE1
    PROFILE1 --> PREFS1
    USER1 -.->|maps to| NA_USER1
```

### シナリオ2: 既存ユーザーのログインとセッション管理

```mermaid
graph TB
    subgraph "ログイン時（NextAuth処理）"
        NA_USER2["nextAuthUser:NextAuthUser<br/>id='clxxxx5678'<br/>email='sato@example.com'<br/>emailVerified='2025-01-20T14:00'<br/>name='佐藤美咲'"]
        NA_SESSION2["nextAuthSession:NextAuthSession<br/>sessionToken='next-auth.session-token.yyy'<br/>userId='clxxxx5678'<br/>expires='2025-02-24T10:30'"]
    end

    subgraph "既存ドメインユーザー"
        USER2["user:User<br/>id=UserId('user_sato_002')<br/>email=Email('sato@example.com')<br/>profile=UserProfile(...)<br/>lastLoginAt='2025-01-24T10:30'"]
    end

    subgraph "同期処理"
        SYNC["sync:UserIntegrationService<br/>syncWithNextAuth()<br/>recordLogin()"]
    end

    NA_USER2 --> NA_SESSION2
    NA_USER2 -->|triggers sync| SYNC
    SYNC -->|updates| USER2
    USER2 -.->|mapped to| NA_USER2
```

### シナリオ3: NextAuthコールバック統合フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant NextAuth as NextAuth.js
    participant Callbacks as NextAuthCallbacks
    participant IntegrationService as UserIntegrationService
    participant DomainUser as Domain User
    participant Repository as UserRepository

    User ->> NextAuth: マジックリンククリック
    NextAuth ->> NextAuth: メール認証確認
    NextAuth ->> Callbacks: signIn callback

    alt 初回ログイン
        Callbacks ->> IntegrationService: createFromNextAuth()
        IntegrationService ->> DomainUser: new User(...)
        IntegrationService ->> Repository: save(user)
        Repository -->> IntegrationService: success
        IntegrationService -->> Callbacks: user created
    else 既存ユーザー
        Callbacks ->> IntegrationService: syncWithNextAuth()
        IntegrationService ->> Repository: findByNextAuthId()
        Repository -->> IntegrationService: existing user
        IntegrationService ->> DomainUser: recordLogin()
        IntegrationService ->> Repository: save(user)
        IntegrationService -->> Callbacks: user synced
    end

    Callbacks -->> NextAuth: continue
    NextAuth ->> Callbacks: session callback
    Callbacks ->> Repository: findByNextAuthId()
    Repository -->> Callbacks: domain user
    Callbacks -->> NextAuth: enhanced session
    NextAuth -->> User: 認証完了
```

### シナリオ4: 認証状態の管理

```mermaid
stateDiagram-v2
    [*] --> 未認証: 初期状態

    未認証 --> NextAuth認証中: マジックリンククリック

    NextAuth認証中 --> NextAuth認証済み: NextAuth処理完了

    NextAuth認証済み --> ドメイン統合中: Callbacks実行

    ドメイン統合中 --> 認証完了: ドメインユーザー作成/同期

    認証完了 --> 認証完了: セッション有効<br/>getServerSession()

    認証完了 --> セッション期限切れ: NextAuthセッション失効

    セッション期限切れ --> 未認証: セッション削除

    認証完了 --> 未認証: signOut()

    note right of 認証完了
        NextAuthSession有効
        ドメインUser存在
        他コンテキストから
        ユーザー情報取得可能
    end note

    note right of ドメイン統合中
        NextAuthCallbacks実行
        UserIntegrationService実行
        ビジネスルール適用
    end note
```

## 5. コンテキスト内の重要な不変条件

### NextAuth統合における不変条件

1. **認証の一意性と整合性**
   - メールアドレスはシステム全体で一意（NextAuthレベル）
   - NextAuthユーザーとドメインユーザーは1:1対応を維持
   - アクティブなセッションは同一ユーザーにつき複数許可（異なるデバイス対応）

2. **データ整合性の保証**
   - NextAuthユーザー作成時に必ずドメインユーザーを作成
   - ドメインユーザーのEmailはNextAuthユーザーのemailと常に同期
   - 論理削除されたドメインユーザーは認証を拒否

3. **セキュリティ境界の維持**
   - 認証・認可はNextAuthに委譲（パスワード、トークン、セッション管理）
   - ビジネスロジックはドメイン層で管理（プロフィール、権限、状態）
   - NextAuthコールバックでのみドメイン統合を実行

4. **状態管理の一貫性**
   - 初回ログイン時はUserIntegrationService.createFromNextAuth()を必ず実行
   - 既存ユーザーログイン時はUserIntegrationService.syncWithNextAuth()を実行
   - セッション有効性はNextAuth.getServerSession()で確認

## 6. 他コンテキストとの連携

### 食材管理・買い物サポートコンテキストへの認証提供

**提供する機能**
- **セッション確認**: NextAuth.getServerSession()によるセッション検証
- **ユーザーID提供**: 認証済みユーザーのUserId取得
- **ユーザー情報取得**: プロフィール、設定情報の提供

**統合方法**
```typescript
// 食材管理コンテキストでの使用例
const session = await getServerSession(authOptions)
if (!session?.user?.id) throw new UnauthorizedError()

const userId = new UserId(session.user.id)
const user = await userRepository.findByNextAuthId(session.user.id)
```

### 共有管理コンテキストへの認可提供（Phase 2）

**提供する機能**
- **ロールベースアクセス制御**: UserStatus, UserPreferencesによる権限管理
- **リソースレベル権限チェック**: User.canAccessFeature()メソッド
- **共有グループメンバー管理**: 将来的なマルチテナント対応

### イベント発行（ドメインイベント）

**NextAuth統合特化イベント**
- `UserCreatedFromNextAuth`: NextAuthユーザーからドメインユーザー作成
- `UserSyncedWithNextAuth`: 既存ユーザーとNextAuthユーザーの同期
- `UserProfileUpdated`: プロフィール更新
- `UserDeactivated`: アカウント削除（論理削除）

**従来イベントの簡素化**
- ~~`UserRegistered`~~: NextAuthが処理
- ~~`UserLoggedIn`~~: NextAuthが処理
- ~~`UserLoggedOut`~~: NextAuthが処理
- ~~`PasswordResetRequested`~~: NextAuthが処理

### 共有カーネルの利用

**継続使用する値オブジェクト**
- `Email`: メールアドレス値オブジェクト（バリデーション強化）
- `UserId`: アプリケーション固有のユーザーID
- `DomainEvent`: イベント基底クラス（userId、correlationId追加）

**不要となる値オブジェクト**
- ~~`Token`基底クラス~~: NextAuthが管理
- ~~`Password`関連~~: NextAuthが管理
- ~~`SessionToken`~~: NextAuthが管理

## 7. 実装優先度とロードマップ

### Phase 1: NextAuth基盤構築（高優先度）
1. NextAuth設定とEmailProvider設定
2. Prismaスキーマ（NextAuth標準テーブル）
3. NextAuthCallbacks実装
4. UserIntegrationService実装

### Phase 2: ドメイン機能実装（中優先度）
1. User、UserProfile、UserStatus値オブジェクト
2. UserRepository実装
3. UserProfileService実装
4. プロフィール管理API

### Phase 3: 統合・最適化（低優先度）
1. ドメインイベント発行
2. 他コンテキストとの統合テスト
3. OAuth プロバイダー追加
4. 管理機能実装

## 更新履歴

| 日付       | 内容                             | 作成者 |
| ---------- | -------------------------------- | ------ |
| 2025-06-24 | 初版作成                         | Claude |
| 2025-06-24 | NextAuth前提での全面再設計・更新 | Claude |
