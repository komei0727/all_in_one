# 食材・在庫管理コンテキスト - アプリケーションサービス仕様

## 概要

このドキュメントでは、食材・在庫管理コンテキストのアプリケーションサービスを定義します。
アプリケーションサービスは、ユースケースの実行とドメイン層の調整を責務とします。

## サービス一覧

| サービス                           | 責務                       | 主要なユースケース                 |
| ---------------------------------- | -------------------------- | ---------------------------------- |
| IngredientApplicationService       | 食材管理の主要ユースケース | 登録、更新、削除、検索             |
| InventoryApplicationService        | 在庫関連の操作             | 消費、補充、在庫確認               |
| ExpiryManagementApplicationService | 期限管理の自動化           | 期限チェック、通知生成             |
| MasterDataApplicationService       | マスタデータ管理           | カテゴリー・単位の取得             |
| ShoppingApplicationService         | 買い物サポート機能         | セッション管理、在庫確認、履歴分析 |

## IngredientApplicationService

### 主要メソッド

| メソッド            | 説明             | トランザクション |
| ------------------- | ---------------- | ---------------- |
| createIngredient    | 新規食材登録     | 必要             |
| updateIngredient    | 食材情報更新     | 必要             |
| deleteIngredient    | 食材削除（論理） | 必要             |
| getIngredient       | 食材詳細取得     | 読み取り専用     |
| listIngredients     | 食材一覧取得     | 読み取り専用     |
| searchIngredients   | 条件検索         | 読み取り専用     |
| getCategorySummary  | カテゴリー別集計 | 読み取り専用     |
| getIngredientEvents | 食材イベント履歴 | 読み取り専用     |

### ユースケース: 食材登録

**フロー**:

1. 入力データのバリデーション
2. ユーザーIDの取得（認証コンテキストから取得済み）
3. 重複チェック（DuplicateCheckServiceを使用: ユーザーID・名前・期限・保存場所）
4. トランザクション開始
5. 食材エンティティの生成
6. リポジトリへの保存
7. トランザクション成功時：
   - ドメインイベントの発行（アウトボックスパターン使用）
   - IngredientCreated（食材ID、ユーザーID、名前、初期数量）
8. レスポンスDTOの生成

**実装例**:

```typescript
async createIngredient(command: CreateIngredientCommand): Promise<IngredientDto> {
  // 1-3. バリデーション・重複チェック
  await this.duplicateCheckService.checkDuplicate(/*...*/);

  // 4-6. トランザクション内で永続化
  const ingredient = await this.transactionManager.run(async () => {
    const newIngredient = IngredientFactory.create(command);
    return await this.ingredientRepository.save(newIngredient);
  });

  // 7. 成功後にイベント発行
  await this.eventPublisher.publish(
    new IngredientCreated(ingredient.id, ingredient.userId, ingredient.name)
  );

  return this.ingredientMapper.toDto(ingredient);
}
```

**エラーケース**:

- 重複エラー → DuplicateIngredientException
- カテゴリー不存在 → CategoryNotFoundException
- 単位不存在 → UnitNotFoundException
- 認証エラー → UnauthorizedException

### ユースケース: 食材検索

**検索条件**:

- ユーザーID（認証コンテキストから自動取得）
- カテゴリー
- 保存場所
- 期限状態（期限切れ、期限間近）
- 在庫状態（在庫あり、在庫切れ）
- キーワード（部分一致）

**ソート順**:

- 更新日時（デフォルト）
- 名前
- 期限（賞味期限優先）
- 登録日時

### ユースケース: カテゴリー別集計

**フロー**:

1. ユーザーIDの取得（認証コンテキストから取得済み）
2. ユーザーの全食材を取得
3. カテゴリー別に集計処理
   - 総アイテム数
   - 在庫ありアイテム数
   - 在庫切れアイテム数
   - 期限切れ間近アイテム数
   - 期限切れアイテム数
4. 全体サマリーの計算
5. レスポンスDTOの生成

**集計ロジック**:

- 期限切れ間近: 3日以内に期限切れ
- 在庫切れ: 数量が0
- カテゴリーがnullの食材は「未分類」として集計

### ユースケース: 食材イベント履歴取得

**フロー**:

1. ユーザーIDと食材IDの取得
2. 食材の所有権確認
3. 指定期間のイベントを取得（デフォルト: 過去30日）
4. イベントタイプでフィルタリング（オプション）
5. ページング処理
6. レスポンスDTOの生成

**対象イベント**:

