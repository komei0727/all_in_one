# 統合テストケース仕様書

## 概要

本書では、エンドポイント中心の統合テスト戦略に基づく詳細なテストケースを定義します。
各エンドポイントを「ルートハンドラー → APIハンドラー → アプリケーションサービス → Repository → データベース」の一貫したフローで検証します。

## テスト構造

```
tests/integration/
├── ingredients/           # 食材管理コンテキスト
├── shopping-sessions/     # 買い物セッションコンテキスト
└── master-data/          # マスタデータコンテキスト
```

## テストケース一覧

---

# 1. 食材管理コンテキスト

## 1.1 create-ingredient.integration.test.ts

**対象**: `POST /api/v1/ingredients`

### 正常系

#### 基本的な食材作成

- **TC001**: 有効なリクエストで食材を作成できる

  - 必須フィールド + 基本的なオプションフィールド
  - レスポンス形式の検証（201 Created）
  - データベース保存の確認
  - 作成時イベント（IngredientCreated）の発行確認

- **TC002**: 最小限の必須フィールドで食材を作成できる

  - name, categoryId, quantity, storageLocation, purchaseDate のみ
  - オプションフィールド（memo, price, expiryInfo）はnull

- **TC003**: 全オプションフィールドを含めて食材を作成できる
  - memo, price, bestBeforeDate, useByDate, storageLocation.detail を含む
  - 全フィールドがレスポンスに正しく反映される

#### データパターンのテスト

- **TC004**: 価格に小数点を含む場合の精度保持

  - 価格: 123.45 → データベースとレスポンスで同じ値
  - Decimal型の精度確認

- **TC005**: 期限情報の組み合わせパターン

  - パターン1: 賞味期限のみ（bestBeforeDate設定、useByDate null）
  - パターン2: 消費期限のみ（useByDate設定、bestBeforeDate null）
  - パターン3: 両方設定（useByDate ≤ bestBeforeDate）

- **TC006**: 各保存場所タイプでの作成
  - REFRIGERATED, FROZEN, ROOM_TEMPERATURE
  - 保存場所詳細ありとなしの両パターン

#### カテゴリー・単位のバリエーション

- **TC007**: 異なるカテゴリーでの食材作成

  - 野菜、肉・魚、調味料カテゴリー
  - カテゴリー情報がレスポンスに正しく含まれる

- **TC008**: 異なる単位での食材作成
  - 個数（個）、重量（g）、容量（ml）
  - 単位タイプごとの作成確認

### 異常系

#### バリデーションエラー

- **TC101**: 必須フィールドが欠けている場合（400エラー）

  - nameなし → 「name is required」
  - categoryIdなし → 「categoryId is required」
  - quantity.amountなし → 「quantity.amount is required」
  - storageLocation.typeなし → 「storageLocation.type is required」

- **TC102**: 文字数制限違反（400エラー）

  - name: 51文字 → 「50文字以内で入力してください」
  - memo: 201文字 → 「200文字以内で入力してください」
  - storageLocation.detail: 51文字 → 「50文字以内で入力してください」

- **TC103**: 数値範囲エラー（400エラー）

  - quantity.amount: 0 → 「数量は0より大きい値を入力してください」
  - quantity.amount: 負の値 → 「数量は0より大きい値を入力してください」
  - price: 負の値 → 「価格は0以上の値を入力してください」

- **TC104**: 期限の論理的矛盾（400エラー）

  - useByDate > bestBeforeDate → 「消費期限は賞味期限以前でなければなりません」

- **TC105**: 不正な列挙値（400エラー）
  - storageLocation.type: "INVALID" → 「無効な保存場所タイプです」

#### リソース不存在エラー

- **TC201**: 存在しないカテゴリーID（404エラー）

  - 正しいプレフィックス形式（cat\_）だが存在しない
  - エラーコード: NOT_FOUND
  - メッセージ: "Category not found"

- **TC202**: 存在しない単位ID（404エラー）
  - 正しいプレフィックス形式（unt\_）だが存在しない
  - エラーコード: NOT_FOUND
  - メッセージ: "Unit not found"

#### ビジネスルール違反

- **TC301**: 重複食材エラー（409エラー）
  - 同ユーザー・同名・同期限・同保存場所の組み合わせ
  - エラーコード: DUPLICATE_INGREDIENT
  - 既存食材の情報を含むエラーメッセージ

