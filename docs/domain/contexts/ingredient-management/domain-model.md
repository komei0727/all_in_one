# 食材・在庫管理コンテキスト - ドメインモデル仕様

## 概要

このドキュメントでは、食材・在庫管理コンテキストのドメインモデルを定義します。
エンティティ、値オブジェクト、その責務とビジネスルールに焦点を当てています。

## エンティティ

### 食材（Ingredient）

食材管理の中核となるエンティティ。食材の基本情報を管理します。

#### 属性

| 属性            | 型              | 説明         | 制約                                                   |
| --------------- | --------------- | ------------ | ------------------------------------------------------ |
| id              | IngredientId    | 一意識別子   | 必須、不変                                             |
| name            | IngredientName  | 食材名       | 必須、1-50文字                                         |
| categoryId      | CategoryId      | カテゴリーID | 必須、存在するカテゴリー                               |
| userId          | UserId          | ユーザーID   | 必須、食材の所有者（ユーザー認証コンテキストから提供） |
| memo            | Memo            | メモ         | 任意、最大200文字                                      |
| expiryInfo      | ExpiryInfo      | 期限情報     | 任意、賞味期限・消費期限                               |
| ingredientStock | IngredientStock | 在庫情報     | 必須、在庫管理のため                                   |
| price           | Price           | 価格         | 任意、0以上、小数点以下2桁まで                         |
| purchaseDate    | Date            | 購入日       | 必須                                                   |
| createdAt       | Date            | 作成日時     | 必須、不変                                             |
| updatedAt       | Date            | 更新日時     | 必須                                                   |
| deletedAt       | Date            | 削除日時     | 論理削除用                                             |

#### ビジネスルール

- 同じユーザー内で同じ名前・期限・保存場所の組み合わせは重複不可
- 削除は論理削除のみ（履歴保持のため）
- 在庫情報（数量、保存場所、期限）はIngredientStockで管理

#### アクセス制御

食材管理コンテキストでは、以下のアクセス制御を実装します：

1. **基本原則**

   - 食材は必ず一人のユーザー（所有者）に属する
   - UserIdはユーザー認証コンテキストから取得される
   - ユーザーは自分のUserIdに紐づく食材のみ操作可能

2. **実装レベル**

   - **集約レベル**: 他ユーザーの食材へのアクセスを拒否
   - **リポジトリレベル**: findById実行時にuserIdを照合
   - **アプリケーションサービスレベル**: 認証コンテキストからUserIdを取得

3. **例外処理**

   - 認証されていない場合: UnauthorizedException (401)
   - 他ユーザーの食材へのアクセス: ForbiddenException (403)

4. **対象外**
   - カテゴリー・単位はシステム共通のため、アクセス制御不要

#### 主要な振る舞い

- `consume(quantity)` - 在庫を消費する
- `replenish(quantity)` - 在庫を補充する
- `delete()` - 論理削除する

### カテゴリー（Category）

食材を分類するためのマスタエンティティ。

#### 属性

| 属性         | 型           | 説明         | 制約                 |
| ------------ | ------------ | ------------ | -------------------- |
| id           | CategoryId   | 一意識別子   | 必須、不変           |
| name         | CategoryName | カテゴリー名 | 必須、一意、1-20文字 |
| description  | string       | 説明         | 任意、最大100文字    |
| displayOrder | number       | 表示順       | 必須、0以上          |

#### ビジネスルール

- カテゴリー名は一意
- 階層構造は持たない（フラット構造）
- 表示順序で並び替え可能

### 単位（Unit）

数量を表現するためのマスタエンティティ。

#### 属性

| 属性         | 型       | 説明       | 制約                              |
| ------------ | -------- | ---------- | --------------------------------- |
| id           | UnitId   | 一意識別子 | 必須、不変                        |
| name         | UnitName | 単位名     | 必須、一意                        |
| symbol       | string   | 記号       | 必須、一意（例: "個", "g", "ml"） |
| type         | UnitType | 種別       | 必須（COUNT, WEIGHT, VOLUME）     |
| displayOrder | number   | 表示順     | 必須、0以上                       |

#### ビジネスルール

- 同じタイプの単位間のみ変換可能
- 単位タイプは変更不可

### 買い物セッション（ShoppingSession）

買い物モードでの活動を記録するエンティティ。

#### 属性

| 属性         | 型                | 説明               | 制約                                      |
| ------------ | ----------------- | ------------------ | ----------------------------------------- |
| id           | ShoppingSessionId | 一意識別子         | 必須、不変                                |
| userId       | UserId            | ユーザーID         | 必須、セッションの所有者                  |
| startedAt    | Date              | 開始日時           | 必須、不変                                |
| completedAt  | Date              | 完了日時           | 任意、完了時に設定                        |
| status       | SessionStatus     | セッション状態     | 必須（ACTIVE, COMPLETED, ABANDONED）      |
| checkedItems | CheckedItem[]     | 確認済み食材リスト | 必須、確認履歴                            |
| deviceType   | DeviceType        | デバイス種別       | 任意、セッション開始時のデバイス          |
| location     | ShoppingLocation  | 買い物場所         | 任意、セッション開始時の場所（GPSベース） |

