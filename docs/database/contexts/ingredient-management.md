# 食材管理コンテキスト - データベース設計

## 概要

食材管理コンテキストに関連するテーブル設計を定義します。DDD設計に基づき、集約ルートを中心とした論理削除対応のスキーマを採用します。

## テーブル設計

### ingredients（食材）テーブル

食材エンティティを管理するメインテーブル。集約ルートとして機能します。

| カラム名         | 型        | 制約                   | 説明                                             |
| ---------------- | --------- | ---------------------- | ------------------------------------------------ |
| id               | TEXT      | PRIMARY KEY            | CUID形式の一意識別子                             |
| name             | TEXT      | NOT NULL               | 食材名                                           |
| category_id      | TEXT      | NOT NULL, FOREIGN KEY  | カテゴリーID                                     |
| unit_id          | TEXT      | NOT NULL, FOREIGN KEY  | 単位ID                                           |
| storage_location | TEXT      | NOT NULL               | 保存場所（REFRIGERATED/FROZEN/ROOM_TEMPERATURE） |
| storage_detail   | TEXT      | NULL                   | 保存場所の詳細（例：ドアポケット）               |
| best_before_date | TIMESTAMP | NULL                   | 賞味期限                                         |
| expiry_date      | TIMESTAMP | NULL                   | 消費期限                                         |
| notes            | TEXT      | NULL                   | メモ                                             |
| created_at       | TIMESTAMP | NOT NULL DEFAULT NOW() | 作成日時                                         |
| updated_at       | TIMESTAMP | NOT NULL               | 更新日時                                         |
| deleted_at       | TIMESTAMP | NULL                   | 論理削除日時                                     |
| created_by       | TEXT      | NOT NULL               | 作成ユーザーID                                   |
| updated_by       | TEXT      | NOT NULL               | 更新ユーザーID                                   |

**インデックス**:

- `idx_ingredients_category_id` - カテゴリー別検索の高速化
- `idx_ingredients_storage_location` - 保存場所別検索の高速化
- `idx_ingredients_best_before_date` - 賞味期限ソートの高速化
- `idx_ingredients_expiry_date` - 消費期限ソートの高速化
- `idx_ingredients_deleted_at` - 論理削除フィルタリング
- `idx_ingredients_name_deleted` - 食材名検索（削除済み除外）

### ingredient_stocks（食材在庫）テーブル

食材の在庫情報を管理するテーブル。数量の変更履歴を保持します。

| カラム名       | 型        | 制約                   | 説明                 |
| -------------- | --------- | ---------------------- | -------------------- |
| id             | TEXT      | PRIMARY KEY            | CUID形式の一意識別子 |
| ingredient_id  | TEXT      | NOT NULL, FOREIGN KEY  | 食材ID               |
| quantity       | DECIMAL   | NOT NULL               | 現在の在庫数量       |
| purchase_date  | TIMESTAMP | NOT NULL               | 購入日               |
| purchase_price | INTEGER   | NULL                   | 購入価格（円単位）   |
| created_at     | TIMESTAMP | NOT NULL DEFAULT NOW() | 作成日時             |
| updated_at     | TIMESTAMP | NOT NULL               | 更新日時             |

**インデックス**:

- `idx_ingredient_stocks_ingredient_id` - 食材IDによる検索
- `idx_ingredient_stocks_purchase_date` - 購入日によるソート

### ingredient_stock_histories（在庫履歴）テーブル

在庫の変更履歴を記録するテーブル。消費・補充の履歴を追跡可能にします。

| カラム名        | 型        | 制約                   | 説明                                   |
| --------------- | --------- | ---------------------- | -------------------------------------- |
| id              | TEXT      | PRIMARY KEY            | CUID形式の一意識別子                   |
| ingredient_id   | TEXT      | NOT NULL, FOREIGN KEY  | 食材ID                                 |
| operation_type  | TEXT      | NOT NULL               | 操作種別（CONSUME/REPLENISH/ADJUST）   |
| quantity_change | DECIMAL   | NOT NULL               | 数量変更（消費時は負数、補充時は正数） |
| quantity_before | DECIMAL   | NOT NULL               | 変更前の数量                           |
| quantity_after  | DECIMAL   | NOT NULL               | 変更後の数量                           |
| reason          | TEXT      | NULL                   | 変更理由（例：料理名、購入理由）       |
| operated_at     | TIMESTAMP | NOT NULL DEFAULT NOW() | 操作日時                               |
| operated_by     | TEXT      | NOT NULL               | 操作ユーザーID                         |