### 認証・認可

#### 認証エラー

- **TC401**: 認証されていない場合（401エラー）

  - Bearerトークンなし
  - エラーコード: UNAUTHORIZED
  - メッセージ: "認証が必要です"

- **TC402**: 無効なトークン（401エラー）

  - 不正なBearerトークン
  - 期限切れトークン

- **TC403**: domainUserIdがない場合（401エラー）
  - NextAuthのユーザー情報にdomainUserIdが含まれない
  - エラーコード: UNAUTHORIZED

### パフォーマンス・並行性

#### 同時処理

- **TC501**: 同時に複数の食材を作成できる

  - 5つの異なる食材を並行作成
  - 全て成功し、異なるIDが生成される
  - データベースに全て保存される

- **TC502**: 同名食材の並行作成（重複チェック）
  - 同名・同期限の食材を並行作成
  - 1つは成功、他は重複エラー
  - データベースには1つのみ保存

#### 不正リクエスト処理

- **TC601**: JSONパースエラー（500エラー）

  - 不正なJSON文字列
  - エラーコード: INTERNAL_ERROR

- **TC602**: Content-Type不正でも処理できる
  - Content-Type: text/plain
  - 有効なJSONなら正常処理される（Next.jsの寛容性）

---

## 1.2 get-ingredient-detail.integration.test.ts

**対象**: `GET /api/v1/ingredients/{id}`

### 正常系

#### 基本的な詳細取得

- **TC001**: 存在する食材の詳細取得

  - 全フィールドが正しく返される
  - レスポンス形式の検証（200 OK）
  - 関連データ（カテゴリー、単位）の結合確認

- **TC002**: 期限なし食材の取得

  - expiryInfoがnull
  - その他のフィールドは正常

- **TC003**: 全フィールドが設定された食材の取得
  - memo, price, expiryInfo, storageLocation.detail すべて設定
  - 小数点価格の精度確認

#### 計算フィールドの検証

- **TC004**: 期限ステータスの計算確認

  - 新鮮（4日以上）→ expiryStatus: "FRESH"
  - 期限間近（3日以内）→ expiryStatus: "EXPIRING_SOON"
  - 期限切れ → expiryStatus: "EXPIRED"

- **TC005**: 在庫ステータスの計算確認
  - hasStock: true/false
  - 数量 > 0 → hasStock: true
  - 数量 = 0 → hasStock: false

### 異常系

#### リソース不存在

- **TC101**: 存在しない食材ID（404エラー）

  - 正しいCUID形式だが存在しない
  - エラーコード: NOT_FOUND

- **TC102**: 他ユーザーの食材（404エラー）

  - 存在するが他ユーザーの食材
  - エラーコード: NOT_FOUND（403ではなく404でプライバシー保護）

- **TC103**: 論理削除された食材（404エラー）
  - deletedAtが設定されている食材
  - エラーコード: NOT_FOUND

#### 不正なID形式

- **TC201**: 無効なID形式（400エラー）
  - CUID形式ではない文字列
  - エラーコード: VALIDATION_ERROR

### 認証・認可

#### 認証エラー

- **TC301**: 認証されていない場合（401エラー）
- **TC302**: 無効なトークン（401エラー）

---

## 1.3 get-ingredients.integration.test.ts

**対象**: `GET /api/v1/ingredients`

### 正常系

#### 基本的な一覧取得

- **TC001**: デフォルトパラメータでの一覧取得

  - page=1, limit=20
  - 更新日時の降順でソート
  - ページネーション情報の確認

- **TC002**: ページネーション
  - 異なるページサイズ（limit: 5, 10, 50）
  - 次ページ・前ページの確認
  - 総件数とページ数の計算確認

#### フィルタリング

- **TC003**: 食材名での検索

  - search="トマト" → 部分一致検索
  - 大文字小文字を区別しない
  - 空の検索結果も確認

- **TC004**: カテゴリーフィルター

  - categoryId指定での絞り込み
  - 存在しないカテゴリーIDは空結果

- **TC005**: 保存場所フィルター

  - storageLocation="REFRIGERATED"
  - 複数の保存場所タイプ

- **TC006**: 在庫状態フィルター

  - hasStock=true → 在庫ありのみ
  - hasStock=false → 在庫切れのみ

- **TC007**: 期限フィルター
  - expiringWithinDays=3 → 3日以内に期限切れ
  - includeExpired=true → 期限切れも含む

