# 食材一覧画面

## 1. 基本情報

- **画面ID**: SCREEN_INGREDIENT_LIST
- **パス**: /ingredients
- **作成日**: 2025-01-21
- **更新日**: 2025-01-21
- **ステータス**: 設計中
- **担当者**: @komei0727

## 2. 画面概要

### 目的

登録されている全ての食材を一覧表示し、検索・フィルタリング・ソート機能を提供することで、ユーザーが必要な食材情報に素早くアクセスできるようにする。

### ユーザーストーリー

ユーザーとして、家にある食材の一覧を見て、在庫状況や賞味期限を確認したい。また、特定の食材を素早く見つけたり、カテゴリー別に絞り込んだりしたい。

### 前提条件・制約

- **アクセス権限**: 認証不要（初期バージョン）
- **事前条件**: なし
- **画面の制約事項**: 大量データ（100件以上）でもパフォーマンスを維持

## 3. UI設計

### 画面構成

```
┌─────────────────────────────────────┐
│ ← 戻る        食材一覧        ➕追加 │
├─────────────────────────────────────┤
│ 🔍 食材を検索...                    │
├─────────────────────────────────────┤
│ フィルター: [全て▼] ソート: [更新日▼] │
├─────────────────────────────────────┤
│ ┌─────────────────────────────┐   │
│ │ 🥛 牛乳                      │   │
│ │ 500ml | 冷蔵 | あと3日       │   │
│ └─────────────────────────────┘   │
│ ┌─────────────────────────────┐   │
│ │ 🥚 卵                        │   │
│ │ 10個 | 冷蔵 | あと5日        │   │
│ └─────────────────────────────┘   │
│ ┌─────────────────────────────┐   │
│ │ 🥬 キャベツ                  │   │
│ │ 1個 | 冷蔵 | あと7日         │   │
│ └─────────────────────────────┘   │
│                                     │
│         もっと見る                  │
└─────────────────────────────────────┘
```

### コンポーネント構成

- **ヘッダー**: タイトル、戻るボタン、追加ボタン
- **メイン**:
  - 検索バー
  - フィルター/ソート選択
  - 食材リスト（カード形式）
  - ページネーション
- **フッター**: なし

### レスポンシブ対応

- **モバイル (< 768px)**: 1カラムリスト
- **タブレット (768px - 1024px)**: 2カラムグリッド
- **デスクトップ (> 1024px)**: 3カラムグリッド、最大幅1200px

## 4. 機能仕様

### アクション一覧

| アクション           | トリガー                     | 処理内容             | 結果                          |
| -------------------- | ---------------------------- | -------------------- | ----------------------------- |
| ホームへ戻る         | 「戻る」ボタンクリック       | ホーム画面へ遷移     | / へ遷移                      |
| 食材追加             | 「➕追加」ボタンクリック     | 食材登録画面へ遷移   | /ingredients/create へ遷移    |
| 食材検索             | 検索バーに入力               | 食材名で絞り込み     | リストを動的に更新            |
| カテゴリーフィルター | フィルタードロップダウン選択 | カテゴリーで絞り込み | リストを更新                  |
| ソート変更           | ソートドロップダウン選択     | 表示順を変更         | リストを並び替え              |
| 食材詳細表示         | 食材カードクリック           | 食材編集画面へ遷移   | /ingredients/[id]/edit へ遷移 |
| ページング           | 「もっと見る」クリック       | 次の20件を追加表示   | リストに追加                  |

### フォーム仕様

| フィールド           | 型     | 必須 | バリデーション | 初期値      |
| -------------------- | ------ | ---- | -------------- | ----------- |
| 検索キーワード       | string | No   | 最大50文字     | 空文字      |
| カテゴリーフィルター | string | No   | -              | "all"       |
| ソート順             | string | No   | -              | "updatedAt" |

### 画面遷移

- **前画面**: ホーム画面（/）
- **次画面**:
  - 食材登録画面（/ingredients/create）
  - 食材編集画面（/ingredients/[id]/edit）
- **エラー時**: エラーメッセージをトースト表示、リストは前回の状態を保持

## 5. API仕様

### 使用するAPI

#### 1. 食材一覧取得

- **エンドポイント**: `GET /api/v1/ingredients`
- **目的**: 食材の一覧を取得
- **呼び出しタイミング**:
  - 画面初期表示時
  - 検索/フィルター/ソート変更時
  - ページング時

**リクエスト**

