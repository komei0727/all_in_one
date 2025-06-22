# ページネーション仕様

## 概要

大量のデータを効率的に取得するため、すべてのリスト系APIエンドポイントでページネーションをサポートします。

## ページネーション方式

### オフセットベース（採用）

- シンプルで理解しやすい
- ページ番号での移動が容易
- UIでのページネーション実装が簡単

### カーソルベース（将来検討）

- リアルタイムデータに強い
- 大規模データセットで高パフォーマンス
- 無限スクロールに最適

## リクエストパラメータ

### クエリパラメータ

| パラメータ | 型     | デフォルト | 最小値 | 最大値 | 説明                    |
| ---------- | ------ | ---------- | ------ | ------ | ----------------------- |
| page       | number | 1          | 1      | -      | ページ番号（1から開始） |
| limit      | number | 20         | 1      | 100    | 1ページあたりの件数     |

### リクエスト例

```
GET /api/v1/ingredients?page=2&limit=20
```

## レスポンス形式

### 成功レスポンス

```json
{
  "data": [
    {
      "id": "clm1234567890",
      "name": "牛乳",
      "categoryId": "clm0987654321",
      "quantity": 2,
      "unitId": "clm1111111111",
      "expiryDate": "2025-01-25T00:00:00Z"
    },
    {
      "id": "clm2345678901",
      "name": "卵",
      "categoryId": "clm0987654321",
      "quantity": 10,
      "unitId": "clm2222222222",
      "expiryDate": "2025-01-28T00:00:00Z"
    }
    // ... 最大でlimit件数分のデータ
  ],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true,
    "nextPage": 3,
    "prevPage": 1
  },
  "meta": {
    "timestamp": "2025-01-21T12:00:00Z",
    "version": "1.0.0"
  }
}
```

### paginationオブジェクトの説明

| フィールド | 型             | 説明                                 |
| ---------- | -------------- | ------------------------------------ |
| page       | number         | 現在のページ番号                     |
| limit      | number         | 1ページあたりの件数                  |
| total      | number         | 総レコード数                         |
| totalPages | number         | 総ページ数                           |
| hasNext    | boolean        | 次のページが存在するか               |
| hasPrev    | boolean        | 前のページが存在するか               |
| nextPage   | number \| null | 次のページ番号（存在しない場合null） |
| prevPage   | number \| null | 前のページ番号（存在しない場合null） |

## エラーケース

### ページ番号が範囲外

```json
{
  "error": {
    "code": "INVALID_PAGE",
    "message": "ページ番号が範囲外です",
    "details": {
      "requestedPage": 100,
      "totalPages": 8
    },
    "timestamp": "2025-01-21T12:00:00Z",
    "path": "/api/v1/ingredients?page=100"
  }
}
```

### 不正なパラメータ

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "パラメータが不正です",
    "details": {
      "page": ["1以上の整数を指定してください"],
      "limit": ["1以上100以下の整数を指定してください"]
    },
    "timestamp": "2025-01-21T12:00:00Z",
    "path": "/api/v1/ingredients?page=0&limit=1000"
  }
}
```

## 実装ガイド

### サーバー側実装（Prisma）

```typescript
interface PaginationParams {
  page?: number
  limit?: number
}

async function getPaginatedIngredients(params: PaginationParams) {
  const page = Math.max(1, params.page || 1)
  const limit = Math.max(1, Math.min(100, params.limit || 20))
  const skip = (page - 1) * limit

  // 総件数を取得
  const total = await prisma.ingredient.count()

  // データを取得
  const data = await prisma.ingredient.findMany({
    skip,
    take: limit,
    orderBy: { updatedAt: 'desc' },
  })

  // ページネーション情報を計算
  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null,
    },
  }
}
```

### クライアント側実装（TypeScript）

```typescript
// 型定義
interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  nextPage: number | null
  prevPage: number | null
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationInfo
  meta: {
    timestamp: string
    version: string
  }
}

// API関数
async function fetchIngredients(
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<Ingredient>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  const response = await fetch(`/api/v1/ingredients?${params}`)

  if (!response.ok) {
    throw new Error('Failed to fetch ingredients')
  }

  return response.json()
}
```

### React実装例

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

function IngredientsList() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['ingredients', { page, limit }],
    queryFn: () => fetchIngredients(page, limit),
    keepPreviousData: true, // ページ遷移時の体験向上
  });

  if (isLoading) return <Loading />;

  return (
    <div>
      {/* データ表示 */}
      <div>
        {data.data.map(ingredient => (
          <IngredientCard key={ingredient.id} {...ingredient} />
        ))}
      </div>

      {/* ページネーションコントロール */}
      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.totalPages}
        hasNext={data.pagination.hasNext}
        hasPrev={data.pagination.hasPrev}
        onPageChange={setPage}
      />
    </div>
  );
}
```

## パフォーマンス考慮事項

### インデックス

```sql
-- ソート用のインデックス
CREATE INDEX idx_ingredients_updated_at ON ingredients(updated_at DESC);
CREATE INDEX idx_ingredients_created_at ON ingredients(created_at DESC);
CREATE INDEX idx_ingredients_name ON ingredients(name);
```

### キャッシュ戦略

- 総件数のキャッシュ（1分間）
- ページデータのキャッシュ（条件付き）

### 大規模データセット対応

- 総件数の概算値使用（1万件以上の場合）
- カーソルベースへの移行検討

## ベストプラクティス

### DO

- ✅ デフォルト値を適切に設定（page=1, limit=20）
- ✅ 最大limit値を制限（100件）
- ✅ 総件数を含めてレスポンス
- ✅ 前後のページ情報を提供
- ✅ ページ遷移時のローディング表示

### DON'T

- ❌ 巨大なlimit値を許可
- ❌ ページ番号0を使用
- ❌ 負のページ番号を許可
- ❌ データなしで404エラー（空配列を返す）

## UI実装パターン

### ページ番号方式

```
[前へ] [1] [2] [3] ... [8] [次へ]
```

### 情報表示

```
156件中 21-40件を表示
```

### もっと見る方式

```
[もっと見る] (次の20件を追加読み込み)
```

## 将来の拡張

### カーソルベースの追加

```
GET /api/v1/ingredients?cursor=eyJpZCI6ImNsbTEyMzQ1Njc4OTAifQ&limit=20
```

### ソート機能の統合

```
GET /api/v1/ingredients?page=1&limit=20&sort=name&order=asc
```

### フィルタリング機能の統合

```
GET /api/v1/ingredients?page=1&limit=20&category=dairy&status=active
```

## 関連仕様

- [エラーハンドリング](./errors.md) - ページネーションエラーの詳細
- [API概要](./overview.md) - 基本的なAPI仕様
