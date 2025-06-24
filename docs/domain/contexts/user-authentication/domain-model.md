# ユーザー認証コンテキスト - ドメインモデル仕様

## 概要

このドキュメントでは、ユーザー認証コンテキストのドメインモデルを定義します。
エンティティ、値オブジェクト、その責務とビジネスルールに焦点を当てています。

## エンティティ

### ユーザー（User）

認証システムの中核となるエンティティ。ユーザーの基本情報と認証状態を管理します。

#### 属性

| 属性          | 型          | 説明                 | 制約                     |
| ------------- | ----------- | -------------------- | ------------------------ |
| id            | UserId      | 一意識別子           | 必須、不変               |
| email         | Email       | メールアドレス       | 必須、システム全体で一意 |
| emailVerified | boolean     | メール確認済みフラグ | 必須、デフォルトfalse    |
| profile       | UserProfile | ユーザープロフィール | 必須、名前等の基本情報   |
| createdAt     | Date        | 作成日時             | 必須、不変               |
| updatedAt     | Date        | 更新日時             | 必須                     |
| lastLoginAt   | Date        | 最終ログイン日時     | 任意、ログイン時に更新   |
| deletedAt     | Date        | 削除日時             | 論理削除用               |

#### ビジネスルール

- メールアドレスはシステム全体で一意でなければならない
- 未確認メールアドレスのユーザーは機能制限がある
- 削除は論理削除のみ（監査証跡のため）
- パスワードは直接保持せず、UserCredentialで管理

#### 主要な振る舞い

- `register(email, password)` - 新規登録
- `verifyEmail(token)` - メールアドレス確認
- `updateProfile(profile)` - プロフィール更新
- `recordLogin()` - ログイン記録
- `deactivate()` - アカウント無効化

### ユーザー認証情報（UserCredential）

ユーザーのパスワード認証情報を管理するエンティティ。

#### 属性

| 属性              | 型     | 説明                 | 制約                     |
| ----------------- | ------ | -------------------- | ------------------------ |
| userId            | UserId | ユーザーID           | 必須、Userとの1:1関係    |
| hashedPassword    | string | ハッシュ化パスワード | 必須、bcrypt等で暗号化   |
| passwordSalt      | string | パスワードソルト     | 必須、ランダム生成       |
| passwordChangedAt | Date   | パスワード変更日時   | 必須、セキュリティ監査用 |

#### ビジネスルール

- パスワードは必ずハッシュ化して保存
- ソルトは十分なランダム性を持つ
- パスワード変更時は変更日時を記録

#### 主要な振る舞い

- `verify(password)` - パスワード検証
- `updatePassword(password)` - パスワード更新
- `isExpired()` - パスワード期限切れ確認

### 認証セッション（AuthSession）

アクティブな認証セッションを管理するエンティティ。

#### 属性

| 属性      | 型           | 説明                 | 制約                       |
| --------- | ------------ | -------------------- | -------------------------- |
| id        | SessionId    | セッションID         | 必須、不変                 |
| userId    | UserId       | ユーザーID           | 必須、セッション所有者     |
| token     | SessionToken | セッショントークン   | 必須、一意、暗号学的に安全 |
| expiresAt | Date         | 有効期限             | 必須、作成から7日間        |
| ipAddress | IpAddress    | IPアドレス           | 必須、セキュリティ監査用   |
| userAgent | string       | ユーザーエージェント | 必須、デバイス識別用       |
| createdAt | Date         | 作成日時             | 必須、不変                 |
| revokedAt | Date         | 無効化日時           | 任意、ログアウト時に設定   |

#### ビジネスルール

- トークンは暗号学的に安全な方法で生成
- 有効期限切れのセッションは無効
- ユーザーごとに複数のセッション許可（複数デバイス対応）
- 無効化されたセッションは再利用不可

#### 主要な振る舞い

- `isValid()` - セッション有効性確認
- `refresh()` - セッション更新
- `revoke()` - セッション無効化

### パスワードリセットトークン（PasswordResetToken）

パスワードリセット要求を管理するエンティティ。

#### 属性

| 属性      | 型     | 説明             | 制約                       |
| --------- | ------ | ---------------- | -------------------------- |
| id        | string | トークンID       | 必須、UUID形式             |
| userId    | UserId | ユーザーID       | 必須、リセット対象ユーザー |
| token     | string | リセットトークン | 必須、暗号学的に安全な生成 |
| expiresAt | Date   | 有効期限         | 必須、作成から1時間        |
| usedAt    | Date   | 使用日時         | 任意、使用済み判定用       |
| createdAt | Date   | 作成日時         | 必須、不変                 |

#### ビジネスルール

- トークンは一度だけ使用可能
- 有効期限は1時間
- 使用済みトークンは再利用不可
- ユーザーごとに有効なトークンは1つまで

#### 主要な振る舞い

- `isValid()` - トークン有効性確認
- `markAsUsed()` - 使用済みマーク
- `isExpired()` - 有効期限切れ確認

### メール確認トークン（EmailVerificationToken）

メールアドレス確認要求を管理するエンティティ。

#### 属性

