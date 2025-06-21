# 食材管理アプリケーション セットアップ手順書

## 概要

このドキュメントは、食材管理アプリケーションの開発環境セットアップ手順を記載しています。
モジュラーモノリス構造を採用し、将来的な拡張性を考慮した設計となっています。

## セットアップフェーズ

### 1. Node.js環境の準備

**目的**: プロジェクトで使用するNode.jsとパッケージマネージャーのバージョンを統一

**実行内容**:

```bash
# mise設定ファイルの作成
cat > .mise.toml << EOF
[tools]
node = "20.19.2"
pnpm = "9.15.2"

[env]
NODE_ENV = "development"
EOF

# ツールのインストール
mise install
mise trust
```

**成果物**:

- `.mise.toml` - バージョン管理設定
- Node.js 20.19.2 (LTS)
- pnpm 9.15.2

---

### 2. Next.jsプロジェクトの初期化

**目的**: TypeScriptベースのNext.jsアプリケーションの基盤を構築

**実行内容**:

- マニュアルでNext.jsプロジェクトを構成
- 基本的なpackage.jsonの作成
- TypeScript、ESLint、Tailwind CSSの設定

**成果物**:

- `package.json` - プロジェクト設定
- `tsconfig.json` - TypeScript設定
- `next.config.mjs` - Next.js設定
- `tailwind.config.ts` - Tailwind CSS設定
- `postcss.config.mjs` - PostCSS設定

---

### 3. 基本的な依存関係のインストール

**目的**: アプリケーション開発に必要なライブラリを導入

**実行内容**:

```bash
# 本番依存関係
pnpm add react-hook-form@7.51.5 zod@3.23.8 \
  @tanstack/react-query@5.64.2 \
  @supabase/supabase-js@2.48.0 @supabase/ssr@0.6.1

# 開発依存関係
pnpm add -D prettier@3.2.5 eslint-config-prettier@9.1.0 \
  prettier-plugin-tailwindcss@0.6.10 \
  @typescript-eslint/parser@7.18.0 \
  @typescript-eslint/eslint-plugin@7.18.0 \
  husky@9.1.7 lint-staged@15.3.0 \
  @testing-library/react@16.1.0 \
  @testing-library/user-event@14.5.2 \
  vitest@1.6.0 @vitejs/plugin-react@4.3.3
```

**成果物**:

- フォーム管理: React Hook Form + Zod
- 状態管理: TanStack Query
- 認証・DB: Supabase関連ライブラリ
- 開発ツール: Prettier、ESLint、Vitest等

---

### 4. プロジェクトのディレクトリ構造作成

**目的**: モジュラーモノリス構造に基づいた拡張可能なディレクトリ構成を実現

**実行内容**:

```bash
mkdir -p src/{app,modules,lib,styles}
# その他、詳細なディレクトリ構造の作成
```

**成果物**:

```
src/
├── app/              # Next.js App Router
├── modules/          # ビジネスモジュール
│   ├── ingredients/  # 食材管理モジュール
│   └── shared/       # 共有モジュール
├── lib/              # アプリケーション基盤
└── styles/           # グローバルスタイル
```

---

### 5. 開発環境の設定ファイル作成

**目的**: コード品質を保つための開発ツールを設定

**実行内容**:

- ESLint設定（TypeScript対応、import順序整理）
- Prettier設定（コードフォーマット）
- Vitest設定（テスト環境）
- EditorConfig（エディタ設定統一）

**成果物**:

- `.eslintrc.json` - ESLint設定
- `.prettierrc.json` - Prettier設定
- `vitest.config.ts` - テスト設定
- `.editorconfig` - エディタ設定

---

### 6. Gitフックの設定

**目的**: コミット時の自動チェックでコード品質を維持

**実行内容**:

```bash
# Huskyの初期化
pnpm exec husky init

# フックの設定
- pre-commit: lint-stagedで自動整形
- pre-push: 型チェック
- commit-msg: Conventional Commits検証
```

**成果物**:

- `.husky/` - Gitフック設定
- `.lintstagedrc.json` - lint-staged設定

---

### 7. データベース設定（Prisma）

**目的**: 型安全なデータベースアクセスの基盤を構築

**実行内容**:

```bash
# Prismaのインストールと初期化
pnpm add -D prisma
pnpm add @prisma/client
pnpm exec prisma init
```

**成果物**:

- `prisma/schema.prisma` - スキーマ定義
- `docker-compose.yml` - ローカルPostgreSQL
- `src/lib/prisma/client.ts` - Prismaクライアント
- データベース操作用npmスクリプト

---

### 8. shadcn/ui基盤設定

**目的**: 再利用可能なUIコンポーネントライブラリの導入準備

**実行内容**:

- components.json作成（shadcn/ui設定）
- cnユーティリティ関数の作成
- CSS変数によるテーマ設定

**成果物**:

- `components.json` - shadcn/ui設定
- `src/modules/shared/client/utils/cn.ts` - クラス名結合ユーティリティ
- `src/styles/globals.css` - テーマ設定

---

### 9. 環境変数テンプレート作成

**目的**: 環境ごとの設定を管理しやすくする

**実行内容**:

- 環境変数テンプレートファイルの作成
- 型安全な環境変数アクセスの実装

**成果物**:

- `.env.example` - 全環境変数の説明
- `.env.local.example` - ローカル開発用
- `.env.production.example` - 本番環境用
- `src/lib/config/env.ts` - 型安全なアクセス

---

## セットアップ後の開発開始手順

1. **環境変数の設定**

   ```bash
   cp .env.local.example .env.local
   # .env.localを編集して必要な値を設定
   ```

2. **データベースの起動**

   ```bash
   pnpm db:up  # Docker PostgreSQLを起動
   ```

3. **開発サーバーの起動**

   ```bash
   pnpm dev    # http://localhost:3000
   ```

4. **コンポーネントの追加（必要に応じて）**
   ```bash
   pnpm dlx shadcn@latest add button
   ```

## 主要なnpmスクリプト

| コマンド          | 説明                 |
| ----------------- | -------------------- |
| `pnpm dev`        | 開発サーバー起動     |
| `pnpm build`      | プロダクションビルド |
| `pnpm lint`       | ESLintチェック       |
| `pnpm format`     | Prettierフォーマット |
| `pnpm type-check` | TypeScript型チェック |
| `pnpm test`       | テスト実行           |
| `pnpm db:up`      | ローカルDB起動       |
| `pnpm db:migrate` | マイグレーション実行 |
| `pnpm db:studio`  | Prisma Studio起動    |

## トラブルシューティング

### huskyのエラーが出る場合

```bash
# pnpmコマンドを直接実行
# 例: pnpm exec lint-staged
```

### データベース接続エラー

```bash
# Dockerが起動しているか確認
docker ps

# PostgreSQLコンテナを再起動
pnpm db:down && pnpm db:up
```

### 型エラーが解決しない場合

```bash
# TypeScriptキャッシュをクリア
rm -rf node_modules/.cache
pnpm type-check
```

## 関連ドキュメント

- [実装計画書](./IMPLEMENTATION_PLAN.md) - 技術スタックとアーキテクチャ
- [CLAUDE.md](../CLAUDE.md) - プロジェクト概要とAI開発指示
