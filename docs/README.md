# プロジェクトドキュメント

## 📚 ドキュメント一覧

### 基本ドキュメント

- [ユーザーストーリー](./USER_STORY.md) - 機能要件とユーザー視点の要求
- [実装計画書](./IMPLEMENTATION_PLAN.md) - 技術スタックと全体構成

### 設計ドキュメント

- [アーキテクチャ設計書](./ARCHITECTURE.md) - システム構造とモジュール設計
- [データベース設計書](./DATABASE_DESIGN.md) - テーブル構造とリレーション
- [API仕様書](./API_SPECIFICATION.md) - RESTful APIエンドポイント

### 開発ドキュメント

- [セットアップ手順書](./SETUP_GUIDE.md) - 環境構築の詳細手順
- [開発ガイド](./DEVELOPMENT_GUIDE.md) - 開発フローとベストプラクティス

## 🏗️ プロジェクト概要

**食材管理アプリケーション**

一人暮らしの方向けの在庫管理と賞味期限管理により、食材の無駄を削減するWebアプリケーション。

### 主な機能

- 📦 食材の在庫管理
- ⏰ 賞味期限アラート
- 📱 モバイル対応
- 🔍 カテゴリ別管理

## 🛠️ 技術スタック

- **フロントエンド**: Next.js 14.2, React 18.3, TypeScript 5.4
- **スタイリング**: Tailwind CSS 3.4, shadcn/ui
- **バックエンド**: Next.js API Routes, Prisma 6.x
- **データベース**: PostgreSQL 15 (Docker/Supabase)
- **開発ツール**: ESLint, Prettier, Vitest, Husky

## 🚀 クイックスタート

```bash
# 依存関係のインストール
pnpm install

# 環境変数の設定
cp .env.local.example .env.local

# データベースの起動
pnpm db:up

# 開発サーバーの起動
pnpm dev
```

詳細は[セットアップ手順書](./SETUP_GUIDE.md)を参照してください。

## 📂 プロジェクト構造

```
src/
├── app/              # Next.js App Router
├── modules/          # ビジネスモジュール（垂直スライス）
│   ├── ingredients/  # 食材管理
│   └── shared/       # 共有リソース
├── lib/              # アプリケーション基盤
└── styles/           # グローバルスタイル
```

詳細は[アーキテクチャ設計書](./ARCHITECTURE.md)を参照してください。

## 🤝 コントリビューション

1. Issueを作成または既存のIssueを選択
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: add amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

詳細は[開発ガイド](./DEVELOPMENT_GUIDE.md)を参照してください。
