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
- `idx_ingredients_user_category_deleted` - ユーザー・カテゴリー・削除状態の複合インデックス（買い物モード最適化）
- `idx_ingredients_quantity_threshold` - 在庫状態判定用（quantity, threshold）
- `idx_ingredients_updated_at` - 最終更新日時順ソート

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

### shopping_sessions（買い物セッション）テーブル

買い物モードでの活動セッションを管理するテーブル。

| カラム名     | 型        | 制約                   | 説明                                |
| ------------ | --------- | ---------------------- | ----------------------------------- |
| id           | TEXT      | PRIMARY KEY            | CUID形式の一意識別子                |
| user_id      | TEXT      | NOT NULL               | ユーザーID（セッションの所有者）    |
| status       | TEXT      | NOT NULL               | セッション状態（ACTIVE/COMPLETED）  |
| started_at   | TIMESTAMP | NOT NULL DEFAULT NOW() | セッション開始日時                  |
| completed_at | TIMESTAMP | NULL                   | セッション完了日時                  |
| device_type  | TEXT      | NULL                   | デバイスタイプ（mobile/tablet/web） |
| location     | JSONB     | NULL                   | 位置情報（店舗名等）                |
| metadata     | JSONB     | NULL                   | その他のメタデータ                  |
| created_at   | TIMESTAMP | NOT NULL DEFAULT NOW() | 作成日時                            |
| updated_at   | TIMESTAMP | NOT NULL               | 更新日時                            |

**制約**:

- `check_session_status` - ステータスは定義された値のみ
  ```sql
  CHECK (status IN ('ACTIVE', 'COMPLETED'))
  ```
- `check_completion_consistency` - 完了時刻は開始時刻以降
  ```sql
  CHECK (completed_at IS NULL OR completed_at >= started_at)
  ```

**ユニーク制約**:

- `unique_active_session_per_user` - ユーザー毎に1つのアクティブセッション
  ```sql
  UNIQUE (user_id) WHERE status = 'ACTIVE'
  ```

**インデックス**:

- `idx_shopping_sessions_user_status` - ユーザー別・ステータス別検索
- `idx_shopping_sessions_started_at` - 開始日時順ソート
- `idx_shopping_sessions_active` - アクティブセッション検索（WHERE status = 'ACTIVE'）

### shopping_session_items（買い物セッション確認履歴）テーブル

買い物セッション中に確認した食材の履歴を記録するテーブル。

| カラム名        | 型        | 制約                   | 説明                                        |
| --------------- | --------- | ---------------------- | ------------------------------------------- |
| id              | TEXT      | PRIMARY KEY            | CUID形式の一意識別子                        |
| session_id      | TEXT      | NOT NULL, FOREIGN KEY  | 買い物セッションID                          |
| ingredient_id   | TEXT      | NOT NULL, FOREIGN KEY  | 食材ID                                      |
| ingredient_name | TEXT      | NOT NULL               | 確認時点の食材名（スナップショット）        |
| stock_status    | TEXT      | NOT NULL               | 在庫状態（IN_STOCK/OUT_OF_STOCK/LOW_STOCK） |
| expiry_status   | TEXT      | NULL                   | 期限状態（FRESH/EXPIRING_SOON/EXPIRED）     |
| checked_at      | TIMESTAMP | NOT NULL DEFAULT NOW() | 確認日時                                    |
| metadata        | JSONB     | NULL                   | その他の確認時メタデータ                    |

**制約**:

- `check_stock_status` - 在庫状態は定義された値のみ
  ```sql
  CHECK (stock_status IN ('IN_STOCK', 'OUT_OF_STOCK', 'LOW_STOCK'))
  ```
- `check_expiry_status` - 期限状態は定義された値のみ
  ```sql
  CHECK (expiry_status IS NULL OR expiry_status IN ('FRESH', 'EXPIRING_SOON', 'EXPIRED'))
  ```

**ユニーク制約**:

- `unique_session_ingredient_check` - セッション内での食材重複確認防止
  ```sql
  UNIQUE (session_id, ingredient_id)
  ```

**インデックス**:

- `idx_session_items_session_id` - セッション別確認履歴検索
- `idx_session_items_ingredient_id` - 食材別確認履歴検索
- `idx_session_items_checked_at` - 確認日時順ソート
- `idx_session_items_stock_status` - 在庫状態別分析

### quick_access_view（クイックアクセスビュー）