- IngredientCreated - 食材登録
- IngredientUpdated - 食材更新
- StockConsumed - 在庫消費
- StockReplenished - 在庫補充
- StockAdjusted - 在庫調整
- IngredientDiscarded - 廃棄
- ExpiryInfoUpdated - 期限更新

## InventoryApplicationService

### 主要メソッド

| メソッド          | 説明             | トランザクション |
| ----------------- | ---------------- | ---------------- |
| consumeStock      | 在庫消費         | 必要             |
| replenishStock    | 在庫補充         | 必要             |
| adjustStock       | 在庫調整         | 必要             |
| discardStock      | 在庫廃棄         | 必要             |
| batchConsumeStock | 複数食材一括消費 | 必要             |
| checkStock        | 在庫確認         | 読み取り専用     |
| getLowStockItems  | 在庫不足食材取得 | 読み取り専用     |

### ユースケース: 在庫消費

**フロー**:

1. ユーザーIDの取得（認証コンテキストから取得済み）
2. 食材の存在確認とユーザー所有権確認
3. 食材在庫の取得
4. 在庫量の検証（StockCalculationServiceを使用）
5. トランザクション開始
6. 消費処理（Ingredientのconsumeメソッド呼び出し）
7. 在庫切れチェック
8. リポジトリへの保存
9. トランザクション成功時のイベント発行：
   - StockConsumed（食材ID、ユーザーID、消費数量）
   - StockDepleted（食材ID、ユーザーID、食材名）※在庫切れの場合

**実装例**:

```typescript
async consumeStock(command: ConsumeStockCommand): Promise<void> {
  // 1-4. 事前検証
  const ingredient = await this.validateAndGetIngredient(command);
  this.stockCalculationService.validateConsumption(ingredient, command.quantity);

  // 5-8. トランザクション内で処理
  await this.transactionManager.run(async () => {
    ingredient.consume(command.quantity);
    await this.ingredientRepository.save(ingredient);

    // イベントはアウトボックステーブルに記録
    await this.eventStore.store([
      new StockConsumed(ingredient.id, ingredient.userId, command.quantity),
      ...(ingredient.isOutOfStock() ? [new StockDepleted(ingredient.id)] : [])
    ]);
  });

  // 9. トランザクション成功後にイベント発行
  await this.eventPublisher.publishPending();
}
```

**エラーケース**:

- 在庫不足 → InsufficientStockException
- 食材不存在 → IngredientNotFoundException
- 認証エラー → UnauthorizedException

### ユースケース: 在庫廃棄

**フロー**:

1. ユーザーIDの取得（認証コンテキストから取得済み）
2. 食材の存在確認とユーザー所有権確認
3. 廃棄理由の検証
4. 廃棄数量の検証（指定がない場合は全量廃棄）
5. 廃棄処理実行
6. ドメインイベントの発行
   - IngredientDiscarded（食材ID、ユーザーID、廃棄数量、理由）
7. 廃棄履歴の記録

**エラーケース**:

- 廃棄数量超過 → InsufficientStockException
- 食材不存在 → IngredientNotFoundException
- 既に廃棄済み → AlreadyDiscardedException
- 認証エラー → UnauthorizedException

### ユースケース: 複数食材一括消費

**フロー**:

1. ユーザーIDの取得（認証コンテキストから取得済み）
2. 事前検証（全食材の存在・権限・在庫量チェック）
3. トランザクション開始
4. 各食材について消費処理を実行
5. すべて成功した場合のみコミット
6. トランザクション成功後にイベント一括発行
7. 処理結果の集約

**実装例**:

```typescript
async batchConsumeStock(command: BatchConsumeCommand): Promise<BatchResult> {
  const results: BatchItemResult[] = [];

  try {
    // 1-2. 事前検証（トランザクション外）
    const validatedItems = await this.validateAllItems(command.items);

    // 3-5. トランザクション内で一括処理
    await this.transactionManager.run(async () => {
      const events: DomainEvent[] = [];

      for (const item of validatedItems) {
        try {
          const ingredient = await this.ingredientRepository.findById(item.ingredientId);
          ingredient.consume(item.quantity);
          await this.ingredientRepository.save(ingredient);

          // イベントを蓄積（まだ発行しない）
          events.push(new StockConsumed(ingredient.id, ingredient.userId, item.quantity));
          if (ingredient.isOutOfStock()) {
            events.push(new StockDepleted(ingredient.id, ingredient.userId));
          }

          results.push({ itemId: item.id, success: true });
        } catch (error) {
          results.push({ itemId: item.id, success: false, error: error.message });
          throw new BatchOperationFailedException(results);
        }
      }

      // アウトボックステーブルに一括保存
      await this.eventStore.storeAll(events);
    });

    // 6. 成功時のみイベント発行
    await this.eventPublisher.publishPending();

  } catch (error) {
    // エラー時の処理（ロールバック済み）
    await this.handleBatchFailure(results, error);
    throw error;
  }

  return new BatchResult(results);
}
```

