# ユーザー認証コンテキスト - アプリケーションサービス仕様

## 概要

このドキュメントでは、ユーザー認証コンテキストのアプリケーションサービスを定義します。
アプリケーションサービスは、認証・認可に関するユースケースの実行とドメイン層の調整を責務とします。

## サービス一覧

| サービス                  | 責務                   | 主要なユースケース                     |
| ------------------------- | ---------------------- | -------------------------------------- |
| UserRegistrationService   | ユーザー登録関連の操作 | 新規登録、メール確認、プロフィール更新 |
| AuthenticationService     | 認証関連の操作         | ログイン、ログアウト、セッション管理   |
| PasswordManagementService | パスワード管理         | パスワード変更、リセット               |
| SessionManagementService  | セッション管理の自動化 | セッション検証、クリーンアップ         |

## UserRegistrationService

### 主要メソッド

| メソッド           | 説明               | トランザクション |
| ------------------ | ------------------ | ---------------- |
| registerUser       | 新規ユーザー登録   | 必要             |
| verifyEmail        | メールアドレス確認 | 必要             |
| updateProfile      | プロフィール更新   | 必要             |
| resendVerification | 確認メール再送信   | 必要             |
| deactivateUser     | アカウント無効化   | 必要             |

### ユースケース: ユーザー登録

**フロー**:

1. 入力データのバリデーション（メール形式、パスワードポリシー）
2. メールアドレスの重複チェック
3. Supabaseでのユーザー作成
4. ローカルUserエンティティの生成
5. UserCredentialの生成（パスワードハッシュ化）
6. リポジトリへの保存
7. メール確認トークンの生成
8. 確認メールの送信依頼
9. ドメインイベントの発行（UserRegistered）
10. レスポンスDTOの生成

**エラーケース**:

- メール重複 → EmailAlreadyExistsException
- パスワード不適合 → InvalidPasswordException
- Supabase連携エラー → ExternalServiceException
- メール送信失敗 → EmailServiceException（ただし登録は成功扱い）

### ユースケース: メールアドレス確認

**フロー**:

1. トークンの検証（有効性、期限）
2. トークンに紐づくユーザーの取得
3. ユーザーのemailVerifiedフラグを更新
4. Supabaseのユーザー情報を同期
5. トークンを使用済みに更新
6. ドメインイベントの発行（UserVerified）
7. 成功レスポンスの返却

**エラーケース**:

- 無効なトークン → InvalidTokenException
- 期限切れトークン → TokenExpiredException
- 既に確認済み → AlreadyVerifiedException

## AuthenticationService

### 主要メソッド

| メソッド        | 説明             | トランザクション |
| --------------- | ---------------- | ---------------- |
| login           | ユーザーログイン | 必要             |
| logout          | ログアウト       | 必要             |
| validateSession | セッション検証   | 読み取り専用     |
| refreshSession  | セッション更新   | 必要             |
| getLoginHistory | ログイン履歴取得 | 読み取り専用     |

### ユースケース: ログイン

**フロー**:

1. メールアドレスとパスワードの受け取り
2. ユーザーの存在確認
3. アカウント状態の確認（有効、メール確認済み）
4. パスワード検証（UserCredentialService使用）
5. 既存セッションの確認（同一IPからの重複防止）
6. 新規AuthSessionの生成
7. Supabaseセッションの作成
8. リポジトリへの保存
9. ドメインイベントの発行（UserLoggedIn）
10. セッショントークンを含むレスポンスの返却

**エラーケース**:

- ユーザー不存在 → InvalidCredentialsException（セキュリティのため曖昧に）
- パスワード不一致 → InvalidCredentialsException
- アカウント無効 → AccountDisabledException
- メール未確認 → EmailNotVerifiedException
- 連続失敗 → TooManyAttemptsException

### ユースケース: セッション検証

**フロー**:

1. セッショントークンの受け取り
2. AuthSessionの取得
3. 有効性の確認（期限、無効化フラグ）
4. ユーザー情報の取得
5. 最終アクティビティの更新（オプション）
6. 検証結果の返却

**エラーケース**:

- 無効なトークン → InvalidSessionException
- 期限切れ → SessionExpiredException
- ユーザー削除済み → UserNotFoundException

## PasswordManagementService

### 主要メソッド

| メソッド                 | 説明                   | トランザクション |
| ------------------------ | ---------------------- | ---------------- |
| changePassword           | パスワード変更         | 必要             |
| requestPasswordReset     | パスワードリセット要求 | 必要             |
| resetPassword            | パスワードリセット実行 | 必要             |
| validatePasswordStrength | パスワード強度チェック | なし             |

### ユースケース: パスワードリセット要求

**フロー**:

