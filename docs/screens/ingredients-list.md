# 食材一覧画面

## 概要

カテゴリー別に食材を整理し、在庫状況を視覚的に把握できる画面。検索・フィルター機能により必要な食材を素早く見つけられる。

## ユーザーストーリー

**As a** 食材を管理するユーザー  
**I want to** カテゴリー別に食材を確認したい  
**So that** 料理や買い物の計画を効率的に立てられる

## UI要件

### レイアウト構造

```
┌─────────────────────────┐
│ Header                  │
│ [← Back] [検索] [フィルター] │
├─────────────────────────┤
│ Category Tabs           │
│ [全て][野菜][肉・魚][乳製品] │
├─────────────────────────┤
│ Search & Filter Bar     │
│ 🔍 [検索ボックス] [🔧]    │
├─────────────────────────┤
│ Ingredients Grid        │
│ ┌──────┐ ┌──────┐       │
│ │トマト │ │鶏肉  │       │
│ │🟢 3個│ │🔴 0g │       │
│ │残2日 │ │期限切│       │
│ └──────┘ └──────┘       │
│ ┌──────┐ ┌──────┐       │
│ │牛乳  │ │卵    │       │
│ │🟡 1L │ │🟢 10個│      │
│ │残3日 │ │残1週 │       │
│ └──────┘ └──────┘       │
├─────────────────────────┤
│ FAB                     │
│        [+ 追加]          │
└─────────────────────────┘
```

### 詳細仕様

#### 1. ヘッダー

- **戻るボタン**: ダッシュボードへ戻る
- **検索アイコン**: 検索バーの表示/非表示切り替え
- **フィルターアイコン**: フィルターパネル表示

#### 2. カテゴリータブ

```typescript
interface CategoryTab {
  id: string
  name: string
  count: number // 該当食材数
  isActive: boolean
}

const categories: CategoryTab[] = [
  { id: 'all', name: '全て', count: 15, isActive: true },
  { id: 'vegetable', name: '野菜', count: 5, isActive: false },
  { id: 'meat-fish', name: '肉・魚', count: 3, isActive: false },
  { id: 'dairy', name: '乳製品', count: 2, isActive: false },
  { id: 'seasoning', name: '調味料', count: 3, isActive: false },
  { id: 'other', name: 'その他', count: 2, isActive: false },
]
```

#### 3. 検索・フィルターバー

- **検索ボックス**: 食材名での部分一致検索
- **フィルターボタン**: 在庫状況・期限・保存場所での絞り込み

#### 4. 食材グリッド

```typescript
interface IngredientCard {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  expiryStatus: 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED'
  daysUntilExpiry?: number
  image?: string
}
```

**カードデザイン仕様**:

- **サイズ**: 160px × 120px（モバイル）
- **グリッド**: 2カラム（モバイル）、3-4カラム（タブレット以上）
- **画像**: 上部40%
- **テキスト**: 下部60%

**状態表示**:

```typescript
const stockStatusColors = {
  IN_STOCK: '#10B981', // Green
  LOW_STOCK: '#F59E0B', // Yellow
  OUT_OF_STOCK: '#EF4444', // Red
}

const expiryStatusBadges = {
  FRESH: { color: '#10B981', text: '新鮮' },
  EXPIRING_SOON: { color: '#F59E0B', text: '残り{n}日' },
  EXPIRED: { color: '#EF4444', text: '期限切れ' },
}
```

#### 5. フローティングアクションボタン（FAB）

- **位置**: 右下固定
- **アイコン**: プラスマーク
- **アクション**: 食材登録画面へ遷移

### インタラクション設計

#### タッチジェスチャー

- **タップ**: 食材詳細画面へ遷移
- **長押し**: クイックアクションメニュー表示（編集/削除/消費）
- **スワイプ**: カテゴリータブの横スクロール

#### アニメーション

- **カテゴリー切り替え**: スライドイン/アウト
- **フィルター適用**: フェードイン/アウト
- **FABアクション**: バウンスエフェクト

### データフロー

```typescript
interface IngredientsListData {
  ingredients: IngredientCard[]
  categories: CategoryTab[]
  filters: {
    searchQuery: string
    selectedCategory: string
    stockStatus?: string[]
    expiryStatus?: string[]
    storageLocation?: string[]
  }
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}
```

### API仕様

**エンドポイント**: `GET /api/v1/ingredients`

