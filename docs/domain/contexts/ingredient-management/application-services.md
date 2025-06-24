# 食材管理コンテキスト - アプリケーションサービス仕様

## 概要

このドキュメントでは、食材管理コンテキストのアプリケーションサービスを定義します。
アプリケーションサービスは、ユースケースの実行とドメイン層の調整を責務とします。

## サービス一覧

| サービス                           | 責務                       | 主要なユースケース     |
| ---------------------------------- | -------------------------- | ---------------------- |
| IngredientApplicationService       | 食材管理の主要ユースケース | 登録、更新、削除、検索 |
| InventoryApplicationService        | 在庫関連の操作             | 消費、補充、在庫確認   |
| ExpiryManagementApplicationService | 期限管理の自動化           | 期限チェック、通知生成 |
| MasterDataApplicationService       | マスタデータ管理           | カテゴリー・単位の取得 |

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
4. 食材エンティティの生成
5. リポジトリへの保存
6. ドメインイベントの発行
   - IngredientCreated（食材ID、ユーザーID、名前、初期数量）
7. レスポンスDTOの生成

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
5. 消費処理（Ingredientのconsumeメソッド呼び出し）
6. 在庫切れチェック
7. ドメインイベントの発行
   - StockConsumed（食材ID、ユーザーID、消費数量）
   - StockDepleted（食材ID、ユーザーID、食材名）※在庫切れの場合
8. 履歴記録

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
2. トランザクション開始
3. 各食材について:
   - 存在確認とユーザー所有権確認
   - 在庫量の検証
   - 仮消費実行
4. すべての検証が成功した場合:
   - 実際の消費処理を実行
   - 各食材についてドメインイベント発行
5. トランザクションコミット
6. 処理結果の集約

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

| 日付       | 内容                                                                             | 作成者     |
| ---------- | -------------------------------------------------------------------------------- | ---------- |
| 2025-06-24 | 初版                                                                             | @komei0727 |
| 2025-06-24 | ユーザー認証統合に伴う修正（認証前提の明記、権限チェックの更新）                 | Claude     |
| 2025-06-24 | DuplicateCheckServiceの詳細仕様を追加                                            | Claude     |
| 2025-06-24 | InventoryApplicationServiceに廃棄処理と一括消費処理を追加                        | Claude     |
| 2025-06-24 | IngredientApplicationServiceに集計・履歴機能、MasterDataApplicationServiceを追加 | Claude     |
