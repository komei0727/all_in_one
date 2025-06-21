# 食材管理アプリ 実装計画書

## プロジェクト概要

一人暮らしの方向けの食材管理アプリケーション。買い物前の在庫確認と賞味期限管理による食材の無駄削減を目的とする。

## 技術スタック

### フロントエンド

- **Next.js 14.2.x (App Router)** - フルスタックフレームワーク
- **React 18.3.x** - UIライブラリ
- **TypeScript 5.4.x** - 型安全性の確保
- **Tailwind CSS 3.4.x** - ユーティリティファーストCSS
- **shadcn/ui (最新版)** - 再利用可能なUIコンポーネントライブラリ
- **React Hook Form 7.51.x** - フォーム状態管理
- **Zod 3.23.x** - スキーマバリデーション

### バックエンド・インフラ

- **データベース**
  - 開発環境: Docker PostgreSQL 15.x
  - 本番環境: Supabase PostgreSQL 15.x
- **ORM**
  - **Prisma 6.x** - 型安全なデータベースアクセス
  - マイグレーション管理
  - データベーススキーマからの型自動生成
- **Supabase** (本番環境のみ)
  - PostgreSQL 15.x - 食材データの永続化
  - Authentication - ユーザー認証（将来拡張用）
  - Row Level Security - データアクセス制御
  - Realtime - リアルタイム同期（将来拡張用）
- **Vercel** - ホスティング・自動デプロイ

### 開発環境

- **Node.js 20.x LTS** - JavaScript実行環境
- **pnpm 9.x** - 高速で効率的なパッケージマネージャー
- **ESLint 8.57.x** - JavaScript/TypeScriptリンター
- **Prettier 3.2.x** - コードフォーマッター
- **husky 9.0.x** - Gitフック管理
- **lint-staged 15.2.x** - ステージされたファイルへのリンター実行

### テスト環境

- **Vitest 1.6.x** - 高速な単体テストフレームワーク
- **Testing Library**
  - @testing-library/react 15.0.x
  - @testing-library/user-event 14.5.x

### 開発環境設定

#### TypeScript設定

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### ESLint設定

- Next.js推奨設定を基本とする
- TypeScript ESLintプラグイン
- Prettier連携
- カスタムルール:
  - import順序の自動整理
  - console.logの警告
  - 未使用変数のエラー

#### Prettier設定

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

#### Git設定

- `.gitignore`: Next.js標準 + 環境変数ファイル
- コミット前の自動チェック:
  - ESLint
  - Prettier
  - TypeScript型チェック

### ディレクトリ構造（モジュラーモノリス - 垂直スライス型）

```
/
├── src/
│   ├── app/                           # Next.js App Router（ルーティング層）
│   │   ├── (dashboard)/               # ダッシュボード関連ページグループ
│   │   │   ├── ingredients/           # 食材管理ページ（モジュールから提供）
│   │   │   ├── layout.tsx             # ダッシュボードレイアウト
│   │   │   └── page.tsx               # ダッシュボードトップ
│   │   ├── api/                       # API Routes
│   │   │   └── [...slug]/             # 動的APIルート（各モジュールにプロキシ）
│   │   │       └── route.ts           # APIルーティングハンドラー
│   │   ├── layout.tsx                 # ルートレイアウト
│   │   └── page.tsx                   # ランディングページ
│   │
│   ├── modules/                       # ビジネスモジュール（垂直スライス）
│   │   ├── ingredients/               # 食材管理モジュール
│   │   │   ├── client/                # クライアントサイド
│   │   │   │   ├── components/        # UIコンポーネント
│   │   │   │   │   ├── IngredientList.tsx
│   │   │   │   │   ├── IngredientForm.tsx
│   │   │   │   │   └── IngredientDetail.tsx
│   │   │   │   ├── hooks/             # カスタムフック
│   │   │   │   ├── stores/            # 状態管理
│   │   │   │   ├── services/          # APIクライアント
│   │   │   │   └── pages/             # ページコンポーネント
│   │   │   │       └── IngredientsPage.tsx
│   │   │   │
│   │   │   ├── server/                # サーバーサイド
│   │   │   │   ├── application/       # アプリケーション層
│   │   │   │   │   ├── use-cases/     # ユースケース
│   │   │   │   │   └── dto/           # データ転送オブジェクト
│   │   │   │   ├── domain/            # ドメイン層
│   │   │   │   │   ├── entities/      # エンティティ
│   │   │   │   │   ├── value-objects/ # 値オブジェクト
│   │   │   │   │   └── repositories/  # リポジトリインターフェース
│   │   │   │   ├── infrastructure/    # インフラストラクチャ層
│   │   │   │   │   ├── repositories/  # リポジトリ実装（Prisma使用）
│   │   │   │   │   └── database/      # DB接続
│   │   │   │   └── api/               # APIエンドポイント
│   │   │   │       └── routes.ts      # APIルート定義
│   │   │   │
│   │   │   ├── shared/                # モジュール内共有
│   │   │   │   ├── types/             # 型定義
│   │   │   │   ├── constants/         # 定数
│   │   │   │   └── utils/             # ユーティリティ
│   │   │   │
│   │   │   └── index.ts               # モジュールエクスポート
│   │   │
│   │   ├── auth/                      # 認証モジュール（将来実装）
│   │   │   ├── client/
│   │   │   ├── server/
│   │   │   ├── shared/
│   │   │   └── index.ts
│   │   │
│   │   ├── recipes/                   # レシピ管理モジュール（将来実装）
│   │   │   └── [同様の構造]
│   │   │
│   │   ├── meal-planning/             # 献立管理モジュール（将来実装）
│   │   │   └── [同様の構造]
│   │   │
│   │   └── shared/                    # モジュール間共有
│   │       ├── client/                # 共有クライアント
│   │       │   ├── components/        # 共通UIコンポーネント
│   │       │   │   └── ui/            # shadcn/ui
│   │       │   ├── hooks/             # 共通フック
│   │       │   └── utils/             # クライアントユーティリティ
│   │       │
│   │       ├── server/                # 共有サーバー
│   │       │   ├── middleware/        # 共通ミドルウェア
│   │       │   ├── database/          # DB基盤（Prismaクライアント）
│   │       │   └── utils/             # サーバーユーティリティ
│   │       │
│   │       └── types/                 # 共通型定義
│   │
│   ├── lib/                           # アプリケーション基盤
│   │   ├── api/                       # API基盤
│   │   ├── auth/                      # 認証基盤
│   │   ├── config/                    # 設定
│   │   └── prisma/                    # Prismaクライアント
│   │       └── client.ts              # Prismaシングルトン
│   │
│   └── styles/                        # グローバルスタイル
│       └── globals.css
│
├── tests/                             # テスト
│   └── modules/                       # モジュール別テスト
│       ├── ingredients/
│       └── shared/
│
├── prisma/                            # Prismaスキーマとマイグレーション
│   ├── schema.prisma                  # データベーススキーマ定義
│   ├── migrations/                    # マイグレーションファイル
│   └── seed.ts                        # シードスクリプト
│
├── public/                            # 静的ファイル
├── docker-compose.yml                 # ローカルPostgreSQL設定
├── .env.local                         # 環境変数
└── package.json
```

