# 買い物モード画面

## 概要

買い物中の特殊な利用環境を考慮した専用画面。在庫状況を素早く確認でき、確認済み食材をマークして効率的な買い物をサポートする。

## ユーザーストーリー

**As a** 買い物中のユーザー  
**I want to** スマホで在庫状況を素早く確認したい  
**So that** 必要な食材を効率的に購入できる

## 利用コンテキスト分析

### 買い物中の制約

- **片手操作**: カートを押しながらの操作
- **短時間確認**: 通路で立ち止まっての素早い確認
- **明るい環境**: 店内照明下での視認性
- **集中力分散**: 他の買い物客への注意も必要

### 必要な機能

- **大きなタッチターゲット**: 誤操作防止
- **明確な色分け**: 瞬時の状況把握
- **クイックアクセス**: よく確認する食材の優先表示
- **セッション管理**: 買い物開始/終了の明確化

## UI要件

### レイアウト構造

```
┌─────────────────────────┐
│ Shopping Header         │
│ 🛒 買い物モード [終了]   │
│ ⏱️ 開始から 15分         │
├─────────────────────────┤
│ Quick Access           │
│ よく確認する食材         │
│ [トマト🟡] [牛乳🔴] [卵🟢] │
├─────────────────────────┤
│ Category Tabs          │
│ [野菜] [肉魚] [乳製品] [調味料] │
├─────────────────────────┤
│ Ingredients List       │
│ ┌─────────────────────┐ │
│ │ トマト         🟡   │ │
│ │ 在庫: 2個 (不足)    │ │
│ │ 期限: 残り3日   ✓   │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ きゅうり       🔴   │ │
│ │ 在庫: なし          │ │
│ │ 期限: -         ○   │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ にんじん       🟢   │ │
│ │ 在庫: 5本 (十分)    │ │
│ │ 期限: 残り1週   ✓   │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ Session Summary        │
│ 確認済み: 3/8 食材      │
└─────────────────────────┘
```

### 詳細仕様

#### 1. 買い物ヘッダー

- **モード表示**: 「🛒 買い物モード」で現在の状態を明示
- **終了ボタン**: 右上、大きなタッチターゲット（44px以上）
- **経過時間**: セッション開始からの時間表示
- **背景色**: 通常画面と区別するため薄いブルー系

#### 2. クイックアクセスエリア

```typescript
interface QuickAccessItem {
  ingredientId: string
  name: string
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  isChecked: boolean
  checkCount: number // 確認頻度
}

const quickAccessItems: QuickAccessItem[] = [
  {
    ingredientId: 'ing_tomato',
    name: 'トマト',
    stockStatus: 'LOW_STOCK',
    isChecked: true,
    checkCount: 15,
  },
]
```

**レイアウト**:

- **横スクロール**: 3-4個表示、スワイプで追加表示
- **大きなボタン**: 80px × 60px
- **状態色**: 背景色で在庫状況を表現

#### 3. カテゴリータブ

- **大きなタッチターゲット**: 最小48px高さ
- **バッジ表示**: 各カテゴリーの未確認食材数
- **横スクロール**: 全カテゴリーがスクロール可能

#### 4. 食材リスト

```typescript
interface ShoppingIngredientItem {
  id: string
  name: string
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  expiryStatus?: 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED'
  quantity: number
  unit: string
  daysUntilExpiry?: number
  isChecked: boolean
  checkedAt?: Date
}
```

**カードデザイン**:

- **高さ**: 最小80px（タッチしやすいサイズ）
- **左側**: 在庫状況インジケーター（20px幅の色帯）
- **中央**: 食材名と詳細情報
- **右側**: チェックボタン（44px × 44px）

**状態表示**:

```typescript
const shoppingStatusConfig = {
  OUT_OF_STOCK: {
    color: '#EF4444',
    bgColor: '#FEF2F2',
    text: '在庫なし',
    priority: 1,
  },
  LOW_STOCK: {
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    text: '在庫不足',
    priority: 2,
  },
  IN_STOCK: {
    color: '#10B981',
    bgColor: '#F0FDF4',
    text: '在庫あり',
    priority: 3,
  },
}
```