| 属性      | 型     | 説明                   | 制約                       |
| --------- | ------ | ---------------------- | -------------------------- |
| id        | string | トークンID             | 必須、UUID形式             |
| userId    | UserId | ユーザーID             | 必須、確認対象ユーザー     |
| email     | Email  | 確認対象メールアドレス | 必須、確認するアドレス     |
| token     | string | 確認トークン           | 必須、暗号学的に安全な生成 |
| expiresAt | Date   | 有効期限               | 必須、作成から24時間       |
| usedAt    | Date   | 使用日時               | 任意、使用済み判定用       |
| createdAt | Date   | 作成日時               | 必須、不変                 |

#### ビジネスルール

- トークンは一度だけ使用可能
- 有効期限は24時間
- 使用済みトークンは再利用不可
- メールアドレスごとに有効なトークンは1つまで

#### 主要な振る舞い

- `isValid()` - トークン有効性確認
- `markAsUsed()` - 使用済みマーク
- `isExpired()` - 有効期限切れ確認

## 値オブジェクト

### 値オブジェクト一覧

| 名前           | 説明                 | 主な責務                       |
| -------------- | -------------------- | ------------------------------ |
| UserId         | ユーザーID           | ユーザーの一意識別             |
| Email          | メールアドレス       | メールアドレスの形式検証       |
| Password       | パスワード（平文）   | パスワードポリシーの検証       |
| HashedPassword | ハッシュ化パスワード | パスワードの安全な保存         |
| SessionToken   | セッショントークン   | セッションの一意識別           |
| SessionId      | セッションID         | セッションの内部識別           |
| UserProfile    | ユーザープロフィール | 名前等の基本情報管理           |
| IpAddress      | IPアドレス           | IP形式の検証とセキュリティ監査 |

### 値オブジェクト詳細

#### UserId

ユーザーの一意識別子。

**属性:**

- value: string (UUID形式)

**制約:**

- 必須
- UUID v4形式
- 不変

#### Email

メールアドレスを表現する値オブジェクト。

**属性:**

- value: string

**制約:**

- 必須
- RFC 5322準拠のメールアドレス形式
- 最大254文字
- 小文字に正規化

**振る舞い:**

- `equals(other)` - 等価性判定
- `getDomain()` - ドメイン部分取得

#### Password

平文パスワードを表現する値オブジェクト（一時的な使用のみ）。

**属性:**

- value: string

**制約:**

- 必須
- 8文字以上128文字以下
- 大文字・小文字・数字を含む
- 一般的な脆弱パスワードは拒否

**振る舞い:**

- `validate()` - パスワードポリシー検証
- `getStrength()` - パスワード強度評価

#### SessionToken

セッショントークンを表現する値オブジェクト。

**属性:**

- value: string

**制約:**

- 必須
- 64文字の16進数文字列
- 暗号学的に安全な乱数生成

**振る舞い:**

- `equals(other)` - 等価性判定
- `mask()` - ログ用マスク表示

#### UserProfile

ユーザーのプロフィール情報を表現する値オブジェクト。

**属性:**

- displayName: string - 表示名
- firstName: string - 名（任意）
- lastName: string - 姓（任意）

**制約:**

- displayNameは必須、1-50文字
- firstName/lastNameは各0-50文字
- 特殊文字の制限

**振る舞い:**

- `getFullName()` - フルネーム取得
- `validate()` - プロフィール検証

## ドメインサービス

### DomainAuthenticationService

認証処理の中核となるドメインサービス。

**責務:**

- ユーザー認証の実行
- セッション管理
- 認証状態の検証

**主要メソッド:**

- `authenticate(email, password): AuthResult` - 認証実行
- `validateSession(token): SessionValidation` - セッション検証
- `createSession(user, context): AuthSession` - セッション作成

### PasswordHashingService

パスワードのハッシュ化を担当するドメインサービス。

**責務:**

- パスワードの安全なハッシュ化
- ハッシュ化パスワードの検証
- ソルトの生成

**主要メソッド:**

- `hash(password): HashedPasswordData` - ハッシュ化
- `verify(password, hash, salt): boolean` - 検証
- `generateSalt(): string` - ソルト生成

### TokenGenerationService

各種トークンの生成を担当するドメインサービス。

**責務:**

- セッショントークンの生成
- パスワードリセットトークンの生成
- メール確認トークンの生成

**主要メソッド:**

- `generateSessionToken(): SessionToken` - セッショントークン生成
- `generateResetToken(): PasswordResetToken` - リセットトークン生成
- `generateVerificationToken(): EmailVerificationToken` - 確認トークン生成

## ファクトリ

### UserFactory

新規ユーザーの作成を担当するファクトリ。

**責務:**

- 新規ユーザーエンティティの生成
- 初期状態の設定
- 関連エンティティの初期化

**主要メソッド:**

- `createUser(email, password, profile): User` - ユーザー作成
- `createWithCredential(email, password): UserWithCredential` - 認証情報付き作成

## 仕様パターン

### ActiveSessionSpecification

アクティブなセッションかどうかを判定する仕様。

**判定基準:**

- 有効期限内である
- 無効化されていない
- ユーザーが削除されていない

### VerifiedUserSpecification

確認済みユーザーかどうかを判定する仕様。

**判定基準:**

- メールアドレスが確認済み
- アカウントが有効
- 削除されていない

### PasswordPolicySpecification

パスワードがポリシーに準拠しているかを判定する仕様。

**判定基準:**

- 最小長を満たす
- 複雑性要件を満たす
- 禁止パスワードリストに含まれない

## 更新履歴

| 日付       | 内容     | 作成者 |
| ---------- | -------- | ------ |
| 2025-06-24 | 初版作成 | Claude |
