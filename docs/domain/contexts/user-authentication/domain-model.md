# ユーザー認証コンテキスト - ドメインモデル仕様（NextAuth版）

## 概要

このドキュメントでは、NextAuth.jsを基盤とするユーザー認証コンテキストのドメインモデルを定義します。
NextAuthが提供する認証機能を活用し、アプリケーション固有のビジネスロジックに特化したエンティティ、値オブジェクト、その責務とビジネスルールに焦点を当てています。

## 設計原則

- **責任分離**: 認証処理はNextAuth、ビジネスロジックはドメイン層
- **最小限の複雑性**: 食材管理アプリに必要な機能のみ実装
- **NextAuth統合**: NextAuthエンティティとの1:1マッピング維持

## エンティティ

### ユーザー（User）

アプリケーション固有のユーザーエンティティ。NextAuthユーザーと1:1対応し、ビジネスロジックとプロフィール管理を担当します。

#### 属性

| 属性             | 型          | 説明                   | 制約                        |
| ---------------- | ----------- | ---------------------- | --------------------------- |
| id               | UserId      | アプリケーション内ID   | 必須、不変                  |
| nextAuthId       | string      | NextAuthユーザーID     | 必須、NextAuthとの紐付け    |
| email            | Email       | メールアドレス         | 必須、NextAuthと同期        |
| profile          | UserProfile | ユーザープロフィール   | 必須、表示名等の基本情報    |
| status           | UserStatus  | ユーザー状態           | 必須、ACTIVE/DEACTIVATED    |
| createdAt        | Date        | 作成日時               | 必須、不変                  |
| updatedAt        | Date        | 更新日時               | 必須                        |
| lastLoginAt      | Date        | 最終ログイン日時       | 任意、ログイン時に更新      |

#### ビジネスルール

- NextAuthユーザーと1:1対応を維持
- メールアドレスはNextAuthと常に同期
- 削除は論理削除のみ（status=DEACTIVATED）
- 認証処理はNextAuthに委譲

#### 主要な振る舞い

- `createFromNextAuth(nextAuthUser)` - NextAuthユーザーからの作成
- `updateProfile(profile)` - プロフィール更新
- `recordLogin()` - ログイン記録
- `deactivate()` - アカウント無効化
- `canAccessFeature(feature)` - 機能アクセス権限確認

#### NextAuth統合

```typescript
// NextAuthユーザーとの対応関係
NextAuthUser.id → User.nextAuthId
NextAuthUser.email → User.email
NextAuthUser.name → User.profile.displayName（初期値）
```

## 値オブジェクト

### 値オブジェクト一覧（NextAuth統合版）

| 名前           | 説明                   | 主な責務                       | 継続使用 |
| -------------- | ---------------------- | ------------------------------ | -------- |
| UserId         | アプリケーション内ID   | ドメインユーザーの一意識別     | ✅       |
| Email          | メールアドレス         | メールアドレスの形式検証       | ✅       |
| UserProfile    | ユーザープロフィール   | 表示名等の基本情報管理         | ✅       |
| UserPreferences| ユーザー設定           | テーマ、通知等の設定管理       | ✅       |
| UserStatus     | ユーザー状態           | アクティブ/無効状態の管理      | ✅       |
| ~~Password~~   | ~~パスワード（平文）~~ | ~~NextAuthが管理~~             | ❌       |
| ~~HashedPassword~~ | ~~ハッシュ化パスワード~~ | ~~NextAuthが管理~~         | ❌       |
| ~~SessionToken~~ | ~~セッショントークン~~ | ~~NextAuthが管理~~           | ❌       |
| ~~SessionId~~  | ~~セッションID~~       | ~~NextAuthが管理~~             | ❌       |
| ~~IpAddress~~  | ~~IPアドレス~~         | ~~NextAuthが管理~~             | ❌       |

### 値オブジェクト詳細

#### UserId

アプリケーション固有のユーザー識別子。NextAuthIDとは別の内部ID。

**属性:**

- value: string (UUID v4形式)

**制約:**

- 必須
- UUID v4形式
- 不変
- NextAuthIdとは独立

**振る舞い:**

- `equals(other: UserId): boolean` - 等価性判定
- `getValue(): string` - 値取得

#### Email

メールアドレスを表現する値オブジェクト（NextAuthと同期）。

**属性:**

- value: string

**制約:**

- 必須
- RFC 5322準拠のメールアドレス形式
- 最大254文字
- 小文字に正規化
- NextAuthのemailと常に同期