#### ビジネスルール

- 同一ユーザーで同時にアクティブなセッションは1つのみ
- 完了済みセッションは再開不可
- セッション中は食材データの更新不可（読み取り専用）
- deviceTypeとlocationはセッション開始時に設定され、変更不可

#### 主要な振る舞い

- `start()` - セッションを開始する
- `checkItem(ingredientId)` - 食材を確認する
- `complete()` - セッションを完了する
- `abandon(reason)` - セッションを中断する
- `getDuration()` - セッション継続時間を取得する

## 値オブジェクト

### 主要な値オブジェクト一覧

| 値オブジェクト    | 責務                 | 主な制約                                       |
| ----------------- | -------------------- | ---------------------------------------------- |
| IngredientId      | 食材の一意識別       | 必須、不変                                     |
| IngredientName    | 食材名の表現         | 1-50文字、空白除去                             |
| UserId            | ユーザーの識別       | 必須、不変（ユーザー認証コンテキストから提供） |
| ExpiryInfo        | 期限情報の表現       | 賞味期限・消費期限の一体管理                   |
| IngredientStock   | 在庫情報の表現       | 数量、単位、保存場所                           |
| StorageLocation   | 保存場所の表現       | type（必須）、detail（任意、最大50文字）       |
| Price             | 価格の表現           | 0以上、小数点以下2桁まで                       |
| CategoryId        | カテゴリーの識別     | 必須、不変                                     |
| CategoryName      | カテゴリー名の表現   | 1-20文字、一意                                 |
| UnitId            | 単位の識別           | 必須、不変                                     |
| UnitName          | 単位名の表現         | 必須、一意                                     |
| ShoppingSessionId | セッションの一意識別 | 必須、不変                                     |
| SessionStatus     | セッション状態の表現 | ACTIVE, COMPLETED, ABANDONED                   |
| CheckedItem       | 確認済み食材の情報   | 食材ID、確認時刻、在庫状態                     |
| DeviceType        | デバイス種別の表現   | MOBILE, TABLET, DESKTOP                        |
| ShoppingLocation  | 買い物場所の表現     | 名前、GPS座標（緯度経度）                      |

### IngredientStock（在庫情報）

食材の在庫情報を表現する値オブジェクト。

#### 属性

- `quantity` - 在庫数量（必須、0以上）
- `unitId` - 単位ID（必須、存在する単位）
- `threshold` - 在庫閾値（任意、0以上）
- `storageLocation` - 保存場所（StorageLocation値オブジェクト）

#### ビジネスルール

- 在庫数量は0以上でなければならない
- 単位IDは存在する単位でなければならない
- 保存場所は任意だが、最大50文字まで

#### 主要な振る舞い

- `isOutOfStock()` - 在庫切れ判定（数量が0）
- `isLowStock()` - 在庫不足判定（数量が閾値以下）
- `add(amount)` - 在庫を追加
- `subtract(amount)` - 在庫を減らす（数量が0未満にならないように）

### ExpiryInfo（期限情報）

賞味期限と消費期限を一体として管理する値オブジェクト。

#### 属性

- `bestBeforeDate` - 賞味期限（任意）
- `useByDate` - 消費期限（任意）

#### ビジネスルール

- 消費期限は賞味期限以前でなければならない
- どちらか一方のみの設定も可能
- 両方nullの場合も許可（期限なし商品）

#### 主要な振る舞い

- `isExpired()` - 期限切れ判定（消費期限優先、なければ賞味期限で判定）
- `isExpiringSoon(days)` - 期限接近判定
- `getDaysUntilExpiry()` - 期限までの日数取得
- `getDisplayDate()` - 表示用の期限日付取得（消費期限優先）

### StorageLocation（保存場所）

食材の保存場所を表現する値オブジェクト。

#### 属性

- `type` - 保存場所タイプ（必須、REFRIGERATED/FROZEN/ROOM_TEMPERATURE）
- `detail` - 保存場所の詳細（任意、最大50文字、例：「ドアポケット」「野菜室」）

#### ビジネスルール

- typeは定義された3つの値のいずれかでなければならない
- detailは任意だが、指定する場合は最大50文字まで

#### 主要な振る舞い

- `isRefrigerated()` - 冷蔵保存かどうか
- `isFrozen()` - 冷凍保存かどうか
- `isRoomTemperature()` - 常温保存かどうか

### CheckedItem（確認済み食材）

買い物セッション中に確認した食材の情報を表現する値オブジェクト。

#### 属性

- `ingredientId` - 食材ID（必須、IngredientId値オブジェクト）
- `ingredientName` - 食材名（必須、確認時点の名前）
- `checkedAt` - 確認時刻（必須）
- `stockStatus` - 在庫状態（必須、IN_STOCK/OUT_OF_STOCK/LOW_STOCK）
- `expiryStatus` - 期限状態（任意、FRESH/EXPIRING_SOON/EXPIRED）