**エラーケース**:

- 部分的な在庫不足 → BatchOperationFailedException（詳細情報含む）
- 食材不存在 → BatchOperationFailedException（詳細情報含む）
- トランザクション失敗 → SystemException
- 認証エラー → UnauthorizedException

**トランザクション制御**:

- すべての消費が成功するか、すべて失敗するかの原子性を保証
- 部分的な成功は許可しない

## ExpiryManagementApplicationService

### 主要メソッド

| メソッド                  | 説明                 | 実行タイミング |
| ------------------------- | -------------------- | -------------- |
| checkExpiringIngredients  | 期限切れ間近チェック | 日次バッチ     |
| processExpiredIngredients | 期限切れ処理         | 日次バッチ     |
| updateExpiryInfo          | 期限更新             | 手動実行       |
| getExpiryStatistics       | 期限統計取得         | オンデマンド   |

### ユースケース: 期限切れ間近チェック

**フロー**:

1. 全ユーザーの期限3日以内の食材を抽出（ExpiryCheckServiceを使用）
2. ユーザーごとにグループ化
3. 各食材についてイベント発行
   - IngredientExpiringSoon（食材ID、ユーザーID、食材名、残日数）
4. 通知サービスへの連携
5. 処理結果の記録

**バッチ設定**:

- 実行時刻: 毎日 8:00
- タイムアウト: 5分
- リトライ: 3回

## MasterDataApplicationService

### 主要メソッド

| メソッド        | 説明               | トランザクション |
| --------------- | ------------------ | ---------------- |
| getCategories   | カテゴリー一覧取得 | 読み取り専用     |
| getUnits        | 単位一覧取得       | 読み取り専用     |
| getCategoryById | カテゴリー詳細取得 | 読み取り専用     |
| getUnitById     | 単位詳細取得       | 読み取り専用     |

### ユースケース: カテゴリー一覧取得

**フロー**:

1. キャッシュチェック（10分間有効）
2. キャッシュがない場合:
   - リポジトリから全カテゴリー取得
   - 表示順でソート
   - キャッシュに保存
3. レスポンスDTOの生成

**キャッシュ戦略**:

- TTL: 10分
- 無効化: カテゴリー更新時
- スコープ: アプリケーション全体

### ユースケース: 単位一覧取得

**フロー**:

1. キャッシュチェック（10分間有効）
2. キャッシュがない場合:
   - リポジトリから全単位取得
   - タイプ別・表示順でソート
   - キャッシュに保存
3. レスポンスDTOの生成

**フィルタリング**:

- タイプ別取得（COUNT/WEIGHT/VOLUME）をサポート
- 使用頻度の高い単位を優先表示

## ShoppingApplicationService

### 主要メソッド

| メソッド                  | 説明                     | トランザクション |
| ------------------------- | ------------------------ | ---------------- |
| startShoppingSession      | 買い物セッション開始     | 必要             |
| completeShoppingSession   | 買い物セッション完了     | 必要             |
| checkIngredient           | 食材在庫確認             | 必要             |
| getActiveSession          | アクティブセッション取得 | 読み取り専用     |
| getShoppingHistory        | 買い物履歴取得           | 読み取り専用     |
| getQuickAccessIngredients | クイックアクセス食材取得 | 読み取り専用     |
| getIngredientsByCategory  | カテゴリー別食材取得     | 読み取り専用     |
| getShoppingStatistics     | 買い物統計取得           | 読み取り専用     |

### ユースケース: 買い物セッション開始

**フロー**:

1. ユーザーIDの取得（認証コンテキストから取得済み）
2. アクティブセッションの存在確認
3. 既存のアクティブセッションがある場合:
   - 30分以上経過していれば自動的に中断（Abandoned）
   - そうでなければエラー
4. 新規ShoppingSessionエンティティの生成
5. リポジトリへの保存
6. ドメインイベントの発行
   - ShoppingSessionStarted（セッションID、ユーザーID、開始時刻）
7. レスポンスDTOの生成

**エラーケース**:

