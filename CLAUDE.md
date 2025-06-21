# 食材管理アプリケーション

## 1. プロジェクト基本情報

### 概要

一人暮らしの方向けの食材管理Webアプリケーション。買い物前の在庫確認と賞味期限管理により、食材の無駄を削減する。

### アーキテクチャ

- **モジュラーモノリス（垂直スライス型）** - 将来的なマイクロサービス化を考慮
- **ドメイン駆動設計（DDD）** - ビジネスロジックの明確な分離

### ディレクトリ構造

```
src/
├── app/              # Next.js App Router
├── modules/          # ビジネスモジュール
│   ├── ingredients/  # 食材管理（client/server/shared）
│   └── shared/       # 共有リソース
├── lib/              # アプリケーション基盤
└── styles/           # グローバルスタイル
```

## 2. 技術スタック

### フロントエンド

- Next.js 14.2.x (App Router)
- React 18.3.x
- TypeScript 5.4.x
- Tailwind CSS 3.4.x
- shadcn/ui
- React Hook Form 7.51.x + Zod 3.23.x
- TanStack Query 5.64.x

### バックエンド

- Next.js API Routes
- Prisma 6.x (ORM)
- PostgreSQL 15 (開発: Docker, 本番: Supabase)

### 開発環境

- Node.js 20.19.2 (mise管理)
- pnpm 9.15.2
- ESLint + Prettier
- Vitest
- Husky + lint-staged

## 3. 共通コマンド

このプロジェクトではmiseのタスクランナーを使用しています。

### 開発

```bash
mise run dev          # 開発サーバー起動
mise run build        # プロダクションビルド
mise run start        # プロダクションサーバー起動
```

### データベース

```bash
mise run db:up        # Docker PostgreSQL起動
mise run db:down      # Docker PostgreSQL停止
mise run db:migrate   # マイグレーション実行
mise run db:push      # スキーマ同期（開発用）
mise run db:studio    # Prisma Studio起動
mise run db:seed      # シードデータ投入
```

### コード品質

```bash
mise run lint         # ESLintチェック
mise run lint:fix     # ESLint自動修正
mise run format       # Prettierフォーマット
mise run format:check # フォーマットチェック
mise run type-check   # TypeScript型チェック
mise run test         # テスト実行
```

### 便利なコマンド

```bash
mise run check        # 型チェック、リント、フォーマットを一括実行
mise run setup        # 初期セットアップ（依存関係、DB、マイグレーション、シード）
mise tasks            # 利用可能なタスクの一覧を表示
```

### UIコンポーネント追加

```bash
mise exec -- pnpm dlx shadcn@latest add <component-name>
```

## 4. コードスタイル

### TypeScript

- strictモード有効
- 明示的な型定義を推奨
- any型の使用は警告

### React

- 関数コンポーネントのみ使用
- カスタムフックは`use`プレフィックス
- コンポーネントはPascalCase

### インポート順序（自動整理）

1. React
2. 外部ライブラリ
3. 内部モジュール（@/...）
4. 相対パス

### コミットメッセージ

Conventional Commitsに従う：

- feat: 新機能
- fix: バグ修正
- docs: ドキュメント
- style: コードスタイル
- refactor: リファクタリング
- test: テスト
- chore: 雑務

## 5. ワークフロー

### 新機能開発

1. Issueの作成/選択
2. フィーチャーブランチ作成: `git checkout -b feature/名前`
3. 実装（TDD推奨）
4. テスト実行: `pnpm test && pnpm type-check && pnpm lint`
5. コミット（自動フォーマット適用）
6. Pull Request作成

### ファイル作成規則

- 新規ファイルより既存ファイルの編集を優先
- ドキュメントは明示的に要求された場合のみ作成
- コンポーネントは対応するモジュール内に配置

### Prismaワークフロー

1. `prisma/schema.prisma`でスキーマ定義
2. `pnpm db:migrate`でマイグレーション作成
3. 型は自動生成される

### デバッグ

- サーバーログ: ターミナルの出力確認
- クライアント: ブラウザ開発者ツール
- DB: `pnpm db:studio`でデータ確認

## 関連ドキュメント

詳細は`docs/`ディレクトリを参照：

- [アーキテクチャ設計](./docs/ARCHITECTURE.md)
- [データベース設計](./docs/DATABASE_DESIGN.md)
- [API仕様](./docs/API_SPECIFICATION.md)
- [開発ガイド](./docs/DEVELOPMENT_GUIDE.md)
