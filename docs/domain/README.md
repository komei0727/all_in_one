# ドメイン駆動設計（DDD）ドキュメント

## 概要

このディレクトリには、食材管理アプリケーションのドメイン駆動設計に関するドキュメントを配置します。
DDDの戦略的設計と戦術的設計の両方をカバーし、ビジネスロジックを中心とした設計を記録します。

## 📚 DDDとは

ドメイン駆動設計（Domain-Driven Design）は、複雑なソフトウェアを設計するためのアプローチです。

### 主要な原則

1. **ビジネスドメインを中心に設計**
2. **ユビキタス言語の使用**
3. **境界づけられたコンテキストによる分割**
4. **モデル駆動設計**

### DDDの利点

- ビジネスとの整合性
- 変更に強い設計
- チーム間のコミュニケーション改善
- 複雑性の管理

## 📁 ディレクトリ構成

```
domain/
├── README.md                         # このファイル
├── overview/                         # 全体設計
│   ├── context-map.md               # コンテキストマップ
│   ├── ubiquitous-language.md       # ユビキタス言語集
│   └── architecture-decisions.md    # アーキテクチャ決定記録
├── contexts/                         # 境界づけられたコンテキスト
│   ├── README.md                    # コンテキスト一覧
│   ├── TEMPLATE.md                  # テンプレート
│   └── ingredient-management/       # 食材管理コンテキスト
└── shared-kernel/                    # 共有カーネル
    ├── README.md
    ├── value-objects.md
    └── domain-primitives.md
```

## 🔧 設計プロセス

### 1. 戦略的設計（Strategic Design）

1. ドメインの理解と分析
2. サブドメインの識別
3. 境界づけられたコンテキストの定義
4. コンテキストマップの作成
5. ユビキタス言語の確立

### 2. 戦術的設計（Tactical Design）

1. ドメインモデルの設計
   - エンティティ
   - 値オブジェクト
   - ドメインサービス
2. 集約の設計
3. リポジトリインターフェースの定義
4. ドメインイベントの設計
5. アプリケーションサービスの設計

## 📝 新しいコンテキストの追加方法

1. コンテキストマップを更新
2. `contexts/`ディレクトリに新しいフォルダを作成
3. 必要なドキュメントを作成
4. 共有する概念があれば`shared-kernel/`に追加

### 例：レシピ管理機能を追加する場合

```bash
mkdir -p contexts/recipe-management
cp contexts/TEMPLATE.md contexts/recipe-management/README.md
# 各ドキュメントを作成...
```

## 🏗️ 実装との関連

### ディレクトリマッピング

| DDDドキュメント                 | 実装ディレクトリ         |
| ------------------------------- | ------------------------ |
| contexts/ingredient-management/ | src/modules/ingredients/ |
| shared-kernel/                  | src/modules/shared/      |
| ドメインモデル                  | domain/models/           |
| リポジトリインターフェース      | domain/repositories/     |
| アプリケーションサービス        | application/services/    |

### レイヤーアーキテクチャ

```
┌─────────────────────────────────────┐
│      プレゼンテーション層            │ (UI/API)
├─────────────────────────────────────┤
│     アプリケーション層              │ (Use Cases)
├─────────────────────────────────────┤
│        ドメイン層                   │ (Business Logic)
├─────────────────────────────────────┤
│    インフラストラクチャ層            │ (DB/External Services)
└─────────────────────────────────────┘
```

## 🔍 重要な概念

### エンティティ（Entity）

- 一意の識別子を持つ
- ライフサイクルがある
- 例：食材（Ingredient）

### 値オブジェクト（Value Object）

- 識別子を持たない
- 不変
- 例：数量（Quantity）、賞味期限（ExpiryDate）

### 集約（Aggregate）

- トランザクション整合性の境界
- 集約ルートを通じてアクセス
- 例：食材集約

### ドメインサービス（Domain Service）

- エンティティや値オブジェクトに属さないドメインロジック
- 例：在庫チェックサービス

### ドメインイベント（Domain Event）

- ドメインで起きた重要な出来事
- 例：食材登録イベント、期限切れイベント

## 💡 ベストプラクティス

### DO

- ✅ ビジネス用語を使う
- ✅ 小さく始めて段階的に拡張
- ✅ ドメインエキスパートと協力
- ✅ テストしやすい設計
- ✅ 境界を明確に保つ

### DON'T

- ❌ 技術的な詳細をドメイン層に含める
- ❌ 巨大な集約を作る
- ❌ 境界を越えた直接参照
- ❌ 貧血ドメインモデル
- ❌ 過度に複雑な設計

## 🔗 参考資料

- [Eric Evans - Domain-Driven Design](https://www.domainlanguage.com/ddd/)
- [Vaughn Vernon - Implementing Domain-Driven Design](https://vaughnvernon.com/)
- [DDD Community](https://dddcommunity.org/)

## 📅 更新履歴

| 日付       | 内容     | 作成者  |
| ---------- | -------- | ------- |
| 2025-01-21 | 初版作成 | @system |
