# データベース命名規約

## 概要

このドキュメントでは、データベースオブジェクト（テーブル、カラム、インデックスなど）の命名規約を定義します。一貫性のある命名により、コードの可読性と保守性を向上させます。

## 基本原則

1. **小文字とアンダースコア** を使用（snake_case）
2. **英語** で命名
3. **単数形** をテーブル名に使用（Rails規約とは異なる）
4. **意味のある名前** を使用し、略語は避ける
5. **予約語** を避ける

## テーブル名

### 基本ルール

```sql
-- 良い例
CREATE TABLE ingredient (...);
CREATE TABLE category (...);
CREATE TABLE ingredient_stock_history (...);

-- 悪い例
CREATE TABLE Ingredients (...);      -- 大文字、複数形
CREATE TABLE tbl_ingredient (...);   -- 不要なプレフィックス
CREATE TABLE ing (...);              -- 略語
```

### 命名パターン

| パターン     | 説明          | 例                                          |
| ------------ | ------------- | ------------------------------------------- |
| エンティティ | 単数形の名詞  | `ingredient`, `category`, `unit`            |
| 関連テーブル | 親\_子        | `recipe_ingredient`, `user_household`       |
| 履歴テーブル | 対象\_history | `ingredient_stock_history`, `price_history` |
| 集計テーブル | 対象\_summary | `category_summary`, `monthly_summary`       |

### 特殊なテーブル

```sql
-- イベントストア
domain_events

-- 監査ログ
audit_logs

-- システム設定
system_settings
```

## カラム名

### 基本ルール

```sql
-- 良い例
name          TEXT NOT NULL;
created_at    TIMESTAMP NOT NULL;
is_active     BOOLEAN DEFAULT TRUE;
unit_price    DECIMAL(10,2);

-- 悪い例
Name          TEXT;           -- 大文字
createdDate   TIMESTAMP;      -- キャメルケース
active        BOOLEAN;        -- is_プレフィックスなし
price         DECIMAL;        -- 単位が不明確
```

### 共通カラム

すべてのエンティティテーブルに含める：

```sql
id          TEXT PRIMARY KEY;        -- CUID形式
created_at  TIMESTAMP NOT NULL;      -- 作成日時
updated_at  TIMESTAMP NOT NULL;      -- 更新日時
created_by  TEXT NOT NULL;           -- 作成者ID
updated_by  TEXT NOT NULL;           -- 更新者ID
```

論理削除対応テーブルの場合：

```sql
deleted_at  TIMESTAMP NULL;          -- 削除日時
deleted_by  TEXT NULL;               -- 削除者ID
```

### カラム命名パターン

| パターン | 説明                         | 例                                       |
| -------- | ---------------------------- | ---------------------------------------- |
| ID       | 外部キーは`テーブル名_id`    | `ingredient_id`, `category_id`           |
| 日付     | `動詞_at`または`名詞_date`   | `created_at`, `purchase_date`            |
| フラグ   | `is_形容詞`または`has_名詞`  | `is_active`, `has_stock`                 |
| 数量     | 単位を明確に                 | `quantity`, `unit_price`, `total_amount` |
| 説明     | `_description`または`_notes` | `description`, `notes`                   |

### データ型別の命名

```sql
-- 文字列
name            TEXT;
description     TEXT;
code            VARCHAR(10);

-- 数値
quantity        DECIMAL(10,2);
price           INTEGER;        -- 円単位で保存
display_order   INTEGER;

-- 日時
created_at      TIMESTAMP;
expiry_date     DATE;
occurred_at     TIMESTAMP;

-- ブール
is_active       BOOLEAN;
has_stock       BOOLEAN;
is_deleted      BOOLEAN;

-- JSON
metadata        JSONB;
event_data      JSONB;
settings        JSONB;
```

## インデックス名

### 命名規則

```
idx_<テーブル名>_<カラム名>
```

### 例

```sql
-- 単一カラムインデックス
CREATE INDEX idx_ingredients_category_id ON ingredients(category_id);
CREATE INDEX idx_ingredients_created_at ON ingredients(created_at);

-- 複合インデックス
CREATE INDEX idx_ingredients_category_deleted ON ingredients(category_id, deleted_at);
CREATE INDEX idx_stock_histories_ingredient_operated ON ingredient_stock_histories(ingredient_id, operated_at);

-- ユニークインデックス
CREATE UNIQUE INDEX uniq_categories_name ON categories(name);
CREATE UNIQUE INDEX uniq_units_symbol ON units(symbol);
```

