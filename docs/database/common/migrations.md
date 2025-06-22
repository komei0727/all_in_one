# マイグレーション戦略

## 概要

このドキュメントでは、データベースマイグレーションの戦略、手順、ベストプラクティスを定義します。Prisma Migrateを使用した安全で再現可能なマイグレーションプロセスを確立します。

## マイグレーションの基本方針

### 1. 前方互換性の維持

- 新しいカラムはNULL許可またはデフォルト値付きで追加
- カラムの削除は2段階（非推奨化→削除）で実施
- アプリケーションの複数バージョンが共存可能な設計

### 2. ロールバック可能性

- すべてのマイグレーションに対応するロールバック手順を準備
- データの損失を伴う変更は慎重に計画
- バックアップとリストアの手順を明確化

### 3. 段階的な適用

- 大規模な変更は複数の小さなマイグレーションに分割
- 各段階でのテストと検証を実施
- 本番環境への適用は段階的に実施

## Prismaマイグレーションワークフロー

### 開発環境でのワークフロー

```bash
# 1. スキーマファイルを編集
vim prisma/schema.prisma

# 2. マイグレーションファイルを生成
pnpm prisma migrate dev --name add_stock_history_table

# 3. 生成されたSQLを確認
cat prisma/migrations/20250122123456_add_stock_history_table/migration.sql

# 4. 必要に応じて手動で編集
vim prisma/migrations/20250122123456_add_stock_history_table/migration.sql

# 5. マイグレーションを適用
pnpm prisma migrate dev
```

### 本番環境へのデプロイ

```bash
# 1. マイグレーションファイルをコミット
git add prisma/migrations/
git commit -m "feat: add stock history table migration"

# 2. CIでマイグレーションを検証
# (自動テストで実行)

# 3. 本番環境でマイグレーションを適用
pnpm prisma migrate deploy
```

## マイグレーションの種類と実装例

### 1. テーブルの追加

```sql
-- prisma/migrations/20250122_add_stock_history/migration.sql
CREATE TABLE ingredient_stock_histories (
    id TEXT PRIMARY KEY,
    ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
    operation_type TEXT NOT NULL,
    quantity_change DECIMAL NOT NULL,
    quantity_before DECIMAL NOT NULL,
    quantity_after DECIMAL NOT NULL,
    reason TEXT,
    operated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operated_by TEXT NOT NULL
);

-- インデックスも同時に作成
CREATE INDEX idx_stock_histories_ingredient_operated
ON ingredient_stock_histories(ingredient_id, operated_at DESC);
```

### 2. カラムの追加

```sql
-- NULL許可で追加（既存データに影響なし）
ALTER TABLE ingredients
ADD COLUMN storage_detail TEXT NULL;

-- デフォルト値付きで追加
ALTER TABLE ingredients
ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT FALSE;

-- 計算値で初期化
ALTER TABLE ingredients
ADD COLUMN days_until_expiry INTEGER GENERATED ALWAYS AS
(DATE_PART('day', expiry_date - CURRENT_DATE)) STORED;
```

### 3. カラムの変更

```sql
-- 段階1: 新しいカラムを追加
ALTER TABLE ingredients
ADD COLUMN storage_location_new TEXT;

-- 段階2: データを移行
UPDATE ingredients
SET storage_location_new =
    CASE storage_location
        WHEN 0 THEN 'REFRIGERATED'
        WHEN 1 THEN 'FROZEN'
        WHEN 2 THEN 'ROOM_TEMPERATURE'
    END;

-- 段階3: NOT NULL制約を追加
ALTER TABLE ingredients
ALTER COLUMN storage_location_new SET NOT NULL;

-- 段階4: 古いカラムを削除（別のマイグレーションで）
-- ALTER TABLE ingredients DROP COLUMN storage_location;

-- 段階5: カラム名を変更
-- ALTER TABLE ingredients
-- RENAME COLUMN storage_location_new TO storage_location;
```

### 4. インデックスの追加・変更

```sql
-- 通常のインデックス追加
CREATE INDEX idx_ingredients_category_id
ON ingredients(category_id);

-- 同時実行（本番環境でロックを避ける）
CREATE INDEX CONCURRENTLY idx_ingredients_name_deleted
ON ingredients(name, deleted_at);

-- 古いインデックスの削除
DROP INDEX IF EXISTS idx_ingredients_old;
```

### 5. データ移行

```sql
-- 既存データの変換
UPDATE ingredients
SET created_by = 'system',
    updated_by = 'system'
WHERE created_by IS NULL;

-- 集計データの初期化
INSERT INTO category_summaries (category_id, total_items, calculated_at)
SELECT
    category_id,
    COUNT(*),
    CURRENT_TIMESTAMP
FROM ingredients
WHERE deleted_at IS NULL
GROUP BY category_id;
```

## DDD対応のマイグレーション

### イベントストアの追加

