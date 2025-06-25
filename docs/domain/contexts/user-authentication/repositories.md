# ユーザー認証コンテキスト - リポジトリ仕様（NextAuth版）

## 概要

このドキュメントでは、NextAuth.jsとの統合を前提としたユーザー認証コンテキストのリポジトリインターフェースを定義します。
NextAuthが認証・セッション・トークン管理を担当するため、リポジトリはドメイン固有のユーザー情報の永続化とビジネス要件に基づく検索に特化します。

## 責任範囲の明確化

### NextAuthが管理（Prisma Adapterで自動管理）

- NextAuthユーザー（users テーブル）
- NextAuthアカウント（accounts テーブル）
- NextAuthセッション（sessions テーブル）
- NextAuth検証トークン（verification_tokens テーブル）

### ドメインが管理（本リポジトリの対象）

- ドメインユーザー（domain_users テーブル）
- ユーザープロフィール
- ユーザー状態・設定
- NextAuthとの統合情報

## リポジトリ一覧（NextAuth統合版）

| リポジトリ     | 対象集約/エンティティ | 主要な責務                         |
| -------------- | --------------------- | ---------------------------------- |
| UserRepository | ユーザー集約          | ドメインユーザー情報の永続化と検索 |

## 削除されたリポジトリ（NextAuthに委譲）

以下のリポジトリはNextAuthとPrisma Adapterが標準機能として提供するため削除：

- ~~`UserCredentialRepository`~~: NextAuthが認証情報を管理
- ~~`AuthSessionRepository`~~: NextAuthがセッションを管理
- ~~`PasswordResetTokenRepository`~~: NextAuthがトークンを管理
- ~~`EmailVerificationTokenRepository`~~: NextAuthがトークンを管理

## UserRepository（NextAuth統合版）

ドメイン固有のユーザー情報を管理するリポジトリ。NextAuthユーザーと1:1で対応するドメインユーザーの永続化と検索を担当。

### 基本操作

| メソッド                             | 説明                         | 備考                       |
| ------------------------------------ | ---------------------------- | -------------------------- |
| save(user: User)                     | ユーザーの保存（作成・更新） | NextAuthIDの一意性を保証   |
| findById(id: UserId)                 | ドメインIDによるユーザー取得 | 論理削除済みは除外         |
| findByEmail(email: Email)            | メールアドレスによる取得     | 大文字小文字を区別しない   |
| findByNextAuthId(nextAuthId: string) | NextAuthIDによる取得         | NextAuth統合の中核メソッド |
| delete(id: UserId)                   | ユーザーの論理削除           | status=DEACTIVATEDに更新   |

### NextAuth統合検索

| メソッド                               | 説明                                 | 使用場面                 |
| -------------------------------------- | ------------------------------------ | ------------------------ |
| existsByNextAuthId(nextAuthId: string) | NextAuthIDの存在確認                 | 統合処理時の重複チェック |
| existsByEmail(email: Email)            | メールアドレスの存在確認             | データ整合性チェック     |
| findOrphanedUsers()                    | NextAuthユーザーが存在しないユーザー | データ整合性の監視・修復 |
| findUsersWithoutNextAuthId()           | NextAuthID未設定のユーザー           | 移行・統合の監視         |

### ビジネス要件に基づく検索

| メソッド                                  | 説明                       | 使用場面         |
| ----------------------------------------- | -------------------------- | ---------------- |
| findActiveUsers()                         | アクティブユーザーの取得   | ユーザー一覧表示 |
| findDeactivatedUsers()                    | 無効化されたユーザーの取得 | 管理画面・監査   |
| findInactiveUsers(days: number)           | 非アクティブユーザーの取得 | アカウント整理   |
| findByIds(ids: UserId[])                  | 複数IDによる一括取得       | バッチ処理       |
| searchByProfile(criteria: SearchCriteria) | プロフィール条件での検索   | ユーザー検索機能 |

### 統計・分析

| メソッド                                      | 説明                 | 使用場面           |
| --------------------------------------------- | -------------------- | ------------------ |
| countByRegistrationDate(from: Date, to: Date) | 期間内の登録者数取得 | 統計・分析         |
| countByStatus(status: UserStatus)             | 状態別ユーザー数取得 | ダッシュボード表示 |
| getRegistrationStatistics(period: Period)     | 登録統計の取得       | レポート生成       |

### インターフェース定義