**振る舞い:**

- `equals(other: Email): boolean` - 等価性判定
- `getDomain(): string` - ドメイン部分取得
- `isValid(): boolean` - 形式検証

#### UserProfile

ユーザーのプロフィール情報を表現する値オブジェクト。

**属性:**

- displayName: string - 表示名（必須）
- timezone: string - タイムゾーン（デフォルト: 'Asia/Tokyo'）
- language: string - 言語設定（デフォルト: 'ja'）
- preferences: UserPreferences - ユーザー設定

**制約:**

- displayNameは必須、1-50文字
- timezoneは有効なIANAタイムゾーン
- languageはISO 639-1形式

**振る舞い:**

- `updateDisplayName(name: string): UserProfile` - 表示名更新
- `updatePreferences(prefs: UserPreferences): UserProfile` - 設定更新
- `validate(): boolean` - プロフィール検証

#### UserPreferences

ユーザーの個人設定を表現する値オブジェクト。

**属性:**

- theme: string - UIテーマ（'light' | 'dark' | 'system'）
- notifications: boolean - 通知有効/無効
- emailFrequency: string - メール通知頻度（'none' | 'weekly' | 'daily'）

**制約:**

- themeは定義済み値のみ
- emailFrequencyは定義済み値のみ

**振る舞い:**

- `isValidTheme(theme: string): boolean` - テーマ検証
- `updateTheme(theme: string): UserPreferences` - テーマ更新
- `updateNotifications(enabled: boolean): UserPreferences` - 通知設定更新

#### UserStatus

ユーザーの状態を表現する値オブジェクト。

**属性:**

- status: string - 状態（'ACTIVE' | 'DEACTIVATED' | 'SUSPENDED'）

**制約:**

- statusは定義済み値のみ
- DEACTIVATEDは論理削除扱い

**振る舞い:**

- `isActive(): boolean` - アクティブ状態確認
- `isDeactivated(): boolean` - 無効化状態確認
- `canLogin(): boolean` - ログイン可能確認
- `deactivate(): UserStatus` - 無効化状態への変更

## ドメインサービス（NextAuth統合版）

### UserIntegrationService

NextAuthとドメインユーザーの統合を担当するドメインサービス。

**責務:**

- NextAuthユーザーからドメインユーザーの作成
- NextAuthユーザーとドメインユーザーの同期
- 初回ログイン時のビジネスロジック適用

**主要メソッド:**

- `createFromNextAuth(nextAuthUser: NextAuthUser): User` - ドメインユーザー作成
- `syncWithNextAuth(user: User, nextAuthUser: NextAuthUser): User` - ユーザー同期
- `handleFirstLogin(user: User): void` - 初回ログイン処理
- `validateNextAuthUser(nextAuthUser: NextAuthUser): boolean` - NextAuthユーザー検証

**統合ロジック:**

```typescript
// 初回ログイン時の処理例
createFromNextAuth(nextAuthUser) {
  const user = new User({
    id: new UserId(generateUUID()),
    nextAuthId: nextAuthUser.id,
    email: new Email(nextAuthUser.email),
    profile: UserProfile.createDefault(nextAuthUser.name),
    status: UserStatus.active()
  });
  
  this.handleFirstLogin(user);
  return user;
}
```

### UserProfileService

ユーザープロフィール管理のビジネスロジックを担当するドメインサービス。

**責務:**

- プロフィール更新の検証
- ビジネスルールの適用
- プロフィール変更の妥当性確認

**主要メソッド:**

- `validateProfile(profile: UserProfile): ValidationResult` - プロフィール検証
- `applyBusinessRules(user: User): void` - ビジネスルール適用
- `canUpdateProfile(user: User): boolean` - 更新権限確認
- `createDefaultProfile(displayName?: string): UserProfile` - デフォルトプロフィール作成

**ビジネスルール例:**

```typescript
validateProfile(profile: UserProfile): ValidationResult {
  // 表示名の重複チェック
  // 不適切な文字列チェック
  // 長さ制限チェック
  return ValidationResult;
}
```

## ファクトリ（NextAuth統合版）

### UserFactory

NextAuth統合を前提とした新規ユーザーの作成を担当するファクトリ。

**責務:**

- NextAuthユーザーからのドメインユーザー生成
- 初期状態の設定
- デフォルト値の適用

**主要メソッド:**