#### 複合フィルター

- **TC008**: 複数条件の組み合わせ
  - カテゴリー + 在庫状態
  - 検索 + 期限状態
  - 全フィルターの組み合わせ

#### ソート

- **TC009**: 各項目でのソート
  - name（昇順・降順）
  - updatedAt（昇順・降順）
  - expiryDate（昇順・降順）
  - quantity（昇順・降順）

### 異常系

#### パラメータエラー

- **TC101**: 不正なページネーション（400エラー）

  - page=0 → 「ページは1以上である必要があります」
  - limit=101 → 「1ページあたりの件数は100以下である必要があります」

- **TC102**: 不正なソート項目（400エラー）
  - sortBy="invalid" → 「無効なソート項目です」

#### 境界値テスト

- **TC201**: 空の結果セット

  - 該当する食材がない場合
  - data: [], total: 0

- **TC202**: 大量データのページネーション
  - 100件以上のデータでの動作確認

### データ分離・セキュリティ

#### ユーザー分離

- **TC301**: ユーザーの食材のみ取得

  - 他ユーザーの食材は結果に含まれない
  - 複数ユーザーのデータが混在する状況でのテスト

- **TC302**: 論理削除された食材は含まれない
  - deletedAtが設定された食材は除外

---

## 1.4 update-ingredient.integration.test.ts

**対象**: `PUT /api/v1/ingredients/{id}`

### 正常系

#### 基本的な更新

- **TC001**: 全フィールドの更新

  - 名前、カテゴリー、数量、単位、保存場所、期限、価格、メモ
  - レスポンス形式の検証（200 OK）
  - データベース更新の確認
  - 更新イベント（IngredientUpdated）の発行確認

- **TC002**: 部分的な更新

  - 名前のみの変更
  - 価格のみの変更
  - 期限情報のみの変更

- **TC003**: カテゴリー・単位の変更
  - 野菜 → 肉・魚へのカテゴリー変更
  - 個 → gへの単位変更
  - 関連する制約の確認

#### 期限情報の更新パターン

- **TC004**: 期限情報の追加

  - 期限なし → 賞味期限追加
  - 賞味期限のみ → 消費期限も追加

- **TC005**: 期限情報の削除

  - 両方設定 → 片方削除
  - 期限あり → 期限なし（null設定）

- **TC006**: 期限情報の変更
  - 日付の変更
  - 消費期限 ≤ 賞味期限の制約確認

#### 在庫情報の更新

- **TC007**: 数量・単位の変更

  - 数量の増減
  - 単位の変更（個 → g）
  - 閾値の設定・変更

- **TC008**: 保存場所の変更
  - タイプの変更（冷蔵 → 冷凍）
  - 詳細の追加・変更・削除

### 異常系

#### リソース不存在

- **TC101**: 存在しない食材ID（404エラー）
- **TC102**: 他ユーザーの食材（404エラー）
- **TC103**: 論理削除された食材（404エラー）

#### バリデーションエラー

- **TC201**: 必須フィールドエラー（400エラー）
  - name空文字 → 「食材名は必須です」
- **TC202**: 制約違反（400エラー）
  - useByDate > bestBeforeDate
  - quantity ≤ 0

#### ビジネスルール違反

- **TC301**: 更新後の重複チェック（409エラー）
  - 名前変更により既存の食材と重複

### 並行性・整合性

#### 楽観的ロック

- **TC401**: 同時更新の競合状態
  - 2つのリクエストが同じ食材を同時更新
  - 1つは成功、もう1つは競合エラー（実装時期により仕様確定）

---

## 1.5 delete-ingredient.integration.test.ts

**対象**: `DELETE /api/v1/ingredients/{id}`

### 正常系

#### 基本的な削除

- **TC001**: 食材の論理削除

  - レスポンス（204 No Content）
  - deletedAtフィールドの設定確認
  - 削除イベント（IngredientDeleted）の発行確認

- **TC002**: 削除後の状態確認
  - 一覧取得で表示されない
  - 詳細取得で404エラー
  - 物理的にはデータベースに残存

### 異常系

#### リソース不存在

- **TC101**: 存在しない食材ID（404エラー）
- **TC102**: 他ユーザーの食材（404エラー）
- **TC103**: 既に削除済みの食材（404エラー）

### データ整合性