- アクティブセッション存在 → ActiveSessionExistsException
- 認証エラー → UnauthorizedException

### ユースケース: 食材在庫確認

**フロー**:

1. ユーザーIDとセッションIDの取得
2. アクティブセッションの検証
3. 食材の取得（読み取り専用）
4. 在庫状態と期限状態の判定
5. CheckedItemの生成
6. セッションへの確認履歴追加
7. ドメインイベントの発行
   - ItemChecked（セッションID、食材ID、食材名、在庫状態、確認時刻）
8. QuickAccessViewの更新（非同期処理）

**非同期処理の実装**:

```typescript
async checkIngredient(command: CheckIngredientCommand): Promise<CheckedItemDto> {
  // 1-6. 同期処理
  const checkedItem = await this.createCheckedItem(command);

  // 7. 同期イベント発行
  await this.eventPublisher.publish(
    new ItemChecked(checkedItem.sessionId, checkedItem.ingredientId, /*...*/)
  );

  // 8. 非同期処理（ファイア&フォーゲット）
  this.asyncTaskQueue.enqueue({
    type: 'UPDATE_QUICK_ACCESS',
    payload: { userId: command.userId, ingredientId: command.ingredientId },
    retryPolicy: { maxRetries: 3, backoffMs: 1000 },
    onError: (error) => this.logger.error('Failed to update quick access', error)
  });

  return this.mapper.toDto(checkedItem);
}
```

**在庫状態の判定**:

- IN_STOCK: 在庫あり（数量 > 0）
- OUT_OF_STOCK: 在庫なし（数量 = 0）
- LOW_STOCK: 在庫少（数量 <= 閾値）

**期限状態の判定**:

- FRESH: 新鮮（期限まで4日以上）
- EXPIRING_SOON: 期限間近（期限まで3日以内）
- EXPIRED: 期限切れ

### ユースケース: 買い物セッション完了

**フロー**:

1. ユーザーIDとセッションIDの取得
2. セッションの所有権確認
3. セッション状態の検証（ACTIVE）
4. セッションの完了処理
5. 継続時間と確認件数の計算
6. ドメインイベントの発行
   - ShoppingSessionCompleted（セッションID、ユーザーID、継続時間、確認件数）
7. 買い物パターンの分析（非同期処理）

**実装例**:

```typescript
async completeShoppingSession(command: CompleteSessionCommand): Promise<void> {
  // 1-5. 同期処理
  const session = await this.validateAndCompleteSession(command);

  // 6. 同期イベント発行
  await this.eventPublisher.publish(
    new ShoppingSessionCompleted(session.id, session.userId, session.getDuration())
  );

  // 7. 非同期分析処理
  this.analysisTaskQueue.enqueue({
    type: 'ANALYZE_SHOPPING_PATTERN',
    payload: {
      sessionId: session.id,
      userId: session.userId,
      checkedItems: session.getCheckedItems()
    },
    priority: 'low',
    delayMs: 5000, // 5秒後に実行
    onError: (error) => this.logger.warn('Shopping pattern analysis failed', error)
  });
}
```

**エラーケース**:

- セッション不存在 → SessionNotFoundException
- 既に完了済み → SessionAlreadyCompletedException
- 権限エラー → ForbiddenException

### ユースケース: クイックアクセス食材取得

**フロー**:

1. ユーザーIDの取得
2. 最近確認した食材の取得（デフォルト: 20件）
3. よく確認する食材の取得（頻度順）
4. 両方の結果をマージ（重複排除）
5. 現在の在庫状態を付加
6. レスポンスDTOの生成

**最適化**:

- 短期キャッシュ（5分）
- バッチ取得によるN+1問題回避
- 必要最小限のフィールドのみ取得

### ユースケース: カテゴリー別食材取得（買い物モード用）

**フロー**:

1. ユーザーIDとカテゴリーIDの取得
2. アクティブセッションの確認
3. カテゴリー別食材の取得（軽量版）
4. 各食材の在庫状態判定
5. カテゴリー内でのソート
   - 在庫なし → 優先度高
   - 在庫少 → 優先度中
   - 在庫あり → 優先度低
6. レスポンスDTOの生成

**返却データ**:

- 食材ID、名前
- 在庫状態（あり/なし/少）
- 期限状態（新鮮/間近/切れ）
- 最終確認日時（セッション内）

### ユースケース: 買い物統計取得

**フロー**:

1. ユーザーIDと期間の取得
2. 指定期間のセッションデータ取得
3. 統計情報の集計
   - 総セッション数
   - 平均セッション時間
   - 平均確認食材数
   - よく確認する食材TOP10
   - 時間帯別利用頻度
