# ユーザー認証コンテキスト - ドメインイベント仕様（NextAuth版）

## 概要

このドキュメントでは、NextAuth.jsとの統合を前提としたユーザー認証コンテキストで発生するドメインイベントを定義します。
NextAuthが認証処理を担当するため、本コンテキストのイベントはアプリケーション固有のビジネスロジックと統合処理に特化しています。

## NextAuth統合におけるイベント設計原則

1. **過去形で命名** - 既に起きた事実を表現（例：UserCreatedFromNextAuth）
2. **不変性** - イベントは作成後に変更されない
3. **自己完結性** - イベント単体で意味が理解できる情報を含む
4. **時系列性** - 発生時刻を必ず含む
5. **責任分離** - NextAuth管理イベントとドメイン管理イベントを明確に分離
6. **統合追跡** - NextAuthIDとドメインIDの関連を記録

## 責任範囲の明確化

### NextAuthが管理するイベント（本コンテキスト対象外）

- ユーザー登録（NextAuth.User作成）
- ログイン/ログアウト（NextAuth.Session管理）
- メール認証（NextAuth標準フロー）
- パスワードリセット（NextAuth標準フロー）

### ドメインが管理するイベント（本コンテキスト対象）

- NextAuthユーザーからのドメインユーザー作成
- プロフィール更新
- アカウント無効化
- NextAuth統合エラー

## イベント一覧（NextAuth統合版）

### NextAuth統合イベント

| イベント                  | 発生タイミング                     | 主要データ                              | 用途                                   |
| ------------------------- | ---------------------------------- | --------------------------------------- | -------------------------------------- |
| UserCreatedFromNextAuth   | NextAuthユーザーからドメイン作成時 | UserId、NextAuthId、Email、プロフィール | 監査ログ、初期設定、他コンテキスト通知 |
| UserSyncedWithNextAuth    | 既存ユーザーとNextAuth同期時       | UserId、NextAuthId、同期内容            | 監査ログ、整合性確認                   |
| NextAuthIntegrationFailed | NextAuth統合処理失敗時             | NextAuthId、エラー詳細、失敗理由        | エラー監視、復旧処理                   |

### ドメイン固有イベント

| イベント               | 発生タイミング       | 主要データ                     | 用途                             |
| ---------------------- | -------------------- | ------------------------------ | -------------------------------- |
| UserProfileUpdated     | プロフィール更新時   | UserId、変更前後のプロフィール | 監査ログ、同期、通知             |
| UserPreferencesChanged | ユーザー設定変更時   | UserId、変更前後の設定         | 設定同期、パーソナライゼーション |
| UserDeactivated        | アカウント無効化時   | UserId、無効化理由、実行者     | 監査ログ、データクリーンアップ   |
| UserReactivated        | アカウント再有効化時 | UserId、再有効化理由、実行者   | 監査ログ、復旧処理               |

### 削除されたイベント（NextAuthに委譲）

以下のイベントはNextAuthが管理するため削除：

- ~~`UserRegistered`~~: NextAuth.User作成時にNextAuthが処理
- ~~`UserVerified`~~: NextAuthの標準メール確認フローで処理
- ~~`UserLoggedIn`~~: NextAuth.Session作成時にNextAuthが処理
- ~~`UserLoggedOut`~~: NextAuth.Session削除時にNextAuthが処理
- ~~`LoginAttemptFailed`~~: NextAuthの認証フローで処理
- ~~`SessionCreated`~~: NextAuth.Session管理で処理
- ~~`SessionRevoked`~~: NextAuth.Session管理で処理
- ~~`PasswordChanged`~~: NextAuthに認証処理を委譲するため不要
- ~~`PasswordResetRequested`~~: NextAuthの標準フローで処理
- ~~`PasswordResetCompleted`~~: NextAuthの標準フローで処理
- ~~`SuspiciousActivityDetected`~~: NextAuthレベルでの処理に委譲
- ~~`AccountLocked`~~: UserStatus管理で代替
- ~~`AccountUnlocked`~~: UserStatus管理で代替

## イベントの共通属性（NextAuth統合版）

