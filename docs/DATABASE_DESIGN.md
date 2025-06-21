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

### ingredients（食材）テーブル

食材の基本情報を管理するメインテーブル。

| カラム名        | 型        | 制約                         | 説明                       |
| --------------- | --------- | ---------------------------- | -------------------------- |
| id              | TEXT      | PRIMARY KEY                  | CUID形式の一意識別子       |
| name            | TEXT      | NOT NULL                     | 食材名                     |
| quantity        | DECIMAL   | NULL                         | 数量                       |
| unit            | TEXT      | NULL                         | 単位（個、g、ml等）        |
| expiration_date | TIMESTAMP | NULL                         | 賞味期限                   |
| category        | TEXT      | NULL                         | カテゴリ（野菜、肉・魚等） |
| status          | ENUM      | NOT NULL DEFAULT 'AVAILABLE' | 在庫状態                   |
| created_at      | TIMESTAMP | NOT NULL DEFAULT NOW()       | 作成日時                   |
| updated_at      | TIMESTAMP | NOT NULL                     | 更新日時                   |

**インデックス**:

- `idx_ingredients_status` - status検索の高速化
- `idx_ingredients_expiration_date` - 期限切れ食材の検索
- `idx_ingredients_category` - カテゴリ別一覧の高速化

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

### IngredientStatus（食材ステータス）

```typescript
enum IngredientStatus {
  AVAILABLE  // あり
  LOW        // 少ない
  OUT        // なし
}
```

### カテゴリマスタ

```typescript
const CATEGORIES = ['野菜', '肉・魚', '乳製品', '調味料', '飲料', 'その他'] as const
```

### 単位マスタ

```typescript
const UNITS = ['個', 'g', 'kg', 'ml', 'L', '本', 'パック', '袋'] as const
```

## Prismaスキーマ

```prisma
model Ingredient {
  id             String    @id @default(cuid())
  name           String
  quantity       Float?
  unit           String?
  expirationDate DateTime? @map("expiration_date")
  category       String?
  status         IngredientStatus @default(AVAILABLE)
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@index([status])
  @@index([expirationDate])
  @@index([category])
  @@map("ingredients")
}

enum IngredientStatus {
  AVAILABLE
  LOW
  OUT
}
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
interface IngredientRepository {
  findAll(): Promise<Ingredient[]>
  findById(id: string): Promise<Ingredient | null>
  findByStatus(status: IngredientStatus): Promise<Ingredient[]>
  findExpiringSoon(days: number): Promise<Ingredient[]>
  create(data: CreateIngredientInput): Promise<Ingredient>
  update(id: string, data: UpdateIngredientInput): Promise<Ingredient>
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
