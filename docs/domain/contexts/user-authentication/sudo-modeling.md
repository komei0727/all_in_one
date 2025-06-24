# SUDOモデリング - ユーザー認証コンテキスト

## 概要

本ドキュメントは、ユーザー認証コンテキスト（User Authentication Context）に特化したSUDOモデリングの成果物です。
このコンテキストは、ユーザーの認証・認可・セッション管理を提供し、システム全体のセキュリティ基盤となる支援サブドメインです。

## 1. システム関連図（System Context Diagram）

ユーザー認証コンテキストと外部アクター、他コンテキストとの関係を示します。

```mermaid
graph TB
    subgraph "アクター"
        USER[ユーザー<br/>- 田中健太<br/>- 佐藤美咲<br/>- 山田・鈴木]
        ADMIN[管理者<br/>将来拡張]
    end

    subgraph "ユーザー認証コンテキスト"
        UA[ユーザー認証システム]
    end

    subgraph "他のコンテキスト"
        IM[食材管理<br/>コンテキスト]
        SS[買い物サポート<br/>コンテキスト]
        SK[共有カーネル]
        SM[共有管理<br/>コンテキスト<br/>Phase 2]
    end

    subgraph "外部システム"
        SUPA[Supabase<br/>Authentication]
        EMAIL[メール<br/>サービス]
    end

    %% アクターとの関係
    USER -->|登録・ログイン| UA
    UA -->|認証状態| USER
    ADMIN -->|ユーザー管理| UA

    %% 他コンテキストとの関係
    IM -->|認証確認| UA
    SS -->|認証確認| UA
    SM -->|認証・認可確認| UA
    UA -->|UserId提供| IM
    UA -->|UserId提供| SS
    UA -->|基本型使用| SK

    %% 外部システムとの関係
    UA <-->|認証処理委譲| SUPA
    UA -->|メール送信| EMAIL

    style UA fill:#74c0fc,stroke:#339af0,stroke-width:4px
    style IM fill:#ff8787,stroke:#c92a2a,stroke-width:2px
    style SS fill:#ff8787,stroke:#c92a2a,stroke-width:2px
    style SM fill:#ffa8a8,stroke:#c92a2a,stroke-width:1px,stroke-dasharray: 5 5
    style SK fill:#ffd43b,stroke:#fab005,stroke-width:2px
```

## 2. ユースケース図（Use Case Diagram）

ユーザー認証コンテキストの主要なユースケースを示します。

```mermaid
graph TB
    subgraph "アクター"
        USER((ユーザー))
        SYSTEM((システム))
        ADMIN((管理者))
    end

    subgraph "ユーザー認証コンテキスト"
        UC1[アカウントを作成する]
        UC2[ログインする]
        UC3[ログアウトする]
        UC4[パスワードをリセットする]
        UC5[メールアドレスを確認する]
        UC6[プロフィールを更新する]
        UC7[アカウントを削除する]
        UC8[セッションを検証する]
        UC9[権限を確認する]
        UC10[ユーザーを管理する<br/>Phase 2]
    end

    %% ユーザーのユースケース
    USER --> UC1
    USER --> UC2
    USER --> UC3
    USER --> UC4
    USER --> UC6
    USER --> UC7

    %% システムのユースケース
    SYSTEM --> UC8
    SYSTEM --> UC9

    %% 管理者のユースケース
    ADMIN --> UC10

    %% 依存関係
    UC1 -.->|<<include>>| UC5
    UC4 -.->|<<include>>| UC5
    UC8 -.->|<<include>>| UC9
```

## 3. ドメインモデル図（Domain Model Diagram）

ユーザー認証コンテキストの中核となるドメインモデルを示します。