```sql
-- ドメインイベントテーブルの作成
CREATE TABLE domain_events (
    id TEXT PRIMARY KEY,
    aggregate_id TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    event_version INTEGER NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    user_id TEXT NOT NULL,
    correlation_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 効率的な検索のためのインデックス
CREATE INDEX idx_events_aggregate
ON domain_events(aggregate_id, aggregate_type, occurred_at DESC);

CREATE INDEX idx_events_type_occurred
ON domain_events(event_type, occurred_at DESC);
```

### 論理削除の実装

```sql
-- 既存テーブルに論理削除カラムを追加
ALTER TABLE ingredients
ADD COLUMN deleted_at TIMESTAMP NULL,
ADD COLUMN deleted_by TEXT NULL;

-- 論理削除を考慮したビューの作成
CREATE OR REPLACE VIEW active_ingredients AS
SELECT * FROM ingredients
WHERE deleted_at IS NULL;

-- 既存のユニーク制約を論理削除対応に変更
DROP INDEX IF EXISTS uniq_ingredients_name;
CREATE UNIQUE INDEX uniq_ingredients_name_active
ON ingredients(name)
WHERE deleted_at IS NULL;
```

## ロールバック手順

### 基本的なロールバック

```bash
# 最後のマイグレーションをロールバック
pnpm prisma migrate resolve --rolled-back 20250122123456

# 特定のマイグレーションまでロールバック
pnpm prisma migrate resolve --rolled-back 20250120000000
```

### 手動ロールバックスクリプト

各マイグレーションに対応するロールバックSQLを準備：

```sql
-- migrations/rollback/20250122_add_stock_history.sql
DROP TABLE IF EXISTS ingredient_stock_histories;
```

## マイグレーションのテスト

### 単体テスト

```typescript
// __tests__/migrations/20250122_add_stock_history.test.ts
describe('Stock History Migration', () => {
  beforeAll(async () => {
    await prisma.$executeRaw`DROP TABLE IF EXISTS ingredient_stock_histories`
    await prisma.$executeRaw`${migrationSQL}`
  })

  it('should create stock history table', async () => {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ingredient_stock_histories'
    `

    expect(result).toContainEqual({
      column_name: 'operation_type',
      data_type: 'text',
    })
  })
})
```

### 統合テスト

```bash
# テスト環境でマイグレーションを実行
DATABASE_URL=postgresql://test@localhost/test_db pnpm prisma migrate deploy

# アプリケーションのテストを実行
pnpm test:integration
```

## ベストプラクティス

### 1. 命名規則

```
YYYYMMDDHHMMSS_descriptive_name.sql
例: 20250122123456_add_stock_history_table.sql
```

### 2. マイグレーションの粒度

- 1つのマイグレーション = 1つの論理的な変更
- 関連する変更はまとめる（テーブル作成とインデックス作成など）
- 独立した変更は分離する

### 3. コメントの活用

```sql
-- Migration: Add stock history tracking
-- Purpose: Track all inventory changes for audit trail
-- Author: @system
-- Date: 2025-01-22

-- Create stock history table
CREATE TABLE ingredient_stock_histories (
    -- ... columns ...
);

-- Add index for efficient querying
CREATE INDEX idx_stock_histories_ingredient_operated
ON ingredient_stock_histories(ingredient_id, operated_at DESC);
```

### 4. 危険な操作の回避

```sql
-- 危険: データ損失の可能性
DROP TABLE ingredients;
ALTER TABLE ingredients DROP COLUMN important_data;

-- 安全: 段階的な変更
ALTER TABLE ingredients RENAME TO ingredients_old;
ALTER TABLE ingredients ADD COLUMN deleted_at TIMESTAMP;
```

## 本番環境での注意事項

### 1. メンテナンスウィンドウ

- 大規模な変更は事前告知の上、メンテナンスウィンドウで実施
- 小規模な変更でもピーク時間を避ける

### 2. 監視とアラート

```sql
-- 長時間実行クエリの監視
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

### 3. ロック対策

```sql
-- ロックタイムアウトの設定
SET lock_timeout = '10s';

-- 実行
ALTER TABLE ingredients ADD COLUMN new_column TEXT;

-- タイムアウトをリセット
SET lock_timeout = DEFAULT;
```

## トラブルシューティング

### マイグレーションの失敗

```bash
# 状態を確認
pnpm prisma migrate status

# 失敗したマイグレーションを解決
pnpm prisma migrate resolve --applied 20250122123456

# データベースをリセット（開発環境のみ）
pnpm prisma migrate reset
```

### スキーマの不整合

```bash
# 現在のスキーマとの差分を確認
pnpm prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma

# スキーマを同期（開発環境のみ）
pnpm prisma db push
```

## 更新履歴

| 日付       | 内容                            | 作成者  |
| ---------- | ------------------------------- | ------- |
| 2025-01-22 | 初版作成 - マイグレーション戦略 | @system |
