# データベース設計書

## 概要

PostgreSQLを使用したリレーショナルデータベース設計。
開発環境ではDocker、本番環境ではSupabaseを使用。

## データベース構成

### 環境別設定

| 環境 | データベース           | 接続方法                                                       |
| ---- | ---------------------- | -------------------------------------------------------------- |
| 開発 | Docker PostgreSQL 15   | `postgresql://postgres:postgres@localhost:5432/all_in_one_dev` |
| 本番 | Supabase PostgreSQL 15 | Supabase提供の接続文字列                                       |

## テーブル設計

### categories（カテゴリー）テーブル

食材のカテゴリーを管理するマスタテーブル。

| カラム名    | 型        | 制約                   | 説明                 |
| ----------- | --------- | ---------------------- | -------------------- |
| id          | TEXT      | PRIMARY KEY            | CUID形式の一意識別子 |
| name        | TEXT      | NOT NULL, UNIQUE       | カテゴリー名         |
| description | TEXT      | NULL                   | カテゴリーの説明     |
| created_at  | TIMESTAMP | NOT NULL DEFAULT NOW() | 作成日時             |
| updated_at  | TIMESTAMP | NOT NULL               | 更新日時             |

### units（単位）テーブル

食材の単位を管理するマスタテーブル。

| カラム名    | 型        | 制約                   | 説明                 |
| ----------- | --------- | ---------------------- | -------------------- |
| id          | TEXT      | PRIMARY KEY            | CUID形式の一意識別子 |
| name        | TEXT      | NOT NULL, UNIQUE       | 単位名               |
| description | TEXT      | NULL                   | 単位の説明           |
| created_at  | TIMESTAMP | NOT NULL DEFAULT NOW() | 作成日時             |
| updated_at  | TIMESTAMP | NOT NULL               | 更新日時             |

### ingredients（食材）テーブル

食材の基本情報を管理するメインテーブル。

| カラム名         | 型        | 制約                   | 説明                       |
| ---------------- | --------- | ---------------------- | -------------------------- |
| id               | TEXT      | PRIMARY KEY            | CUID形式の一意識別子       |
| name             | TEXT      | NOT NULL               | 食材名                     |
| category_id      | TEXT      | NOT NULL, FOREIGN KEY  | カテゴリーID               |
| quantity         | DECIMAL   | NOT NULL               | 数量                       |
| unit_id          | TEXT      | NOT NULL, FOREIGN KEY  | 単位ID                     |
| expiry_date      | TIMESTAMP | NULL                   | 賞味期限                   |
| best_before_date | TIMESTAMP | NULL                   | 消費期限                   |
| purchase_date    | TIMESTAMP | NOT NULL               | 購入日                     |
| price            | INTEGER   | NULL                   | 価格（円単位）             |
| storage_location | ENUM      | NOT NULL               | 保存場所（冷蔵/冷凍/常温） |
| memo             | TEXT      | NULL                   | メモ                       |
| created_at       | TIMESTAMP | NOT NULL DEFAULT NOW() | 作成日時                   |
| updated_at       | TIMESTAMP | NOT NULL               | 更新日時                   |

**インデックス**:

- `idx_ingredients_category_id` - カテゴリー別検索の高速化
- `idx_ingredients_unit_id` - 単位別検索の高速化
- `idx_ingredients_expiry_date` - 賞味期限切れ食材の検索
- `idx_ingredients_best_before_date` - 消費期限切れ食材の検索

### 今後追加予定のテーブル

#### users（ユーザー）テーブル

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

#### households（世帯）テーブル