すべてのドメインイベントは以下の共通属性を持ちます：

| 属性          | 型     | 説明                           | 例                                |
| ------------- | ------ | ------------------------------ | --------------------------------- |
| eventId       | string | イベントの一意識別子           | "evt_01HX5K3J2BXVMH3Z4K5N6P7Q8R"  |
| eventType     | string | イベントタイプ                 | "UserCreatedFromNextAuth"         |
| aggregateId   | string | 集約ルートのID（ドメインUser） | "user_01HX5K3J2BXVMH3Z4K5N6P7Q8R" |
| occurredAt    | Date   | イベント発生時刻               | "2025-06-24T10:30:00Z"            |
| userId        | string | 対象ドメインユーザーID         | "user_01HX5K3J2BXVMH3Z4K5N6P7Q8R" |
| nextAuthId    | string | 関連NextAuthユーザーID         | "clxxxx1234"                      |
| correlationId | string | 処理追跡ID                     | "corr_01HX5K3J2BXVMH3Z4K5N6P7Q8R" |
| metadata      | object | 追加のメタデータ               | { "source": "nextauth-callback" } |

## イベント詳細（NextAuth統合版）

### UserCreatedFromNextAuth

NextAuthユーザーから新規ドメインユーザーが作成された際のイベント。

```typescript
interface UserCreatedFromNextAuth extends DomainEvent {
  eventType: 'UserCreatedFromNextAuth'
  payload: {
    userId: string // ドメインユーザーID
    nextAuthId: string // NextAuthユーザーID
    email: string // メールアドレス
    profile: {
      displayName: string
      timezone: string
      language: string
    }
    status: 'ACTIVE'
    isFirstTime: boolean // 初回登録かどうか
  }
  metadata: {
    source: 'nextauth-callback'
    nextAuthMethod: 'email' | 'oauth'
    userAgent?: string
  }
}
```

### UserSyncedWithNextAuth

既存ドメインユーザーとNextAuthユーザーが同期された際のイベント。

```typescript
interface UserSyncedWithNextAuth extends DomainEvent {
  eventType: 'UserSyncedWithNextAuth'
  payload: {
    userId: string
    nextAuthId: string
    syncedFields: ('email' | 'name' | 'lastLoginAt')[]
    changes: {
      field: string
      oldValue: any
      newValue: any
    }[]
  }
  metadata: {
    source: 'nextauth-callback'
    triggerReason: 'login' | 'profile_update'
  }
}
```

### NextAuthIntegrationFailed

NextAuth統合処理が失敗した際のエラーイベント。

```typescript
interface NextAuthIntegrationFailed extends DomainEvent {
  eventType: 'NextAuthIntegrationFailed'
  payload: {
    nextAuthId: string
    email?: string
    errorType: 'USER_CREATION_FAILED' | 'SYNC_FAILED' | 'VALIDATION_FAILED'
    errorMessage: string
    errorDetails: object
  }
  metadata: {
    source: 'nextauth-callback'
    retryable: boolean
    attemptCount: number
  }
}
```

### UserProfileUpdated

ユーザープロフィールが更新された際のイベント。

```typescript
interface UserProfileUpdated extends DomainEvent {
  eventType: 'UserProfileUpdated'
  payload: {
    userId: string
    oldProfile: UserProfile
    newProfile: UserProfile
    updatedFields: string[]
  }
  metadata: {
    source: 'user-action' | 'admin-action' | 'sync'
    reason?: string
  }
}
```

### UserDeactivated

ユーザーが無効化された際のイベント。

```typescript
interface UserDeactivated extends DomainEvent {
  eventType: 'UserDeactivated'
  payload: {
    userId: string
    reason: 'USER_REQUEST' | 'ADMIN_ACTION' | 'POLICY_VIOLATION' | 'DATA_RETENTION'
    deactivatedBy: string // 実行者ID
    effectiveDate: Date // 無効化実効日
  }
  metadata: {
    source: 'admin-panel' | 'user-settings' | 'automated'
    originalStatus: string
  }
}
```

## イベントの利用パターン（NextAuth統合版）

### 1. NextAuth統合の監査とトレーシング

