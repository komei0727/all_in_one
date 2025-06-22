# データベース設計書

> **注意**: このドキュメントは再構成されました。新しいドキュメント構造については以下を参照してください。

## 📁 新しいドキュメント構造

データベース設計ドキュメントは、より管理しやすい構造に再編成されました：

### 📚 [データベース設計ドキュメント](./database/README.md)

- **[共通設計](./database/common/)**

  - [全体構成](./database/common/overview.md) - アーキテクチャ、システム構成
  - [命名規約](./database/common/naming-conventions.md) - テーブル、カラム、インデックスの命名
  - [インデックス設計](./database/common/indexes.md) - 最適化戦略、パフォーマンス
  - [マイグレーション戦略](./database/common/migrations.md) - Prisma Migrate、ロールバック

- **[コンテキスト別設計](./database/contexts/)**
  - [食材管理](./database/contexts/ingredient-management.md) - 食材、在庫、履歴テーブル

## 🔄 移行について

このドキュメントの内容は、以下のように新しい構造に移行されました：

| 旧セクション           | 新しい場所                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| データベース構成       | [database/common/overview.md](./database/common/overview.md)                               |
| テーブル設計           | [database/contexts/ingredient-management.md](./database/contexts/ingredient-management.md) |
| データ型定義           | [database/contexts/ingredient-management.md](./database/contexts/ingredient-management.md) |
| マイグレーション戦略   | [database/common/migrations.md](./database/common/migrations.md)                           |
| データアクセスパターン | 各コンテキストのドメインモデル仕様書に移動                                                 |

## 📋 主な改善点

1. **ドメイン駆動設計（DDD）への対応**

   - 境界づけられたコンテキストごとにドキュメントを分離
   - ドメインイベント、集約の概念を反映

2. **新しいテーブルの追加**

   - `ingredient_stocks` - 在庫管理の分離
   - `ingredient_stock_histories` - 在庫変更履歴
   - `domain_events` - イベントストア

3. **論理削除のサポート**

   - すべてのエンティティに`deleted_at`カラムを追加
   - アクティブレコードのビュー定義

4. **より詳細な設計ガイドライン**
   - 命名規約の明確化
   - インデックス設計の最適化指針
   - マイグレーションのベストプラクティス

## 更新履歴

| 日付       | 内容                     | 作成者  |
| ---------- | ------------------------ | ------- |
| 2025-01-22 | ドキュメント構造の再編成 | @system |
| 2025-01-21 | 初版作成                 | @system |