```typescript
interface UserRepository {
  // 基本操作
  save(user: User): Promise<void>
  findById(id: UserId): Promise<User | null>
  findByEmail(email: Email): Promise<User | null>
  findByNextAuthId(nextAuthId: string): Promise<User | null>
  delete(id: UserId): Promise<void>

  // NextAuth統合検索
  existsByNextAuthId(nextAuthId: string): Promise<boolean>
  existsByEmail(email: Email): Promise<boolean>
  findOrphanedUsers(): Promise<User[]>
  findUsersWithoutNextAuthId(): Promise<User[]>

  // ビジネス要件に基づく検索
  findActiveUsers(options?: PagingOptions): Promise<PagedResult<User>>
  findDeactivatedUsers(options?: PagingOptions): Promise<PagedResult<User>>
  findInactiveUsers(days: number, options?: PagingOptions): Promise<PagedResult<User>>
  findByIds(ids: UserId[]): Promise<User[]>
  searchByProfile(criteria: SearchCriteria, options?: PagingOptions): Promise<PagedResult<User>>

  // 統計・分析
  countByRegistrationDate(from: Date, to: Date): Promise<number>
  countByStatus(status: UserStatus): Promise<number>
  getRegistrationStatistics(period: Period): Promise<RegistrationStats>
}
```

## 共通仕様（NextAuth統合版）

### ページング

すべての一覧取得メソッドは以下のページングオプションを受け付けます：

```typescript
interface PagingOptions {
  page: number // ページ番号（1始まり）
  limit: number // 1ページあたりの件数（最大100）
  sort?: SortOptions // ソート条件
}

interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  totalPages: number
}
```

### ソート

```typescript
interface SortOptions {
  field: string // ソート対象フィールド
  order: 'asc' | 'desc' // ソート順
}
```

### 検索条件

```typescript
interface SearchCriteria {
  displayName?: string // 部分一致
  email?: string // 部分一致
  status?: UserStatus // 完全一致
  createdFrom?: Date
  createdTo?: Date
  lastLoginFrom?: Date
  lastLoginTo?: Date
}
```

### トランザクション

- ドメインユーザー操作は必ずトランザクション内で実行
- NextAuthテーブルへの直接操作は禁止（Prisma Adapter経由のみ）
- エラー時は全体をロールバック

## パフォーマンス考慮（NextAuth統合版）

### インデックス設計

| テーブル     | インデックス            | 用途                     |
| ------------ | ----------------------- | ------------------------ |
| domain_users | next_auth_id (unique)   | NextAuth統合検索         |
| domain_users | email (unique)          | メールアドレス検索       |
| domain_users | status, created_at      | 状態別ユーザー検索       |
| domain_users | last_login_at           | 非アクティブユーザー検索 |
| domain_users | profile->>'displayName' | プロフィール検索（JSON） |

### キャッシュ戦略

| 対象                 | キャッシュ期間 | 無効化タイミング     |
| -------------------- | -------------- | -------------------- |
| ユーザー基本情報     | 10分           | 更新・削除時         |
| NextAuthID存在確認   | 5分            | ユーザー作成時       |
| ユーザー統計情報     | 1時間          | ユーザー作成・削除時 |
| プロフィール検索結果 | 30秒           | プロフィール更新時   |

### 最適化戦略

- ユーザープロフィールはJSONB型で効率的に格納
- 頻繁に検索される項目はインデックス化
- NextAuth統合チェックは非同期バックグラウンドで実行

## 実装上の注意（NextAuth統合版）

### NextAuth統合における注意点

**データ整合性の確保:**

- NextAuthユーザーとドメインユーザーの1:1対応を維持
- NextAuthIDの一意性制約を必ず設定
- 孤立データの定期的な検出と修復

**禁止事項:**

- NextAuthテーブルへの直接的な読み書き
- NextAuthセッション情報の直接管理
- NextAuthトークンの独自生成

### エラーハンドリング

- 存在しないリソースへのアクセスは`null`を返す（例外を投げない）
- NextAuth統合エラーは専用の例外クラスで表現
- データ整合性エラーは優先度高でログ記録

### セキュリティ

- SQLインジェクション対策（プリペアドステートメント使用）
- NextAuthIDの検証とサニタイズ
- 個人情報の最小限の取得と保護

### データ移行考慮

- 既存システムからの移行時はNextAuthID未設定を許容
- 段階的な統合を可能にする設計
- 移行状態の監視とレポート機能

## 実装例

```typescript
// Prismaを使用したUserRepository実装例
export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findByNextAuthId(nextAuthId: string): Promise<User | null> {
    const record = await this.prisma.domainUser.findUnique({
      where: { nextAuthId },
      // 論理削除済みを除外
      // status != 'DEACTIVATED'
    })

    return record ? this.toDomainModel(record) : null
  }

  async findOrphanedUsers(): Promise<User[]> {
    // NextAuthユーザーとLEFT JOINして
    // NextAuth側がNULLのレコードを検出
    const orphaned = await this.prisma.$queryRaw`
      SELECT du.*
      FROM domain_users du
      LEFT JOIN users na ON du.next_auth_id = na.id
      WHERE na.id IS NULL
        AND du.status != 'DEACTIVATED'
    `

    return orphaned.map(this.toDomainModel)
  }
}
```

## 更新履歴

| 日付       | 内容                               | 作成者 |
| ---------- | ---------------------------------- | ------ |
| 2025-06-24 | 初版作成                           | Claude |
| 2025-06-24 | NextAuth統合前提での全面再設計更新 | Claude |