#### ビジネスルール

- 確認時刻はセッション開始時刻以降でなければならない
- 同一食材の重複確認は最新のもののみ保持

### SessionStatus（セッション状態）

買い物セッションの状態を表現する値オブジェクト。

#### 値

- `ACTIVE` - アクティブ（買い物中）
- `COMPLETED` - 完了
- `ABANDONED` - 中断

#### ビジネスルール

- 状態遷移は ACTIVE → COMPLETED または ACTIVE → ABANDONED の一方向のみ
- COMPLETED/ABANDONED状態からACTIVEへの戻りは不可

### DeviceType（デバイス種別）

買い物セッションで使用されるデバイスの種別を表現する値オブジェクト。

#### 値

- `MOBILE` - スマートフォン
- `TABLET` - タブレット
- `DESKTOP` - デスクトップPC

#### ビジネスルール

- 値は定義された3つのいずれかでなければならない
- セッション開始後の変更は不可

### ShoppingLocation（買い物場所）

買い物を行っている場所の情報を表現する値オブジェクト。

#### 属性

- `name` - 場所の名前（任意、最大100文字、例：「〇〇スーパー△△店」）
- `latitude` - 緯度（必須、-90から90の範囲）
- `longitude` - 経度（必須、-180から180の範囲）

#### ビジネスルール

- GPS座標（緯度・経度）は必須
- 場所の名前は任意だが、指定する場合は最大100文字まで
- セッション開始後の変更は不可

#### 主要な振る舞い

- `getCoordinates()` - GPS座標を取得（{latitude, longitude}）
- `getDistanceTo(location)` - 他の場所との距離を計算（km）

## ドメインサービス

### 期限チェックサービス（ExpiryCheckService）

食材の期限に関する処理を行う。

#### 主要な責務

- 期限切れ食材の抽出
- 期限切れ間近食材の抽出（デフォルト7日）
- 期限によるソート

###　食材重複判定サービス　(DuplicateCheckService)

食材の重複チェックを行う。

#### 主要な責務

- ユーザー内での食材名、期限、保存場所の重複チェック
- 重複食材の特定

### 在庫計算サービス（StockCalculationService）

在庫の計算や集計を行う。

#### 主要な責務

- 複数食材の在庫充足チェック
- 在庫不足食材の特定
- カテゴリー別の在庫集計
- 単位変換を伴う在庫計算

### 買い物アシストサービス（ShoppingAssistService）

買い物モードでの在庫確認を支援する。

#### 主要な責務

- アクティブセッションの管理
- カテゴリー別の在庫状態集計
- 最近確認した食材の追跡
- 買い物統計の生成

## ファクトリ

### IngredientFactory

食材エンティティの生成を担当。

#### 責務

- 食材の新規作成
- ビジネスルールの検証
- IDの生成

### ShoppingSessionFactory

買い物セッションエンティティの生成を担当。

#### 責務

- 新規セッションの作成
- アクティブセッションの重複チェック
- IDの生成

## 仕様パターン

### 主要な仕様

| 仕様                       | 目的                       | 条件                   |
| -------------------------- | -------------------------- | ---------------------- |
| ExpiringSoonSpecification  | 期限切れ間近の食材を特定   | 指定日数以内に期限切れ |
| LowStockSpecification      | 在庫不足の食材を特定       | 閾値以下の在庫量       |
| OutOfStockSpecification    | 在庫切れの食材を特定       | 在庫量が0              |
| CategorySpecification      | 特定カテゴリーの食材を特定 | カテゴリーIDが一致     |
| UserSpecification          | 特定ユーザーの食材を特定   | ユーザーIDが一致       |
| ActiveSessionSpecification | アクティブセッションを特定 | ステータスがACTIVE     |
| RecentSessionSpecification | 最近のセッションを特定     | 指定期間内のセッション |

## 更新履歴

| 日付       | 内容                                                                                              | 作成者     |
| ---------- | ------------------------------------------------------------------------------------------------- | ---------- |
| 2025-06-24 | 初版                                                                                              | @komei0727 |
| 2025-06-24 | IngredientStockエンティティ追加、UserId追加、ドメインサービス名統一                               | @komei0727 |
| 2025-06-24 | ユーザー認証コンテキストとの統合に伴う修正（UserIdの出所明記、アクセス制御追加）                  | Claude     |
| 2025-06-24 | Ingredientエンティティに価格（Price）と購入日（purchaseDate）フィールドを追加                     | Claude     |
| 2025-06-24 | StorageLocation値オブジェクトを追加（API仕様に合わせて修正）                                      | Claude     |
| 2025-06-28 | 買い物サポート機能統合（ShoppingSession、関連値オブジェクト、ドメインサービス追加）               | Claude     |
| 2025-07-01 | ShoppingSessionにdeviceTypeとlocation追加、関連値オブジェクト（DeviceType、ShoppingLocation）追加 | Claude     |