### モジュール間の依存関係ルール

1. **垂直スライス構成**

   - 各モジュールは独立した機能単位として完結
   - モジュール内でclient/server/sharedに分離
   - モジュール間の直接的な依存は禁止

2. **依存方向の制約**

   - 各モジュールは`shared`モジュールのみに依存可能
   - `lib`は全モジュールから利用可能
   - 循環依存は厳禁

3. **サーバーサイドレイヤー間の依存ルール**

   - api → application → domain ← infrastructure
   - domainは他層に依存しない（依存性逆転の原則）

4. **インポートパスエイリアス**
   ```typescript
   // tsconfig.json のパスマッピング
   "@/app/*": ["./src/app/*"],
   "@/modules/*": ["./src/modules/*"],
   "@/lib/*": ["./src/lib/*"],
   "@ingredients/*": ["./src/modules/ingredients/*"],
   "@shared/*": ["./src/modules/shared/*"],
   ```

### 各モジュールの構成と責務

#### ingredients（食材管理）モジュール

**client/**

- UIコンポーネント（一覧、詳細、フォーム）
- カスタムフック（データ取得、更新）
- 状態管理（TanStack Query）
- APIクライアント

**server/**

- APIエンドポイント定義
- ユースケース（CRUD操作、賞味期限チェック）
- ドメインモデル（Ingredient、ExpirationDate）
- データアクセス（Prisma経由のPostgreSQL操作）

**shared/**

- 型定義（Ingredient、Category等）
- 定数（カテゴリ一覧、単位等）
- バリデーションルール

#### shared（共有）モジュール

**client/**

- UIコンポーネントライブラリ（shadcn/ui）
- 共通レイアウト
- 汎用フック（useToast、useModal等）

**server/**

- 認証ミドルウェア
- エラーハンドリング
- データベース接続（Prismaクライアント）
- 共通バリデーター

### モジュール拡張の指針

新しいモジュールを追加する際は：

1. **独立性の確保**

   - `/src/modules/[module-name]/`に配置
   - client/server/sharedの3層構造を維持
   - 他モジュールへの直接依存を避ける

2. **APIルーティング**

   - `/src/app/api/[...slug]/route.ts`が各モジュールのAPIを動的にルーティング
   - 各モジュールは独自のAPIルートを定義

3. **ページ統合**

   - モジュールがページコンポーネントをエクスポート
   - App Routerでそれらを利用

4. **拡張例**
   ```
   modules/
   ├── recipes/          # レシピ管理
   ├── meal-planning/    # 献立計画
   ├── shopping-list/    # 買い物リスト
   └── nutrition/        # 栄養管理
   ```

### 将来的な分離を考慮した設計

1. **マイクロサービス化への移行パス**

   - 各モジュールが独立したサービスとして切り出し可能
   - APIインターフェースを変更せずに移行可能

2. **BFF（Backend for Frontend）導入**

   - 現在のAPI層をBFFとして独立させることが可能
   - GraphQL導入も容易

3. **マルチテナント対応**
   - モジュール単位でのテナント分離が可能
   - データベース分離も考慮した設計