最近確認した食材とよく確認する食材を効率的に取得するためのマテリアライズドビュー。

```sql
CREATE MATERIALIZED VIEW quick_access_view AS
SELECT
  user_id,
  ingredient_id,
  ingredient_name,
  last_checked_at,
  check_count,
  avg_days_between_checks,
  'RECENT' as access_type
FROM (
  -- 最近確認した食材（過去30日以内）
  SELECT
    s.user_id,
    si.ingredient_id,
    si.ingredient_name,
    MAX(si.checked_at) as last_checked_at,
    COUNT(*) as check_count,
    CASE
      WHEN COUNT(*) > 1 THEN
        EXTRACT(DAYS FROM (MAX(si.checked_at) - MIN(si.checked_at))) / (COUNT(*) - 1)
      ELSE NULL
    END as avg_days_between_checks
  FROM shopping_sessions s
  JOIN shopping_session_items si ON s.id = si.session_id
  WHERE si.checked_at >= NOW() - INTERVAL '30 days'
  GROUP BY s.user_id, si.ingredient_id, si.ingredient_name
  ORDER BY last_checked_at DESC
  LIMIT 20
)
UNION ALL
SELECT
  user_id,
  ingredient_id,
  ingredient_name,
  last_checked_at,
  check_count,
  avg_days_between_checks,
  'FREQUENT' as access_type
FROM (
  -- よく確認する食材（確認回数上位）
  SELECT
    s.user_id,
    si.ingredient_id,
    si.ingredient_name,
    MAX(si.checked_at) as last_checked_at,
    COUNT(*) as check_count,
    CASE
      WHEN COUNT(*) > 1 THEN
        EXTRACT(DAYS FROM (MAX(si.checked_at) - MIN(si.checked_at))) / (COUNT(*) - 1)
      ELSE NULL
    END as avg_days_between_checks
  FROM shopping_sessions s
  JOIN shopping_session_items si ON s.id = si.session_id
  WHERE si.checked_at >= NOW() - INTERVAL '90 days'
  GROUP BY s.user_id, si.ingredient_id, si.ingredient_name
  HAVING COUNT(*) >= 3
  ORDER BY check_count DESC, last_checked_at DESC
  LIMIT 20
);

CREATE UNIQUE INDEX idx_quick_access_view_user_ingredient_type
  ON quick_access_view (user_id, ingredient_id, access_type);
```

## ドメインイベント用テーブル

### domain_events（ドメインイベント）テーブル

ドメインイベントを永続化するイベントストア。アウトボックスパターンに対応。

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
| published      | BOOLEAN   | NOT NULL DEFAULT FALSE | 発行済みフラグ                 |
| published_at   | TIMESTAMP | NULL                   | 発行日時                       |
| created_at     | TIMESTAMP | NOT NULL DEFAULT NOW() | 記録日時                       |

**インデックス**:

- `idx_domain_events_aggregate` - 集約別イベント検索
- `idx_domain_events_type_occurred` - イベントタイプと発生日時
- `idx_domain_events_correlation` - 相関IDによる関連イベント検索
- `idx_domain_events_occurred_at` - 発生日時順ソート
- `idx_domain_events_unpublished` - 未発行イベント検索（WHERE published = FALSE）
- `idx_domain_events_user_type` - ユーザー別・イベントタイプ別検索

## パフォーマンス考慮事項

### インデックス戦略

#### 食材テーブル（ingredients）

- **基本検索**: ユーザー別、カテゴリー別、削除状態の複合インデックス
- **買い物モード**: カテゴリー別食材取得の最適化（`idx_ingredients_user_category_deleted`）
- **在庫判定**: 数量と閾値の複合インデックス（在庫状態の高速判定）
- **期限管理**: 期限日の複合インデックス（期限切れ・期限間近の検索）

#### 買い物セッション関連テーブル

- **アクティブセッション検索**: `status = 'ACTIVE'`の条件付きインデックス
- **履歴分析**: セッションID別、食材ID別、確認日時の複合インデックス
- **統計集計**: マテリアライズドビュー（`quick_access_view`）の活用

### パーティショニング戦略

将来的なデータ量増加に備えた分割：

#### 履歴テーブル

- `ingredient_stock_histories`: 月別パーティション（operated_at基準）
- `shopping_session_items`: 四半期別パーティション（checked_at基準）
- `domain_events`: 年月別パーティション（occurred_at基準）

#### パーティション保持期間