#### 履歴保持

- **TC201**: 削除後の履歴確認
  - 統計データに削除前の情報が反映される
  - イベント履歴が保持される

---

## 1.6 consume-ingredient.integration.test.ts

**対象**: `POST /api/v1/ingredients/{id}/consume`

### 正常系

#### 基本的な消費

- **TC001**: 部分消費

  - 在庫10 → 3消費 → 残り7
  - レスポンスで消費前後の数量確認
  - StockConsumedイベントの発行確認

- **TC002**: 全量消費（在庫切れ）

  - 在庫5 → 5消費 → 残り0
  - StockDepletedイベントの追加発行
  - isOutOfStock: trueの確認

- **TC003**: 消費理由とメモの記録
  - consumedFor: "カレー"
  - notes: "4人分の夕食"
  - イベントデータに含まれることを確認

### 異常系

#### ビジネスルール違反

- **TC101**: 在庫不足（400エラー）

  - 在庫5 → 10消費要求
  - エラーコード: INSUFFICIENT_STOCK
  - 現在の在庫量を含むエラーメッセージ

- **TC102**: 無効な消費量（400エラー）
  - 消費量0
  - 消費量負の値

#### リソース不存在

- **TC201**: 存在しない食材（404エラー）
- **TC202**: 他ユーザーの食材（404エラー）

### トランザクション

#### データ整合性

- **TC301**: 消費処理の原子性
  - 数量更新とイベント記録が同一トランザクション
  - 失敗時のロールバック確認

---

## 1.7 replenish-ingredient.integration.test.ts

**対象**: `POST /api/v1/ingredients/{id}/replenish`

### 正常系

#### 基本的な補充

- **TC001**: 在庫補充

  - 在庫5 → 10補充 → 合計15
  - レスポンスで補充前後の数量確認
  - StockReplenishedイベントの発行確認

- **TC002**: 補充時の付加情報

  - purchasePrice: 150.50
  - purchaseDate: "2024-01-15"
  - 価格・購入日の更新確認

- **TC003**: 期限情報の更新

  - 補充時に新しい期限を設定
  - 既存期限の上書き

- **TC004**: 保存場所の変更
  - 補充時に保存場所変更
  - 冷蔵 → 冷凍への移動

### 異常系

#### バリデーションエラー

- **TC101**: 無効な補充量（400エラー）
  - 補充量0以下
  - 無効な価格（負の値）

#### リソース不存在

- **TC201**: 存在しない食材（404エラー）

---

## 1.8 get-expiring-soon.integration.test.ts

**対象**: `GET /api/v1/ingredients/expiring-soon`

### 正常系

#### 基本的な期限チェック

- **TC001**: デフォルト期間（3日）での取得

  - 3日以内に期限切れの食材のみ
  - 期限が近い順でソート
  - カテゴリー別サマリー情報

- **TC002**: カスタム期間での取得

  - days=7 → 7日以内
  - days=1 → 1日以内（CRITICAL状態）

- **TC003**: 期限なし食材は対象外
  - expiryInfo=nullの食材は含まれない

#### 期限判定ロジック

- **TC004**: 消費期限優先の判定

  - bestBeforeDate: 5日後, useByDate: 2日後 → 2日後で判定
  - useByDateのみ設定 → useByDateで判定
  - bestBeforeDataのみ設定 → bestBeforeDateで判定

- **TC005**: 期限ステータスの設定
  - 1日以内 → CRITICAL
  - 2-3日以内 → EXPIRING_SOON

### データ分離

#### ユーザー分離

- **TC101**: ユーザーの食材のみ取得
- **TC102**: 論理削除された食材は含まれない

---

# 2. 買い物セッションコンテキスト

## 2.1 start-shopping-session.integration.test.ts

**対象**: `POST /api/v1/shopping-sessions`

### 正常系

#### 基本的なセッション開始

- **TC001**: 最小限のパラメータでセッション開始

  - userId: 認証ユーザーID
  - レスポンス（201 Created）
  - sessionId、status: "ACTIVE"、startedAtの確認

- **TC002**: デバイスタイプを含むセッション開始

  - deviceType: "MOBILE"
  - レスポンスに反映確認（現在は実装未完了のためnull）

- **TC003**: 位置情報を含むセッション開始
  - location: { name: "○○スーパー", latitude: 35.6762, longitude: 139.6503 }
  - 緯度・経度の範囲確認

