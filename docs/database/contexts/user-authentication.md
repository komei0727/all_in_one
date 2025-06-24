# ユーザー認証コンテキスト - データベース設計

## 概要

ユーザー認証コンテキストに関連するテーブル設計を定義します。集約設計に基づき、各集約ルートに対応するテーブルを設計し、認証・認可のセキュリティ要件を満たすスキーマを採用します。

## テーブル設計

### users（ユーザー）テーブル

ユーザー集約のルートエンティティ。ユーザーの基本情報とプロフィールを管理。

| カラム名              | 型        | 制約                          | 説明                                    |
| --------------------- | --------- | ----------------------------- | --------------------------------------- |
| id                    | TEXT      | PRIMARY KEY                   | CUID形式の一意識別子                    |
| email                 | TEXT      | NOT NULL, UNIQUE              | メールアドレス（ログインID）            |
| email_verified        | BOOLEAN   | NOT NULL DEFAULT FALSE        | メール確認済みフラグ                    |
| display_name          | TEXT      | NOT NULL                      | 表示名                                  |
| first_name            | TEXT      | NULL                          | 名                                      |
| last_name             | TEXT      | NULL                          | 姓                                      |
| avatar_url            | TEXT      | NULL                          | アバター画像URL                         |
| preferred_language    | TEXT      | NOT NULL DEFAULT 'ja'         | 優先言語                                |
| timezone              | TEXT      | NOT NULL DEFAULT 'Asia/Tokyo' | タイムゾーン                            |
| status                | TEXT      | NOT NULL DEFAULT 'ACTIVE'     | ステータス（ACTIVE/INACTIVE/SUSPENDED） |
| last_login_at         | TIMESTAMP | NULL                          | 最終ログイン日時                        |
| failed_login_attempts | INTEGER   | NOT NULL DEFAULT 0            | 連続ログイン失敗回数                    |
| locked_until          | TIMESTAMP | NULL                          | アカウントロック解除日時                |
| created_at            | TIMESTAMP | NOT NULL DEFAULT NOW()        | 作成日時                                |
| updated_at            | TIMESTAMP | NOT NULL                      | 更新日時                                |
| deleted_at            | TIMESTAMP | NULL                          | 論理削除日時                            |

**制約**:

- `check_status` - ステータスは定義された値のみ
  ```sql
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'))
  ```

**ユニーク制約**:

- `email` - メールアドレスの一意性（大文字小文字を区別しない）

**インデックス**:

- `idx_users_email` - メールアドレスによる高速検索
- `idx_users_status` - ステータスによるフィルタリング
- `idx_users_deleted_at` - 論理削除フィルタリング
- `idx_users_email_deleted` - メール検索（削除済み除外）

### user_credentials（ユーザー認証情報）テーブル

ユーザー認証情報集約のルートエンティティ。パスワード情報を安全に管理。

| カラム名                | 型        | 制約                   | 説明                             |
| ----------------------- | --------- | ---------------------- | -------------------------------- |
| id                      | TEXT      | PRIMARY KEY            | CUID形式の一意識別子             |
| user_id                 | TEXT      | NOT NULL, UNIQUE       | ユーザーID（外部キー）           |
| password_hash           | TEXT      | NOT NULL               | bcryptハッシュ化されたパスワード |
| password_changed_at     | TIMESTAMP | NOT NULL DEFAULT NOW() | パスワード最終変更日時           |
| require_password_change | BOOLEAN   | NOT NULL DEFAULT FALSE | パスワード変更要求フラグ         |
| created_at              | TIMESTAMP | NOT NULL DEFAULT NOW() | 作成日時                         |
| updated_at              | TIMESTAMP | NOT NULL               | 更新日時                         |

**外部キー制約**:

- `user_id` → `users.id` (CASCADE削除)

**インデックス**:

- `idx_user_credentials_user_id` - ユーザーIDによる高速検索

### auth_sessions（認証セッション）テーブル

認証セッション集約のルートエンティティ。アクティブなセッションを管理。

