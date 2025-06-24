# ユーザー認証コンテキスト - アプリケーションサービス仕様（NextAuth版）

## 概要

このドキュメントでは、NextAuth.jsとの統合を前提としたユーザー認証コンテキストのアプリケーションサービスを定義します。
NextAuthが認証・セッション管理を担当するため、本コンテキストのアプリケーションサービスはアプリケーション固有のビジネスロジック実行とNextAuth統合処理に特化しています。

## 責任範囲の明確化

### NextAuthが担当（本コンテキスト対象外）
- ユーザー登録・認証フロー
- ログイン・ログアウト処理
- セッション作成・管理・無効化
- パスワード管理・リセット
- メール認証処理

### ドメインが担当（本コンテキスト対象）
- NextAuthユーザーとドメインユーザーの統合
- プロフィール管理
- アカウント状態管理
- ビジネスルールの適用

## サービス一覧（NextAuth統合版）

| サービス                     | 責務                             | 主要なユースケース                              |
| ---------------------------- | -------------------------------- | ----------------------------------------------- |
| UserIntegrationService       | NextAuthとドメインユーザーの統合 | ユーザー作成、同期、統合エラー処理              |
| UserProfileManagementService | プロフィール管理                 | プロフィール更新、設定変更、バリデーション      |
| UserAccountService           | アカウント状態管理               | アカウント無効化、再有効化、状態確認            |
| UserQueryService             | ユーザー情報取得                 | ユーザー検索、プロフィール取得、状態取得        |

## 削除されたサービス（NextAuthに委譲）

以下のサービスはNextAuthが標準機能として提供するため削除：

- ~~`UserRegistrationService`~~: NextAuth.js標準のユーザー登録フロー
- ~~`AuthenticationService`~~: NextAuth.js標準の認証フロー
- ~~`PasswordManagementService`~~: NextAuth.js標準のパスワード管理
- ~~`SessionManagementService`~~: NextAuth.js標準のセッション管理

## UserIntegrationService

NextAuthとドメインユーザーの統合を担当するアプリケーションサービス。

### 主要メソッド

| メソッド                   | 説明                                 | トランザクション |
| -------------------------- | ------------------------------------ | ---------------- |
| createUserFromNextAuth     | NextAuthユーザーからドメインユーザー作成 | 必要             |
| syncUserWithNextAuth       | 既存ユーザーとNextAuthユーザーの同期 | 必要             |
| handleIntegrationFailure   | 統合エラーの処理と復旧               | 必要             |
| validateIntegration        | 統合状態の検証                       | 読み取り専用     |

### ユースケース: NextAuthユーザーからドメインユーザー作成

**フロー**:

1. NextAuthユーザー情報の受け取り
2. NextAuthIDの重複チェック
3. Emailアドレスの重複チェック
4. UserFactoryによるドメインユーザー生成
5. デフォルトプロフィールの設定
6. リポジトリへの保存
7. 初回ログイン処理の実行
8. ドメインイベントの発行（UserCreatedFromNextAuth）
9. 成功レスポンスの返却

**エラーケース**:

- NextAuthID重複 → NextAuthIdAlreadyExistsException
- Email重複 → EmailAlreadyExistsException
- バリデーションエラー → InvalidUserDataException
- データベースエラー → UserCreationFailedException

### ユースケース: 既存ユーザーとNextAuthユーザーの同期

**フロー**:

1. NextAuthIDによるユーザー検索
2. ユーザー状態の確認（アクティブ）
3. NextAuthユーザー情報との差分検出
4. 許可された変更の適用（Email、名前等）
5. 最終ログイン時刻の更新
6. リポジトリへの保存
7. ドメインイベントの発行（UserSyncedWithNextAuth）
8. 同期結果の返却

**エラーケース**:

- ユーザー不存在 → UserNotFoundException
- アカウント無効 → AccountDeactivatedException
- 同期競合 → SyncConflictException

## UserProfileManagementService

ユーザープロフィール管理を担当するアプリケーションサービス。

### 主要メソッド

| メソッド           | 説明                   | トランザクション |
| ------------------ | ---------------------- | ---------------- |
| updateProfile      | プロフィール更新       | 必要             |
| updatePreferences  | ユーザー設定変更       | 必要             |
| validateProfile    | プロフィール検証       | 読み取り専用     |
| getProfile         | プロフィール取得       | 読み取り専用     |

