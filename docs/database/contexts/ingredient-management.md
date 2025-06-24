# 食材管理コンテキスト - データベース設計

## 概要

食材管理コンテキストに関連するテーブル設計を定義します。DDD設計に基づき、集約ルートを中心とした論理削除対応のスキーマを採用します。

## テーブル設計

### ingredients（食材）テーブル

食材エンティティを管理するメインテーブル。集約ルートとして機能します。

| カラム名    | 型        | 制約                                    | 説明                                 |
| ----------- | --------- | --------------------------------------- | ------------------------------------ |
| id          | TEXT      | PRIMARY KEY                             | CUID形式の一意識別子                 |
| name        | TEXT      | NOT NULL                                | 食材名                               |
| category_id | TEXT      | NOT NULL, FOREIGN KEY (CASCADE制約付き) | カテゴリーID                         |
| memo        | TEXT      | NULL                                    | メモ                                 |
| created_at  | TIMESTAMP | NOT NULL DEFAULT NOW()                  | 作成日時                             |
| updated_at  | TIMESTAMP | NOT NULL                                | 更新日時                             |
| deleted_at  | TIMESTAMP | NULL                                    | 論理削除日時                         |
| created_by  | TEXT      | NULL                                    | 作成ユーザーID                       |
| updated_by  | TEXT      | NOT NULL                                | 更新ユーザーID（監査証跡のため必須） |

**ユニーク制約**:

- `[name, category_id, deleted_at]` - 同一カテゴリー内での食材名の重複を防ぐ

**インデックス**:

- `idx_ingredients_category_id` - カテゴリー別検索の高速化
- `idx_ingredients_deleted_at` - 論理削除フィルタリング
- `idx_ingredients_name_deleted` - 食材名検索（削除済み除外）

### ingredient_stocks（食材在庫）テーブル

食材の在庫情報を管理するテーブル。食材ごとに複数の在庫を管理可能です。

| カラム名                | 型            | 制約                                     | 説明                                            |
| ----------------------- | ------------- | ---------------------------------------- | ----------------------------------------------- |
| id                      | TEXT          | PRIMARY KEY                              | CUID形式の一意識別子                            |
| ingredient_id           | TEXT          | NOT NULL, FOREIGN KEY (CASCADE制約付き)  | 食材ID                                          |
| quantity                | FLOAT         | NOT NULL                                 | 現在の在庫数量                                  |
| unit_id                 | TEXT          | NOT NULL, FOREIGN KEY (RESTRICT制約付き) | 単位ID                                          |
| storage_location_type   | ENUM          | NOT NULL                                 | 保管場所タイプ（REFRIGERATED/FROZEN/ROOM_TEMP） |
| storage_location_detail | TEXT          | NULL                                     | 保管場所の詳細（例：ドアポケット）              |
| best_before_date        | TIMESTAMP     | NULL                                     | 賞味期限                                        |
| expiry_date             | TIMESTAMP     | NULL                                     | 消費期限                                        |
| purchase_date           | TIMESTAMP     | NOT NULL                                 | 購入日                                          |
| price                   | DECIMAL(10,2) | NULL                                     | 価格（小数点対応）                              |
| is_active               | BOOLEAN       | NOT NULL DEFAULT TRUE                    | アクティブな在庫かどうか                        |
| created_at              | TIMESTAMP     | NOT NULL DEFAULT NOW()                   | 作成日時                                        |
| updated_at              | TIMESTAMP     | NOT NULL                                 | 更新日時                                        |
| deleted_at              | TIMESTAMP     | NULL                                     | 論理削除日時                                    |
| created_by              | TEXT          | NULL                                     | 作成ユーザーID                                  |
| updated_by              | TEXT          | NOT NULL                                 | 更新ユーザーID（監査証跡のため必須）            |

**制約**:

- `check_expiry_dates` - 消費期限は賞味期限以前でなければならない
  ```sql
  CHECK (expiry_date IS NULL OR best_before_date IS NULL OR expiry_date <= best_before_date)
  ```

**インデックス**:

- `idx_ingredient_stocks_ingredient_id_is_active` - 食材IDとアクティブフラグの複合インデックス
- `idx_ingredient_stocks_purchase_date` - 購入日によるソート
- `idx_ingredient_stocks_best_before_date` - 賞味期限によるソート
- `idx_ingredient_stocks_expiry_date` - 消費期限によるソート
- `idx_ingredient_stocks_deleted_at` - 論理削除フィルタリング
- `idx_ingredient_stocks_expiry_composite` - 期限チェック用の複合インデックス（best_before_date, expiry_date, is_active）

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

| 日付       | 内容                                                       | 作成者  |
| ---------- | ---------------------------------------------------------- | ------- |
| 2025-01-22 | 初版作成 - DDD設計に基づくテーブル構成                     | @system |
| 2025-01-22 | 論理削除、イベントストア、在庫履歴テーブルを追加           | @system |
| 2025-01-22 | 食材と在庫の分離、監査フィールドの追加、外部キー制約の強化 | @system |
| 2025-01-24 | 期限チェック用複合インデックス、期限整合性制約、監査強化   | @system |