| カラム名       | 型        | 制約                   | 説明                                       |
| -------------- | --------- | ---------------------- | ------------------------------------------ |
| id             | TEXT      | PRIMARY KEY            | CUID形式の一意識別子                       |
| user_id        | TEXT      | NOT NULL               | ユーザーID（外部キー）                     |
| session_token  | TEXT      | NOT NULL, UNIQUE       | セッショントークン（暗号学的に安全な生成） |
| ip_address     | TEXT      | NOT NULL               | IPアドレス                                 |
| user_agent     | TEXT      | NULL                   | ユーザーエージェント                       |
| device_info    | JSONB     | NULL                   | デバイス情報                               |
| expires_at     | TIMESTAMP | NOT NULL               | 有効期限                                   |
| last_activity  | TIMESTAMP | NOT NULL DEFAULT NOW() | 最終アクティビティ                         |
| revoked_at     | TIMESTAMP | NULL                   | 無効化日時                                 |
| revoked_reason | TEXT      | NULL                   | 無効化理由                                 |
| created_at     | TIMESTAMP | NOT NULL DEFAULT NOW() | 作成日時                                   |

**外部キー制約**:

- `user_id` → `users.id` (CASCADE削除)

**制約**:

- `check_expiry` - 有効期限は作成時より未来
  ```sql
  CHECK (expires_at > created_at)
  ```

**インデックス**:

- `idx_auth_sessions_token` - トークンによる高速検索
- `idx_auth_sessions_user_id` - ユーザー別セッション検索
- `idx_auth_sessions_expires_at` - 期限切れセッションのクリーンアップ
- `idx_auth_sessions_revoked_at` - 無効化されたセッションのフィルタリング

### password_reset_tokens（パスワードリセットトークン）テーブル

パスワードリセットトークン集約のルートエンティティ。

| カラム名   | 型        | 制約                   | 説明                                     |
| ---------- | --------- | ---------------------- | ---------------------------------------- |
| id         | TEXT      | PRIMARY KEY            | CUID形式の一意識別子                     |
| user_id    | TEXT      | NOT NULL               | ユーザーID（外部キー）                   |
| token      | TEXT      | NOT NULL, UNIQUE       | リセットトークン（暗号学的に安全な生成） |
| expires_at | TIMESTAMP | NOT NULL               | 有効期限（作成から1時間）                |
| used_at    | TIMESTAMP | NULL                   | 使用日時                                 |
| ip_address | TEXT      | NOT NULL               | 要求元IPアドレス                         |
| user_agent | TEXT      | NULL                   | 要求元ユーザーエージェント               |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | 作成日時                                 |

**外部キー制約**:

- `user_id` → `users.id` (CASCADE削除)

**制約**:

- `check_expiry` - 有効期限は作成時より未来かつ1時間以内
  ```sql
  CHECK (expires_at > created_at AND expires_at <= created_at + INTERVAL '1 hour')
  ```

**インデックス**:

- `idx_password_reset_tokens_token` - トークンによる高速検索
- `idx_password_reset_tokens_user_id` - ユーザー別トークン検索
- `idx_password_reset_tokens_expires_at` - 期限切れトークンのクリーンアップ
- `idx_password_reset_tokens_used_at` - 使用済みトークンのフィルタリング

### email_verification_tokens（メール確認トークン）テーブル

メール確認トークン集約のルートエンティティ。

| カラム名   | 型        | 制約                   | 説明                                 |
| ---------- | --------- | ---------------------- | ------------------------------------ |
| id         | TEXT      | PRIMARY KEY            | CUID形式の一意識別子                 |
| user_id    | TEXT      | NOT NULL               | ユーザーID（外部キー）               |
| email      | TEXT      | NOT NULL               | 確認対象メールアドレス               |
| token      | TEXT      | NOT NULL, UNIQUE       | 確認トークン（暗号学的に安全な生成） |
| expires_at | TIMESTAMP | NOT NULL               | 有効期限（作成から24時間）           |
| used_at    | TIMESTAMP | NULL                   | 使用日時                             |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | 作成日時                             |

**外部キー制約**:

- `user_id` → `users.id` (CASCADE削除)