- `fromNextAuthUser(nextAuthUser: NextAuthUser): User` - NextAuthからの作成
- `createWithProfile(nextAuthUser: NextAuthUser, profile: UserProfile): User` - プロフィール指定作成
- `createDefault(nextAuthId: string, email: string): User` - デフォルト作成

**作成例:**

```typescript
fromNextAuthUser(nextAuthUser: NextAuthUser): User {
  return new User({
    id: new UserId(generateUUID()),
    nextAuthId: nextAuthUser.id,
    email: new Email(nextAuthUser.email),
    profile: UserProfile.createDefault(nextAuthUser.name),
    status: UserStatus.active(),
    createdAt: new Date(),
    updatedAt: new Date()
  });
}
```

## リポジトリインターフェース

### UserRepository

ドメインユーザーの永続化を担当するリポジトリインターフェース。

**責務:**

- ドメインユーザーのCRUD操作
- NextAuthIDによる検索
- ビジネス検索条件による取得

**主要メソッド:**

- `save(user: User): Promise<void>` - ユーザー保存
- `findById(id: UserId): Promise<User | null>` - ID検索
- `findByEmail(email: Email): Promise<User | null>` - メール検索
- `findByNextAuthId(nextAuthId: string): Promise<User | null>` - NextAuthID検索
- `exists(email: Email): Promise<boolean>` - 存在確認
- `delete(id: UserId): Promise<void>` - 論理削除
- `findActiveUsers(): Promise<User[]>` - アクティブユーザー取得

## 仕様パターン（NextAuth統合版）

### ActiveUserSpecification

アクティブなユーザーかどうかを判定する仕様（セッション管理はNextAuthに委譲）。

**判定基準:**

- ユーザーステータスがACTIVE
- 論理削除されていない（status != DEACTIVATED）
- NextAuthユーザーと正常に紐付いている

**実装例:**

```typescript
class ActiveUserSpecification {
  isSatisfiedBy(user: User): boolean {
    return user.status.isActive() && 
           user.nextAuthId != null;
  }
}
```

### ValidProfileSpecification

有効なプロフィールかどうかを判定する仕様。

**判定基準:**

- 表示名が設定されている
- 不適切な文字列を含まない
- 長さ制限を満たしている
- 必須項目が設定されている

**実装例:**

```typescript
class ValidProfileSpecification {
  isSatisfiedBy(profile: UserProfile): boolean {
    return profile.displayName.length >= 1 &&
           profile.displayName.length <= 50 &&
           this.isAppropriateContent(profile.displayName);
  }
}
```

### NextAuthIntegrationSpecification

NextAuthとの統合が正常かどうかを判定する仕様。

**判定基準:**

- NextAuthIDが存在する
- Emailが同期されている
- NextAuthユーザーが存在する（外部確認）

**実装例:**

```typescript
class NextAuthIntegrationSpecification {
  isSatisfiedBy(user: User, nextAuthUser?: NextAuthUser): boolean {
    return user.nextAuthId != null &&
           nextAuthUser != null &&
           user.email.getValue() === nextAuthUser.email;
  }
}
```

## 削除された仕様パターン

以下の仕様パターンはNextAuthに委譲されるため削除：

- ~~`ActiveSessionSpecification`~~: NextAuthがセッション管理
- ~~`PasswordPolicySpecification`~~: NextAuthがパスワード管理
- ~~`TokenValidationSpecification`~~: NextAuthがトークン管理

## ドメインイベント

### UserCreatedFromNextAuth

NextAuthユーザーからドメインユーザーが作成された際のイベント。

**属性:**

- userId: UserId - 作成されたユーザーID
- nextAuthId: string - NextAuthユーザーID
- email: Email - メールアドレス
- occurredOn: Date - 発生日時

### UserProfileUpdated

ユーザープロフィールが更新された際のイベント。

**属性:**

- userId: UserId - 対象ユーザーID
- oldProfile: UserProfile - 変更前プロフィール
- newProfile: UserProfile - 変更後プロフィール
- occurredOn: Date - 発生日時

### UserDeactivated

ユーザーが無効化された際のイベント。

**属性:**

- userId: UserId - 対象ユーザーID
- reason: string - 無効化理由
- occurredOn: Date - 発生日時

## 更新履歴

| 日付       | 内容                             | 作成者 |
| ---------- | -------------------------------- | ------ |
| 2025-06-24 | 初版作成                         | Claude |
| 2025-06-24 | NextAuth前提での全面再設計・更新 | Claude |
