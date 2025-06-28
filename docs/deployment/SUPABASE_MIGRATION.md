# Supabase マイグレーションガイド

## 📋 概要

このガイドでは、ローカル開発環境でのマイグレーション作成から、Staging/Production環境への適用までの手順を説明します。

## 🔧 前提条件

- Supabaseプロジェクト（Staging/Production）が作成済み
- 各環境のデータベース接続情報を取得済み
- ローカル開発環境が構築済み

## 📊 マイグレーションワークフロー

```
1. ローカル開発 → 2. マイグレーション作成 → 3. Staging適用 → 4. 動作確認 → 5. Production適用
```

## 🚀 詳細手順

### 1. ローカル開発環境でのマイグレーション作成

#### スキーマ変更

```bash
# 1. Prismaスキーマを編集
# prisma/schema.prisma を編集

# 2. マイグレーションファイルを生成
pnpm dotenv -e .env.local -- prisma migrate dev --name add_new_feature

# 例: 新しいカラムを追加
# pnpm prisma migrate dev --name add_expiry_notification_flag
```

#### 生成されるファイル

```
prisma/
├── migrations/
│   ├── 20240115000000_initial_migration/
│   │   └── migration.sql
│   ├── 20240120000000_add_new_feature/
│   │   └── migration.sql
│   └── migration_lock.toml
```

### 2. マイグレーションの内容確認

#### SQLファイルの確認

```bash
# 生成されたSQLを確認
cat prisma/migrations/20240120000000_add_new_feature/migration.sql
```

#### 重要な確認ポイント

- データ損失の可能性がないか
- インデックスが適切に作成されているか
- 既存データへの影響

### 3. Staging環境への適用

#### 環境変数の設定

```bash
# Staging環境の接続情報を設定
export DATABASE_URL="postgresql://postgres.nmcirhzathwqkydkvqae:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres.nmcirhzathwqkydkvqae:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

#### マイグレーション状態の確認

```bash
# 現在の状態を確認
pnpm prisma migrate status

# 出力例:
# 2 migrations found in prisma/migrations
# 1 migration already applied
# 1 migration pending
```

#### マイグレーションの適用

```bash
# Staging環境にマイグレーションを適用
pnpm dotenv -e .env.staging -- prisma migrate deploy

# 成功時の出力:
# Applying migration `20240120000000_add_new_feature`
# The following migration have been applied:
# └─ 20240120000000_add_new_feature/
#    └─ migration.sql
```

#### データの確認

```bash
または、Supabase Dashboardで確認
https://app.supabase.com/project/[PROJECT-ID]/editor
```

### 4. Production環境への適用

#### ⚠️ 事前チェックリスト

- [ ] Stagingで十分なテストを実施
- [ ] バックアップの作成
- [ ] ダウンタイムの計画（必要な場合）
- [ ] ロールバック手順の確認

#### 環境変数の設定

```bash
# Production環境の接続情報を設定
export DATABASE_URL="postgresql://postgres.ngcuunfkonnrwrlvdebs:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres.ngcuunfkonnrwrlvdebs:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

#### マイグレーションの適用

```bash
# 状態確認
pnpm prisma migrate status

# 本番環境に適用
pnpm dotenv -e .env.production -- prisma migrate deploy
```

### 5. シードデータの管理

#### 開発/Staging環境

```typescript
// prisma/seed.ts
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  // カテゴリマスタ
  const categories = await prisma.category.createMany({
    data: [
      { id: 'cat1', name: '野菜', displayOrder: 1 },
      { id: 'cat2', name: '肉類', displayOrder: 2 },
      { id: 'cat3', name: '魚介類', displayOrder: 3 },
    ],
    skipDuplicates: true,
  })

  // 開発環境のみテストデータを追加
  if (process.env.NODE_ENV !== 'production') {
    // テスト用の食材データ
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

#### シードデータの実行

```bash
# Staging環境
pnpm prisma db seed

# Production環境（マスタデータのみ）
NODE_ENV=production pnpm prisma db seed
```

## 🔄 ロールバック手順

### 緊急時のロールバック

1. **Supabase Dashboardからバックアップを復元**

   - Settings → Backups
   - Point-in-time recovery（有料プラン）

2. **手動でのロールバック**

```sql
-- マイグレーションを元に戻すSQL
-- prisma/migrations/[timestamp]_[name]/down.sql として保存

-- 例: カラムの削除
ALTER TABLE ingredients DROP COLUMN expiry_notification_sent;
```

## 📝 ベストプラクティス

### 1. マイグレーション作成時の注意

- **小さな変更単位で作成**

  - 1つのマイグレーション = 1つの機能
  - レビューとロールバックが容易

- **破壊的変更の回避**

  ```prisma
  // ❌ 悪い例：既存カラムの削除
  model Ingredient {
    // deletedField String を削除
  }

  // ✅ 良い例：段階的な移行
  // 1. 新カラム追加
  // 2. データ移行
  // 3. 古いカラムを削除
  ```

### 2. 環境間の同期

- **常に同じ順序で適用**

  ```
  Local → Staging → Production
  ```

- **スキップ禁止**
  - すべての環境で同じマイグレーションを適用

### 3. CI/CDとの統合

```yaml
# .github/workflows/deploy.yml
deploy-staging:
  steps:
    - name: Apply migrations
      env:
        DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
        DIRECT_URL: ${{ secrets.STAGING_DIRECT_URL }}
      run: |
        pnpm prisma migrate deploy
```

## 🚨 トラブルシューティング

### よくあるエラー

#### 1. マイグレーションの不整合

```bash
# エラー: The migration ... was modified after it was applied
# 解決:
pnpm prisma migrate resolve --applied [migration_name]
```

#### 2. 接続エラー

```bash
# エラー: Can't reach database server
# 確認事項:
# - DATABASE_URLが正しいか
# - Supabaseプロジェクトが起動しているか
# - ファイアウォール設定
```

#### 3. スキーマの同期

```bash
# ローカルとリモートの差分確認
pnpm prisma db pull
pnpm prisma migrate diff
```

## 📊 マイグレーション管理表

| 環境       | 最終適用日 | バージョン | 状態        |
| ---------- | ---------- | ---------- | ----------- |
| Local      | 随時       | Latest     | Development |
| Staging    | デプロイ時 | Latest-1   | Testing     |
| Production | 承認後     | Stable     | Live        |

## ✅ チェックリスト

### マイグレーション作成前

- [ ] スキーマ変更の影響範囲を確認
- [ ] 既存データへの影響を評価
- [ ] パフォーマンスへの影響を検討

### Staging適用前

- [ ] ローカルでテスト完了
- [ ] マイグレーションファイルをレビュー
- [ ] バックアップ作成

### Production適用前

- [ ] Stagingで十分な期間テスト
- [ ] ステークホルダーへの通知
- [ ] ロールバック手順の準備
- [ ] メンテナンス画面の準備（必要な場合）
