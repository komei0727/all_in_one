# 食材・在庫管理コンテキスト - リポジトリ仕様

## 概要

このドキュメントでは、食材・在庫管理コンテキストのリポジトリインターフェースを定義します。
リポジトリは集約の永続化とビジネス要件に基づく検索を責務とします。

## リポジトリ一覧

| リポジトリ                | 対象集約/エンティティ | 主要な責務                   |
| ------------------------- | --------------------- | ---------------------------- |
| IngredientRepository      | 食材集約              | 食材の永続化と検索           |
| CategoryRepository        | カテゴリー集約        | カテゴリーマスタの管理       |
| UnitRepository            | 単位集約              | 単位マスタの管理             |
| ShoppingSessionRepository | 買い物セッション集約  | セッションの永続化と履歴管理 |

## IngredientRepository

### 基本操作

| メソッド         | 説明                     | 備考                                                            |
| ---------------- | ------------------------ | --------------------------------------------------------------- |
| save(ingredient) | 食材の保存（作成・更新） | IDの有無で判断、必要に応じてドメインイベント発行                |
| findById(id)     | IDによる食材取得         | 存在しない場合はnull、アクセス権チェック必須                    |
| findAll()        | 全食材取得               | 削除済みは除外、実装では使用せず                                |
| delete(id)       | 食材の削除               | 論理削除、アクセス権チェック必須、IngredientDeletedイベント発行 |

### ビジネス要件に基づく検索

**重要**: すべての検索メソッドはユーザーIDによるフィルタリングが必須です。これにより、ユーザーは自分の食材のみアクセス可能となります。

| メソッド                                | 説明                       | 使用場面           |
| --------------------------------------- | -------------------------- | ------------------ |
| findByUserId(userId)                    | ユーザー別食材取得         | マイ食材一覧       |
| findByCategory(userId, categoryId)      | ユーザー・カテゴリー別取得 | カテゴリー絞り込み |
| findExpiringSoon(userId, days)          | ユーザーの期限切れ間近取得 | アラート生成       |
| findExpired(userId)                     | ユーザーの期限切れ食材取得 | 廃棄候補表示       |
| findByStorageLocation(userId, location) | ユーザー・保存場所別取得   | 冷蔵庫確認         |
| findOutOfStock(userId)                  | ユーザーの在庫切れ食材取得 | 買い物リスト       |
| findLowStock(userId, threshold)         | ユーザーの在庫不足食材取得 | 補充提案           |

### 買い物モード専用の検索

| メソッド                                 | 説明                     | 使用場面                   |
| ---------------------------------------- | ------------------------ | -------------------------- |
| findActiveIngredients(userId)            | アクティブな食材のみ取得 | 買い物モード表示           |
| findByIds(userId, ids)                   | 複数IDによる一括取得     | 買い物履歴からの参照       |
| findByCategoryForShopping(userId, catId) | カテゴリー別簡易取得     | 買い物モードカテゴリー表示 |

### 一意性チェック

| メソッド                                                                    | 説明                       | 使用場面   |
| --------------------------------------------------------------------------- | -------------------------- | ---------- |
| existsByUserAndNameAndExpiryAndLocation(userId, name, expiryInfo, location) | ユーザー内での重複チェック | 登録時検証 |

### 集計クエリ

| メソッド                              | 説明                       | 使用場面   |
| ------------------------------------- | -------------------------- | ---------- |
| countByUserAndCategory(userId)        | ユーザーのカテゴリー別件数 | 統計表示   |
| countExpiringSoon(userId, days)       | ユーザーの期限切れ間近件数 | バッジ表示 |
| countByUserAndStorageLocation(userId) | ユーザーの保存場所別件数   | 在庫概要   |

### ドメインイベント発行責務

IngredientRepositoryは以下のドメインイベントの発行を担当：

| 操作                  | 発行イベント                 | 発行条件                                  |
| --------------------- | ---------------------------- | ----------------------------------------- |
| save (新規作成時)     | IngredientCreated            | 新規食材作成時                            |
| save (更新時)         | IngredientUpdated            | 既存食材更新時                            |
| save (在庫消費時)     | StockConsumed, StockDepleted | 在庫減少時、在庫が0になった場合           |
| save (在庫補充時)     | StockReplenished             | 在庫増加時                                |
| save (期限更新時)     | ExpiryInfoUpdated            | 期限情報変更時                            |
| save (閾値チェック時) | LowStockDetected             | 在庫が閾値以下になった場合                |
| delete                | IngredientDeleted            | 食材削除時                                |
| findExpiringSoon      | IngredientExpiringSoon       | 期限3日前の食材検出時（バッチ処理で使用） |
| findExpired           | IngredientExpired            | 期限切れ食材検出時（バッチ処理で使用）    |