4. レスポンスDTOの生成

**集計内容**:

- セッション統計
- 食材確認パターン
- 買い物習慣の分析
- 改善提案（在庫切れ頻度が高い食材など）

## 共通仕様

### DTOパターン

**入力DTO（Command）**:

- 必要最小限のデータ
- バリデーションアノテーション付き
- 不変オブジェクト

**出力DTO（Response）**:

- クライアントが必要とする形式
- ドメインモデルの詳細を隠蔽
- null安全性の保証

### エラーハンドリング

| 例外タイプ            | HTTPステータス | 説明               |
| --------------------- | -------------- | ------------------ |
| ValidationException   | 400            | 入力検証エラー     |
| UnauthorizedException | 401            | 認証エラー         |
| ForbiddenException    | 403            | 権限エラー         |
| NotFoundException     | 404            | リソース不存在     |
| DuplicateException    | 409            | 重複エラー         |
| BusinessException     | 422            | ビジネスルール違反 |
| SystemException       | 500            | システムエラー     |

### トランザクション管理

- 更新系操作は必ずトランザクション内で実行
- 読み取り専用操作はトランザクション不要
- 複数集約の更新は結果整合性で対応

**トランザクションとイベント発行のパターン**:

1. **単一集約の更新**:

   ```typescript
   await this.transactionManager.run(async () => {
     // 1. 集約の操作
     ingredient.updateName(newName)
     await this.repository.save(ingredient)

     // 2. アウトボックスに記録
     await this.eventStore.store([new IngredientUpdated(ingredient.id, 'name', oldName, newName)])
   })

   // 3. トランザクション成功後にイベント発行
   await this.eventPublisher.publishPending()
   ```

2. **複数集約の更新（結果整合性）**:

   ```typescript
   // 各集約を独立したトランザクションで更新
   await this.updateIngredient(ingredientId, updates)

   // イベントを介して他の集約を更新
   this.eventBus.publishAsync(new IngredientCategoryChanged(ingredientId, newCategoryId))
   ```

3. **アウトボックスパターンの実装**:
   ```sql
   -- アウトボックステーブル
   CREATE TABLE outbox_events (
     id UUID PRIMARY KEY,
     aggregate_id VARCHAR(255) NOT NULL,
     event_type VARCHAR(255) NOT NULL,
     event_data JSONB NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     published_at TIMESTAMP NULL,
     retry_count INTEGER DEFAULT 0
   );
   ```

### 認証・権限チェック

