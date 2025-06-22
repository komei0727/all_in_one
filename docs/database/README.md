# データベース設計ドキュメント

## 概要

このディレクトリには、食材管理アプリケーションのデータベース設計に関するドキュメントが含まれています。ドメイン駆動設計（DDD）の原則に基づき、境界づけられたコンテキストごとに設計書を分割しています。

## ディレクトリ構成

```
database/
├── README.md                           # このファイル
├── common/                             # 共通設計
│   ├── overview.md                     # データベース全体構成
│   ├── naming-conventions.md           # 命名規約
│   ├── indexes.md                      # インデックス設計指針
│   └── migrations.md                   # マイグレーション戦略
└── contexts/                           # コンテキスト別設計
    └── ingredient-management.md        # 食材管理コンテキスト
```

## データベース構成

### 環境別設定

| 環境 | データベース           | 接続方法                                                       |
| ---- | ---------------------- | -------------------------------------------------------------- |
| 開発 | Docker PostgreSQL 15   | `postgresql://postgres:postgres@localhost:5432/all_in_one_dev` |
| 本番 | Supabase PostgreSQL 15 | Supabase提供の接続文字列                                       |

### 技術スタック

- **データベース**: PostgreSQL 15
- **ORM**: Prisma 6.x
- **マイグレーション**: Prisma Migrate
- **開発環境**: Docker Compose
- **本番環境**: Supabase

## 設計原則

### 1. ドメイン駆動設計（DDD）の適用

- 境界づけられたコンテキストごとにテーブルを分離
- 集約ルートを中心としたテーブル設計
- ドメインイベントの永続化

### 2. 論理削除の採用

- すべてのエンティティテーブルに`deleted_at`カラムを追加
- 物理削除は行わず、データの完全性を保持
- 削除済みデータは統計・分析用途で活用

### 3. 監査証跡の実装

- `created_by`、`updated_by`による操作者の記録
- イベントストアによる変更履歴の完全な追跡
- 在庫変更履歴の詳細な記録

### 4. パフォーマンスの最適化

- 適切なインデックスの設計
- ビューによるクエリの簡素化
- 将来的なパーティショニングの考慮

## 各ドキュメントの説明

### 共通設計 (`common/`)

- **[overview.md](./common/overview.md)**: データベース全体の構成、アーキテクチャ、技術選定について
- **[naming-conventions.md](./common/naming-conventions.md)**: テーブル名、カラム名、インデックス名などの命名規約
- **[indexes.md](./common/indexes.md)**: インデックス設計の指針、最適化戦略
- **[migrations.md](./common/migrations.md)**: マイグレーション戦略、バージョン管理、ロールバック手順

### コンテキスト別設計 (`contexts/`)

- **[ingredient-management.md](./contexts/ingredient-management.md)**: 食材管理に関するテーブル設計、リレーション、ビュー定義

## クイックリファレンス

### よく使うコマンド

```bash
# Docker PostgreSQL起動
pnpm db:up

# マイグレーション実行
pnpm db:migrate

# Prisma Studio起動（データ確認）
pnpm db:studio

# スキーマの同期（開発時）
pnpm db:push
```

### 主要テーブル一覧

| テーブル名                 | 説明             | コンテキスト |
| -------------------------- | ---------------- | ------------ |
| ingredients                | 食材マスタ       | 食材管理     |
| ingredient_stocks          | 食材在庫         | 食材管理     |
| ingredient_stock_histories | 在庫変更履歴     | 食材管理     |
| categories                 | カテゴリーマスタ | 食材管理     |
| units                      | 単位マスタ       | 食材管理     |
| domain_events              | ドメインイベント | 共通         |

## 今後の拡張予定

### フェーズ2（ユーザー管理）

- users（ユーザー）
- households（世帯）
- user_households（ユーザー世帯関連）

### フェーズ3（レシピ管理）

- recipes（レシピ）
- recipe_ingredients（レシピ材料）
- cooking_histories（調理履歴）

### フェーズ4（買い物リスト）

- shopping_lists（買い物リスト）
- shopping_list_items（買い物リスト項目）

## 関連ドキュメント

- [アーキテクチャ設計](../ARCHITECTURE.md)
- [API仕様](../api/)
- [ドメインモデル](../domain/README.md)

## 更新履歴

| 日付       | 内容                                 | 作成者  |
| ---------- | ------------------------------------ | ------- |
| 2025-01-22 | 初版作成 - DDD基づくDB設計構造を導入 | @system |