**クエリパラメータ**:

```typescript
interface IngredientsQuery {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  stockStatus?: string[]
  expiryStatus?: string[]
  storageLocation?: string[]
  sortBy?: 'name' | 'updatedAt' | 'expiryDate' | 'quantity'
  sortOrder?: 'asc' | 'desc'
}
```

**レスポンス例**:

```json
{
  "data": [
    {
      "id": "ing_abc123",
      "name": "トマト",
      "category": {
        "id": "cat_vegetable",
        "name": "野菜"
      },
      "quantity": 3,
      "unit": {
        "symbol": "個"
      },
      "stockStatus": "LOW_STOCK",
      "expiryStatus": "EXPIRING_SOON",
      "daysUntilExpiry": 2,
      "storageLocation": {
        "type": "REFRIGERATED",
        "detail": "野菜室"
      },
      "updatedAt": "2025-06-28T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### フィルター仕様

#### フィルターパネル

```typescript
interface FilterOptions {
  stockStatus: {
    label: string
    value: string
    color: string
    count: number
  }[]
  expiryStatus: {
    label: string
    value: string
    color: string
    count: number
  }[]
  storageLocation: {
    label: string
    value: string
    icon: React.ReactNode
    count: number
  }[]
}

const filterOptions: FilterOptions = {
  stockStatus: [
    { label: '在庫あり', value: 'IN_STOCK', color: '#10B981', count: 10 },
    { label: '在庫不足', value: 'LOW_STOCK', color: '#F59E0B', count: 3 },
    { label: '在庫切れ', value: 'OUT_OF_STOCK', color: '#EF4444', count: 2 },
  ],
  expiryStatus: [
    { label: '新鮮', value: 'FRESH', color: '#10B981', count: 8 },
    { label: '期限間近', value: 'EXPIRING_SOON', color: '#F59E0B', count: 5 },
    { label: '期限切れ', value: 'EXPIRED', color: '#EF4444', count: 2 },
  ],
  storageLocation: [
    { label: '冷蔵庫', value: 'REFRIGERATED', icon: '❄️', count: 8 },
    { label: '冷凍庫', value: 'FROZEN', icon: '🧊', count: 2 },
    { label: '常温', value: 'ROOM_TEMPERATURE', icon: '🌡️', count: 5 },
  ],
}
```

### 空状態デザイン

#### 初回利用時

```typescript
const EmptyStateFirst = () => (
  <div className="text-center py-12">
    <div className="text-6xl mb-4">🥗</div>
    <h3 className="text-lg font-semibold mb-2">
      食材を追加して始めましょう
    </h3>
    <p className="text-gray-500 mb-6">
      最初の食材を登録して、在庫管理を始めてみませんか？
    </p>
    <button className="bg-primary text-white px-6 py-2 rounded-lg">
      食材を追加する
    </button>
  </div>
)
```

#### 検索結果なし

```typescript
const EmptyStateSearch = ({ query }: { query: string }) => (
  <div className="text-center py-12">
    <div className="text-4xl mb-4">🔍</div>
    <h3 className="text-lg font-semibold mb-2">
      「{query}」が見つかりません
    </h3>
    <p className="text-gray-500 mb-6">
      別のキーワードで検索するか、新しく食材を追加してください
    </p>
    <button className="bg-primary text-white px-6 py-2 rounded-lg">
      「{query}」を追加する
    </button>
  </div>
)
```

### レスポンシブ対応

#### Mobile (375px~)

- **グリッド**: 2カラム
- **カードサイズ**: 160px × 120px
- **タブ**: 横スクロール

#### Tablet (768px~)

- **グリッド**: 3カラム
- **カードサイズ**: 180px × 140px
- **タブ**: 全表示

#### Desktop (1024px~)

- **グリッド**: 4-5カラム
- **カードサイズ**: 200px × 160px
- **サイドバー**: フィルターを左側に常時表示

## PC版詳細設計

### 全体レイアウト (1200px以上)

```
┌─────────────────────────────────────────────────────────────┐
│                        Top Bar                              │
│ [🥗 Food Manager] [🔍 食材を検索...] [🛒] [🔔] [👤]         │
├─────────────────────────────────────────────────────────────┤
│ Nav │             Ingredients List                   │ Detail│
│     │                                                │ Panel │
│ [📊]│ ┌─────────────────────────────────────────────┐│       │
│ [🥗]│ │  [全て:15] [野菜:5] [肉魚:3] [乳製品:2]     ││ [食材詳細]│
│ [🛒]│ └─────────────────────────────────────────────┘│       │
│ [📈]│                                                │ 🍅トマト│
│     │ Filters  │         Grid View               │  │       │
│     │ 在庫状況  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│ 残り2日│
│     │ ☑在庫あり │ │トマト │ │鶏肉  │ │牛乳  │ │卵    ││ 在庫:2個│
│     │ ☑在庫不足 │ │🟡3個 │ │🔴0g  │ │🟡1L  │ │🟢12個││       │
│     │ □在庫切れ │ │残2日 │ │期限切│ │残3日 │ │残1週 ││ Actions│
│     │          │ └──────┘ └──────┘ └──────┘ └──────┘│ [編集] │
│     │ 期限状況  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│ [消費] │
│     │ ☑新鮮    │ │にんじん│ │玉ねぎ │ │醤油  │ │砂糖  ││ [削除] │
│     │ ☑期限間近 │ │🟢5本 │ │🟢3個 │ │🟢500ml │ │🟢1kg ││       │
│     │ □期限切れ │ │残1週 │ │残1週 │ │残6月 │ │残1年 ││       │
│     │          │ └──────┘ └──────┘ └──────┘ └──────┘│       │
│     │ 保存場所  │                                    │       │
│     │ ☑冷蔵庫  │ ┌─────────────────────────────────┐│       │
│     │ ☑冷凍庫  │ │         ページネーション          ││       │
│     │ ☑常温    │ │  ← 1 2 3 4 5 →  (15件中1-8件) ││       │
│     │          │ └─────────────────────────────────┘│       │
└─────────────────────────────────────────────────────────────┘
```

### 3カラムレイアウト

#### 左サイドバー: 高度なフィルター

```jsx
const AdvancedFiltersPanel = ({ filters, onFilterChange }) => (
  <aside className="w-64 border-r border-gray-200 bg-white p-6">
    <h2 className="mb-6 text-lg font-semibold">フィルター</h2>

    {/* カテゴリーフィルター */}
    <div className="mb-8">
      <h3 className="mb-3 font-medium text-gray-900">カテゴリー</h3>
      <div className="space-y-2">
        {categories.map((category) => (
          <label key={category.id} className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={filters.categories.includes(category.id)}
              onChange={(e) => handleCategoryFilter(category.id, e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="flex items-center text-sm text-gray-700">
              <span className="mr-2">{category.icon}</span>
              {category.name}
              <span className="ml-auto text-xs text-gray-500">({category.count})</span>
            </span>
          </label>
        ))}
      </div>
    </div>

    {/* 在庫状況フィルター */}
    <div className="mb-8">
      <h3 className="mb-3 font-medium text-gray-900">在庫状況</h3>
      <div className="space-y-2">
        {stockStatusOptions.map((status) => (
          <label key={status.value} className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={filters.stockStatus.includes(status.value)}
              onChange={(e) => handleStockStatusFilter(status.value, e.target.checked)}
              className="rounded border-gray-300"
            />
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="text-sm text-gray-700">{status.label}</span>
              <span className="ml-auto text-xs text-gray-500">({status.count})</span>
            </div>
          </label>
        ))}
      </div>
    </div>

    {/* 期限状況フィルター */}
    <div className="mb-8">
      <h3 className="mb-3 font-medium text-gray-900">期限状況</h3>
      <div className="space-y-2">
        {expiryStatusOptions.map((status) => (
          <label key={status.value} className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={filters.expiryStatus.includes(status.value)}
              onChange={(e) => handleExpiryStatusFilter(status.value, e.target.checked)}
              className="rounded border-gray-300"
            />
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="text-sm text-gray-700">{status.label}</span>
              <span className="ml-auto text-xs text-gray-500">({status.count})</span>
            </div>
          </label>
        ))}
      </div>
    </div>

    {/* 価格範囲フィルター */}
    <div className="mb-8">
      <h3 className="mb-3 font-medium text-gray-900">価格範囲</h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600">最小価格</label>
          <input
            type="number"
            value={filters.priceRange.min}
            onChange={(e) => handlePriceRangeChange('min', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="¥0"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">最大価格</label>
          <input
            type="number"
            value={filters.priceRange.max}
            onChange={(e) => handlePriceRangeChange('max', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="¥9999"
          />
        </div>
      </div>
    </div>

    {/* フィルター操作 */}
    <div className="space-y-2">
      <button
        onClick={clearAllFilters}
        className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        すべてクリア
      </button>
      <button
        onClick={saveFilterPreset}
        className="w-full rounded-md border border-blue-300 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
      >
        フィルターを保存
      </button>
    </div>
  </aside>
)
```

#### 中央エリア: 拡張グリッドビュー

```jsx
const EnhancedIngredientsGrid = ({
  ingredients,
  view,
  onViewChange,
  selectedItems,
  onSelectionChange,
}) => (
  <main className="flex-1 p-6">
    {/* ツールバー */}
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-bold text-gray-900">食材一覧</h1>
        <span className="text-sm text-gray-500">{ingredients.length}件の食材</span>
      </div>

      <div className="flex items-center space-x-3">
        {/* 表示切替 */}
        <div className="flex rounded-lg border border-gray-300">
          <button
            onClick={() => onViewChange('grid')}
            className={`rounded-l-lg px-3 py-2 text-sm ${
              view === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewChange('list')}
            className={`px-3 py-2 text-sm ${
              view === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewChange('table')}
            className={`rounded-r-lg px-3 py-2 text-sm ${
              view === 'table' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
            }`}
          >
            <Table className="h-4 w-4" />
          </button>
        </div>

        {/* ソート */}
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          onChange={(e) => handleSortChange(e.target.value)}
        >
          <option value="name">名前順</option>
          <option value="updatedAt">更新日順</option>
          <option value="expiryDate">期限順</option>
          <option value="quantity">在庫順</option>
        </select>

        {/* 一括操作 */}
        {selectedItems.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{selectedItems.length}件選択中</span>
            <button className="rounded-lg bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600">
              一括削除
            </button>
          </div>
        )}
      </div>
    </div>

    {/* グリッドビュー */}
    {view === 'grid' && (
      <div className="grid grid-cols-4 gap-6">
        {ingredients.map((ingredient) => (
          <EnhancedIngredientCard
            key={ingredient.id}
            ingredient={ingredient}
            isSelected={selectedItems.includes(ingredient.id)}
            onSelect={() => onSelectionChange(ingredient.id)}
            onAction={(action) => handleIngredientAction(ingredient.id, action)}
          />
        ))}
      </div>
    )}

    {/* リストビュー */}
    {view === 'list' && (
      <div className="space-y-3">
        {ingredients.map((ingredient) => (
          <IngredientListItem
            key={ingredient.id}
            ingredient={ingredient}
            isSelected={selectedItems.includes(ingredient.id)}
            onSelect={() => onSelectionChange(ingredient.id)}
          />
        ))}
      </div>
    )}

    {/* テーブルビュー */}
    {view === 'table' && (
      <IngredientsTable
        ingredients={ingredients}
        selectedItems={selectedItems}
        onSelectionChange={onSelectionChange}
      />
    )}
  </main>
)
```

#### 右サイドパネル: 食材詳細とアクション

```jsx
const IngredientDetailPanel = ({ ingredient, onClose, onAction }) => (
  <aside className="w-80 border-l border-gray-200 bg-white p-6">
    {ingredient ? (
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">食材詳細</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 食材情報 */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-lg bg-gray-100">
            {ingredient.image ? (
              <img
                src={ingredient.image}
                alt={ingredient.name}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <span className="text-3xl">{ingredient.category.icon}</span>
            )}
          </div>
          <h3 className="text-xl font-semibold text-gray-900">{ingredient.name}</h3>
          <p className="text-sm text-gray-600">{ingredient.category.name}</p>
        </div>

        {/* ステータス */}
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <span className="text-sm font-medium text-gray-700">在庫状況</span>
            <StockStatusBadge status={ingredient.stockStatus} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <span className="text-sm font-medium text-gray-700">期限状況</span>
            <ExpiryStatusBadge
              status={ingredient.expiryStatus}
              daysUntilExpiry={ingredient.daysUntilExpiry}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <span className="text-sm font-medium text-gray-700">現在の在庫</span>
            <span className="font-medium">
              {ingredient.currentQuantity.amount} {ingredient.currentQuantity.unit}
            </span>
          </div>
        </div>

        {/* クイックアクション */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">クイックアクション</h4>

          <button
            onClick={() => onAction('consume')}
            className="flex w-full items-center justify-center rounded-lg bg-blue-500 px-4 py-3 text-white transition-colors hover:bg-blue-600"
          >
            <Minus className="mr-2 h-4 w-4" />
            消費する
          </button>

          <button
            onClick={() => onAction('replenish')}
            className="flex w-full items-center justify-center rounded-lg bg-green-500 px-4 py-3 text-white transition-colors hover:bg-green-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            補充する
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onAction('edit')}
              className="flex items-center justify-center rounded-lg border border-gray-300 px-4 py-3 text-gray-700 hover:bg-gray-50"
            >
              <Edit className="mr-2 h-4 w-4" />
              編集
            </button>

            <button
              onClick={() => onAction('delete')}
              className="flex items-center justify-center rounded-lg border border-red-300 px-4 py-3 text-red-600 hover:bg-red-50"
            >
              <Trash className="mr-2 h-4 w-4" />
              削除
            </button>
          </div>
        </div>

        {/* 詳細情報 */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">詳細情報</h4>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">保存場所</span>
              <span className="font-medium">
                {ingredient.storageLocation.type === 'REFRIGERATED'
                  ? '冷蔵庫'
                  : ingredient.storageLocation.type === 'FROZEN'
                    ? '冷凍庫'
                    : '常温'}
                {ingredient.storageLocation.detail && ` (${ingredient.storageLocation.detail})`}
              </span>
            </div>

            {ingredient.price && (
              <div className="flex justify-between">
                <span className="text-gray-600">価格</span>
                <span className="font-medium">¥{ingredient.price}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">追加日</span>
              <span className="font-medium">
                {format(new Date(ingredient.createdAt), 'yyyy/MM/dd')}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">最終更新</span>
              <span className="font-medium">
                {formatDistanceToNow(new Date(ingredient.updatedAt), { locale: ja })}前
              </span>
            </div>
          </div>
        </div>

        {/* メモ */}
        {ingredient.memo && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">メモ</h4>
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{ingredient.memo}</p>
          </div>
        )}
      </div>
    ) : (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <div className="text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p>食材を選択してください</p>
        </div>
      </div>
    )}
  </aside>
)
```

### テーブルビュー設計

```jsx
const IngredientsTable = ({ ingredients, selectedItems, onSelectionChange }) => (
  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="w-8 px-4 py-3">
            <input
              type="checkbox"
              checked={selectedItems.length === ingredients.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300"
            />
          </th>
          <th className="px-4 py-3 text-left font-medium text-gray-900">食材名</th>
          <th className="px-4 py-3 text-left font-medium text-gray-900">カテゴリー</th>
          <th className="px-4 py-3 text-left font-medium text-gray-900">在庫</th>
          <th className="px-4 py-3 text-left font-medium text-gray-900">期限</th>
          <th className="px-4 py-3 text-left font-medium text-gray-900">保存場所</th>
          <th className="px-4 py-3 text-left font-medium text-gray-900">価格</th>
          <th className="px-4 py-3 text-left font-medium text-gray-900">更新日</th>
          <th className="w-24 px-4 py-3"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {ingredients.map((ingredient) => (
          <tr
            key={ingredient.id}
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => onIngredientSelect(ingredient)}
          >
            <td className="px-4 py-3">
              <input
                type="checkbox"
                checked={selectedItems.includes(ingredient.id)}
                onChange={(e) => {
                  e.stopPropagation()
                  onSelectionChange(ingredient.id)
                }}
                className="rounded border-gray-300"
              />
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100">
                  <span className="text-sm">{ingredient.category.icon}</span>
                </div>
                <span className="font-medium text-gray-900">{ingredient.name}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{ingredient.category.name}</td>
            <td className="px-4 py-3">
              <div className="flex items-center space-x-2">
                <StockStatusBadge status={ingredient.stockStatus} />
                <span className="text-sm font-medium">
                  {ingredient.currentQuantity.amount} {ingredient.currentQuantity.unit}
                </span>
              </div>
            </td>
            <td className="px-4 py-3">
              <ExpiryStatusBadge
                status={ingredient.expiryStatus}
                daysUntilExpiry={ingredient.daysUntilExpiry}
              />
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              {ingredient.storageLocation.type === 'REFRIGERATED'
                ? '冷蔵庫'
                : ingredient.storageLocation.type === 'FROZEN'
                  ? '冷凍庫'
                  : '常温'}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              {ingredient.price ? `¥${ingredient.price}` : '-'}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              {format(new Date(ingredient.updatedAt), 'MM/dd')}
            </td>
            <td className="px-4 py-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleQuickAction(ingredient.id)
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
```

### キーボードショートカット

```typescript
const ingredientsListShortcuts = {
  // ナビゲーション
  J: () => selectNextItem(),
  K: () => selectPreviousItem(),
  Enter: () => openSelectedItem(),
  Space: () => toggleSelectedItem(),

  // アクション
  E: () => editSelectedItem(),
  D: () => deleteSelectedItem(),
  C: () => consumeSelectedItem(),
  R: () => replenishSelectedItem(),

  // 表示切替
  '1': () => setView('grid'),
  '2': () => setView('list'),
  '3': () => setView('table'),

  // フィルター
  F: () => focusFilters(),
  Escape: () => clearFilters(),

  // 一括操作
  'Ctrl+A': () => selectAll(),
  'Ctrl+D': () => deselectAll(),
  Delete: () => deleteSelected(),
}
```

### ドラッグ&ドロップ機能

```jsx
const DraggableIngredientCard = ({ ingredient, onDrop }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'ingredient',
    item: { id: ingredient.id, type: 'ingredient' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <div ref={drag} className={`ingredient-card ${isDragging ? 'opacity-50' : ''}`}>
      {/* カード内容 */}
    </div>
  )
}

const CategoryDropZone = ({ category, onDrop }) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'ingredient',
    drop: (item) => onDrop(item.id, category.id),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  return (
    <div ref={drop} className={`category-zone ${isOver ? 'border-blue-300 bg-blue-50' : ''}`}>
      {category.name}
    </div>
  )
}
```

### パフォーマンス最適化

#### 仮想スクロール

```typescript
// react-window を使用した仮想化
import { FixedSizeGrid as Grid } from 'react-window'

const VirtualizedIngredientGrid = ({ ingredients }) => (
  <Grid
    columnCount={2}
    columnWidth={180}
    height={600}
    rowCount={Math.ceil(ingredients.length / 2)}
    rowHeight={140}
    itemData={ingredients}
  >
    {IngredientGridItem}
  </Grid>
)
```

#### 画像遅延読み込み

```typescript
const IngredientImage = ({ src, alt }) => (
  <Image
    src={src}
    alt={alt}
    width={160}
    height={80}
    loading="lazy"
    placeholder="blur"
    blurDataURL="data:image/jpeg;base64,..."
  />
)
```

## 技術実装

### Component構造

```
IngredientsListPage
├── IngredientsHeader
│   ├── SearchButton
│   └── FilterButton
├── CategoryTabs
│   └── CategoryTab
├── SearchBar (conditional)
├── FilterPanel (conditional)
├── IngredientsGrid
│   └── IngredientCard
├── EmptyState (conditional)
├── LoadingState (conditional)
└── FloatingActionButton
```

### 状態管理

```typescript
export const useIngredientsList = () => {
  const [filters, setFilters] = useState<IngredientFilters>({
    searchQuery: '',
    selectedCategory: 'all',
    stockStatus: [],
    expiryStatus: [],
    storageLocation: [],
  })

  const { data, isLoading, error, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['ingredients', filters],
    queryFn: ({ pageParam = 1 }) => fetchIngredients({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
  })

  return {
    ingredients: data?.pages.flatMap((page) => page.data) || [],
    isLoading,
    error,
    filters,
    setFilters,
    loadMore: fetchNextPage,
    hasMore: hasNextPage,
  }
}
```

### アクセシビリティ

- **フォーカス管理**: 検索・フィルター操作時の適切なフォーカス移動
- **スクリーンリーダー**: 在庫状況・期限状況の音声読み上げ対応
- **キーボードナビゲーション**: グリッド内のTab移動
- **セマンティックHTML**: 適切なランドマークとheading構造

## 今後の拡張

### フェーズ2機能

- **並び替え**: ドラッグ&ドロップでカスタムソート
- **一括操作**: 複数選択での一括編集・削除
- **お気に入り**: よく使う食材のピン留め

### フェーズ3機能

- **ビュー切り替え**: カード/リスト/テーブル表示
- **タグ機能**: 自由なラベル付け
- **共有**: 食材リストの家族間共有
