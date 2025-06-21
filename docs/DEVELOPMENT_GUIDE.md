# 開発ガイド

## 開発環境のセットアップ

### 前提条件

- macOS, Linux, またはWSL2
- mise（またはNode.js 20.x + pnpm 9.x）
- Docker Desktop
- Git

### 初期セットアップ

1. **リポジトリのクローン**

   ```bash
   git clone <repository-url>
   cd all_in_one
   ```

2. **Node.js環境の準備**

   ```bash
   # miseを使用する場合
   mise install
   mise trust

   # または直接インストール
   # Node.js 20.xとpnpm 9.xをインストール
   ```

3. **依存関係のインストール**

   ```bash
   pnpm install
   ```

4. **環境変数の設定**

   ```bash
   cp .env.local.example .env.local
   # .env.localを編集
   ```

5. **データベースの起動**

   ```bash
   pnpm db:up
   ```

6. **開発サーバーの起動**
   ```bash
   pnpm dev
   # http://localhost:3000 でアクセス
   ```

## 開発フロー

### 1. 新機能の開発

1. **ブランチの作成**

   ```bash
   git checkout -b feature/feature-name
   ```

2. **実装**

   - 対応するモジュールに実装を追加
   - テストを作成
   - 型定義を適切に行う

3. **テストの実行**

   ```bash
   pnpm test
   pnpm type-check
   pnpm lint
   ```

4. **コミット**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   # Conventional Commitsに従う
   ```

### 2. コミットメッセージ規約

Conventional Commitsを使用：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**タイプ**:

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードスタイル
- `refactor`: リファクタリング
- `test`: テスト
- `chore`: 雑務

**例**:

```
feat(ingredients): add expiration date notification

Add a feature to notify users when ingredients are about to expire.
This includes:
- Background job for checking expiration dates
- Push notification integration
- UI updates for expired items
```

### 3. コードスタイル

#### TypeScript

```typescript
// ✅ Good - 型を明示的に定義
interface CreateIngredientInput {
  name: string
  quantity?: number
  unit?: string
}

// ❌ Bad - any型の使用
const data: any = { name: 'Apple' }
```

#### React

```typescript
// ✅ Good - 関数コンポーネント + TypeScript
interface IngredientListProps {
  ingredients: Ingredient[]
  onEdit: (id: string) => void
}

export function IngredientList({ ingredients, onEdit }: IngredientListProps) {
  return (
    // ...
  )
}

// ❌ Bad - PropTypesの使用
```

#### インポート順序

ESLintが自動整理しますが、以下の順序を意識：

```typescript
// 1. React
import React from 'react'

// 2. 外部ライブラリ
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

// 3. 内部モジュール
import { Button } from '@/modules/shared/client/components/ui'

// 4. 相対パス
import { IngredientList } from './components'
```

## データベース操作

### マイグレーション

```bash
# 新しいマイグレーションを作成
pnpm db:migrate

# マイグレーションを適用（開発環境）
pnpm db:push

# Prisma Studioでデータを確認
pnpm db:studio
```

### シードデータ

```typescript
// prisma/seed.ts
import { prisma } from '../src/lib/prisma/client'

async function main() {
  await prisma.ingredient.createMany({
    data: [
      { name: 'トマト', category: '野菜', status: 'AVAILABLE' },
      { name: '牛乳', category: '乳製品', status: 'LOW' },
    ],
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

## テスト

### 単体テスト

```typescript
// src/modules/ingredients/domain/entities/ingredient.test.ts
import { describe, it, expect } from 'vitest'
import { Ingredient } from './ingredient'

describe('Ingredient', () => {
  it('should create an ingredient', () => {
    const ingredient = new Ingredient({
      name: 'Apple',
      quantity: 5,
      unit: '個',
    })

    expect(ingredient.name).toBe('Apple')
    expect(ingredient.isExpired()).toBe(false)
  })
})
```

### 統合テスト

```typescript
// tests/api/ingredients.test.ts
import { describe, it, expect } from 'vitest'

describe('Ingredients API', () => {
  it('should return list of ingredients', async () => {
    const response = await fetch('/api/ingredients')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data.items)).toBe(true)
  })
})
```

## デバッグ

### サーバーサイド

```typescript
// Prismaクエリのログ出力
export const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})

// APIルートでのログ
export async function GET(request: Request) {
  console.log('Request headers:', request.headers)
  // ...
}
```

### クライアントサイド

```typescript
// React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}
```

## トラブルシューティング

### よくある問題

**1. pnpmコマンドが見つからない**

```bash
# miseが有効化されていることを確認
mise doctor

# miseをアクティベート
eval "$(mise activate bash)"
```

**2. データベース接続エラー**

```bash
# Dockerが起動しているか確認
docker ps

# コンテナを再起動
pnpm db:down && pnpm db:up
```

**3. 型エラーが解決しない**

```bash
# TypeScriptサーバーを再起動
# VSCodeの場合: Cmd+Shift+P → "TypeScript: Restart TS Server"

# または
rm -rf node_modules/.cache
pnpm type-check
```

**4. Prismaの型が更新されない**

```bash
pnpm exec prisma generate
```

## パフォーマンス最適化

### 1. バンドルサイズの確認

```bash
# Next.jsのバンドル分析
ANALYZE=true pnpm build
```

### 2. React DevTools Profiler

開発者ツールでコンポーネントのレンダリングパフォーマンスを確認

### 3. Lighthouse

Chrome DevToolsのLighthouseでパフォーマンススコアを確認

## セキュリティ

### 1. 環境変数

- `.env.local`はGitにコミットしない
- センシティブな情報は必ず環境変数で管理

### 2. 入力検証

```typescript
// 必ずサーバーサイドでも検証
const schema = z.object({
  name: z.string().min(1).max(100),
  quantity: z.number().positive().optional(),
})

export async function POST(request: Request) {
  const body = await request.json()
  const validated = schema.parse(body) // 検証エラーで例外
  // ...
}
```

### 3. SQLインジェクション対策

Prismaを使用することで自動的に対策される：

```typescript
// ✅ Safe
await prisma.ingredient.findMany({
  where: { name: userInput },
})

// ❌ Unsafe (使用しない)
await prisma.$queryRaw`SELECT * FROM ingredients WHERE name = ${userInput}`
```