### 異常系

#### ビジネスルール違反

- **TC101**: 既にアクティブなセッションが存在（409エラー）
  - エラーコード: ACTIVE_SESSION_EXISTS
  - 既存セッション情報を含むエラーメッセージ

#### バリデーションエラー

- **TC201**: 無効なデバイスタイプ（400エラー）

  - deviceType: "INVALID"
  - エラーコード: INVALID_DEVICE_TYPE

- **TC202**: 無効な位置情報（400エラー）
  - latitude: 91 （範囲外）
  - longitude: -181 （範囲外）
  - エラーコード: INVALID_LOCATION

#### 認証エラー

- **TC301**: 未認証リクエスト（401エラー）

### セッション管理

#### 自動中断処理

- **TC401**: 古いアクティブセッションの自動中断
  - 30分以上前のアクティブセッション
  - 新規セッション開始時に自動的にABANDONED状態に変更

---

## 2.2 get-active-session.integration.test.ts

**対象**: `GET /api/v1/shopping-sessions/active`

### 正常系

#### アクティブセッション取得

- **TC001**: アクティブセッションが存在する場合

  - 開始時刻、継続時間、確認件数の計算
  - デバイスタイプ、位置情報の取得

- **TC002**: アクティブセッションがない場合
  - レスポンス: { data: null }

#### セッション状態の計算

- **TC003**: 継続時間の計算

  - startedAtから現在時刻までの秒数
  - リアルタイムでの変化確認

- **TC004**: 確認件数の集計
  - セッション内でcheckIngredientを実行した回数
  - 同一食材の重複確認は1回としてカウント

### データ分離

#### ユーザー分離

- **TC101**: ユーザーのセッションのみ取得
  - 他ユーザーのアクティブセッションは表示されない

---

## 2.3 complete-shopping-session.integration.test.ts

**対象**: `PUT /api/v1/shopping-sessions/{id}/complete`

### 正常系

#### セッション完了

- **TC001**: 基本的なセッション完了

  - status: "ACTIVE" → "COMPLETED"
  - completedAtの設定
  - 総継続時間の計算

- **TC002**: 完了時メモと総支出額の記録
  - notes: "今日の買い物"
  - totalSpent: 2500.50
  - レスポンスに反映確認

### 異常系

#### リソース・状態エラー

- **TC101**: 存在しないセッション（404エラー）

  - エラーコード: SESSION_NOT_FOUND

- **TC102**: 既に完了済みのセッション（409エラー）

  - エラーコード: SESSION_ALREADY_COMPLETED

- **TC103**: 他ユーザーのセッション（403エラー）
  - エラーコード: FORBIDDEN

### データ整合性

#### 完了処理の原子性

- **TC201**: セッション状態変更とイベント発行
  - ShoppingSessionCompletedイベントの発行
  - 継続時間と確認件数の正確な記録

---

## 2.4 check-ingredient.integration.test.ts

**対象**: `POST /api/v1/shopping-sessions/{sessionId}/check/{ingredientId}`

### 正常系

#### 食材確認

- **TC001**: 基本的な食材確認

  - 在庫状態の判定（IN_STOCK/OUT_OF_STOCK/LOW_STOCK）
  - 期限状態の判定（FRESH/EXPIRING_SOON/EXPIRED）
  - 確認時刻の記録

- **TC002**: 在庫状態の判定ロジック

  - 数量 > 閾値 → IN_STOCK
  - 0 < 数量 ≤ 閾値 → LOW_STOCK
  - 数量 = 0 → OUT_OF_STOCK

- **TC003**: 期限状態の判定ロジック
  - 期限まで4日以上 → FRESH
  - 期限まで1-3日 → EXPIRING_SOON
  - 期限切れ → EXPIRED

#### 確認履歴の管理

- **TC004**: 同一食材の重複確認

  - 最新の確認情報で上書き
  - 確認回数のカウント

- **TC005**: ItemCheckedイベントの発行
  - セッションID、食材ID、確認時刻
  - 在庫・期限状態のスナップショット

### 異常系

#### リソース不存在

- **TC101**: 存在しないセッション（404エラー）
- **TC102**: 存在しない食材（404エラー）
- **TC103**: 他ユーザーのセッション・食材（403エラー）

#### セッション状態エラー