**制約**:

- `check_expiry` - 有効期限は作成時より未来かつ24時間以内
  ```sql
  CHECK (expires_at > created_at AND expires_at <= created_at + INTERVAL '24 hours')
  ```

**インデックス**:

- `idx_email_verification_tokens_token` - トークンによる高速検索
- `idx_email_verification_tokens_user_id` - ユーザー別トークン検索
- `idx_email_verification_tokens_expires_at` - 期限切れトークンのクリーンアップ
- `idx_email_verification_tokens_used_at` - 使用済みトークンのフィルタリング

## ドメインイベント用テーブル

認証コンテキストのイベントは、共通の`domain_events`テーブルに保存されます。

### 認証関連イベントタイプ

| イベントタイプ         | 説明                   | 主要データ                   |
| ---------------------- | ---------------------- | ---------------------------- |
| UserRegistered         | ユーザー登録           | userId, email, displayName   |
| UserLoggedIn           | ログイン成功           | userId, sessionId, ipAddress |
| UserLoggedOut          | ログアウト             | userId, sessionId            |
| PasswordChanged        | パスワード変更         | userId                       |
| PasswordResetRequested | パスワードリセット要求 | userId, tokenId              |
| PasswordResetCompleted | パスワードリセット完了 | userId                       |
| EmailVerificationSent  | メール確認送信         | userId, email, tokenId       |
| EmailVerified          | メール確認完了         | userId                       |
| AccountLocked          | アカウントロック       | userId, reason, lockedUntil  |
| AccountUnlocked        | アカウントロック解除   | userId                       |
| SessionRevoked         | セッション無効化       | userId, sessionId, reason    |

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

1. **パスワード保護**

   - bcryptによるハッシュ化（コスト係数12以上）
   - 平文パスワードは一切保存しない
   - パスワード履歴による再利用防止（将来実装）

2. **トークン保護**

   - 暗号学的に安全な乱数生成
   - 適切な有効期限の設定
   - 使用済みトークンの即座の無効化

3. **セッション管理**
   - セッショントークンの安全な生成
   - IPアドレスによる検証
   - 異常検知によるセッション無効化

### Row Level Security (RLS)

Supabase環境では、以下のRLSポリシーを適用：

```sql
-- ユーザーは自分の情報のみ参照・更新可能
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid() AND deleted_at IS NULL);

-- 認証情報は本人のみアクセス可能
CREATE POLICY "Users can view own credentials" ON user_credentials
  FOR SELECT USING (user_id = auth.uid());

-- セッションは本人のみ参照可能
CREATE POLICY "Users can view own sessions" ON auth_sessions
  FOR SELECT USING (user_id = auth.uid() AND revoked_at IS NULL);

-- トークンはシステムのみアクセス可能（RLSなし）
-- password_reset_tokens と email_verification_tokens はアプリケーション層で制御
```

### 監査ログ

すべての認証関連操作は`domain_events`テーブルに記録：

- ログイン試行（成功/失敗）
- パスワード変更
- アカウントロック/アンロック
- セッション操作

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
-- 大文字小文字を区別しないメール検索用
CREATE UNIQUE INDEX idx_users_email_lower ON users (LOWER(email)) WHERE deleted_at IS NULL;

-- セッションの複合インデックス
CREATE INDEX idx_auth_sessions_user_expires ON auth_sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;

-- トークンの有効性チェック用
CREATE INDEX idx_password_reset_tokens_valid ON password_reset_tokens (token, expires_at)
  WHERE used_at IS NULL;
```

## マイグレーション戦略

### 初期マイグレーション

1. ユーザー関連テーブルの作成
2. インデックスの作成
3. RLSポリシーの適用
4. 初期管理者ユーザーの作成

### 今後の拡張

- OAuth プロバイダー連携テーブル
- 二要素認証（2FA）サポート
- パスワード履歴テーブル
- ログイン履歴の詳細記録

## 更新履歴

| 日付       | 内容     | 作成者 |
| ---------- | -------- | ------ |
| 2025-06-24 | 初版作成 | Claude |
