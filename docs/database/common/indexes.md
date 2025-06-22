# インデックス設計指針

## 概要

このドキュメントでは、データベースのインデックス設計に関する指針と最適化戦略を定義します。適切なインデックス設計により、クエリパフォーマンスを大幅に向上させます。

## インデックス設計の基本原則

### 1. 必要最小限の原則

- 必要なインデックスのみを作成
- 過剰なインデックスは更新性能を低下させる
- 定期的に使用状況を監視し、不要なインデックスを削除

### 2. カーディナリティの考慮

- 高カーディナリティ（値の種類が多い）カラムを優先
- 低カーディナリティの場合は部分インデックスを検討

### 3. クエリパターンの分析

- 実際のクエリパターンに基づいて設計
- WHERE句、JOIN条件、ORDER BY句を重点的に分析

## インデックスの種類と使い分け

### B-treeインデックス（デフォルト）

最も一般的なインデックス。等価比較、範囲検索に適している。

```sql
-- 単一カラムインデックス
CREATE INDEX idx_ingredients_name ON ingredients(name);

-- 複合インデックス
CREATE INDEX idx_ingredients_category_created ON ingredients(category_id, created_at);
```

### 部分インデックス

特定の条件を満たすレコードのみをインデックス化。

```sql
-- 論理削除されていないレコードのみ
CREATE INDEX idx_ingredients_name_active
ON ingredients(name)
WHERE deleted_at IS NULL;

-- 在庫ありの食材のみ
CREATE INDEX idx_stocks_ingredient_with_stock
ON ingredient_stocks(ingredient_id)
WHERE quantity > 0;
```

### ユニークインデックス

一意性制約を強制しつつ、検索性能も向上。

```sql
-- カテゴリー名の一意性
CREATE UNIQUE INDEX uniq_categories_name ON categories(name);

-- 単位記号の一意性
CREATE UNIQUE INDEX uniq_units_symbol ON units(symbol);
```

### 式インデックス

計算結果や関数の結果に対するインデックス。

```sql
-- 小文字変換した名前での検索用
CREATE INDEX idx_ingredients_name_lower
ON ingredients(LOWER(name));

-- 期限切れまでの日数計算用
CREATE INDEX idx_ingredients_days_until_expiry
ON ingredients((expiry_date - CURRENT_DATE));
```

## 食材管理システムのインデックス設計

### ingredientsテーブル

```sql
-- 主キー（自動作成）
-- PRIMARY KEY (id)

-- 外部キー用
CREATE INDEX idx_ingredients_category_id ON ingredients(category_id);
CREATE INDEX idx_ingredients_unit_id ON ingredients(unit_id);

-- 検索用（論理削除考慮）
CREATE INDEX idx_ingredients_name_deleted
ON ingredients(name, deleted_at);

-- ソート用
CREATE INDEX idx_ingredients_expiry_deleted
ON ingredients(expiry_date, deleted_at)
WHERE deleted_at IS NULL;

CREATE INDEX idx_ingredients_best_before_deleted
ON ingredients(best_before_date, deleted_at)
WHERE deleted_at IS NULL;

-- フィルタリング用
CREATE INDEX idx_ingredients_storage_deleted
ON ingredients(storage_location, deleted_at)
WHERE deleted_at IS NULL;

-- 複合検索用
CREATE INDEX idx_ingredients_category_storage_deleted
ON ingredients(category_id, storage_location, deleted_at)
WHERE deleted_at IS NULL;
```

### ingredient_stocksテーブル

```sql
-- 主キー（自動作成）
-- PRIMARY KEY (id)

-- 食材との関連
CREATE INDEX idx_stocks_ingredient_id ON ingredient_stocks(ingredient_id);

-- 在庫切れチェック用
CREATE INDEX idx_stocks_quantity_zero
ON ingredient_stocks(ingredient_id)
WHERE quantity = 0;

-- 購入日でのソート
CREATE INDEX idx_stocks_purchase_date ON ingredient_stocks(purchase_date DESC);
```

### ingredient_stock_historiesテーブル

```sql
-- 主キー（自動作成）
-- PRIMARY KEY (id)

-- 食材別履歴検索
CREATE INDEX idx_stock_histories_ingredient_operated
ON ingredient_stock_histories(ingredient_id, operated_at DESC);

-- 操作種別での絞り込み
CREATE INDEX idx_stock_histories_type_date
ON ingredient_stock_histories(operation_type, operated_at DESC);

-- ユーザー別操作履歴
CREATE INDEX idx_stock_histories_user_operated
ON ingredient_stock_histories(operated_by, operated_at DESC);
```