## CategoryRepository

### 基本操作

| メソッド       | 説明             | 備考             |
| -------------- | ---------------- | ---------------- |
| save(category) | カテゴリーの保存 | 作成・更新       |
| findById(id)   | IDによる取得     | マスタ参照       |
| findAll()      | 全カテゴリー取得 | 表示順でソート   |
| delete(id)     | カテゴリーの削除 | 使用中は削除不可 |

### ビジネス要件に基づく検索

| メソッド           | 説明           | 使用場面       |
| ------------------ | -------------- | -------------- |
| findByName(name)   | 名前による検索 | 重複チェック   |
| existsByName(name) | 名前の存在確認 | バリデーション |
| hasIngredients(id) | 食材の有無確認 | 削除可否判定   |

## UnitRepository

### 基本操作

| メソッド     | 説明         | 備考             |
| ------------ | ------------ | ---------------- |
| save(unit)   | 単位の保存   | 作成・更新       |
| findById(id) | IDによる取得 | マスタ参照       |
| findAll()    | 全単位取得   | 表示順でソート   |
| delete(id)   | 単位の削除   | 使用中は削除不可 |

### ビジネス要件に基づく検索

| メソッド                           | 説明             | 使用場面       |
| ---------------------------------- | ---------------- | -------------- |
| findByType(type)                   | タイプ別単位取得 | 単位選択UI     |
| findBySymbol(symbol)               | 記号による検索   | 重複チェック   |
| existsByNameOrSymbol(name, symbol) | 存在確認         | バリデーション |
| hasIngredients(id)                 | 食材の有無確認   | 削除可否判定   |

## ShoppingSessionRepository

### 基本操作

| メソッド                   | 説明                           | 備考                        |
| -------------------------- | ------------------------------ | --------------------------- |
| save(session)              | セッションの保存（作成・更新） | IDの有無で判断              |
| findById(id)               | IDによるセッション取得         | 存在しない場合はnull        |
| findActiveByUserId(userId) | アクティブセッション取得       | ユーザーごとに1つのみ       |
| complete(sessionId)        | セッションの完了               | ステータスをCOMPLETEDに更新 |

### ビジネス要件に基づく検索

| メソッド                                    | 説明                       | 使用場面             |
| ------------------------------------------- | -------------------------- | -------------------- |
| findRecentSessions(userId, limit)           | 最近のセッション履歴取得   | 買い物履歴表示       |
| findByDateRange(userId, startDate, endDate) | 期間内のセッション取得     | 統計分析             |
| countActiveSession(userId)                  | アクティブセッション数確認 | 重複チェック         |
| hasActiveSession(userId)                    | アクティブセッションの有無 | 新規セッション開始前 |
| findByDeviceType(userId, deviceType)        | デバイス種別での絞り込み   | 利用デバイス分析     |
| findByLocation(userId, location, radius)    | 位置情報での検索           | 店舗別分析           |

### 確認履歴管理

| メソッド                               | 説明                       | 使用場面           |
| -------------------------------------- | -------------------------- | ------------------ |
| addCheckedItem(sessionId, checkedItem) | 確認済み食材の追加         | 買い物中の食材確認 |
| findCheckedItems(sessionId)            | セッション内の確認履歴取得 | 履歴表示           |
| getRecentlyChecked(userId, limit)      | 最近確認した食材取得       | クイックアクセス   |
| getMostCheckedItems(userId, limit)     | よく確認する食材取得       | 優先表示           |

### 集計クエリ

| メソッド                                | 説明               | 使用場面       |
| --------------------------------------- | ------------------ | -------------- |
| getSessionStatistics(userId, dateRange) | 買い物統計の取得   | ダッシュボード |
| getAverageSessionDuration(userId)       | 平均セッション時間 | 分析           |
| getCheckFrequency(userId, ingredientId) | 食材確認頻度の取得 | パターン分析   |

### ドメインイベント発行責務

ShoppingSessionRepositoryは以下のドメインイベントの発行を担当：