#### 5. セッションサマリー

- **確認進捗**: 「確認済み: 3/8 食材」
- **確認率**: プログレスバーで視覚化
- **セッション時間**: 継続時間の表示

### インタラクション設計

#### チェック機能

- **タップアクション**: カード全体またはチェックボタンをタップ
- **視覚フィードバック**:
  - チェック時: ✓ マーク表示 + 背景色変更
  - アニメーション: バウンスエフェクト
- **音響フィードバック**: 軽い振動（haptic feedback）

#### 状態管理

```typescript
interface ShoppingSession {
  id: string
  userId: string
  status: 'ACTIVE' | 'COMPLETED'
  startedAt: Date
  checkedItems: CheckedItem[]
  deviceType?: string
  location?: {
    placeName?: string
  }
}

interface CheckedItem {
  ingredientId: string
  ingredientName: string
  stockStatus: string
  expiryStatus?: string
  checkedAt: Date
}
```

### API仕様

#### セッション開始

**エンドポイント**: `POST /api/v1/shopping/sessions`

**リクエスト**:

```json
{
  "deviceType": "mobile",
  "location": {
    "placeName": "スーパーマーケット ABC"
  }
}
```

**レスポンス**:

```json
{
  "data": {
    "sessionId": "ses_abc123",
    "status": "ACTIVE",
    "startedAt": "2025-06-28T14:30:00Z"
  }
}
```

#### カテゴリー別食材取得

**エンドポイント**: `GET /api/v1/shopping/categories/{categoryId}/ingredients`

**レスポンス**:

```json
{
  "data": {
    "category": {
      "id": "cat_vegetable",
      "name": "野菜"
    },
    "ingredients": [
      {
        "id": "ing_tomato",
        "name": "トマト",
        "stockStatus": "LOW_STOCK",
        "expiryStatus": "EXPIRING_SOON",
        "daysUntilExpiry": 3,
        "currentQuantity": {
          "amount": 2,
          "unit": { "symbol": "個" }
        },
        "lastCheckedAt": null
      }
    ],
    "summary": {
      "totalItems": 5,
      "outOfStockCount": 1,
      "lowStockCount": 2,
      "expiringSoonCount": 1
    }
  }
}
```

#### 食材確認

**エンドポイント**: `POST /api/v1/shopping/sessions/{sessionId}/check/{ingredientId}`

**リクエスト**:

```json
{
  "stockStatus": "LOW_STOCK",
  "expiryStatus": "EXPIRING_SOON"
}
```

### 離脱・復帰対応

#### セッション継続

- **バックグラウンド対応**: アプリを閉じても30分間セッション維持
- **復帰時**: セッション状態の自動復元
- **通知**: 長時間未操作時の確認通知

#### データ同期

```typescript
// オフライン対応
const useShoppingSession = () => {
  const [session, setSession] = useState<ShoppingSession | null>(null)

  // ローカルストレージにセッション状態を保存
  useEffect(() => {
    if (session) {
      localStorage.setItem('shopping-session', JSON.stringify(session))
    }
  }, [session])

  // アプリ起動時にセッション復元
  useEffect(() => {
    const saved = localStorage.getItem('shopping-session')
    if (saved) {
      const parsedSession = JSON.parse(saved)
      // 30分以内のセッションのみ復元
      if (isSessionValid(parsedSession)) {
        setSession(parsedSession)
      }
    }
  }, [])
}
```

### レスポンシブ対応

#### Mobile (375px~)

- **クイックアクセス**: 3個表示
- **食材カード**: 全幅使用
- **タッチターゲット**: 最小44px

#### Large Mobile (414px~)

- **クイックアクセス**: 4個表示
- **食材カード**: より詳細な情報表示

#### Tablet (768px~)

- **2カラムレイアウト**: 左にリスト、右にサマリー
- **より多くの情報**: 購入履歴、おすすめ食材など

## PC版詳細設計

### 利用シナリオ

