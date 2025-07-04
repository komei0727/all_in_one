# 食材・在庫管理コンテキスト - 集約設計

## 概要

このドキュメントでは、食材・在庫管理コンテキストにおける集約（Aggregate）の設計を定義します。
集約はトランザクション整合性の境界を定め、ビジネス不変条件を保護します。

## 集約の一覧

| 集約名               | 集約ルート      | 責務                               |
| -------------------- | --------------- | ---------------------------------- |
| 食材集約             | Ingredient      | 個々の食材の管理とライフサイクル   |
| カテゴリー集約       | Category        | 食材カテゴリーのマスタ管理         |
| 単位集約             | Unit            | 数量単位のマスタ管理               |
| 買い物セッション集約 | ShoppingSession | 買い物活動の記録と在庫確認履歴管理 |

## 食材集約（Ingredient Aggregate）

### 概要

食材集約は、在庫管理の中核となる集約です。食材の登録から消費、廃棄までのライフサイクル全体を管理します。

### 集約の構成

```mermaid
graph TD
    subgraph "食材集約"
        Ingredient[食材<br/>集約ルート]
        IngredientStock[食材在庫<br/>値オブジェクト]
        Quantity[数量<br/>値オブジェクト]
        ExpiryInfo[期限情報<br/>値オブジェクト]
        CategoryId[カテゴリーID<br/>値オブジェクト]
        UserId[ユーザーID<br/>値オブジェクト<br/>（認証コンテキストから）]

        Ingredient --> IngredientStock
        Ingredient --> UserId
        IngredientStock --> Quantity
        Ingredient --> ExpiryInfo
        Ingredient --> CategoryId
    end
```

### 不変条件

1. **数量の整合性**

   - 数量は常に0以上
   - 単位の変更時は数量も適切に変換
   - 閾値は数量と同じ単位で管理

2. **期限の整合性**

   - ExpiryInfo内で賞味期限と消費期限の整合性を保証
   - 消費期限は賞味期限以前でなければならない

3. **削除状態の整合性**

   - 削除済みの食材は更新不可
   - 削除は論理削除のみ