### ユースケース: プロフィール更新

**フロー**:

1. プロフィール更新データの受け取り
2. ユーザーの存在・状態確認
3. 更新権限の確認
4. プロフィールデータの検証
5. ビジネスルールの適用
6. UserProfileサービスによる検証
7. ユーザーエンティティの更新
8. リポジトリへの保存
9. ドメインイベントの発行（UserProfileUpdated）
10. 更新結果の返却

**エラーケース**:

- ユーザー不存在 → UserNotFoundException
- アクセス権限なし → AccessDeniedException
- バリデーションエラー → InvalidProfileDataException
- 競合状態 → ConcurrencyException

## UserAccountService

アカウント状態管理を担当するアプリケーションサービス。

### 主要メソッド

| メソッド         | 説明                 | トランザクション |
| ---------------- | -------------------- | ---------------- |
| deactivateUser   | アカウント無効化     | 必要             |
| reactivateUser   | アカウント再有効化   | 必要             |
| checkUserStatus  | ユーザー状態確認     | 読み取り専用     |
| getUserActivity  | ユーザー活動履歴取得 | 読み取り専用     |

### ユースケース: アカウント無効化

**フロー**:

1. 無効化要求の受け取り（理由含む）
2. ユーザーの存在確認
3. 無効化権限の確認
4. ビジネスルールの適用
5. UserStatusの更新（DEACTIVATED）
6. 関連データの処理（セッション等は対象外）
7. リポジトリへの保存
8. ドメインイベントの発行（UserDeactivated）
9. 無効化完了の通知

**エラーケース**:

- ユーザー不存在 → UserNotFoundException
- 既に無効化済み → AlreadyDeactivatedException
- 無効化権限なし → InsufficientPermissionException

## UserQueryService

ユーザー情報取得を担当するアプリケーションサービス。

### 主要メソッド

| メソッド                | 説明                     | トランザクション |
| ----------------------- | ------------------------ | ---------------- |
| getUserById             | ID指定ユーザー取得       | 読み取り専用     |
| getUserByNextAuthId     | NextAuthID指定ユーザー取得 | 読み取り専用     |
| getUserByEmail          | Email指定ユーザー取得    | 読み取り専用     |
| searchUsers             | ユーザー検索             | 読み取り専用     |
| getUsersWithFilters     | フィルター指定ユーザー一覧 | 読み取り専用     |

### ユースケース: ユーザー検索

**フロー**:

1. 検索条件の受け取り
2. 検索権限の確認
3. 検索条件の検証
4. リポジトリでの検索実行
5. 結果のフィルタリング（権限に基づく）
6. DTOへの変換
7. 検索結果の返却

**エラーケース**:

- 検索権限なし → SearchPermissionDeniedException
- 無効な検索条件 → InvalidSearchCriteriaException

## 共通仕様（NextAuth統合版）

### DTOパターン

NextAuth統合を前提とした入力・出力DTO：

```typescript
// NextAuth統合用入力DTO
interface CreateUserFromNextAuthInput {
  nextAuthId: string
  email: string
  name?: string
  image?: string
  emailVerified?: Date
}

// プロフィール更新DTO
interface UpdateProfileInput {
  displayName?: string
  timezone?: string
  language?: string
  preferences?: UserPreferencesInput
}

// 統合結果DTO
interface UserIntegrationResult {
  userId: string
  nextAuthId: string
  isNewUser: boolean
  user: UserDto
  warnings?: string[]
}

// ユーザー情報DTO
interface UserDto {
  id: string
  nextAuthId: string
  email: string
  profile: UserProfileDto
  status: string
  createdAt: Date
  lastLoginAt?: Date
}
```

### エラーハンドリング（NextAuth統合版）

- NextAuth統合エラーは専用の例外クラスで表現
- NextAuthコールバック内エラーはユーザー体験を妨げない
- 統合失敗は非同期で復旧処理を実行
- データ整合性エラーは優先度を高めてログ記録

### トランザクション管理

- ドメインユーザー操作は必ずトランザクション内で実行
- NextAuth統合処理は軽量なトランザクションで高速化
- エラー時は部分ロールバックで影響最小化
- 読み取り専用操作は明示的に指定