- **TC201**: 非アクティブなセッション（400エラー）
  - COMPLETED/ABANDONEDセッションでの確認は不可

### 非同期処理

#### QuickAccessViewの更新

- **TC301**: 確認履歴の非同期更新
  - 最近確認した食材リストへの追加
  - 確認頻度カウンターの更新

---

# 3. マスタデータコンテキスト

## 3.1 get-categories.integration.test.ts

**対象**: `GET /api/v1/ingredients/categories`

### 正常系

#### カテゴリー一覧取得

- **TC001**: 全カテゴリーの取得
  - 表示順（displayOrder）でのソート
  - 必要なフィールド（id, name, description, displayOrder）
  - メタ情報（timestamp, version）

### パフォーマンス

#### キャッシュ動作

- **TC101**: キャッシュの効果確認
  - 初回: データベースアクセス
  - 2回目以降: キャッシュからの取得（10分間）

---

## 3.2 get-units.integration.test.ts

**対象**: `GET /api/v1/ingredients/units`

### 正常系

#### 単位一覧取得

- **TC001**: 全単位の取得
  - タイプ別・表示順でのソート
  - 必要なフィールド（id, name, symbol, type, displayOrder）

#### 単位タイプの確認

- **TC002**: タイプ別の正しい分類
  - COUNT: 個、本、枚など
  - WEIGHT: g、kg、tなど
  - VOLUME: ml、L、ccなど

---

# 共通仕様・横断的関心事

## エラーハンドリング

### HTTPステータスコード体系

- **200**: 正常取得
- **201**: 正常作成
- **204**: 正常削除
- **400**: バリデーションエラー、ビジネスルール違反
- **401**: 認証エラー
- **403**: 認可エラー
- **404**: リソース不存在
- **409**: 重複・競合エラー
- **500**: システムエラー

### エラーレスポンス形式

```typescript
{
  error: {
    code: string,           // VALIDATION_ERROR, NOT_FOUND等
    message: string,        // ユーザー向けメッセージ
    type: string,           // エラー分類
    details?: {             // 詳細情報
      fields?: Array<{      // バリデーションエラー時
        field: string,
        message: string,
        code: string
      }>
    }
  },
  meta: {
    timestamp: string,
    correlationId: string   // エラー追跡用ID
  }
}
```

## 認証・認可

### 認証方式

- **Bearer Token**: `Authorization: Bearer <token>`
- **NextAuth**: セッション管理
- **Domain User**: domainUserIdによるドメイン内識別

### アクセス制御

- **データ分離**: ユーザーは自分のデータのみアクセス可能
- **エラー統一**: 他ユーザーのリソースも404で返却（プライバシー保護）

## テストデータ管理

### Faker.js使用方針

```typescript
// ✅ 推奨: ランダムデータ
const name = faker.food.ingredient()
const price = faker.number.float({ min: 100, max: 1000, fractionDigits: 2 })

// ❌ 非推奨: ハードコード
const name = 'トマト'
const price = 150
```

### テストデータ分離

- 各テストケースで独立したデータ使用
- 一意性制約を考慮した生成
- 確実なクリーンアップ

## パフォーマンス要件

### レスポンス時間

- **一覧取得**: 100ms以内
- **詳細取得**: 50ms以内
- **作成・更新**: 200ms以内

### 並行処理

- **同時リクエスト**: 50件まで正常処理
- **データ競合**: 楽観的ロックによる制御

## 実装フェーズ

### Phase 1 (Week 1-2): コア機能

1. create-ingredient.integration.test.ts
2. get-ingredient-detail.integration.test.ts
3. get-ingredients.integration.test.ts
4. update-ingredient.integration.test.ts
5. delete-ingredient.integration.test.ts

### Phase 2 (Week 3): 在庫管理

1. consume-ingredient.integration.test.ts
2. replenish-ingredient.integration.test.ts
3. get-expiring-soon.integration.test.ts

### Phase 3 (Week 4): 買い物セッション

1. start-shopping-session.integration.test.ts
2. check-ingredient.integration.test.ts
3. complete-shopping-session.integration.test.ts

### Phase 4 (Week 5): 高度な機能

1. get-categories.integration.test.ts
2. get-units.integration.test.ts
3. その他の買い物セッション機能

---

## 更新履歴

| 日付       | 内容     | 作成者 |
| ---------- | -------- | ------ |
| 2025-07-02 | 初版作成 | Claude |