**インデックス**:

- `idx_stock_histories_ingredient_id` - 食材別履歴検索
- `idx_stock_histories_operated_at` - 日時順ソート
- `idx_stock_histories_type_date` - 操作種別と日時の複合インデックス

### categories（カテゴリー）テーブル

食材のカテゴリーを管理するマスタテーブル。

| カラム名      | 型        | 制約                   | 説明                 |
| ------------- | --------- | ---------------------- | -------------------- |
| id            | TEXT      | PRIMARY KEY            | CUID形式の一意識別子 |
| name          | TEXT      | NOT NULL, UNIQUE       | カテゴリー名         |
| description   | TEXT      | NULL                   | カテゴリーの説明     |
| display_order | INTEGER   | NOT NULL DEFAULT 0     | 表示順               |
| is_active     | BOOLEAN   | NOT NULL DEFAULT TRUE  | 有効フラグ           |
| created_at    | TIMESTAMP | NOT NULL DEFAULT NOW() | 作成日時             |
| updated_at    | TIMESTAMP | NOT NULL               | 更新日時             |

**インデックス**:

- `idx_categories_display_order` - 表示順ソート
- `idx_categories_is_active` - 有効なカテゴリーのフィルタリング

### units（単位）テーブル

食材の単位を管理するマスタテーブル。

| カラム名      | 型        | 制約                   | 説明                              |
| ------------- | --------- | ---------------------- | --------------------------------- |
| id            | TEXT      | PRIMARY KEY            | CUID形式の一意識別子              |
| name          | TEXT      | NOT NULL               | 単位名（例：グラム）              |
| symbol        | TEXT      | NOT NULL, UNIQUE       | 単位記号（例：g）                 |
| type          | TEXT      | NOT NULL               | 単位タイプ（COUNT/WEIGHT/VOLUME） |
| description   | TEXT      | NULL                   | 単位の説明                        |
| display_order | INTEGER   | NOT NULL DEFAULT 0     | 表示順                            |
| is_active     | BOOLEAN   | NOT NULL DEFAULT TRUE  | 有効フラグ                        |
| created_at    | TIMESTAMP | NOT NULL DEFAULT NOW() | 作成日時                          |
| updated_at    | TIMESTAMP | NOT NULL               | 更新日時                          |

**インデックス**:

- `idx_units_type` - タイプ別検索
- `idx_units_display_order` - 表示順ソート
- `idx_units_is_active` - 有効な単位のフィルタリング

## ドメインイベント用テーブル

### domain_events（ドメインイベント）テーブル

ドメインイベントを永続化するイベントストア。

| カラム名       | 型        | 制約                   | 説明                           |
| -------------- | --------- | ---------------------- | ------------------------------ |
| id             | TEXT      | PRIMARY KEY            | CUID形式の一意識別子           |
| aggregate_id   | TEXT      | NOT NULL               | 集約ID                         |
| aggregate_type | TEXT      | NOT NULL               | 集約タイプ（例：Ingredient）   |
| event_type     | TEXT      | NOT NULL               | イベントタイプ                 |
| event_data     | JSONB     | NOT NULL               | イベントデータ                 |
| event_version  | INTEGER   | NOT NULL               | イベントバージョン             |
| occurred_at    | TIMESTAMP | NOT NULL               | イベント発生日時               |
| user_id        | TEXT      | NOT NULL               | イベント発生ユーザーID         |
| correlation_id | TEXT      | NULL                   | 相関ID（関連イベントの追跡用） |
| created_at     | TIMESTAMP | NOT NULL DEFAULT NOW() | 記録日時                       |

**インデックス**:

- `idx_domain_events_aggregate` - 集約別イベント検索
- `idx_domain_events_type_occurred` - イベントタイプと発生日時
- `idx_domain_events_correlation` - 相関IDによる関連イベント検索
- `idx_domain_events_occurred_at` - 発生日時順ソート

## ビュー定義

### active_ingredients_view

論理削除されていない有効な食材のビュー。