#### 1. 事前準備モード（自宅のPC）

- 買い物リストの作成
- 必要な食材の確認
- 購入予算の計算
- 店舗情報の確認

#### 2. 店舗内利用（タブレット・PC）

- リアルタイムでの在庫確認
- 購入チェック機能
- 価格比較・メモ機能

### 全体レイアウト (1200px以上)

```
┌─────────────────────────────────────────────────────────────┐
│                      Top Bar                                │
│ [🥗 Food Manager] [🛒 Shopping Mode] [Timer: 15:32] [終了]  │
├─────────────────────────────────────────────────────────────┤
│ Nav │                Shopping Dashboard              │ Cart  │
│     │                                                │ Panel │
│ [📊]│ ┌─────────────────────────────────────────────┐│       │
│ [🥗]│ │         Shopping Progress                   ││ 買い物リスト│
│ [🛒]│ │ [確認済み: 6/12] [予算: ¥1,250/¥2,000]     ││       │
│ [📈]│ └─────────────────────────────────────────────┘│ ✓トマト │
│     │                                                │ ○牛乳  │
│     │ ┌─────────────────┐ ┌─────────────────────────┐│ ○卵    │
│     │ │  Quick Check    │ │    Categories           ││ ○鶏肉  │
│     │ │                 │ │                         ││ ○玉ねぎ │
│     │ │ よく確認する食材  │ │ [野菜:3] [肉魚:2] [乳:1] ││       │
│     │ │ [トマト🟡] [牛乳🔴]│ │ [調味料:1] [その他:2]   ││ 合計予算│
│     │ │ [卵🟢] [鶏肉🔴]  │ │                         ││ ¥1,250 │
│     │ │                 │ │ [野菜] Selected:        ││       │
│     │ └─────────────────┘ │                         ││ Memo   │
│     │                     │ ┌──────┐ ┌──────┐ ┌──────┐││ ・特売  │
│     │ ┌─────────────────┐ │ │トマト │ │にんじん│ │玉ねぎ ││  セール │
│     │ │  購入履歴       │ │ │🟡不足│ │🟢十分 │ │🟢十分││       │
│     │ │                 │ │ │残2日 │ │残1週  │ │残2週 ││ Recent │
│     │ │ 前回: ¥1,800    │ │ │[✓]  │ │[○]   │ │[○] ││ ・トマト│
│     │ │ 平均: ¥2,100    │ │ └──────┘ └──────┘ └──────┘││  確認  │
│     │ │ 今月: ¥8,400    │ │                         ││  5分前 │
│     │ │                 │ │ [肉・魚] [乳製品] [調味料]││       │
│     │ └─────────────────┘ └─────────────────────────┘│       │
└─────────────────────────────────────────────────────────────┘
```

### 3カラムレイアウト

#### 左サイドバー: ショッピングツール