```typescript
interface GetIngredientsParams {
  search?: string // 検索キーワード
  categoryId?: string // カテゴリーID（"all"の場合は全件）
  storageLocation?: string // 保存場所フィルタ
  hasStock?: boolean // 在庫有無フィルタ
  expiringWithinDays?: number // 期限切れ日数フィルタ
  includeExpired?: boolean // 期限切れ食材を含むか
  sortBy?: 'name' | 'updatedAt' | 'expiryDate' | 'quantity' // ソート項目
  sortOrder?: 'asc' | 'desc' // ソート順
  page?: number // ページ番号（1から開始）
  limit?: number // 1ページあたりの件数（デフォルト: 20）
}
```

**レスポンス**

```typescript
interface IngredientsListResponse {
  data: Array<{
    id: string
    name: string
    category: {
      id: string
      name: string
    }
    quantity: {
      amount: number
      unit: {
        id: string
        name: string
        symbol: string
        type: 'COUNT' | 'WEIGHT' | 'VOLUME'
      }
    }
    storageLocation: {
      type: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
      detail?: string
    }
    bestBeforeDate: string | null // ISO 8601形式
    expiryDate: string | null // ISO 8601形式
    daysUntilExpiry: number | null
    expiryStatus: 'FRESH' | 'NEAR_EXPIRY' | 'EXPIRING_SOON' | 'CRITICAL' | 'EXPIRED'
    isExpired: boolean
    isExpiringSoon: boolean
    hasStock: boolean
    updatedAt: string // ISO 8601形式
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
    nextPage: number | null
    prevPage: number | null
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

#### 2. カテゴリー一覧取得

- **エンドポイント**: `GET /api/v1/ingredients/categories`
- **目的**: フィルター用のカテゴリー一覧を取得
- **呼び出しタイミング**: 画面初期表示時

**リクエスト**

```typescript
// パラメータなし
```

**レスポンス**

```typescript
interface CategoriesResponse {
  data: Array<{
    id: string
    name: string
    description: string | null
    displayOrder: number
    createdAt: string
    updatedAt: string
  }>
  meta: {
    timestamp: string
    version: string
  }
}
```

**エラーハンドリング**
| エラーコード | 処理 |
|------------|------|
| 400 | 検索条件をリセットして再取得 |
| 401 | （将来）ログイン画面へリダイレクト |
| 404 | 「食材が登録されていません」を表示 |
| 500 | 「データの取得に失敗しました」をトースト表示 |

## 6. 状態管理

### クライアント状態

```typescript
interface IngredientsListState {
  searchKeyword: string
  selectedCategoryId: string
  sortBy: 'name' | 'updatedAt' | 'expiryDate'
  sortOrder: 'asc' | 'desc'
  page: number
}
```

### サーバー状態（TanStack Query）

- **queryKey**:
  - `['ingredients', { search, categoryId, sortBy, sortOrder, page, limit }]`
  - `['categories']`
- **キャッシュ戦略**:
  - 食材リスト: 1分間キャッシュ
  - カテゴリー: 10分間キャッシュ
- **再検証タイミング**:
  - ウィンドウフォーカス時
  - 他画面から戻ってきた時

### URL状態

- **クエリパラメータ**:
  - `?search=キーワード`
  - `?category=カテゴリーID`
  - `?sort=ソート項目`
  - `?order=asc|desc`
  - `?page=ページ番号`

## 7. 実装ガイド

### 使用コンポーネント

- **shadcn/ui**:
  - Input（検索バー）
  - Select（フィルター/ソート）
  - Card（食材カード）
  - Button（追加ボタン、もっと見る）
  - Skeleton（ローディング時）
  - Toast（エラー表示）
- **カスタムコンポーネント**:
  - IngredientCard
  - IngredientsFilter
  - IngredientsSort

### ディレクトリ構成

```
src/
├── app/ingredients/
│   └── page.tsx                    # 一覧画面
└── modules/ingredients/
    ├── components/
    │   ├── IngredientCard.tsx
    │   ├── IngredientsFilter.tsx
    │   └── IngredientsSort.tsx
    ├── hooks/
    │   ├── useIngredients.ts
    │   └── useCategories.ts
    └── api/
        └── ingredients.api.ts
```

### 実装時の注意点

- 無限スクロールではなく「もっと見る」ボタンで実装（UX向上）
- 検索は300ms のデバウンスを実装
- カテゴリーフィルターは即座に反映
- 日付表示は「あとX日」の相対表示と実際の日付を併記

### テスト観点

- [ ] **正常系**:
  - 食材一覧が表示される
  - 検索機能が動作する
  - フィルター/ソートが正しく動作する
  - ページングが動作する
- [ ] **異常系**:
  - APIエラー時のエラーメッセージ表示
  - ネットワークエラー時の処理
  - 空の検索結果の表示
- [ ] **エッジケース**:
  - 大量データ（1000件以上）の表示パフォーマンス
  - 日本語・英数字混在の検索
  - 同時に複数の操作をした場合の動作