```mermaid
classDiagram
    class User {
        -UserId id
        -Email email
        -EmailVerified emailVerified
        -UserProfile profile
        -CreatedAt createdAt
        -UpdatedAt updatedAt
        -LastLoginAt lastLoginAt
        +register(email: Email, password: Password): void
        +verifyEmail(token: VerificationToken): void
        +updateProfile(profile: UserProfile): void
        +changePassword(current: Password, new: Password): void
        +recordLogin(): void
        +deactivate(): void
    }

    class UserCredential {
        -UserId userId
        -HashedPassword password
        -PasswordSalt salt
        -PasswordChangedAt changedAt
        +verify(password: Password): boolean
        +updatePassword(password: Password): void
        +isExpired(): boolean
    }

    class AuthSession {
        -SessionId id
        -UserId userId
        -SessionToken token
        -ExpiresAt expiresAt
        -IpAddress ipAddress
        -UserAgent userAgent
        -CreatedAt createdAt
        +isValid(): boolean
        +refresh(): void
        +revoke(): void
    }

    class PasswordResetToken {
        -TokenId id
        -UserId userId
        -ResetToken token
        -ExpiresAt expiresAt
        -UsedAt usedAt
        +isValid(): boolean
        +use(): void
    }

    class EmailVerificationToken {
        -TokenId id
        -UserId userId
        -VerificationToken token
        -Email email
        -ExpiresAt expiresAt
        -VerifiedAt verifiedAt
        +isValid(): boolean
        +verify(): void
    }

    class UserRepository {
        <<interface>>
        +save(user: User): void
        +findById(id: UserId): User
        +findByEmail(email: Email): User
        +exists(email: Email): boolean
        +delete(id: UserId): void
    }

    class AuthSessionRepository {
        <<interface>>
        +save(session: AuthSession): void
        +findByToken(token: SessionToken): AuthSession
        +findByUserId(userId: UserId): AuthSession[]
        +deleteExpired(): void
        +deleteByUserId(userId: UserId): void
    }

    class DomainService {
        <<service>>
        +DomainAuthenticationService
        +PasswordHashingService
        +TokenGenerationService
    }

    class SupabaseAuthAdapter {
        <<adapter>>
        +createUser(email: Email, password: Password): SupabaseUser
        +signIn(email: Email, password: Password): SupabaseSession
        +signOut(token: SessionToken): void
        +resetPassword(email: Email): void
        +verifyOtp(token: string): void
    }

    %% 関連
    User "1" --> "0..1" UserCredential : has
    User "1" --> "0..*" AuthSession : has active
    User "1" --> "0..*" PasswordResetToken : requests
    User "1" --> "0..*" EmailVerificationToken : receives
    UserRepository ..> User : manages
    AuthSessionRepository ..> AuthSession : manages
    DomainService ..> User : uses
    DomainService ..> UserCredential : uses
    SupabaseAuthAdapter ..> User : adapts
```

## 4. オブジェクト図（Object Diagram）

具体的なシナリオでのオブジェクトの状態を示します。

### シナリオ1: 田中健太の新規登録とログイン

```mermaid
graph TB
    subgraph "新規登録時"
        USER1["user:User<br/>id='user_tanaka'<br/>email='tanaka@example.com'<br/>emailVerified=false<br/>provider='EMAIL'"]
        CRED1["credential:UserCredential<br/>userId='user_tanaka'<br/>password='hashed...'<br/>salt='salt123'"]
        TOKEN1["token:EmailVerificationToken<br/>userId='user_tanaka'<br/>token='verify123'<br/>expiresAt='2025-01-25T12:00'"]
    end

    subgraph "メール確認後・ログイン時"
        USER2["user:User<br/>id='user_tanaka'<br/>email='tanaka@example.com'<br/>emailVerified=true<br/>lastLoginAt='2025-01-24T10:00'"]
        SESSION1["session:AuthSession<br/>userId='user_tanaka'<br/>token='session123'<br/>expiresAt='2025-01-31T10:00'<br/>ipAddress='192.168.1.1'"]
    end

    subgraph "Supabase連携"
        SUPA_USER["supabaseUser<br/>id='uuid-tanaka'<br/>email='tanaka@example.com'"]
        SUPA_SESSION["supabaseSession<br/>access_token='jwt...'<br/>refresh_token='refresh...'"]
    end

    USER1 --> CRED1
    USER1 --> TOKEN1
    USER2 --> SESSION1
    USER2 -.->|maps to| SUPA_USER
    SESSION1 -.->|maps to| SUPA_SESSION
```