```jsx
const ShoppingToolsPanel = ({ session, stats, history }) => (
  <aside className="w-80 space-y-6 border-r border-gray-200 bg-white p-6">
    {/* セッション情報 */}
    <div className="rounded-lg bg-blue-50 p-4">
      <h2 className="mb-3 font-semibold text-blue-900">買い物セッション</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-blue-800">
          <span>開始時刻</span>
          <span>{format(session.startedAt, 'HH:mm')}</span>
        </div>
        <div className="flex justify-between text-blue-800">
          <span>経過時間</span>
          <span>{formatDuration(session.duration)}</span>
        </div>
        <div className="flex justify-between text-blue-800">
          <span>場所</span>
          <span>{session.location?.placeName || '未設定'}</span>
        </div>
      </div>
    </div>

    {/* クイックチェック */}
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 font-semibold">よく確認する食材</h3>
      <div className="grid grid-cols-2 gap-2">
        {frequentlyCheckedItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onQuickCheck(item.id)}
            className={`rounded-lg border-2 p-3 transition-all ${
              item.isChecked
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <div
                className={`mx-auto mb-1 h-4 w-4 rounded-full ${
                  item.stockStatus === 'OUT_OF_STOCK'
                    ? 'bg-red-500'
                    : item.stockStatus === 'LOW_STOCK'
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
              />
              <div className="text-xs font-medium">{item.name}</div>
              {item.isChecked && <Check className="mx-auto mt-1 h-4 w-4 text-green-600" />}
            </div>
          </button>
        ))}
      </div>
    </div>

    {/* 購入統計 */}
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 font-semibold">購入履歴</h3>
      <div className="space-y-3">
        <div className="text-sm">
          <div className="mb-1 flex justify-between">
            <span className="text-gray-600">前回の買い物</span>
            <span className="font-medium">¥{history.lastAmount}</span>
          </div>
          <div className="mb-1 flex justify-between">
            <span className="text-gray-600">平均予算</span>
            <span className="font-medium">¥{history.averageAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">今月の合計</span>
            <span className="font-medium">¥{history.monthlyTotal}</span>
          </div>
        </div>

        <div className="border-t pt-3">
          <h4 className="mb-2 text-sm font-medium text-gray-700">よく買う食材</h4>
          <div className="space-y-1">
            {history.frequentItems.slice(0, 5).map((item) => (
              <div key={item.name} className="flex justify-between text-xs">
                <span>{item.name}</span>
                <span className="text-gray-500">{item.frequency}回</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* 予算トラッカー */}
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 font-semibold">予算管理</h3>
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span>使用予算</span>
            <span>
              ¥{stats.currentSpend} / ¥{stats.budget}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className={`h-2 rounded-full ${
                stats.currentSpend > stats.budget
                  ? 'bg-red-500'
                  : stats.currentSpend > stats.budget * 0.8
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
              style={{
                width: `${Math.min(100, (stats.currentSpend / stats.budget) * 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setBudget(prompt('予算を入力', stats.budget))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs hover:bg-gray-50"
          >
            予算変更
          </button>
          <button
            onClick={() => resetSpending()}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs hover:bg-gray-50"
          >
            リセット
          </button>
        </div>
      </div>
    </div>
  </aside>
)
```

#### 中央エリア: カテゴリー別食材表示

```jsx
const ShoppingMainContent = ({
  categories,
  selectedCategory,
  onCategorySelect,
  ingredients,
  onIngredientCheck,
}) => (
  <main className="flex-1 p-6">
    {/* プログレスヘッダー */}
    <div className="mb-6 rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">買い物リスト確認</h1>
        <div className="text-sm text-gray-600">{format(new Date(), 'yyyy年MM月dd日 HH:mm')}</div>
      </div>

      {/* プログレスバー */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>確認済み食材</span>
          <span>
            {checkedItems.length}/{totalItems}件
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-200">
          <div
            className="h-3 rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(checkedItems.length / totalItems) * 100}%` }}
          />
        </div>
      </div>

      {/* 統計サマリー */}
      <div className="mt-4 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-red-50 p-3 text-center">
          <div className="text-lg font-semibold text-red-600">{outOfStockCount}</div>
          <div className="text-sm text-red-700">在庫切れ</div>
        </div>
        <div className="rounded-lg bg-yellow-50 p-3 text-center">
          <div className="text-lg font-semibold text-yellow-600">{lowStockCount}</div>
          <div className="text-sm text-yellow-700">在庫不足</div>
        </div>
        <div className="rounded-lg bg-green-50 p-3 text-center">
          <div className="text-lg font-semibold text-green-600">{inStockCount}</div>
          <div className="text-sm text-green-700">在庫十分</div>
        </div>
        <div className="rounded-lg bg-blue-50 p-3 text-center">
          <div className="text-lg font-semibold text-blue-600">{expiringSoonCount}</div>
          <div className="text-sm text-blue-700">期限間近</div>
        </div>
      </div>
    </div>

    {/* カテゴリータブ */}
    <div className="mb-6 flex space-x-1 rounded-lg bg-gray-100 p-1">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategorySelect(category.id)}
          className={`flex flex-1 items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition-all ${
            selectedCategory === category.id
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="mr-2">{category.icon}</span>
          {category.name}
          <span className="ml-2 rounded-full bg-gray-200 px-2 py-1 text-xs">
            {category.itemCount}
          </span>
        </button>
      ))}
    </div>

    {/* 食材グリッド */}
    <div className="grid grid-cols-3 gap-4">
      {ingredients.map((ingredient) => (
        <ShoppingIngredientCard
          key={ingredient.id}
          ingredient={ingredient}
          isChecked={checkedItems.includes(ingredient.id)}
          onCheck={() => onIngredientCheck(ingredient.id)}
          onAddToCart={() => onAddToCart(ingredient.id)}
        />
      ))}
    </div>

    {/* 一括操作 */}
    <div className="mt-6 flex justify-center space-x-3">
      <button
        onClick={() => checkAllInCategory(selectedCategory)}
        className="rounded-lg bg-blue-500 px-6 py-3 text-white transition-colors hover:bg-blue-600"
      >
        このカテゴリーをすべて確認
      </button>
      <button
        onClick={() => uncheckAllInCategory(selectedCategory)}
        className="rounded-lg border border-gray-300 px-6 py-3 text-gray-700 transition-colors hover:bg-gray-50"
      >
        このカテゴリーの確認を解除
      </button>
    </div>
  </main>
)
```

#### 右パネル: ショッピングカートとメモ

```jsx
const ShoppingCartPanel = ({ cartItems, notes, onAddNote, onRemoveItem, onUpdateQuantity }) => (
  <aside className="w-80 border-l border-gray-200 bg-white p-6">
    <div className="space-y-6">
      {/* ショッピングカート */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">買い物リスト</h2>

        {cartItems.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <ShoppingCart className="mx-auto mb-2 h-12 w-12 text-gray-300" />
            <p>買い物リストは空です</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border-2 p-3 transition-all ${
                  item.isChecked ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => onToggleCheck(item.id)}
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                        item.isChecked ? 'border-green-500 bg-green-500' : 'border-gray-300'
                      }`}
                    >
                      {item.isChecked && <Check className="h-4 w-4 text-white" />}
                    </button>

                    <div>
                      <div
                        className={`font-medium ${
                          item.isChecked ? 'text-green-800 line-through' : 'text-gray-900'
                        }`}
                      >
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.category} • {item.stockStatus}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* 数量調整 */}
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-xs text-gray-600">必要数量:</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* カート操作 */}
        <div className="mt-4 space-y-2">
          <button
            onClick={() => exportShoppingList()}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            <Download className="mr-2 inline h-4 w-4" />
            リストを出力
          </button>
          <button
            onClick={() => shareShoppingList()}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            <Share className="mr-2 inline h-4 w-4" />
            リストを共有
          </button>
        </div>
      </div>

      {/* メモ機能 */}
      <div>
        <h3 className="mb-3 font-semibold">買い物メモ</h3>

        <div className="mb-3 space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded border border-yellow-200 bg-yellow-50 p-2 text-sm"
            >
              <div className="flex items-start justify-between">
                <span>{note.text}</span>
                <button
                  onClick={() => onDeleteNote(note.id)}
                  className="text-yellow-600 hover:text-yellow-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-1 text-xs text-yellow-600">
                {formatDistanceToNow(note.createdAt, { locale: ja })}前
              </div>
            </div>
          ))}
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="メモを追加..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleAddNote}
            className="rounded-lg bg-blue-500 px-3 py-2 text-white hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 最近の活動 */}
      <div>
        <h3 className="mb-3 font-semibold">最近の確認</h3>
        <div className="space-y-2">
          {recentChecks.slice(0, 5).map((check) => (
            <div key={check.id} className="flex items-center space-x-2 text-sm">
              <div
                className={`h-2 w-2 rounded-full ${
                  check.action === 'checked' ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              <span className="flex-1">{check.ingredientName}</span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(check.timestamp, { locale: ja })}前
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </aside>
)
```

### 拡張されたショッピングカード

```jsx
const ShoppingIngredientCard = ({ ingredient, isChecked, onCheck, onAddToCart }) => (
  <div
    className={`rounded-lg border-2 bg-white p-4 transition-all hover:shadow-md ${
      isChecked ? 'border-green-500 bg-green-50' : 'border-gray-200'
    }`}
  >
    {/* ヘッダー */}
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div
          className={`h-4 w-4 rounded-full ${
            ingredient.stockStatus === 'OUT_OF_STOCK'
              ? 'bg-red-500'
              : ingredient.stockStatus === 'LOW_STOCK'
                ? 'bg-yellow-500'
                : 'bg-green-500'
          }`}
        />
        <span className="font-medium text-gray-900">{ingredient.name}</span>
      </div>

      <button
        onClick={onCheck}
        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
          isChecked ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-400'
        }`}
      >
        {isChecked && <Check className="h-4 w-4 text-white" />}
      </button>
    </div>

    {/* 情報 */}
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600">現在の在庫</span>
        <span
          className={`font-medium ${
            ingredient.stockStatus === 'OUT_OF_STOCK'
              ? 'text-red-600'
              : ingredient.stockStatus === 'LOW_STOCK'
                ? 'text-yellow-600'
                : 'text-green-600'
          }`}
        >
          {ingredient.currentQuantity.amount} {ingredient.currentQuantity.unit}
        </span>
      </div>

      {ingredient.daysUntilExpiry !== undefined && (
        <div className="flex justify-between">
          <span className="text-gray-600">期限</span>
          <span
            className={`font-medium ${
              ingredient.daysUntilExpiry <= 0
                ? 'text-red-600'
                : ingredient.daysUntilExpiry <= 3
                  ? 'text-yellow-600'
                  : 'text-green-600'
            }`}
          >
            {ingredient.daysUntilExpiry <= 0
              ? '期限切れ'
              : ingredient.daysUntilExpiry === 1
                ? '明日'
                : `残り${ingredient.daysUntilExpiry}日`}
          </span>
        </div>
      )}

      {ingredient.threshold && (
        <div className="flex justify-between">
          <span className="text-gray-600">推奨在庫</span>
          <span className="font-medium text-gray-700">
            {ingredient.threshold} {ingredient.currentQuantity.unit}
          </span>
        </div>
      )}
    </div>

    {/* アクション */}
    <div className="mt-3 border-t border-gray-200 pt-3">
      <div className="flex space-x-2">
        <button
          onClick={() => onAddToCart(ingredient.id)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
            ingredient.stockStatus === 'OUT_OF_STOCK'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : ingredient.stockStatus === 'LOW_STOCK'
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ShoppingCart className="mr-1 inline h-4 w-4" />
          カートに追加
        </button>
      </div>
    </div>

    {/* 価格情報（あれば） */}
    {ingredient.averagePrice && (
      <div className="mt-2 text-center text-xs text-gray-500">
        平均価格: ¥{ingredient.averagePrice}
      </div>
    )}
  </div>
)
```

### キーボードショートカット

```typescript
const shoppingModeShortcuts = {
  // ナビゲーション
  Tab: () => focusNextIngredient(),
  'Shift+Tab': () => focusPreviousIngredient(),

  // チェック操作
  Space: () => toggleCurrentIngredient(),
  Enter: () => addCurrentToCart(),

  // カテゴリー切替
  '1': () => selectCategory('vegetable'),
  '2': () => selectCategory('meat-fish'),
  '3': () => selectCategory('dairy'),
  '4': () => selectCategory('seasoning'),

  // 一括操作
  'Ctrl+A': () => checkAllInCategory(),
  'Ctrl+Shift+A': () => uncheckAllInCategory(),

  // セッション操作
  S: () => saveSession(),
  E: () => endSession(),
  N: () => addNote(),

  // 表示切替
  V: () => toggleView(),
  F: () => toggleFullscreen(),
}
```

### オフライン対応

```jsx
const OfflineShoppingMode = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingActions, setPendingActions] = useState([])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncPendingActions()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleIngredientCheck = (ingredientId, status) => {
    const action = {
      type: 'INGREDIENT_CHECK',
      ingredientId,
      status,
      timestamp: new Date(),
      id: generateLocalId(),
    }

    if (isOnline) {
      syncAction(action)
    } else {
      setPendingActions((prev) => [...prev, action])
      // ローカルストレージに保存
      localStorage.setItem('pending-shopping-actions', JSON.stringify([...pendingActions, action]))
    }
  }

  return (
    <div className="relative">
      {!isOnline && (
        <div className="mb-4 border-l-4 border-yellow-500 bg-yellow-100 p-4">
          <div className="flex">
            <Wifi className="mr-2 h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-yellow-700">オフライン状態です。確認状況は自動で同期されます。</p>
              {pendingActions.length > 0 && (
                <p className="mt-1 text-sm text-yellow-600">
                  {pendingActions.length}件の変更が同期待ちです。
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
    </div>
  )
}
```

### アクセシビリティ

#### 視覚的配慮

- **高コントラスト**: 店内照明下での視認性
- **大きなフォントサイズ**: 最小16px
- **明確な色分け**: 色覚異常ユーザーへの配慮

#### 操作性

- **音声読み上げ**: スクリーンリーダー対応
- **振動フィードバック**: 操作確認
- **大きなタッチエリア**: 誤操作防止

### エラーハンドリング

#### ネットワーク問題

```typescript
const OfflineIndicator = () => (
  <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
    <div className="flex">
      <div className="ml-3">
        <p className="text-sm text-yellow-700">
          オフライン状態です。確認状況は自動で同期されます。
        </p>
      </div>
    </div>
  </div>
)
```

#### セッション期限切れ

```typescript
const SessionExpiredModal = ({ onRestart }) => (
  <Modal>
    <div className="text-center p-6">
      <h3 className="text-lg font-semibold mb-4">
        セッションが期限切れです
      </h3>
      <p className="text-gray-600 mb-6">
        新しい買い物セッションを開始しますか？
      </p>
      <button onClick={onRestart} className="bg-primary text-white px-6 py-2 rounded">
        新しいセッションを開始
      </button>
    </div>
  </Modal>
)
```

## 技術実装

### Component構造

```
ShoppingModePage
├── ShoppingHeader
│   ├── ModeIndicator
│   ├── ElapsedTimer
│   └── ExitButton
├── QuickAccessSection
│   └── QuickAccessItem
├── CategoryTabs
│   └── CategoryTab
├── IngredientsShoppingList
│   └── ShoppingIngredientCard
│       ├── StatusIndicator
│       ├── IngredientInfo
│       └── CheckButton
├── SessionSummary
└── OfflineIndicator (conditional)
```

### 状態管理

```typescript
export const useShoppingMode = () => {
  const [session, setSession] = useState<ShoppingSession | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const startSession = useMutation({
    mutationFn: startShoppingSession,
    onSuccess: (newSession) => {
      setSession(newSession)
      // セッション開始の分析イベント
      analytics.track('shopping_session_started', {
        sessionId: newSession.id,
        deviceType: 'mobile',
      })
    },
  })

  const checkIngredient = useMutation({
    mutationFn: ({ ingredientId, status }) =>
      checkIngredientInSession(session.id, ingredientId, status),
    onSuccess: (checkedItem) => {
      setSession((prev) => ({
        ...prev,
        checkedItems: [...prev.checkedItems, checkedItem],
      }))
    },
  })

  return {
    session,
    isOnline,
    startSession: startSession.mutate,
    checkIngredient: checkIngredient.mutate,
    endSession: () => setSession(null),
  }
}
```

## 今後の拡張

### フェーズ2機能

- **音声入力**: 「トマトを確認」の音声コマンド
- **位置情報連携**: 店舗に応じた商品配置ガイド
- **価格比較**: 複数店舗での価格情報表示

### フェーズ3機能

- **AR機能**: カメラで商品を認識して自動チェック
- **レシート連携**: 購入レシートの自動読み取り
- **共有リスト**: 家族との買い物リスト共有