| メソッド          | 発行イベント             | 発行タイミング                           |
| ----------------- | ------------------------ | ---------------------------------------- |
| save (新規作成時) | ShoppingSessionStarted   | 新規セッション作成時                     |
| addCheckedItem    | ItemChecked              | 食材確認の記録時                         |
| complete          | ShoppingSessionCompleted | セッション正常完了時                     |
| abandon           | ShoppingSessionAbandoned | セッション中断時（30分無操作で自動発行） |

## 共通仕様

### ページング

大量データを扱う可能性があるメソッドはページング対応：

- `findAll()` → `findAll(page, size)`
- `findByCategory()` → `findByCategory(categoryId, page, size)`
- `findRecentSessions()` → `findRecentSessions(userId, limit, offset)`
- `getRecentlyChecked()` → `getRecentlyChecked(userId, limit, offset)`

### ソート

ビジネス要件に応じたソート順：

- 食材：更新日時降順（デフォルト）、名前昇順、期限昇順（賞味期限優先）
- カテゴリー・単位：表示順昇順
- 買い物セッション：開始日時降順
- 確認履歴：確認日時降順

### トランザクション

- 各リポジトリメソッドは単一のトランザクション内で実行
- 複数集約にまたがる操作はアプリケーションサービスで制御
- 買い物セッションと食材の参照は読み取り専用トランザクション

### 整合性制約

#### 集約ルートを通じたアクセス

- 食材集約内の値オブジェクト（IngredientStock、ExpiryInfo）は必ず集約ルート（Ingredient）を通じてアクセス
- 買い物セッション内のCheckedItemは必ずShoppingSessionを通じてアクセス
- 直接的な値オブジェクトの永続化は禁止

#### ドメインモデルの整合性

- ユーザーIDによるアクセス制御は全メソッドで必須
- 論理削除された食材は通常の検索から除外
- アクティブな買い物セッションは1ユーザー1つまで
- 買い物セッション中の食材参照は読み取り専用（更新不可）

## パフォーマンス考慮事項

### インデックス設計

効率的な検索のためのインデックス：

- 食材：userId, categoryId, expiryInfo（データベース実装ではbest_before_dateとuse_by_dateの個別インデックス）, storageLocation
- カテゴリー：name, displayOrder
- 単位：type, symbol
- 買い物セッション：userId + status（アクティブセッション検索用）, startedAt, deviceType
- 確認履歴：sessionId, ingredientId, checkedAt

### キャッシュ戦略

- カテゴリー・単位：アプリケーション起動時に全件キャッシュ
- 食材：キャッシュなし（更新頻度が高いため）
- 買い物用食材リスト：短期キャッシュ（5分、読み取り専用）
- 最近確認した食材：セッション内キャッシュ

### 遅延読み込み

- 一覧表示時：最小限のフィールドのみ取得
- 詳細表示時：関連データを含めて取得
- 買い物モード：名前、在庫状態、期限状態のみ取得

### 買い物モードの最適化

- 読み取り専用クエリの使用
- 必要最小限のフィールド選択
- バッチ取得による N+1 問題の回避
- カテゴリー別の事前フェッチ

## 実装上の注意事項

### アクセス制御

すべての食材操作はUserIdによるアクセス制御が必須です。
詳細な実装方針は[ドメインモデル仕様のアクセス制御](./domain-model.md#アクセス制御)を参照してください。

### エラーハンドリング

- データベース接続エラー：リトライ後、例外をスロー
- 一意制約違反：ビジネス例外として処理
- 楽観的ロック：バージョン不整合例外

### 論理削除

- 削除フラグ（deletedAt）による論理削除
- 通常の検索では削除済みデータを除外
- 履歴参照時のみ削除済みデータを含める

### ドメインイベント発行

- リポジトリは永続化操作と同時にドメインイベントを発行
- イベント発行はトランザクション内で実行（アウトボックスパターン推奨）
- イベント発行失敗時は永続化操作もロールバック
- 高頻度イベント（ItemChecked等）はバッファリングを検討

## 更新履歴

| 日付       | 内容                                                                                            | 作成者     |
| ---------- | ----------------------------------------------------------------------------------------------- | ---------- |
| 2025-06-24 | 初版                                                                                            | @komei0727 |
| 2025-06-24 | ユーザー認証統合に伴う修正（アクセス制御の明記、インデックス追加）                              | Claude     |
| 2025-06-28 | 買い物サポート機能統合に伴う修正（ShoppingSessionRepository追加、ドメインイベント発行責務追加） | Claude     |
| 2025-07-01 | ShoppingSessionRepositoryにデバイス種別・位置情報での検索メソッドを追加、インデックス設計更新   | Claude     |
