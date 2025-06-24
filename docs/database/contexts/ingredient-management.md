# 食材管理コンテキスト - データベース設計

## 概要

食材管理コンテキストに関連するテーブル設計を定義します。DDD設計に基づき、集約ルートを中心とした論理削除対応のスキーマを採用します。

## テーブル設計

### ingredients（食材）テーブル

食材エンティティを管理するメインテーブル。集約ルートとして機能し、在庫情報も含みます。

| カラム名                | 型            | 制約                                     | 説明                                            |
| ----------------------- | ------------- | ---------------------------------------- | ----------------------------------------------- |
| id                      | TEXT          | PRIMARY KEY                              | CUID形式の一意識別子                            |
| user_id                 | TEXT          | NOT NULL                                 | ユーザーID（所有者）                            |
| name                    | TEXT          | NOT NULL                                 | 食材名                                          |
| category_id             | TEXT          | NOT NULL, FOREIGN KEY (RESTRICT制約付き) | カテゴリーID                                    |
| memo                    | TEXT          | NULL                                     | メモ                                            |
| price                   | DECIMAL(10,2) | NULL                                     | 価格（小数点対応）                              |
| purchase_date           | TIMESTAMP     | NOT NULL                                 | 購入日                                          |
| quantity                | DECIMAL(10,2) | NOT NULL                                 | 在庫数量                                        |
| unit_id                 | TEXT          | NOT NULL, FOREIGN KEY (RESTRICT制約付き) | 単位ID                                          |
| threshold               | DECIMAL(10,2) | NULL                                     | 在庫閾値                                        |
| storage_location_type   | ENUM          | NOT NULL                                 | 保管場所タイプ（REFRIGERATED/FROZEN/ROOM_TEMP） |
| storage_location_detail | TEXT          | NULL                                     | 保管場所の詳細（例：ドアポケット）              |
| best_before_date        | TIMESTAMP     | NULL                                     | 賞味期限                                        |
| use_by_date             | TIMESTAMP     | NULL                                     | 消費期限                                        |
| created_at              | TIMESTAMP     | NOT NULL DEFAULT NOW()                   | 作成日時                                        |
| updated_at              | TIMESTAMP     | NOT NULL                                 | 更新日時                                        |
| deleted_at              | TIMESTAMP     | NULL                                     | 論理削除日時                                    |

**制約**:

- `check_expiry_dates` - 消費期限は賞味期限以前でなければならない
  ```sql
  CHECK (use_by_date IS NULL OR best_before_date IS NULL OR use_by_date <= best_before_date)
  ```
- `check_quantity` - 在庫数量は0以上
  ```sql
  CHECK (quantity >= 0)
  ```

**ユニーク制約**:

- `[user_id, name, best_before_date, use_by_date, storage_location_type, storage_location_detail, deleted_at]` - 同一ユーザー内での食材・期限・保存場所の組み合わせ重複を防ぐ

**インデックス**:

- `idx_ingredients_user_id` - ユーザー別食材検索の高速化
- `idx_ingredients_category_id` - カテゴリー別検索の高速化
- `idx_ingredients_deleted_at` - 論理削除フィルタリング
- `idx_ingredients_user_name_deleted` - ユーザー別食材名検索（削除済み除外）
- `idx_ingredients_expiry_dates` - 期限によるソート（best_before_date, use_by_date）
- `idx_ingredients_storage_location` - 保存場所別検索

### （削除）ingredient_stocks（食材在庫）テーブル

**注**: 集約設計に基づき、在庫情報はingredientsテーブルに統合されました。このテーブルは使用しません。

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
-- 食材は所有者のみ参照・更新可能
CREATE POLICY "Users can view own ingredients" ON ingredients
  FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can update own ingredients" ON ingredients
  FOR UPDATE USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can insert own ingredients" ON ingredients
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own ingredients" ON ingredients
  FOR DELETE USING (user_id = auth.uid());

-- 在庫履歴は参照のみ可能
CREATE POLICY "Users can view own stock history" ON ingredient_stock_histories
  FOR SELECT USING (
    ingredient_id IN (
      SELECT id FROM ingredients WHERE user_id = auth.uid()
    )
  );
```

## 更新履歴

| 日付       | 内容                                                                                            | 作成者     |
| ---------- | ----------------------------------------------------------------------------------------------- | ---------- |
| 2025-06-22 | 初版作成 - DDD設計に基づくテーブル構成                                                          | @komei0727 |
| 2025-06-24 | 集約設計に合わせて修正：ingredient_stocksをingredientsに統合、user_id追加、CASCADE→RESTRICT変更 | Claude     |