### シナリオ2: パスワードリセットフロー

```mermaid
graph TB
    subgraph "パスワードリセット要求"
        USER["user:User<br/>email='sato@example.com'"]
        RESET_TOKEN["token:PasswordResetToken<br/>userId='user_sato'<br/>token='reset456'<br/>expiresAt='2025-01-24T14:00'"]
        EMAIL_EVENT["event:PasswordResetRequested<br/>email='sato@example.com'<br/>token='reset456'"]
    end

    subgraph "リセット実行"
        NEW_CRED["credential:UserCredential<br/>userId='user_sato'<br/>password='new_hashed...'<br/>changedAt='2025-01-24T13:30'"]
        USED_TOKEN["token:PasswordResetToken<br/>usedAt='2025-01-24T13:30'"]
    end

    USER -->|requests| RESET_TOKEN
    RESET_TOKEN -->|generates| EMAIL_EVENT
    RESET_TOKEN -->|becomes| USED_TOKEN
    USER -->|updates| NEW_CRED
```

### シナリオ3: セッション管理と認証確認

```mermaid
stateDiagram-v2
    [*] --> 未認証: 初期状態

    未認証 --> 認証済み: login()<br/>session created

    認証済み --> 認証済み: validateSession()<br/>session valid

    認証済み --> セッション期限切れ: validateSession()<br/>session expired

    セッション期限切れ --> 認証済み: refresh()<br/>new session

    認証済み --> 未認証: logout()<br/>session revoked

    セッション期限切れ --> 未認証: no refresh

    note right of 認証済み
        AuthSession有効
        他コンテキストからの
        認証確認可能
    end note

    note right of セッション期限切れ
        再ログインが必要
    end note
```

## 5. コンテキスト内の重要な不変条件

1. **認証の一意性**

   - メールアドレスはシステム全体で一意
   - アクティブなセッションは同一ユーザーにつき複数許可（異なるデバイス対応）

2. **セキュリティの保証**

   - パスワードは必ずハッシュ化して保存
   - トークンは十分なランダム性を持つ
   - 有効期限切れのトークン・セッションは無効

3. **状態の整合性**

   - 未確認メールアドレスのユーザーは制限付きアクセス
   - 削除されたユーザーのセッションは即座に無効化

4. **Supabaseとの同期**
   - ローカルUserとSupabase Userは1:1対応
   - 認証状態は常にSupabaseと同期

## 6. 他コンテキストとの連携

### 食材管理・買い物サポートコンテキストへの認証提供

- UserIdの提供（認証済みユーザーのみ）
- セッション検証API
- 権限確認API（将来拡張）

### 共有管理コンテキストへの認可提供（Phase 2）

- ロールベースアクセス制御
- リソースレベルの権限チェック
- 共有グループのメンバー管理

### イベント発行

- `UserRegistered`: 新規登録完了
- `UserLoggedIn`: ログイン成功
- `UserLoggedOut`: ログアウト
- `PasswordResetRequested`: パスワードリセット要求
- `UserDeleted`: アカウント削除

### 共有カーネルの利用

- `Email`: メールアドレスの値オブジェクト
- `UserId`: ユーザーIDの値オブジェクト
- `Token`: トークンの基底値オブジェクト

## 更新履歴

| 日付       | 内容     | 作成者 |
| ---------- | -------- | ------ |
| 2025-06-24 | 初版作成 | Claude |
