# 開発者ガイド

このガイドは、食材管理アプリケーションの開発環境セットアップから日常的な開発作業までを包括的にカバーしています。

## 目次

1. [開発環境のセットアップ](#開発環境のセットアップ)
2. [プロジェクトの初期設定](#プロジェクトの初期設定)
3. [開発フロー](#開発フロー)
4. [コーディング規約](#コーディング規約)
5. [データベース操作](#データベース操作)
6. [テスト](#テスト)
7. [デバッグ](#デバッグ)
8. [トラブルシューティング](#トラブルシューティング)
9. [パフォーマンス最適化](#パフォーマンス最適化)
10. [セキュリティ](#セキュリティ)

## 開発環境のセットアップ

### 前提条件

- macOS, Linux, またはWSL2
- Git
- Docker Desktop
- mise（推奨）またはNode.js 20.19.2 + pnpm 9.15.2

### 初期セットアップ手順

#### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd all_in_one
```

#### 2. Node.js環境の準備

**miseを使用する場合（推奨）:**

```bash
# miseのインストール（まだの場合）
curl https://mise.run | sh

# プロジェクトのツールをインストール
mise install
mise trust

# シェルのアクティベート
eval "$(mise activate bash)"  # bashの場合
# eval "$(mise activate zsh)"  # zshの場合
```

**直接インストールする場合:**

```bash
# Node.js 20.19.2をインストール
# pnpm 9.15.2をインストール
npm install -g pnpm@9.15.2
```

#### 3. 依存関係のインストール

```bash
pnpm install
```

#### 4. 環境変数の設定

```bash
cp .env.local.example .env.local
# .env.localを編集して必要な値を設定
```

主要な環境変数:

- `DATABASE_URL`: PostgreSQL接続文字列
- `NEXT_PUBLIC_APP_URL`: アプリケーションのURL

#### 5. データベースのセットアップ

```bash
# Dockerコンテナの起動
pnpm db:up

# データベースのマイグレーション
pnpm db:migrate

# 初期データの投入（オプション）
pnpm db:seed
```

#### 6. 開発サーバーの起動

```bash
pnpm dev
# http://localhost:3000 でアクセス
```

## プロジェクトの初期設定

### ディレクトリ構造

```
src/
├── app/              # Next.js App Router
├── modules/          # ビジネスモジュール
│   ├── ingredients/  # 食材管理モジュール
│   │   ├── client/   # クライアントサイドコード
│   │   ├── server/   # サーバーサイドコード
│   │   └── shared/   # 共有コード
│   └── shared/       # 共有モジュール
├── lib/              # アプリケーション基盤
│   ├── prisma/       # Prismaクライアント
│   └── config/       # 設定ファイル
└── styles/           # グローバルスタイル
```

### 主要な設定ファイル

- `.mise.toml` - Node.jsとpnpmのバージョン管理
- `tsconfig.json` - TypeScript設定
- `.eslintrc.json` - ESLint設定
- `.prettierrc.json` - Prettier設定
- `vitest.config.ts` - テスト設定

## 開発フロー

### 1. 新機能の開発

#### ブランチの作成

```bash
# Issueからブランチを作成
git checkout -b feature/issue-番号-機能名

# 例
git checkout -b feature/24-master-data-api
```

#### 実装の進め方

1. 対応するモジュールにコードを追加
2. テストを先に書く（TDD推奨）
3. 実装を行う
4. 型定義を適切に行う

#### 品質チェック

```bash
# 型チェック
pnpm type-check

# リント
pnpm lint

# フォーマット
pnpm format

# テスト
pnpm test

# すべてを一度に実行
pnpm type-check && pnpm lint && pnpm format:check && pnpm test
```

### 2. コミット規約

[Conventional Commits](https://www.conventionalcommits.org/)に従います：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**タイプ:**

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードスタイル（フォーマット等）
- `refactor`: リファクタリング
- `test`: テスト
- `chore`: ビルドプロセスやツールの変更

**例:**

```bash
git commit -m "feat(ingredients): add category master data API

- Implement GET /api/v1/ingredients/categories endpoint
- Add Prisma seed data for initial categories
- Include unit tests for the endpoint"
```

### 3. プルリクエスト

1. すべてのテストがパスすることを確認
2. プルリクエストを作成
3. レビューを受ける
4. マージ

## コーディング規約

### TypeScript

#### 基本原則

- strictモードを有効化
- any型の使用を避ける
- 明示的な型定義を推奨

```typescript
// ✅ Good - 型を明示的に定義
interface CreateIngredientDto {
  name: string
  categoryId: string
  quantity: {
    amount: number
    unitId: string
  }
  storageLocation?: {
    type: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
    detail?: string
  }
}

// ❌ Bad - any型の使用
const data: any = { name: 'Apple' }
```

### React

#### コンポーネント

- 関数コンポーネントのみ使用
- TypeScriptで型定義
- カスタムフックは`use`プレフィックス

```typescript
// ✅ Good
interface IngredientListProps {
  ingredients: Ingredient[]
  onEdit: (id: string) => void
}

export function IngredientList({ ingredients, onEdit }: IngredientListProps) {
  return (
    // ...
  )
}

// カスタムフック
export function useIngredients() {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: fetchIngredients,
  })
}
```

### インポート順序

ESLintが自動整理しますが、以下の順序を意識：

```typescript
// 1. React
import { useState, useEffect } from 'react'

// 2. 外部ライブラリ
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

// 3. 内部モジュール（@/...）
import { Button } from '@/modules/shared/client/components/ui'
import { useAuth } from '@/lib/auth'

// 4. 相対パス
import { IngredientList } from './components'
import type { Ingredient } from './types'
```

### 命名規則

- コンポーネント: PascalCase
- 関数・変数: camelCase
- 定数: UPPER_SNAKE_CASE
- 型・インターフェース: PascalCase

## データベース操作

### Prisma の基本操作

#### スキーマの変更

1. `prisma/schema.prisma`を編集
2. マイグレーションを作成

```bash
pnpm db:migrate
```

#### 開発中の一時的な変更

```bash
# スキーマを直接データベースに反映（マイグレーション作成なし）
pnpm db:push
```

#### データの確認

```bash
# Prisma Studioを起動
pnpm db:studio
```

### シードデータ

`prisma/seed.ts`でシードデータを定義：

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // カテゴリーマスタの作成
  await prisma.category.createMany({
    data: [
      { id: '1', name: '野菜', displayOrder: 1 },
      { id: '2', name: '肉類', displayOrder: 2 },
      { id: '3', name: '魚介類', displayOrder: 3 },
    ],
    skipDuplicates: true,
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

実行:

```bash
pnpm db:seed
```

## テスト

### 単体テスト

Vitestを使用：

```typescript
// src/modules/ingredients/server/services/ingredient.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { IngredientService } from './ingredient.service'

describe('IngredientService', () => {
  let service: IngredientService

  beforeEach(() => {
    service = new IngredientService()
  })

  describe('create', () => {
    it('should create a new ingredient', async () => {
      const input = {
        name: 'トマト',
        categoryId: '1',
        quantity: { amount: 3, unitId: '1' },
      }

      const result = await service.create(input)

      expect(result).toMatchObject({
        name: 'トマト',
        categoryId: '1',
      })
    })
  })
})
```

### APIエンドポイントテスト

```typescript
// src/app/api/v1/ingredients/route.test.ts
import { describe, it, expect } from 'vitest'
import { GET } from './route'

describe('GET /api/v1/ingredients', () => {
  it('should return ingredients list', async () => {
    const request = new Request('http://localhost:3000/api/v1/ingredients')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('ingredients')
    expect(Array.isArray(data.ingredients)).toBe(true)
  })
})
```

### テストの実行

```bash
# すべてのテスト
pnpm test

# ウォッチモード
pnpm test:watch

# カバレッジレポート
pnpm test:coverage
```

## デバッグ

### サーバーサイド

#### Prismaクエリのログ

```typescript
// src/lib/prisma/client.ts
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})
```

#### APIルートのデバッグ

```typescript
export async function GET(request: Request) {
  console.log('Request URL:', request.url)
  console.log('Request headers:', Object.fromEntries(request.headers))

  try {
    const data = await fetchData()
    return Response.json({ data })
  } catch (error) {
    console.error('API Error:', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

### クライアントサイド

#### React Query DevTools

```typescript
// src/app/providers.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
```

#### ブラウザのデバッグツール

- React Developer Tools
- Redux DevTools（必要に応じて）
- Network タブでAPIリクエストを確認

## トラブルシューティング

### よくある問題と解決方法

#### 1. pnpmコマンドが見つからない

```bash
# miseが有効化されていることを確認
mise doctor

# シェルを再読み込み
source ~/.bashrc  # または ~/.zshrc

# 手動でアクティベート
eval "$(mise activate bash)"
```

#### 2. データベース接続エラー

```bash
# Dockerが起動しているか確認
docker ps

# PostgreSQLコンテナの状態を確認
docker ps -a | grep postgres

# コンテナを再起動
pnpm db:down && pnpm db:up

# ログを確認
docker logs all_in_one_postgres
```

#### 3. 型エラーが解決しない

```bash
# TypeScriptのキャッシュをクリア
rm -rf node_modules/.cache

# node_modulesを再インストール
rm -rf node_modules pnpm-lock.yaml
pnpm install

# VSCodeの場合: TypeScriptサーバーを再起動
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

#### 4. Prismaの型が更新されない

```bash
# Prismaクライアントを再生成
pnpm exec prisma generate

# スキーマを再読み込み
pnpm db:push
```

#### 5. ESLintエラーが自動修正されない

```bash
# 手動で修正
pnpm lint:fix

# Prettierも含めて修正
pnpm format && pnpm lint:fix
```

## パフォーマンス最適化

### 1. バンドルサイズの分析

```bash
# Next.jsのバンドル分析ツールを起動
ANALYZE=true pnpm build
```

### 2. コンポーネントの最適化

```typescript
// メモ化を使用
import { memo, useMemo, useCallback } from 'react'

export const IngredientList = memo(function IngredientList({ ingredients }: Props) {
  const sortedIngredients = useMemo(
    () => ingredients.sort((a, b) => a.name.localeCompare(b.name)),
    [ingredients]
  )

  const handleClick = useCallback((id: string) => {
    // 処理
  }, [])

  return (
    // ...
  )
})
```

### 3. 画像の最適化

```typescript
import Image from 'next/image'

// Next.jsのImageコンポーネントを使用
<Image
  src="/images/ingredient.jpg"
  alt="Ingredient"
  width={300}
  height={200}
  loading="lazy"
/>
```

### 4. データフェッチの最適化

```typescript
// 並列フェッチ
const [ingredients, categories, units] = await Promise.all([
  fetchIngredients(),
  fetchCategories(),
  fetchUnits(),
])

// React Queryでのプリフェッチ
await queryClient.prefetchQuery({
  queryKey: ['ingredients'],
  queryFn: fetchIngredients,
})
```

## セキュリティ

### 1. 環境変数の管理

- `.env.local`は絶対にGitにコミットしない
- `.gitignore`で確実に除外
- 本番環境の値は環境変数で管理

### 2. 入力値の検証

```typescript
// Zodスキーマによる検証
const createIngredientSchema = z.object({
  name: z.string().min(1).max(50),
  categoryId: z.string().uuid(),
  quantity: z.object({
    amount: z.number().positive().max(9999.99),
    unitId: z.string().uuid(),
  }),
})

// APIルートでの使用
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = createIngredientSchema.parse(body)

    // 検証済みデータで処理を続行
    const result = await createIngredient(validatedData)
    return Response.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ errors: error.errors }, { status: 400 })
    }
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

### 3. SQLインジェクション対策

Prismaを使用することで自動的に対策されます：

```typescript
// ✅ 安全 - Prismaが自動的にエスケープ
const ingredients = await prisma.ingredient.findMany({
  where: {
    name: {
      contains: userInput,
    },
  },
})

// ❌ 危険 - 生のSQLは避ける
// const ingredients = await prisma.$queryRawUnsafe(
//   `SELECT * FROM ingredients WHERE name LIKE '%${userInput}%'`
// )
```

### 4. 認証・認可

```typescript
// APIルートでの認証チェック例
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getSession()

  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 認証済みユーザーのみアクセス可能な処理
  const ingredients = await fetchUserIngredients(session.userId)
  return Response.json({ ingredients })
}
```

### 5. CORS設定

```typescript
// next.config.mjs
export default {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}
```

## 関連ドキュメント

- [アーキテクチャ設計](./ARCHITECTURE.md)
- [プロジェクト概要（CLAUDE.md）](../CLAUDE.md)
- [API仕様](./api/README.md)
- [データベース設計](./database/README.md)
