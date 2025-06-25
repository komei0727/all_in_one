# ユーザー認証コンテキスト - データベース設計

## 概要

ユーザー認証コンテキストに関連するテーブル設計を定義します。NextAuth.jsを使用したマジックリンク認証を前提とし、NextAuthの標準テーブル構成とドメイン固有のユーザー管理テーブルを統合した設計を採用します。

## テーブル設計

### NextAuth標準テーブル

NextAuth.jsが管理する認証関連テーブル。Prisma Adapterにより自動生成・管理されます。

#### Account（NextAuthアカウント）テーブル

外部認証プロバイダーとの連携情報を管理。

| カラム名          | 型      | 制約        | 説明                               |
| ----------------- | ------- | ----------- | ---------------------------------- |
| id                | TEXT    | PRIMARY KEY | CUID形式の一意識別子               |
| userId            | TEXT    | NOT NULL    | NextAuthユーザーID（外部キー）     |
| type              | TEXT    | NOT NULL    | アカウントタイプ（email, oauth等） |
| provider          | TEXT    | NOT NULL    | プロバイダー名（email等）          |
| providerAccountId | TEXT    | NOT NULL    | プロバイダー側のアカウントID       |
| refresh_token     | TEXT    | NULL        | リフレッシュトークン（OAuth用）    |
| access_token      | TEXT    | NULL        | アクセストークン（OAuth用）        |
| expires_at        | INTEGER | NULL        | トークン有効期限（Unix時間）       |
| token_type        | TEXT    | NULL        | トークンタイプ                     |
| scope             | TEXT    | NULL        | 権限スコープ                       |
| id_token          | TEXT    | NULL        | IDトークン（OAuth用）              |
| session_state     | TEXT    | NULL        | セッション状態                     |

**制約**:

- UNIQUE(provider, providerAccountId)

#### Session（NextAuthセッション）テーブル

アクティブなセッション情報を管理。

| カラム名     | 型        | 制約            | 説明                           |
| ------------ | --------- | --------------- | ------------------------------ |
| id           | TEXT      | PRIMARY KEY     | CUID形式の一意識別子           |
| sessionToken | TEXT      | NOT NULL UNIQUE | セッショントークン             |
| userId       | TEXT      | NOT NULL        | NextAuthユーザーID（外部キー） |
| expires      | TIMESTAMP | NOT NULL        | セッション有効期限             |

#### User（NextAuthユーザー）テーブル

NextAuthが管理する基本的なユーザー情報。

| カラム名      | 型        | 制約        | 説明                 |
| ------------- | --------- | ----------- | -------------------- |
| id            | TEXT      | PRIMARY KEY | CUID形式の一意識別子 |
| email         | TEXT      | UNIQUE      | メールアドレス       |
| emailVerified | TIMESTAMP | NULL        | メール確認日時       |
| name          | TEXT      | NULL        | 表示名               |
| image         | TEXT      | NULL        | プロフィール画像URL  |

#### VerificationToken（検証トークン）テーブル

マジックリンクのトークンを管理。

| カラム名   | 型        | 制約     | 説明               |
| ---------- | --------- | -------- | ------------------ |
| identifier | TEXT      | NOT NULL | 識別子（メール等） |
| token      | TEXT      | NOT NULL | 検証トークン       |
| expires    | TIMESTAMP | NOT NULL | 有効期限           |

**制約**:

- PRIMARY KEY(identifier, token)

### ドメインテーブル

### domain_users（ドメインユーザー）テーブル

ユーザー集約のルートエンティティ。NextAuthユーザーと連携してドメイン固有の情報を管理。

| カラム名           | 型        | 制約                          | 説明                             |
| ------------------ | --------- | ----------------------------- | -------------------------------- |
| id                 | TEXT      | PRIMARY KEY                   | CUID形式の一意識別子             |
| next_auth_id       | TEXT      | NOT NULL, UNIQUE              | NextAuthユーザーID（外部キー）   |
| email              | TEXT      | NOT NULL, UNIQUE              | メールアドレス（NextAuthと同期） |
| name               | TEXT      | NULL                          | 表示名（NextAuthと同期可能）     |
| preferred_language | TEXT      | NOT NULL DEFAULT 'ja'         | 優先言語                         |
| timezone           | TEXT      | NOT NULL DEFAULT 'Asia/Tokyo' | タイムゾーン                     |
| status             | TEXT      | NOT NULL DEFAULT 'ACTIVE'     | ステータス（ACTIVE/DEACTIVATED） |
| last_login_at      | TIMESTAMP | NULL                          | 最終ログイン日時                 |
| created_at         | TIMESTAMP | NOT NULL DEFAULT NOW()        | 作成日時                         |
| updated_at         | TIMESTAMP | NOT NULL                      | 更新日時                         |

**外部キー制約**:

- `next_auth_id` → NextAuth `User.id` (CASCADE削除)

