# Shopping Session API リファクタリング計画（TDD版）

## 概要

本ブランチで実装したShopping Session関連のAPIを、テスト駆動開発（TDD）の手法を用いて、プロジェクト標準のWebアダプターパターンに準拠するようリファクタリングする。

## 現状の問題点

- `src/app/api`ディレクトリで直接HTTP処理を実装している
- バリデーション、エラーハンドリング、レスポンス変換が各ルートに分散
- 認証チェックの実装が不統一
- テストが後付けになっており、カバレッジが不十分

## TDDアプローチの基本方針

1. **Red** - まずテストを書く（失敗することを確認）
2. **Green** - テストが通る最小限の実装を行う
3. **Refactor** - コードをクリーンにする

## リファクタリング手順

### Phase 1: StartShoppingSession APIのTDD実装

#### Step 1: テストファースト - StartShoppingSessionApiHandler

1. [ ] `tests/unit/modules/ingredients/server/api/handlers/commands/start-shopping-session.handler.test.ts` を作成
   - 正常系：有効なリクエストでセッション開始
   - 異常系：バリデーションエラー（userIdなし）
   - 異常系：ビジネスルール違反（既存アクティブセッション）
2. [ ] テストが失敗することを確認（Red）
3. [ ] `src/modules/ingredients/server/api/handlers/commands/start-shopping-session.handler.ts` を実装
4. [ ] テストが通ることを確認（Green）
5. [ ] リファクタリング（Refactor）

#### Step 2: バリデータのTDD実装

1. [ ] `tests/unit/modules/ingredients/server/api/validators/start-shopping-session.validator.test.ts` を作成
2. [ ] `src/modules/ingredients/server/api/validators/start-shopping-session.validator.ts` を実装

#### Step 3: CompositionRootの更新

1. [ ] `tests/unit/modules/ingredients/server/infrastructure/composition-root.test.ts` にテスト追加
2. [ ] `getStartShoppingSessionApiHandler()` メソッドを実装

#### Step 4: ルートハンドラーの統合テスト

1. [ ] `tests/integration/api/v1/shopping-sessions/route.test.ts` を作成
2. [ ] `/api/v1/shopping-sessions/route.ts` をリファクタリング

### Phase 2: CompleteShoppingSession APIのTDD実装

#### Step 1: テストファースト - CompleteShoppingSessionApiHandler

1. [ ] `tests/unit/modules/ingredients/server/api/handlers/commands/complete-shopping-session.handler.test.ts` を作成
2. [ ] `src/modules/ingredients/server/api/handlers/commands/complete-shopping-session.handler.ts` を実装
3. [ ] バリデータとCompositionRootを同様に実装

### Phase 3: Query系APIのTDD実装

#### GetActiveShoppingSession

1. [ ] `tests/unit/modules/ingredients/server/api/handlers/queries/get-active-shopping-session.handler.test.ts` を作成
2. [ ] 実装とリファクタリング

#### GetShoppingStatistics

1. [ ] `tests/unit/modules/ingredients/server/api/handlers/queries/get-shopping-statistics.handler.test.ts` を作成
2. [ ] 実装とリファクタリング

#### GetRecentSessions

1. [ ] `tests/unit/modules/ingredients/server/api/handlers/queries/get-recent-sessions.handler.test.ts` を作成
2. [ ] 実装とリファクタリング

#### GetQuickAccessIngredients

1. [ ] `tests/unit/modules/ingredients/server/api/handlers/queries/get-quick-access-ingredients.handler.test.ts` を作成
2. [ ] 実装とリファクタリング

#### GetIngredientCheckStatistics

1. [ ] `tests/unit/modules/ingredients/server/api/handlers/queries/get-ingredient-check-statistics.handler.test.ts` を作成
2. [ ] 実装とリファクタリング

### Phase 4: CheckIngredient APIの確認と調整

1. [ ] 既存の `check-ingredient.handler.ts` のテストカバレッジ確認
2. [ ] 必要に応じてテストを追加
3. [ ] ルートハンドラーの統合テストを実装

### Phase 5: 共通処理のTDD実装

#### 認証ミドルウェア

1. [ ] `tests/unit/modules/shared/server/api/middleware/auth.middleware.test.ts` を作成
2. [ ] 認証ミドルウェアを実装（まだ存在しない場合）

#### エラーハンドラー

1. [ ] `tests/unit/modules/shared/server/api/handlers/error.handler.test.ts` を作成
2. [ ] 共通エラーハンドラーを実装

### Phase 6: E2Eテストの実装

1. [ ] `tests/e2e/shopping-session-flow.test.ts` を作成
   - セッション開始 → 食材チェック → セッション完了の一連のフロー
2. [ ] パフォーマンステストを含める

## 実装時の注意点

### TDD実践のポイント

1. **テストファースト厳守**

   - 実装前に必ずテストを書く
   - テストが失敗することを確認してから実装に進む
   - 「Red → Green → Refactor」のサイクルを守る

2. **小さなステップで進める**

   - 一度に大きな変更をせず、小さな単位でテストと実装を繰り返す
   - 各ステップでコミットし、進捗を記録

3. **テストの品質**

   - Faker.jsを使用してランダムなテストデータを生成
   - Test Data Builderパターンを活用
   - Given-When-Then形式でテストを構造化

4. **既存機能の保護**
   - リファクタリング前に既存機能の統合テストを書く
   - テストが通ることを確認してからリファクタリング開始

### 技術的な注意点

1. **段階的な実装**

   - 一度にすべてを変更せず、APIごとに段階的に実装
   - 各段階でテストを実行し、動作確認を行う

2. **既存APIとの整合性**

   - ingredientsモジュールの既存実装パターンに準拠
   - エラーレスポンス形式を統一

3. **後方互換性**
   - APIのインターフェース（リクエスト/レスポンス形式）は変更しない
   - 内部実装のみをリファクタリング

## テスト戦略

### 単体テスト（70%）

- APIハンドラー: リクエスト処理、バリデーション、レスポンス形式
- バリデータ: 各種入力パターンの検証
- エラーハンドリング: 例外処理とエラーレスポンス

### 統合テスト（20%）

- ルートハンドラー: HTTPリクエスト → レスポンスの全体フロー
- 認証: 認証が必要なエンドポイントの動作確認
- データベース: 実際のDBとの連携確認

### E2Eテスト（10%）

- ユーザーシナリオ: 買い物セッションの完全なフロー
- パフォーマンス: レスポンスタイムの確認

## 期待される効果

1. **品質の向上**

   - バグの早期発見
   - リグレッションの防止
   - 仕様の明確化

2. **保守性の向上**

   - HTTP層とビジネスロジックの明確な分離
   - コードの再利用性向上
   - テストがドキュメントとして機能

3. **開発効率の向上**

   - 自信を持ってリファクタリング可能
   - 新機能追加時の影響範囲が明確

4. **一貫性の確保**
   - プロジェクト全体でアーキテクチャが統一
   - 新規開発者の理解が容易に