```sql
CREATE VIEW active_ingredients_view AS
SELECT
  i.*,
  c.name as category_name,
  u.name as unit_name,
  u.symbol as unit_symbol,
  s.quantity as current_quantity,
  s.purchase_date,
  s.purchase_price,
  CASE
    WHEN i.expiry_date IS NOT NULL AND i.expiry_date < CURRENT_DATE THEN true
    WHEN i.best_before_date IS NOT NULL AND i.best_before_date < CURRENT_DATE THEN true
    ELSE false
  END as is_expired,
  CASE
    WHEN i.expiry_date IS NOT NULL THEN DATE_PART('day', i.expiry_date - CURRENT_DATE)
    WHEN i.best_before_date IS NOT NULL THEN DATE_PART('day', i.best_before_date - CURRENT_DATE)
    ELSE NULL
  END as days_until_expiry
FROM ingredients i
JOIN categories c ON i.category_id = c.id
JOIN units u ON i.unit_id = u.id
LEFT JOIN ingredient_stocks s ON i.id = s.ingredient_id
WHERE i.deleted_at IS NULL;
```

### low_stock_ingredients_view

在庫が少ない食材を抽出するビュー（将来的に閾値設定機能と連携）。

```sql
CREATE VIEW low_stock_ingredients_view AS
SELECT
  i.id,
  i.name,
  c.name as category_name,
  s.quantity as current_quantity,
  u.symbol as unit_symbol
FROM ingredients i
JOIN categories c ON i.category_id = c.id
JOIN units u ON i.unit_id = u.id
JOIN ingredient_stocks s ON i.id = s.ingredient_id
WHERE i.deleted_at IS NULL
  AND s.quantity <= 1; -- 将来的に動的な閾値に変更
```

## マイグレーション戦略

### 初期マイグレーション

1. 既存の`ingredients`テーブルからデータを移行
2. `ingredient_stocks`テーブルを作成し、現在の数量を初期値として設定
3. 論理削除カラムを追加（デフォルトNULL）
4. ドメインイベントテーブルを新規作成

### データ移行スクリプト例

```sql
-- 1. 新しいカラムを追加
ALTER TABLE ingredients
ADD COLUMN deleted_at TIMESTAMP NULL,
ADD COLUMN created_by TEXT NOT NULL DEFAULT 'system',
ADD COLUMN updated_by TEXT NOT NULL DEFAULT 'system',
ADD COLUMN storage_detail TEXT NULL;

-- 2. ingredient_stocksテーブルにデータを移行
INSERT INTO ingredient_stocks (id, ingredient_id, quantity, purchase_date, purchase_price, created_at, updated_at)
SELECT
  gen_random_uuid(),
  id,
  quantity,
  purchase_date,
  price,
  created_at,
  updated_at
FROM ingredients;

-- 3. ingredientsテーブルから数量関連カラムを削除（別トランザクションで実行）
-- ALTER TABLE ingredients DROP COLUMN quantity, DROP COLUMN purchase_date, DROP COLUMN price;
```

## パフォーマンス考慮事項

### インデックス戦略

- 頻繁に検索される条件（カテゴリー、保存場所、期限）にインデックスを設定
- 論理削除を考慮した複合インデックスの活用
- ビューの基盤となるテーブルに適切なインデックスを配置

### パーティショニング検討

将来的なデータ量増加に備えて：

- `ingredient_stock_histories`テーブルは月別パーティションを検討
- `domain_events`テーブルは年月別パーティションを検討

### クエリ最適化

- 論理削除フィルタは全クエリに適用されるため、`deleted_at IS NULL`条件を含む複合インデックスを活用
- 集計クエリは定期的にマテリアライズドビューとして更新することを検討

## セキュリティ考慮事項

### Row Level Security (RLS)

Supabase環境では、以下のRLSポリシーを適用：

```sql
-- 食材は作成者のみ参照・更新可能
CREATE POLICY "Users can view own ingredients" ON ingredients
  FOR SELECT USING (created_by = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can update own ingredients" ON ingredients
  FOR UPDATE USING (created_by = auth.uid() AND deleted_at IS NULL);

-- 在庫履歴は参照のみ可能
CREATE POLICY "Users can view own stock history" ON ingredient_stock_histories
  FOR SELECT USING (
    ingredient_id IN (
      SELECT id FROM ingredients WHERE created_by = auth.uid()
    )
  );
```

## 更新履歴

| 日付       | 内容                                             | 作成者  |
| ---------- | ------------------------------------------------ | ------- |
| 2025-01-22 | 初版作成 - DDD設計に基づくテーブル構成           | @system |
| 2025-01-22 | 論理削除、イベントストア、在庫履歴テーブルを追加 | @system |