### domain_eventsテーブル

```sql
-- 主キー（自動作成）
-- PRIMARY KEY (id)

-- 集約別イベント検索
CREATE INDEX idx_events_aggregate
ON domain_events(aggregate_id, aggregate_type, occurred_at DESC);

-- イベントタイプ別検索
CREATE INDEX idx_events_type_occurred
ON domain_events(event_type, occurred_at DESC);

-- 相関ID検索
CREATE INDEX idx_events_correlation
ON domain_events(correlation_id)
WHERE correlation_id IS NOT NULL;
```

## インデックスの最適化戦略

### 1. カバリングインデックス

クエリで必要なすべてのカラムを含むインデックス。テーブルアクセスが不要になる。

```sql
-- 食材一覧表示用のカバリングインデックス
CREATE INDEX idx_ingredients_list_covering
ON ingredients(deleted_at, created_at DESC)
INCLUDE (name, category_id, storage_location)
WHERE deleted_at IS NULL;
```

### 2. インデックスの統合

類似したインデックスは統合して管理を簡素化。

```sql
-- 悪い例：冗長なインデックス
CREATE INDEX idx_ingredients_category ON ingredients(category_id);
CREATE INDEX idx_ingredients_category_name ON ingredients(category_id, name);

-- 良い例：統合されたインデックス
CREATE INDEX idx_ingredients_category_name ON ingredients(category_id, name);
-- category_idのみの検索でも利用可能
```

### 3. インデックスヒント

必要に応じてクエリでインデックスを明示的に指定。

```sql
-- PostgreSQLではあまり使用しないが、問題がある場合は検討
SET enable_seqscan = OFF; -- シーケンシャルスキャンを無効化
-- クエリ実行
SET enable_seqscan = ON;  -- 元に戻す
```

## パフォーマンス監視

### 使用されていないインデックスの検出

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

### インデックスの効果測定

```sql
-- クエリ実行計画の確認
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM ingredients
WHERE category_id = 'xxx'
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

### インデックスサイズの確認

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

## インデックスメンテナンス

### 1. 定期的な再構築

```sql
-- インデックスの再構築（ロックを最小限に）
REINDEX INDEX CONCURRENTLY idx_ingredients_name_deleted;
```

### 2. 統計情報の更新

```sql
-- テーブルの統計情報を更新
ANALYZE ingredients;
ANALYZE ingredient_stocks;
```

### 3. 断片化の確認

```sql
-- インデックスの断片化状況を確認
SELECT
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## インデックス設計のチェックリスト

### 新規インデックス作成時

- [ ] クエリパターンを分析したか
- [ ] カーディナリティを確認したか
- [ ] 既存インデックスとの重複はないか
- [ ] 部分インデックスの方が適切ではないか
- [ ] 更新性能への影響を検討したか

### 定期レビュー時

- [ ] 使用されていないインデックスはないか
- [ ] スロークエリログを確認したか
- [ ] インデックスサイズは適切か
- [ ] 統計情報は最新か
- [ ] 新しいクエリパターンに対応が必要か

## アンチパターン

### 1. 過剰なインデックス

```sql
-- 悪い例：すべてのカラムにインデックス
CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_notes ON ingredients(notes);
CREATE INDEX idx_ingredients_created_by ON ingredients(created_by);
-- notesやcreated_byでの検索は稀
```

### 2. 順序を考慮しない複合インデックス

```sql
-- 悪い例：低カーディナリティを先頭に
CREATE INDEX idx_ingredients_storage_name
ON ingredients(storage_location, name);

-- 良い例：高カーディナリティを先頭に
CREATE INDEX idx_ingredients_name_storage
ON ingredients(name, storage_location);
```

### 3. 論理削除を考慮しないインデックス

```sql
-- 悪い例：deleted_atを考慮していない
CREATE INDEX idx_ingredients_name ON ingredients(name);

-- 良い例：deleted_atを含めるか部分インデックス
CREATE INDEX idx_ingredients_name_active
ON ingredients(name)
WHERE deleted_at IS NULL;
```

## 更新履歴

| 日付       | 内容                            | 作成者  |
| ---------- | ------------------------------- | ------- |
| 2025-01-22 | 初版作成 - インデックス設計指針 | @system |