**制約**:

- `check_status` - ステータスは定義された値のみ
  ```sql
  CHECK (status IN ('ACTIVE', 'DEACTIVATED'))
  ```

**ユニーク制約**:

- `next_auth_id` - NextAuthユーザーとの1対1対応
- `email` - メールアドレスの一意性

**インデックス**:

- `idx_domain_users_next_auth_id` - NextAuthユーザーIDによる高速検索
- `idx_domain_users_email` - メールアドレスによる高速検索
- `idx_domain_users_status` - ステータスによるフィルタリング

## ドメインイベント用テーブル

認証コンテキストのイベントは、共通の`domain_events`テーブルに保存されます。

### 認証関連イベントタイプ（NextAuth統合版）

| イベントタイプ          | 説明                     | 主要データ                |
| ----------------------- | ------------------------ | ------------------------- |
| UserCreatedFromNextAuth | NextAuthユーザーから作成 | userId, nextAuthId, email |
| UserLoggedIn            | ログイン成功             | userId, nextAuthId        |
| UserLoggedOut           | ログアウト               | userId                    |
| UserProfileUpdated      | プロフィール更新         | userId, changedFields     |
| UserDeactivated         | ユーザー無効化           | userId, reason            |
| UserReactivated         | ユーザー再有効化         | userId                    |

## パフォーマンス考慮事項

### インデックス戦略

1. **認証処理の高速化**

   - メールアドレスによるユーザー検索を最適化
   - トークンによる検索を高速化
   - アクティブセッションの効率的な管理

2. **クリーンアップ処理**
   - 期限切れトークンの定期削除用インデックス
   - 無効化されたセッションの削除用インデックス

### パーティショニング検討

将来的なスケーリングに備えて：

- `auth_sessions`テーブルは月別パーティションを検討
- `domain_events`の認証イベントは年月別パーティションを検討

### クエリ最適化

- 認証チェックは高頻度で実行されるため、必要最小限のデータのみ取得
- セッション検証はキャッシュと組み合わせて負荷軽減

## セキュリティ考慮事項

### データ保護

1. **認証情報の保護**

   - NextAuthによる安全な認証フロー
   - マジックリンクトークンの自動管理
   - パスワードレス認証による安全性向上

2. **セッション管理**
   - NextAuthによる安全なセッション管理
   - HTTPOnly Cookieによる保護
   - 自動的なセッション有効期限管理

### Row Level Security (RLS)

Supabase環境では、以下のRLSポリシーを適用：

```sql
-- NextAuthテーブルはシステムのみアクセス可能（RLSなし）

-- ドメインユーザーは自分の情報のみ参照・更新可能
-- NextAuthのセッションを通じて認証されたユーザーのみアクセス可能
CREATE POLICY "Users can view own domain profile" ON domain_users
  FOR SELECT USING (
    next_auth_id = auth.uid()
    AND status = 'ACTIVE'
  );

CREATE POLICY "Users can update own domain profile" ON domain_users
  FOR UPDATE USING (
    next_auth_id = auth.uid()
    AND status = 'ACTIVE'
  )
  WITH CHECK (
    -- statusとnext_auth_idは変更不可
    next_auth_id = auth.uid()
    AND status = 'ACTIVE'
  );
```

### 監査ログ

すべての認証関連操作は`domain_events`テーブルに記録：

- NextAuthユーザーからのドメインユーザー作成
- ログイン（NextAuth経由）
- ログアウト
- プロフィール更新
- アカウント無効化/再有効化

## データベース初期化

### 必須データ

```sql
-- デフォルトタイムゾーン設定
SET timezone = 'Asia/Tokyo';

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### インデックス作成

```sql
-- NextAuthテーブルのインデックス（Prisma Adapterが自動作成）
-- Account: provider, providerAccountId の複合インデックス
-- Session: sessionToken のユニークインデックス
-- User: email のユニークインデックス
-- VerificationToken: identifier, token の複合主キー

-- ドメインユーザーテーブルのインデックス
CREATE UNIQUE INDEX idx_domain_users_next_auth_id ON domain_users (next_auth_id);
CREATE UNIQUE INDEX idx_domain_users_email ON domain_users (email);
CREATE INDEX idx_domain_users_status ON domain_users (status)
  WHERE status = 'ACTIVE';
```

## マイグレーション戦略

### 初期マイグレーション

1. NextAuthテーブルの作成（Prisma Adapterによる自動生成）
2. ドメインユーザーテーブルの作成
3. インデックスの作成
4. RLSポリシーの適用

### 今後の拡張

- OAuth プロバイダー追加（Google, GitHub等）
- 二要素認証（2FA）サポート
- より詳細なユーザープロフィール
- ユーザー設定の拡張

## 更新履歴

| 日付       | 内容     | 作成者 |
| ---------- | -------- | ------ |
| 2025-06-24 | 初版作成 | Claude |