- すべてのAPIは認証必須（Bearer Token）
- UserIdは認証コンテキストから自動的に取得
- アクセス制御の詳細は[ドメインモデル仕様](./domain-model.md#アクセス制御)を参照

## パフォーマンス最適化

### キャッシュ戦略

- マスタデータ（カテゴリー、単位）は起動時キャッシュ
- 検索結果は5分間キャッシュ
- 更新操作後はキャッシュクリア

### バッチ処理

- 大量データ処理は非同期実行
- 進捗状況の追跡
- 部分的な失敗の許容
- セッション自動中断処理（30分無操作）

**セッション自動中断の実装**:

```typescript
@Scheduled('*/5 * * * *') // 5分ごとに実行
async checkAndExpireSessions(): Promise<void> {
  const expiredSessions = await this.shoppingSessionRepository
    .findExpiredSessions(30); // 30分無操作

  for (const session of expiredSessions) {
    try {
      await this.transactionManager.run(async () => {
        session.abandon(SessionAbandonReason.TIMEOUT);
        await this.shoppingSessionRepository.save(session);

        // アウトボックスに記録
        await this.eventStore.store([
          new ShoppingSessionAbandoned(
            session.id,
            session.userId,
            session.getDuration(),
            'TIMEOUT'
          )
        ]);
      });

      // イベント発行
      await this.eventPublisher.publishPending();

    } catch (error) {
      this.logger.error('Failed to abandon session', {
        sessionId: session.id,
        error
      });
    }
  }
}
```

## ドメインサービスの詳細

### DuplicateCheckService

食材の重複登録を防ぐためのドメインサービス。

#### 責務

- 同一ユーザー内での食材重複チェック
- 重複判定基準：ユーザーID + 食材名 + 期限情報 + 保存場所

#### 主要メソッド

| メソッド       | 説明                       | パラメータ                                |
| -------------- | -------------------------- | ----------------------------------------- |
| checkDuplicate | 重複チェックを実行         | userId, name, expiryInfo, storageLocation |
| isDuplicate    | 重複しているかどうかを判定 | userId, name, expiryInfo, storageLocation |
| findDuplicates | 重複している食材を検索     | userId, name, expiryInfo, storageLocation |

#### 実装詳細

```typescript
interface DuplicateCheckService {
  /**
   * 食材の重複をチェックする
   * @param userId - ユーザーID
   * @param name - 食材名
   * @param expiryInfo - 期限情報（null可）
   * @param storageLocation - 保存場所
   * @returns 重複している場合はtrue
   */
  async isDuplicate(
    userId: UserId,
    name: IngredientName,
    expiryInfo: ExpiryInfo | null,
    storageLocation: StorageLocation
  ): Promise<boolean>

  /**
   * 重複している食材を検索する
   * @returns 重複している食材のリスト
   */
  async findDuplicates(
    userId: UserId,
    name: IngredientName,
    expiryInfo: ExpiryInfo | null,
    storageLocation: StorageLocation
  ): Promise<Ingredient[]>
}
```

#### ビジネスルール

- 期限情報がnullの場合は、期限なし食材として比較
- 保存場所のdetailも含めて完全一致で判定
- 既に削除された食材は重複チェックの対象外

### ShoppingAssistService

買い物モードでの在庫確認を支援するドメインサービス。

#### 責務

- アクティブセッションの管理
- カテゴリー別の在庫状態集計
- 最近確認した食材の追跡
- 買い物統計の生成

#### 主要メソッド

| メソッド                     | 説明                       | パラメータ              |
| ---------------------------- | -------------------------- | ----------------------- |
| validateActiveSession        | アクティブセッションの検証 | userId, sessionId       |
| calculateCategoryStockStatus | カテゴリー別在庫状態の計算 | ingredients, categoryId |
| trackItemCheck               | 食材確認の追跡             | sessionId, ingredientId |
| generateShoppingInsights     | 買い物インサイトの生成     | userId, dateRange       |

#### 実装詳細

```typescript
interface ShoppingAssistService {
  /**
   * セッションがアクティブで有効かを検証
   * @param userId - ユーザーID
   * @param sessionId - セッションID
   * @returns 有効な場合はセッション、無効な場合はnull
   */
  async validateActiveSession(
    userId: UserId,
    sessionId: ShoppingSessionId
  ): Promise<ShoppingSession | null>

  /**
   * カテゴリー内の在庫状態を集計
   * @param ingredients - 食材リスト
   * @param categoryId - カテゴリーID
   * @returns 在庫状態の集計結果
   */
  calculateCategoryStockStatus(
    ingredients: Ingredient[],
    categoryId: CategoryId
  ): CategoryStockSummary

  /**
   * 買い物インサイトを生成
   * @param userId - ユーザーID
   * @param dateRange - 分析期間
   * @returns インサイト情報
   */
  async generateShoppingInsights(
    userId: UserId,
    dateRange: DateRange
  ): Promise<ShoppingInsights>
}
```

#### ビジネスルール

- 30分以上操作がないセッションは自動的に無効化
- 在庫状態の優先順位：在庫なし > 在庫少 > 在庫あり
- 確認頻度の高い食材は優先的に表示

## 監査とロギング

### 監査対象

- すべての更新操作
- 誰が、いつ、何を変更したか
- 変更前後の値

### ログレベル

- INFO: 正常な操作完了
- WARN: リトライ可能なエラー
- ERROR: 処理失敗

## 更新履歴

| 日付       | 内容                                                                                      | 作成者     |
| ---------- | ----------------------------------------------------------------------------------------- | ---------- |
| 2025-06-24 | 初版                                                                                      | @komei0727 |
| 2025-06-24 | ユーザー認証統合に伴う修正（認証前提の明記、権限チェックの更新）                          | Claude     |
| 2025-06-24 | DuplicateCheckServiceの詳細仕様を追加                                                     | Claude     |
| 2025-06-24 | InventoryApplicationServiceに廃棄処理と一括消費処理を追加                                 | Claude     |
| 2025-06-24 | IngredientApplicationServiceに集計・履歴機能、MasterDataApplicationServiceを追加          | Claude     |
| 2025-06-28 | 買い物サポート機能統合に伴う修正（ShoppingApplicationService、ShoppingAssistService追加） | Claude     |
| 2025-06-28 | 処理フロー改善（トランザクション境界、イベント発行、非同期処理、セッション管理の詳細化）  | Claude     |