- 在庫履歴: 3年間（税務要件を考慮）
- 買い物履歴: 2年間（分析用途）
- ドメインイベント: 1年間（監査ログ）

### クエリ最適化

#### 買い物モード最適化

```sql
-- カテゴリー別食材取得（最適化クエリ例）
SELECT i.id, i.name, i.quantity, i.threshold,
       CASE
         WHEN i.quantity = 0 THEN 'OUT_OF_STOCK'
         WHEN i.threshold IS NOT NULL AND i.quantity <= i.threshold THEN 'LOW_STOCK'
         ELSE 'IN_STOCK'
       END as stock_status
FROM ingredients i
WHERE i.user_id = $1
  AND i.category_id = $2
  AND i.deleted_at IS NULL
ORDER BY
  CASE
    WHEN i.quantity = 0 THEN 1
    WHEN i.threshold IS NOT NULL AND i.quantity <= i.threshold THEN 2
    ELSE 3
  END,
  i.name;
```

#### 統計集計の最適化

- **マテリアライズドビューの定期更新**: 1時間毎
- **集計クエリのキャッシュ**: Redis活用（5分TTL）
- **バッチ処理**: 夜間バッチで重い集計処理を実行

### メモリ最適化

#### 接続プール設定

- **最大接続数**: 20（Webアプリ用）+ 5（バッチ処理用）
- **アイドルタイムアウト**: 30分
- **接続ライフタイム**: 1時間

#### クエリプランキャッシュ

- **Prepared Statement**: 頻繁に実行されるクエリで活用
- **Query Plan Cache**: PostgreSQLの自動最適化を活用

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

-- 買い物セッションは所有者のみ操作可能
CREATE POLICY "Users can manage own shopping sessions" ON shopping_sessions
  FOR ALL USING (user_id = auth.uid());

-- 買い物履歴は所有者のみ参照可能
CREATE POLICY "Users can view own shopping history" ON shopping_session_items
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM shopping_sessions WHERE user_id = auth.uid()
    )
  );

-- クイックアクセスビューは所有者のみ参照可能
CREATE POLICY "Users can view own quick access" ON quick_access_view
  FOR SELECT USING (user_id = auth.uid());

-- ドメインイベントは所有者のみ参照可能（管理用）
CREATE POLICY "Users can view own domain events" ON domain_events
  FOR SELECT USING (user_id = auth.uid());
```

### 集約境界とトランザクション管理

#### 集約ルート経由のアクセス保証

```sql
-- 在庫履歴は必ず有効な食材IDを参照
ALTER TABLE ingredient_stock_histories
ADD CONSTRAINT fk_stock_history_ingredient
FOREIGN KEY (ingredient_id)
REFERENCES ingredients(id)
ON DELETE RESTRICT;

-- 買い物履歴は必ず有効なセッションと食材を参照
ALTER TABLE shopping_session_items
ADD CONSTRAINT fk_session_item_session
FOREIGN KEY (session_id)
REFERENCES shopping_sessions(id)
ON DELETE CASCADE;

ALTER TABLE shopping_session_items
ADD CONSTRAINT fk_session_item_ingredient
FOREIGN KEY (ingredient_id)
REFERENCES ingredients(id)
ON DELETE RESTRICT;
```

#### 一貫性制約

```sql
-- アクティブセッション数制限（ユーザー毎に1つまで）
CREATE UNIQUE INDEX idx_unique_active_session
ON shopping_sessions (user_id)
WHERE status = 'ACTIVE';

-- セッション内食材重複防止
CREATE UNIQUE INDEX idx_unique_session_ingredient
ON shopping_session_items (session_id, ingredient_id);

-- 論理削除された食材の一意性制約
CREATE UNIQUE INDEX idx_unique_active_ingredient
ON ingredients (user_id, name,
                best_before_date, use_by_date,
                storage_location_type, storage_location_detail)
WHERE deleted_at IS NULL;
```

## 更新履歴

| 日付       | 内容                                                                                            | 作成者     |
| ---------- | ----------------------------------------------------------------------------------------------- | ---------- |
| 2025-06-22 | 初版作成 - DDD設計に基づくテーブル構成                                                          | @komei0727 |
| 2025-06-24 | 集約設計に合わせて修正：ingredient_stocksをingredientsに統合、user_id追加、CASCADE→RESTRICT変更 | Claude     |
| 2025-06-28 | 買い物サポート機能統合：買い物セッションテーブル追加、インデックス最適化、パフォーマンス改善    | Claude     |