- NextAuthユーザー作成とドメインユーザー作成の関連付け追跡
- 統合処理の成功/失敗パターンの分析
- NextAuthIDとドメインUserIDのマッピング監査
- 統合エラーの原因分析とデバッグ

### 2. アプリケーション固有のビジネス監査

- ユーザープロフィール変更の履歴追跡
- アカウント無効化の理由と経緯の記録
- ユーザー設定変更の監査ログ
- 管理者操作の透明性確保

### 3. 他コンテキストへの通知（簡素化）

- **食材管理コンテキスト**: ユーザー無効化時のデータクリーンアップ
- **通知サービス**: プロフィール更新時の通知
- **分析サービス**: ユーザー行動パターンの収集

### 4. エラー監視と復旧

- NextAuth統合失敗の自動検出
- リトライ可能エラーの自動再処理
- 統合エラーアラートの生成
- データ整合性チェックの実行

## イベントストア設計（NextAuth統合版）

### 保存期間

| イベントカテゴリ     | 保存期間 | 理由                           |
| -------------------- | -------- | ------------------------------ |
| NextAuth統合イベント | 2年      | 統合処理の監査とデバッグ       |
| プロフィール変更     | 1年      | ユーザー体験改善とサポート対応 |
| アカウント無効化     | 7年      | 法的要件とコンプライアンス     |
| 統合エラー           | 1年      | エラーパターン分析と改善       |

### パフォーマンス考慮（NextAuth統合特化）

- NextAuthコールバック内でのイベント発行の軽量化
- 非同期イベント処理による認証フローの高速化
- バックグラウンド処理でのデータ整合性チェック

## 実装上の注意（NextAuth統合版）

### 1. NextAuth統合特有の考慮事項

**NextAuthコールバック内での制約:**

- コールバック処理時間の最小化（認証フローを妨げない）
- イベント発行失敗がログインを阻害しない
- NextAuth標準エラーハンドリングとの協調

**データ整合性の確保:**

- NextAuthユーザーとドメインユーザーの1:1対応維持
- 統合失敗時のデータ孤立防止
- NextAuthIDの一意性保証

### 2. プライバシーとセキュリティ

**個人情報の最小化:**

- NextAuthが管理する認証情報は記録しない
- 必要最小限のプロフィール情報のみ記録
- GDPR等のプライバシー規制遵守

**統合セキュリティ:**

- NextAuthトークンは絶対にイベントに含めない
- ドメインイベントはNextAuth認証後のみ発行
- 統合エラー情報の機密性保持

### 3. エラーハンドリングと復旧

**統合エラーの分類:**

- リトライ可能エラー（一時的な DB 接続エラー等）
- 永続的エラー（バリデーション失敗等）
- 致命的エラー（システム障害等）

**復旧戦略:**

- 統合失敗時の手動復旧プロセス
- データ整合性チェックの定期実行
- 孤立データの検出と修復

### 4. 実装パターン

**イベント発行タイミング:**

```typescript
// NextAuthコールバック内
async function signInCallback(user, account, profile) {
  try {
    const domainUser = await createOrSyncUser(user);
    // コールバック成功後に非同期でイベント発行
    setImmediate(() => {
      publishEvent(new UserCreatedFromNextAuth({...}));
    });
    return true;
  } catch (error) {
    // エラーイベントは即座に発行
    publishEvent(new NextAuthIntegrationFailed({...}));
    // ログインは継続（ユーザー体験を優先）
    return true;
  }
}
```

## 監視とアラート

### 重要指標の監視

- NextAuth統合成功率（目標: 99.9%）
- 統合処理時間（目標: 100ms以下）
- データ整合性エラー率（目標: 0.1%以下）
- プロフィール更新成功率（目標: 99.5%）

### アラート設定

- 統合エラー率が1%を超過
- データ整合性チェックで不整合検出
- 大量のプロフィール更新失敗

## 更新履歴

| 日付       | 内容                               | 作成者 |
| ---------- | ---------------------------------- | ------ |
| 2025-06-24 | 初版作成                           | Claude |
| 2025-06-24 | NextAuth統合前提での全面再設計更新 | Claude |