4. **ユーザー所有権の整合性**
   - 食材は必ず一人のユーザーに属する
   - 同一ユーザー内で同じ名前・期限・保存場所の組み合わせは重複不可
   - アクセス制御の詳細は[ドメインモデル仕様](./domain-model.md#アクセス制御)を参照

### トランザクション境界

- 食材の作成・更新・削除は単一トランザクション
- 複数食材の一括更新は各食材ごとにトランザクション
- 他の集約への参照は ID のみ

### ドメインイベント

| イベント               | 発生タイミング | ペイロード                         |
| ---------------------- | -------------- | ---------------------------------- |
| IngredientCreated      | 食材登録時     | 食材ID、ユーザーID、名前、初期数量 |
| StockConsumed          | 在庫消費時     | 食材ID、ユーザーID、消費数量       |
| StockReplenished       | 在庫補充時     | 食材ID、ユーザーID、補充数量       |
| StockDepleted          | 在庫切れ時     | 食材ID、ユーザーID、食材名         |
| IngredientExpiringSoon | 期限接近時     | 食材ID、ユーザーID、食材名、残日数 |
| IngredientDeleted      | 削除時         | 食材ID、ユーザーID                 |

## カテゴリー集約（Category Aggregate）

### 概要

カテゴリー集約は、食材の分類マスタを管理します。シンプルな集約で、カテゴリー情報のみを含みます。

### 不変条件

1. カテゴリー名は一意
2. 表示順序は0以上
3. カテゴリーは階層を持たない

### トランザクション境界

- カテゴリーの作成・更新は単一トランザクション
- カテゴリー削除時の食材への影響は別トランザクション

## 単位集約（Unit Aggregate）

### 概要

単位集約は、数量の単位マスタを管理します。単位の種別（個数/重量/容量）によって振る舞いが異なります。

### 不変条件

1. 単位名とシンボルは一意
2. 単位タイプは変更不可
3. 表示順序は0以上

## 買い物セッション集約（ShoppingSession Aggregate）

### 概要

買い物セッション集約は、買い物モードでの活動を記録し、在庫確認の履歴を管理します。
買い物中の高速な在庫確認を支援し、ユーザーの買い物パターンを追跡します。

### 集約の構成

```mermaid
graph TD
    subgraph "買い物セッション集約"
        ShoppingSession[買い物セッション<br/>集約ルート]
        CheckedItem[確認済みアイテム<br/>値オブジェクト]
        SessionStatus[セッション状態<br/>値オブジェクト]
        UserId[ユーザーID<br/>値オブジェクト<br/>（認証コンテキストから）]
        DeviceType[デバイスタイプ<br/>値オブジェクト]
        ShoppingLocation[買い物場所<br/>値オブジェクト]

        ShoppingSession --> UserId
        ShoppingSession --> SessionStatus
        ShoppingSession --> CheckedItem
        ShoppingSession --> DeviceType
        ShoppingSession --> ShoppingLocation
    end
```

### 不変条件

1. **セッションの一意性**

   - 同一ユーザーで同時にアクティブなセッションは1つのみ
   - 完了済みセッションは再開不可

2. **確認履歴の整合性**

   - 確認時刻は常にセッション開始時刻以降
   - 同一食材の重複確認は最新のもののみ保持

3. **読み取り専用の保証**

   - 買い物セッション中は食材データの更新不可
   - 在庫確認のみ実行可能

4. **デバイスタイプの制約**

   - MOBILE、TABLET、DESKTOPのいずれかの値のみ許可
   - セッション開始後の変更は不可

5. **位置情報の整合性**
   - 緯度は-90から90の範囲
   - 経度は-180から180の範囲
   - セッション開始後の変更は不可

### トランザクション境界

- セッションの開始・完了は単一トランザクション
- 食材確認の記録は独立したトランザクション
- 食材集約への参照は読み取り専用

### ドメインイベント

| イベント                 | 発生タイミング   | ペイロード                                                   |
| ------------------------ | ---------------- | ------------------------------------------------------------ |
| ShoppingSessionStarted   | セッション開始時 | セッションID、ユーザーID、開始時刻、デバイスタイプ、位置情報 |
| ItemChecked              | 食材確認時       | セッションID、食材ID、食材名、在庫状態、期限状態、確認時刻   |
| ShoppingSessionCompleted | セッション完了時 | セッションID、ユーザーID、継続時間、確認件数                 |
| ShoppingSessionAbandoned | セッション中断時 | セッションID、ユーザーID、継続時間、中断理由                 |

## 集約間の関係

### 参照関係

```mermaid
graph LR
    Ingredient -->|categoryId| Category
    IngredientStock -->|unitId via Quantity| Unit
    Ingredient -->|has| IngredientStock
    ShoppingSession -.->|reads| Ingredient

    style Ingredient fill:#f9f,stroke:#333,stroke-width:2px
    style IngredientStock fill:#fcc,stroke:#333,stroke-width:2px
    style Category fill:#9ff,stroke:#333,stroke-width:2px
    style Unit fill:#9ff,stroke:#333,stroke-width:2px
    style ShoppingSession fill:#fcf,stroke:#333,stroke-width:2px
```

### 整合性の保証

1. **結果整合性**

   - カテゴリー削除時、食材は「未分類」カテゴリーに移動
   - 単位削除は関連する食材がない場合のみ可能
   - 買い物セッションの食材確認は常に最新の在庫状態を反映

2. **参照整合性**

   - 食材は必ず存在するカテゴリーを参照
   - 数量は必ず存在する単位を参照
   - 買い物セッションは存在する食材のみ確認可能

3. **買い物モードの整合性**
   - 買い物セッション中の食材参照は読み取り専用
   - 同時実行制御により在庫の一貫性を保証

## リポジトリの責務

### IngredientRepository

#### 基本操作

- `save(ingredient)` - 食材の保存
- `findById(id)` - ID による検索
- `findAll()` - 全件取得
- `delete(id)` - 論理削除

#### ビジネス要件に基づく検索

- `findByUserId(userId)` - ユーザー別取得
- `findByCategory(userId, categoryId)` - ユーザー・カテゴリー別取得
- `findExpiringSoon(userId, days)` - ユーザーの期限切れ間近食材の取得
- `findByStorageLocation(userId, location)` - ユーザー・保存場所別取得

#### 一意性チェック

- `existsByUserAndNameAndExpiryAndLocation(userId, name, expiryInfo, location)` - 重複チェック

### CategoryRepository

- `save(category)` - カテゴリーの保存
- `findById(id)` - ID による検索
- `findAll()` - 全件取得（表示順）
- `existsByName(name)` - 名前の重複チェック

### UnitRepository

- `save(unit)` - 単位の保存
- `findById(id)` - ID による検索
- `findAll()` - 全件取得
- `findByType(type)` - タイプ別取得
- `existsByNameOrSymbol(name, symbol)` - 重複チェック

### ShoppingSessionRepository

#### 基本操作

- `save(session)` - セッションの保存
- `findById(id)` - ID による検索
- `findActiveByUserId(userId)` - ユーザーのアクティブセッション取得
- `complete(id)` - セッションの完了

#### ビジネス要件に基づく検索

- `findRecentSessions(userId, limit)` - 最近のセッション履歴取得
- `findCheckedItems(sessionId)` - セッション内の確認済み食材取得
- `getSessionStatistics(userId, dateRange)` - 買い物統計の取得

## パフォーマンス考慮事項

### 遅延読み込み

- 食材一覧表示時は必要最小限のフィールドのみ取得
- 詳細画面遷移時に完全なエンティティを取得
- 買い物モードでは在庫有無のみの軽量データ取得

### キャッシュ戦略

- カテゴリー・単位はマスタデータなのでキャッシュ可能
- 食材データは更新頻度が高いため慎重にキャッシュ
- 買い物モード用のクイックアクセスデータは短期キャッシュ（5分）

### バッチ処理

- 期限切れチェックは日次バッチで実行
- 大量の食材更新は非同期処理
- 古い買い物セッションの自動クリーンアップ（30日経過）

### 買い物モードの最適化

- インデックスによる高速検索（カテゴリー、名前）
- 最小限のフィールド読み込み（名前、在庫有無、期限状態）
- 読み取り専用トランザクションによる並行性向上

## 設計上の決定事項

### なぜ食材を単一の集約としたか

1. **トランザクション境界が明確**

   - 在庫更新は単一食材で完結
   - 他の食材に影響しない

2. **パフォーマンス**

   - 小さな集約は並行性が高い
   - ロック競合が少ない

3. **理解しやすさ**
   - ビジネスロジックが集中
   - テストが容易

### なぜカテゴリーと単位を別集約としたか

1. **ライフサイクルの違い**

   - マスタデータは変更頻度が低い
   - 食材とは独立して管理

2. **参照の方向性**
   - 食材→カテゴリー/単位の単方向
   - 循環参照を避ける

### なぜ買い物セッションを別集約としたか

1. **トランザクション分離**

   - 買い物中の確認操作は食材更新と競合しない
   - 読み取り専用操作により並行性を最大化

2. **責務の明確化**

   - 食材管理と買い物活動は異なるビジネスプロセス
   - 独立した集約により保守性向上

3. **パフォーマンス最適化**
   - 買い物モード専用の軽量データ構造
   - 高速アクセスに特化した設計

## 更新履歴

| 日付       | 内容                                                                               | 作成者     |
| ---------- | ---------------------------------------------------------------------------------- | ---------- |
| 2025-06-24 | 初版                                                                               | @komei0727 |
| 2025-06-24 | ユーザー認証統合に伴う修正（ドメインイベントへのユーザーID追加、アクセス制御強化） | Claude     |
| 2025-06-28 | 買い物サポート機能統合に伴う修正（買い物セッション集約の追加）                     | Claude     |
| 2025-07-01 | 買い物セッション集約にDeviceTypeとShoppingLocation値オブジェクトを追加             | Claude     |