```sql
CREATE TABLE households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

#### user_households（ユーザー世帯関連）テーブル

```sql
CREATE TABLE user_households (
  user_id TEXT REFERENCES users(id),
  household_id TEXT REFERENCES households(id),
  role TEXT NOT NULL DEFAULT 'member',
  PRIMARY KEY (user_id, household_id)
);
```

## データ型定義

### StorageLocation（保存場所）

```typescript
enum StorageLocation {
  REFRIGERATED     // 冷蔵
  FROZEN          // 冷凍
  ROOM_TEMPERATURE // 常温
}
```

### 初期カテゴリマスタ

```typescript
const INITIAL_CATEGORIES = [
  { name: '野菜', description: '野菜類' },
  { name: '肉・魚', description: '肉類・魚介類' },
  { name: '乳製品', description: '牛乳・チーズ・ヨーグルトなど' },
  { name: '調味料', description: '醤油・味噌・スパイスなど' },
  { name: '飲料', description: '水・ジュース・お茶など' },
  { name: 'その他', description: 'その他の食材' },
] as const
```

### 初期単位マスタ

```typescript
const INITIAL_UNITS = [
  { name: '個', description: '個数' },
  { name: 'g', description: 'グラム' },
  { name: 'kg', description: 'キログラム' },
  { name: 'ml', description: 'ミリリットル' },
  { name: 'L', description: 'リットル' },
  { name: '本', description: '本数' },
  { name: 'パック', description: 'パック' },
  { name: '袋', description: '袋' },
] as const
```

## マイグレーション戦略

### 開発環境

```bash
# マイグレーションファイルの作成
pnpm db:migrate

# スキーマの同期（開発時の迅速な反映）
pnpm db:push
```

### 本番環境

1. Prisma Migrateでマイグレーションファイルを生成
2. CI/CDパイプラインで自動適用
3. ロールバック用のスクリプトも準備

## データアクセスパターン

### リポジトリパターン

```typescript
// Ingredient Repository
interface IngredientRepository {
  findAll(): Promise<Ingredient[]>
  findById(id: string): Promise<Ingredient | null>
  findByCategory(categoryId: string): Promise<Ingredient[]>
  findByStorageLocation(location: StorageLocation): Promise<Ingredient[]>
  findExpiringSoon(days: number): Promise<Ingredient[]>
  create(data: CreateIngredientInput): Promise<Ingredient>
  update(id: string, data: UpdateIngredientInput): Promise<Ingredient>
  delete(id: string): Promise<void>
}

// Category Repository
interface CategoryRepository {
  findAll(): Promise<Category[]>
  findById(id: string): Promise<Category | null>
  findByName(name: string): Promise<Category | null>
  create(data: CreateCategoryInput): Promise<Category>
  update(id: string, data: UpdateCategoryInput): Promise<Category>
  delete(id: string): Promise<void>
}

// Unit Repository
interface UnitRepository {
  findAll(): Promise<Unit[]>
  findById(id: string): Promise<Unit | null>
  findByName(name: string): Promise<Unit | null>
  create(data: CreateUnitInput): Promise<Unit>
  update(id: string, data: UpdateUnitInput): Promise<Unit>
  delete(id: string): Promise<void>
}
```

### クエリ最適化

1. **N+1問題の回避**

   - Prismaの`include`を適切に使用
   - 必要なデータのみを取得

2. **ページネーション**

   ```typescript
   findAll(page: number, limit: number) {
     return prisma.ingredient.findMany({
       skip: (page - 1) * limit,
       take: limit,
       orderBy: { updatedAt: 'desc' }
     })
   }
   ```

3. **検索の最適化**
   - フルテキスト検索の実装（将来）
   - 適切なインデックスの設計

## バックアップとリカバリ

### 開発環境

- Dockerボリュームの定期バックアップ
- 開発データのシード機能

### 本番環境

- Supabaseの自動バックアップ機能を利用
- Point-in-time Recovery対応
- 定期的なバックアップテスト

## セキュリティ

### アクセス制御

1. **Row Level Security (RLS)**

   - Supabaseで有効化
   - ユーザーごとのデータアクセス制御

2. **入力検証**

   - Zodによるスキーマ検証
   - SQLインジェクション対策（Prisma）

3. **暗号化**
   - 接続時のSSL/TLS暗号化
   - センシティブデータの暗号化（将来）