## パフォーマンス最適化（NextAuth統合版）

### キャッシュ戦略

| 対象                 | キャッシュ期間 | 無効化タイミング     |
| -------------------- | -------------- | -------------------- |
| ユーザープロフィール | 10分           | プロフィール更新時   |
| ユーザー状態         | 5分            | 状態変更時           |
| NextAuth統合状態     | 1分            | 統合処理成功時       |
| 検索結果             | 30秒           | ユーザーデータ変更時 |

### バッチ処理

- 統合状態チェックは100件単位で処理
- プロフィール同期は50件単位でバッチ実行
- 統計情報は事前集計で高速化

### NextAuth統合最適化

- コールバック処理は50ms以内で完了
- 非同期イベント発行でコールバック高速化
- バックグラウンドでのデータ整合性チェック

## 監査とロギング（NextAuth統合版）

### 監査対象イベント

| イベント                 | ログレベル | 保持期間 |
| ------------------------ | ---------- | -------- |
| NextAuth統合成功         | INFO       | 2年      |
| NextAuth統合失敗         | ERROR      | 2年      |
| プロフィール更新         | INFO       | 1年      |
| アカウント無効化         | INFO       | 7年      |
| 統合データ不整合         | ERROR      | 3年      |
| アクセス権限エラー       | WARN       | 1年      |

### ログ内容

```json
{
  "timestamp": "2025-06-24T10:30:00Z",
  "service": "UserIntegrationService",
  "method": "createUserFromNextAuth",
  "userId": "user_123",
  "nextAuthId": "clxxxx1234",
  "correlationId": "corr_456",
  "result": "SUCCESS",
  "duration": 85,
  "metadata": {
    "isNewUser": true,
    "source": "nextauth-callback"
  }
}
```

## セキュリティ考慮事項（NextAuth統合版）

### 1. NextAuth統合セキュリティ

**統合境界の保護:**
- NextAuthIDの検証とサニタイズ
- 統合データの暗号化
- 不正な統合要求の検出と拒否

**データ整合性の確保:**
- NextAuthユーザーとドメインユーザーの1:1対応維持
- 重複統合の防止
- 統合状態の定期検証

### 2. アクセス制御

**権限ベースアクセス:**
- プロフィール更新は所有者のみ
- 管理操作は管理者権限必須
- NextAuth認証済みユーザーのみ処理

**データ保護:**
- 個人情報の最小権限アクセス
- 機密データのマスキング
- 監査ログの改ざん防止

### 3. 統合プロセスセキュリティ

**コールバックセキュリティ:**
- NextAuthトークンの検証
- CSRF保護の実装
- セッションハイジャック対策

**エラーハンドリングセキュリティ:**
- エラー詳細の適切な隠蔽
- 攻撃者への情報漏洩防止
- セキュリティインシデントの自動検出

## 実装パターン

### NextAuth統合パターン

```typescript
// NextAuthコールバック統合
export class UserIntegrationService {
  async handleSignInCallback(nextAuthUser: NextAuthUser) {
    const correlationId = generateCorrelationId();
    
    try {
      // 軽量な処理でコールバックを高速化
      const result = await this.createOrSyncUser(nextAuthUser);
      
      // 重い処理は非同期で実行
      setImmediate(() => {
        this.publishEvents(result, correlationId);
        this.performDataIntegrityCheck(result.userId);
      });
      
      return result;
    } catch (error) {
      await this.handleIntegrationError(error, nextAuthUser, correlationId);
      throw error;
    }
  }
}
```

### エラー復旧パターン

```typescript
// 統合エラーの自動復旧
export class IntegrationRecoveryService {
  async recoverFailedIntegration(failureEvent: NextAuthIntegrationFailed) {
    if (failureEvent.metadata.retryable) {
      await this.scheduleRetry(failureEvent);
    } else {
      await this.escalateToManualReview(failureEvent);
    }
  }
}
```

## 更新履歴

| 日付       | 内容                               | 作成者 |
| ---------- | ---------------------------------- | ------ |
| 2025-06-24 | 初版作成                           | Claude |
| 2025-06-24 | NextAuth統合前提での全面再設計更新 | Claude |