1. メールアドレスの受け取り
2. ユーザーの存在確認（存在しなくても成功応答）
3. 既存のリセットトークンを無効化
4. 新規PasswordResetTokenの生成
5. リポジトリへの保存
6. リセットメールの送信依頼
7. ドメインイベントの発行（PasswordResetRequested）
8. 成功レスポンスの返却（セキュリティのため常に成功）

**エラーケース**:

- レート制限超過 → TooManyRequestsException
- メール送信失敗 → 内部的にリトライ、ユーザーには成功応答

### ユースケース: パスワードリセット実行

**フロー**:

1. トークンと新パスワードの受け取り
2. トークンの検証（有効性、期限、使用済み）
3. パスワードポリシーの検証
4. ユーザーの取得
5. UserCredentialの更新
6. トークンを使用済みに更新
7. 全セッションの無効化（セキュリティ対策）
8. Supabaseパスワードの同期
9. ドメインイベントの発行（PasswordResetCompleted）
10. 確認メールの送信
11. 成功レスポンスの返却

**エラーケース**:

- 無効なトークン → InvalidTokenException
- 期限切れ → TokenExpiredException
- 既に使用済み → TokenAlreadyUsedException
- パスワード不適合 → InvalidPasswordException

## SessionManagementService

### 主要メソッド

| メソッド               | 説明                         | トランザクション |
| ---------------------- | ---------------------------- | ---------------- |
| cleanupExpiredSessions | 期限切れセッションの削除     | 必要             |
| revokeUserSessions     | ユーザーの全セッション無効化 | 必要             |
| getActiveSessions      | アクティブセッション一覧取得 | 読み取り専用     |
| analyzeSessionActivity | セッションアクティビティ分析 | 読み取り専用     |

### ユースケース: 期限切れセッションのクリーンアップ

**フロー**:

1. 期限切れセッションの検索
2. バッチでの削除処理
3. 削除件数の記録
4. パフォーマンスメトリクスの記録
5. 完了レポートの生成

**エラーケース**:

- データベースエラー → 部分的な成功を許容、エラーログ記録

## 共通仕様

### DTOパターン

入力と出力には専用のDTOを使用：

```typescript
// 入力DTO例
interface RegisterUserInput {
  email: string
  password: string
  displayName: string
  firstName?: string
  lastName?: string
}

// 出力DTO例
interface AuthenticationResult {
  userId: string
  sessionToken: string
  expiresAt: Date
  user: UserDto
}
```

### エラーハンドリング

- ビジネスエラーは専用の例外クラスで表現
- セキュリティ関連のエラーは詳細を隠蔽
- 外部サービスエラーは適切にラップ
- すべてのエラーはログに記録

### トランザクション管理

- 更新系操作は必ずトランザクション内で実行
- Supabaseとの同期もトランザクションに含める
- エラー時は完全にロールバック
- 読み取り専用操作は明示的に指定

## パフォーマンス最適化

### キャッシュ戦略

| 対象             | キャッシュ期間 | 無効化タイミング |
| ---------------- | -------------- | ---------------- |
| セッション検証   | 30秒           | セッション更新時 |
| ユーザー権限     | 5分            | 権限変更時       |
| ログイン試行回数 | 15分           | 成功ログイン時   |

### バッチ処理

- セッションクリーンアップは1000件単位で処理
- 通知メールは100件単位でバッチ送信
- 統計情報は事前集計で高速化

## 監査とロギング

### 監査対象イベント

| イベント         | ログレベル | 保持期間 |
| ---------------- | ---------- | -------- |
| ユーザー登録     | INFO       | 7年      |
| ログイン成功     | INFO       | 1年      |
| ログイン失敗     | WARN       | 1年      |
| パスワード変更   | INFO       | 2年      |
| アカウント削除   | INFO       | 7年      |
| 不正アクセス試行 | ERROR      | 3年      |

### ログ内容

```json
{
  "timestamp": "2025-06-24T10:30:00Z",
  "service": "AuthenticationService",
  "method": "login",
  "userId": "user_123",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "result": "SUCCESS",
  "duration": 123
}
```

## セキュリティ考慮事項

1. **タイミング攻撃対策**

   - パスワード検証は常に一定時間で完了
   - ユーザー存在確認の応答時間を統一

2. **ブルートフォース対策**

   - IPアドレス単位でのレート制限
   - 連続失敗時の指数バックオフ
   - キャプチャの導入検討

3. **セッションセキュリティ**
   - セキュアな乱数生成
   - HTTPSでの通信必須
   - SameSite Cookieの使用

## 更新履歴

| 日付       | 内容     | 作成者 |
| ---------- | -------- | ------ |
| 2025-06-24 | 初版作成 | Claude |