## 制約名

### 主キー

```sql
-- 自動生成される名前を使用
PRIMARY KEY (id)
```

### 外部キー

```
fk_<子テーブル>_<親テーブル>
```

```sql
-- 例
ALTER TABLE ingredients
ADD CONSTRAINT fk_ingredients_categories
FOREIGN KEY (category_id) REFERENCES categories(id);

ALTER TABLE ingredients
ADD CONSTRAINT fk_ingredients_units
FOREIGN KEY (unit_id) REFERENCES units(id);
```

### チェック制約

```
chk_<テーブル名>_<制約内容>
```

```sql
-- 例
ALTER TABLE ingredients
ADD CONSTRAINT chk_ingredients_quantity_positive
CHECK (quantity >= 0);

ALTER TABLE ingredient_stock_histories
ADD CONSTRAINT chk_stock_histories_operation_type
CHECK (operation_type IN ('CONSUME', 'REPLENISH', 'ADJUST'));
```

## ビュー名

### 命名規則

```
<内容>_view
```

### 例

```sql
-- アクティブな食材
CREATE VIEW active_ingredients_view AS ...;

-- 在庫切れ食材
CREATE VIEW out_of_stock_ingredients_view AS ...;

-- カテゴリー別サマリー
CREATE VIEW category_summary_view AS ...;
```

## 関数・プロシージャ名

### 命名規則

```
<動詞>_<対象>
```

### 例

```sql
-- 関数
CREATE FUNCTION calculate_days_until_expiry(expiry_date DATE) ...;
CREATE FUNCTION get_ingredient_status(ingredient_id TEXT) ...;

-- トリガー関数
CREATE FUNCTION update_updated_at_column() ...;
CREATE FUNCTION log_ingredient_changes() ...;
```

## トリガー名

### 命名規則

```
trg_<タイミング>_<テーブル名>_<アクション>
```

### 例

```sql
-- updated_atの自動更新
CREATE TRIGGER trg_before_ingredients_update
BEFORE UPDATE ON ingredients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 履歴の自動記録
CREATE TRIGGER trg_after_ingredient_stocks_update
AFTER UPDATE ON ingredient_stocks
FOR EACH ROW EXECUTE FUNCTION log_stock_changes();
```

## 列挙型（ENUM）

### 命名規則

```
<テーブル名>_<カラム名>_enum
```

### 例

```sql
-- 保存場所
CREATE TYPE ingredients_storage_location_enum AS ENUM (
  'REFRIGERATED',
  'FROZEN',
  'ROOM_TEMPERATURE'
);

-- 操作種別
CREATE TYPE stock_histories_operation_type_enum AS ENUM (
  'CONSUME',
  'REPLENISH',
  'ADJUST'
);
```

## パーティション名

### 命名規則

```
<テーブル名>_<期間>
```

### 例

```sql
-- 月別パーティション
CREATE TABLE ingredient_stock_histories_2025_01 ...;
CREATE TABLE ingredient_stock_histories_2025_02 ...;

-- 年別パーティション
CREATE TABLE domain_events_2025 ...;
CREATE TABLE domain_events_2026 ...;
```

## アンチパターン

避けるべき命名：

```sql
-- ハンガリアン記法
tblIngredient     -- tblプレフィックス
intQuantity       -- 型のプレフィックス

-- 意味不明な略語
ing_qty           -- ingredient_quantity
cat_id            -- category_id

-- 予約語
user              -- PostgreSQLの予約語
order             -- SQLの予約語

-- 日本語ローマ字
shokuzai          -- ingredient
kazu              -- quantity
```

## Prismaでの考慮事項

Prismaスキーマとの整合性：

```prisma
// Prismaでのモデル定義
model Ingredient {
  id             String    @id @default(cuid())
  name           String
  categoryId     String    @map("category_id")
  category       Category  @relation(fields: [categoryId], references: [id])
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@map("ingredients")
}
```

## 更新履歴

| 日付       | 内容                        | 作成者  |
| ---------- | --------------------------- | ------- |
| 2025-01-22 | 初版作成 - 基本的な命名規約 | @system |
