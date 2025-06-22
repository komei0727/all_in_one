# データベース全体構成

## アーキテクチャ概要

### 基本方針

本アプリケーションのデータベースは、以下の方針に基づいて設計されています：

1. **PostgreSQL 15** を採用し、JSONBやパーティショニングなどの高度な機能を活用
2. **Prisma ORM** によるタイプセーフなデータアクセス
3. **ドメイン駆動設計（DDD）** の原則に基づくテーブル構成
4. **イベントソーシング** パターンの部分的な採用
5. **論理削除** による完全な監査証跡の保持

### システム構成図

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│                  (Next.js + TypeScript)                  │
└─────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                      Prisma ORM                          │
│              (Type-safe Database Client)                 │
└─────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL 15                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Business Tables │  │  Event Store    │              │
│  │  - ingredients  │  │ - domain_events │              │
│  │  - categories   │  │                 │              │
│  │  - units        │  └─────────────────┘              │
│  └─────────────────┘                                    │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ History Tables  │  │     Views       │              │
│  │ - stock_history │  │ - active_items  │              │
│  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────┘
```

## データモデリング方針

### 1. エンティティ設計

すべてのエンティティテーブルには以下の共通カラムを含めます：

```sql
-- 共通カラム
id          TEXT      PRIMARY KEY     -- CUID v2形式
created_at  TIMESTAMP NOT NULL        -- 作成日時
updated_at  TIMESTAMP NOT NULL        -- 更新日時
deleted_at  TIMESTAMP NULL            -- 論理削除日時
created_by  TEXT      NOT NULL        -- 作成者ID
updated_by  TEXT      NOT NULL        -- 更新者ID
```

### 2. リレーション設計

- **外部キー制約** を適切に設定し、データ整合性を保証
- **カスケード削除** は使用せず、アプリケーション層で制御
- **多対多** の関係は中間テーブルで表現

### 3. 値オブジェクトの扱い

DDDの値オブジェクトは以下のように実装：

- 単純な値: カラムとして埋め込み（例: `storage_location`）
- 複合的な値: JSONBカラムまたは別テーブル（例: 数量と単位）

## テーブル分類

### 1. マスタテーブル

変更頻度が低く、参照が多いデータ：

- `categories` - カテゴリーマスタ
- `units` - 単位マスタ

特徴：

- キャッシュ対象
- 有効/無効フラグ（`is_active`）による管理
- 表示順（`display_order`）の管理

### 2. トランザクションテーブル

日々の業務で作成・更新されるデータ：

- `ingredients` - 食材データ
- `ingredient_stocks` - 在庫データ

特徴：

- 論理削除対応
- 更新履歴の保持
- 楽観的ロック（`updated_at`による）

### 3. 履歴テーブル

変更履歴を記録するデータ：

- `ingredient_stock_histories` - 在庫変更履歴
- `domain_events` - ドメインイベント

特徴：

- 追記のみ（更新・削除なし）
- タイムスタンプによる時系列管理
- パーティショニング候補

### 4. ビュー

よく使用するクエリパターンを簡素化：

- `active_ingredients_view` - 有効な食材一覧
- `low_stock_ingredients_view` - 在庫少食材

特徴：

- 論理削除を考慮したフィルタリング
- 複雑なJOINの隠蔽
- パフォーマンス最適化

## トランザクション設計

### 分離レベル

デフォルトは `READ COMMITTED` を使用し、必要に応じて調整：

```typescript
// Prismaでのトランザクション例
await prisma.$transaction(async (tx) => {
  // 在庫を更新
  const stock = await tx.ingredientStock.update({
    where: { ingredientId },
    data: { quantity: newQuantity },
  })

  // 履歴を記録
  await tx.ingredientStockHistory.create({
    data: {
      ingredientId,
      operationType: 'CONSUME',
      quantityChange: -consumedAmount,
      // ...
    },
  })

  // イベントを記録
  await tx.domainEvent.create({
    data: {
      aggregateId: ingredientId,
      eventType: 'IngredientConsumed',
      // ...
    },
  })
})
```

### デッドロック対策

- 一貫した順序でテーブルにアクセス
- 長時間のトランザクションを避ける
- 適切なインデックスによるロック競合の最小化

## パフォーマンス考慮事項

### 1. インデックス戦略

[インデックス設計指針](./indexes.md)を参照

### 2. パーティショニング

大量データが予想されるテーブルの対策：

```sql
-- 履歴テーブルの月別パーティション例
CREATE TABLE ingredient_stock_histories_2025_01
PARTITION OF ingredient_stock_histories
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 3. 統計情報の更新

```sql
-- 定期的な統計情報更新
ANALYZE ingredients;
ANALYZE ingredient_stocks;
```

## セキュリティ設計

### 1. アクセス制御

- アプリケーション用の専用ユーザーを作成
- 最小権限の原則に基づく権限設定
- Supabase環境ではRow Level Security (RLS)を活用

### 2. データ暗号化

- 接続時: SSL/TLS必須
- 保存時: Supabaseの暗号化機能を利用
- センシティブデータ: アプリケーション層で暗号化

### 3. 監査ログ

- すべての変更操作を`domain_events`に記録
- `created_by`/`updated_by`による操作者の追跡
- 定期的な監査レポートの生成

## バックアップとリカバリ

### 開発環境

```bash
# Dockerボリュームのバックアップ
docker run --rm -v all_in_one_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup_$(date +%Y%m%d).tar.gz -C /data .

# リストア
docker run --rm -v all_in_one_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup_20250122.tar.gz -C /data
```

### 本番環境（Supabase）

- 自動バックアップ: 毎日実行
- Point-in-time Recovery: 過去7日間の任意の時点
- 手動バックアップ: 重要な変更前に実施

## モニタリング

### 監視項目

1. **パフォーマンス**

   - スロークエリ（実行時間 > 1秒）
   - インデックスの使用状況
   - テーブルサイズの増加傾向

2. **リソース**

   - 接続数
   - メモリ使用量
   - ディスク使用量

3. **エラー**
   - デッドロック発生頻度
   - 制約違反エラー
   - タイムアウト発生率

### アラート設定

```sql
-- スロークエリの検出
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000 -- 1秒以上
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## 更新履歴

| 日付       | 内容                                | 作成者  |
| ---------- | ----------------------------------- | ------- |
| 2025-01-22 | 初版作成 - 全体構成とアーキテクチャ | @system |
