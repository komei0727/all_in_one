# 食材管理アプリケーション

一人暮らしの方向けの食材管理Webアプリケーション。買い物前の在庫確認と賞味期限管理により、食材の無駄を削減します。

## 🏗️ アーキテクチャ

**Enhanced Modular Monolith** - DDDベストプラクティスを完全統合した先進的なアーキテクチャ

### 主要特徴

- 🎯 **ドメイン駆動設計（DDD）**: ビジネスロジック中心の設計
- 🔄 **CQRS パターン**: 読み書き責務の最適分離
- 🔌 **Hexagonal Architecture**: 外部システムとの疎結合
- 📡 **Event-Driven**: ドメインイベントによる非同期処理
- 🏗️ **モジュラー構成**: 機能ごとの完全な独立性

### 📚 アーキテクチャ文書

- 🏗️ **[メインアーキテクチャ設計書](./docs/ARCHITECTURE.md)** - アーキテクチャ概要
- 📁 **[包括的設計資料](./docs/architecture/)** - 詳細な設計資料集
- 🎯 **[DDD設計資料](./docs/domain/)** - ドメイン駆動設計の詳細
- 📊 **[API設計資料](./docs/api/)** - RESTful API仕様
- 🗃️ **[データベース設計](./docs/database/)** - DB設計とマイグレーション

## 🚀 技術スタック

### フロントエンド

- **Next.js 14.2.x** (App Router)
- **React 18.3.x**
- **TypeScript 5.4.x**
- **Tailwind CSS 3.4.x**
- **shadcn/ui**
- **TanStack Query 5.64.x**

### バックエンド

- **Next.js API Routes**
- **Prisma 6.x** (ORM)
- **PostgreSQL 15**

### 開発環境

- **Node.js 20.19.2**
- **pnpm 9.15.2**
- **ESLint + Prettier**
- **Vitest**
- **Husky + lint-staged**

## 🛠️ セットアップ

### 前提条件

- Node.js 20.x
- pnpm 9.x
- Docker (PostgreSQL用)

### インストール

```bash
# 依存関係のインストール
pnpm install

# データベース起動
pnpm db:up

# データベースセットアップ
pnpm db:migrate
pnpm db:seed

# 開発サーバー起動
pnpm dev
```

## 📋 主要コマンド

### 開発

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # プロダクションビルド
pnpm start        # プロダクションサーバー起動
```

### データベース

```bash
pnpm db:up        # Docker PostgreSQL起動
pnpm db:down      # Docker PostgreSQL停止
pnpm db:migrate   # マイグレーション実行
pnpm db:push      # スキーマ同期（開発用）
pnpm db:studio    # Prisma Studio起動
pnpm db:seed      # シードデータ投入
```

### コード品質

```bash
pnpm lint         # ESLintチェック
pnpm lint:fix     # ESLint自動修正
pnpm format       # Prettierフォーマット
pnpm format:check # フォーマットチェック
pnpm type-check   # TypeScript型チェック
pnpm test         # テスト実行
```

### 一括品質チェック

```bash
pnpm type-check && pnpm lint && pnpm format:check
```

## 📖 プロジェクト構成

```
src/modules/
├── ingredients/          # 食材管理モジュール
│   ├── client/          # Presentation Layer
│   ├── server/          # Business Logic
│   │   ├── api/         # Web Adapters
│   │   ├── application/ # Command/Query Handlers
│   │   ├── domain/      # Domain Layer (DDD)
│   │   └── infrastructure/ # Infrastructure Layer
│   └── shared/          # Shared Kernel
└── shared/              # Global Shared
```

## 🎯 開発ガイドライン

### コードスタイル

- **TypeScript**: strict モード、明示的型定義
- **React**: 関数コンポーネント、カスタムフック活用
- **DDD**: Entity、Value Object、Domain Service の適切な使い分け
- **CQRS**: Command と Query の明確な分離

### コミット規則

Conventional Commits に従う：

- `feat:` 新機能
- `fix:` バグ修正
- `docs:` ドキュメント
- `refactor:` リファクタリング
- `test:` テスト

## 📚 開発者向けリソース

### 🆕 新規参加者

1. [セットアップガイド](./docs/SETUP_GUIDE.md)
2. [アーキテクチャ概要](./docs/ARCHITECTURE.md)
3. [開発ガイド](./docs/DEVELOPMENT_GUIDE.md)

### 🏗️ アーキテクチャ理解

1. [Enhanced Modular Monolith 設計書](./docs/architecture/ARCHITECTURE_ENHANCED.md)
2. [アーキテクチャパターン比較](./docs/architecture/ARCHITECTURE_PATTERNS_COMPARISON.md)
3. [DDD設計資料](./docs/domain/)

### 🔧 実装者向け

1. [実装計画](./docs/IMPLEMENTATION_PLAN.md)
2. [API仕様書](./docs/api/)
3. [データベース設計](./docs/database/)

## 🤝 貢献

### ワークフロー

1. Issue の作成/選択
2. フィーチャーブランチ作成: `git checkout -b feature/機能名`
3. 実装（TDD推奨）
4. 品質チェック: `pnpm type-check && pnpm lint && pnpm test`
5. Pull Request作成

### 実装方針

- **新規ファイルより既存ファイルの編集を優先**
- **DDDパターンの遵守**
- **テストファーストの開発**
- **段階的な機能追加**

## 📄 ライセンス

[MIT License](./LICENSE)

---

> 💡 **ヒント**: アーキテクチャの詳細を理解するため、まず [docs/architecture/](./docs/architecture/) の資料をご確認ください。
