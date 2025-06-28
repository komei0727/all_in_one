# ホーム画面（ダッシュボード）

## 概要

食材管理アプリのメイン画面。ユーザーが最初に目にする画面で、食材の全体状況を一目で把握でき、主要な機能に素早くアクセスできるダッシュボード。

## ユーザーストーリー

**As a** 一人暮らしのユーザー  
**I want to** 食材の状況を一目で把握したい  
**So that** 効率的に料理と買い物の計画を立てられる

## UI要件

### レイアウト構造

```
┌─────────────────────────┐
│ Header                  │
│ [Profile] [買い物モード]  │
├─────────────────────────┤
│ Status Cards            │
│ [期限切れ間近] [在庫切れ]  │
│ [期限切れ]   [全食材数]   │
├─────────────────────────┤
│ Quick Actions           │
│ [+ 食材追加] [📱 買い物]  │
├─────────────────────────┤
│ 要注意食材リスト          │
│ 🔴 期限切れ (2件)        │
│ 🟡 期限間近 (3件)        │
│ 🔵 在庫不足 (1件)        │
├─────────────────────────┤
│ 最近の活動              │
│ ・トマト を消費 (2時間前) │
│ ・牛乳 を追加 (1日前)    │
└─────────────────────────┘
```

### 詳細仕様

#### 1. ヘッダー

- **アプリ名/ロゴ**: 左上に配置
- **プロフィールアイコン**: 右上、タップでプロフィール画面へ
- **買い物モードボタン**: 右上、緊急性の高いアクション

#### 2. ステータスカード（4つのグリッド）

```typescript
interface StatusCard {
  title: string
  count: number
  color: 'red' | 'yellow' | 'blue' | 'gray'
  icon: React.ReactNode
  action: () => void
}

const statusCards: StatusCard[] = [
  {
    title: "期限切れ間近",
    count: 3,
    color: "yellow",
    icon: <Clock />,
    action: () => navigate('/ingredients?filter=expiring-soon')
  },
  {
    title: "在庫切れ",
    count: 2,
    color: "red",
    icon: <AlertTriangle />,
    action: () => navigate('/ingredients?filter=out-of-stock')
  }
]
```

#### 3. クイックアクション

- **食材追加**: 最も頻繁に使用する機能、目立つ配置
- **買い物モード**: 外出先での利用を想定、アクセスしやすく

#### 4. 要注意食材リスト

- **優先度順**: 期限切れ > 期限間近 > 在庫不足
- **展開可能**: 初期は件数のみ、タップで詳細表示
- **アクション**: 各食材をタップで詳細画面へ

#### 5. 最近の活動

- **時系列**: 最新5件を表示
- **アクション種別**: 追加/消費/編集を色分けまたはアイコンで区別

### インタラクション設計

#### タッチターゲット

- **最小サイズ**: 44px（Apple推奨）
- **間隔**: 8px以上確保

#### アニメーション

- **データ読み込み**: スケルトンローディング
- **状態変化**: フェードイン/アウト
- **ナビゲーション**: スライドアニメーション

### データフロー

```typescript
interface DashboardData {
  statusSummary: {
    expiringAfterDays: number // 期限切れ間近の件数
    outOfStock: number // 在庫切れの件数
    expired: number // 期限切れの件数
    totalIngredients: number // 全食材数
  }
  criticalItems: {
    expired: IngredientSummary[]
    expiringSoon: IngredientSummary[]
    lowStock: IngredientSummary[]
  }
  recentActivities: Activity[]
}

interface IngredientSummary {
  id: string
  name: string
  category: string
  daysUntilExpiry?: number
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
}
```

### API仕様

**エンドポイント**: `GET /api/v1/dashboard`

**レスポンス例**:

```json
{
  "data": {
    "statusSummary": {
      "expiringAfterDays": 3,
      "outOfStock": 2,
      "expired": 0,
      "totalIngredients": 15
    },
    "criticalItems": {
      "expired": [],
      "expiringSoon": [
        {
          "id": "ing_abc123",
          "name": "牛乳",
          "category": "乳製品",
          "daysUntilExpiry": 2,
          "stockStatus": "IN_STOCK"
        }
      ],
      "lowStock": [
        {
          "id": "ing_def456",
          "name": "トマト",
          "category": "野菜",
          "stockStatus": "LOW_STOCK"
        }
      ]
    },
    "recentActivities": [
      {
        "type": "CONSUME",
        "ingredientName": "トマト",
        "timestamp": "2025-06-28T10:30:00Z",
        "quantity": 1
      }
    ]
  }
}
```

### レスポンシブ対応

#### Mobile First (375px~)

- **4つのカード**: 2x2グリッド
- **クイックアクション**: 縦並び
- **リスト項目**: 全幅使用

#### Tablet (768px~)

- **4つのカード**: 4x1 横並び
- **クイックアクション**: 横並び
- **サイドバー**: 最近の活動を右側に配置

#### Desktop (1024px~)

- **グリッドレイアウト**: 3カラム構成
- **詳細情報**: より多くの情報を表示

## PC版詳細設計

### 全体レイアウト (1200px以上)

```
┌─────────────────────────────────────────────────────────────┐
│                        Top Bar                              │
│ [🥗 Food Manager] [🔍検索] [🛒3] [🔔2] [👤 User] [⚙️]      │
├─────────────────────────────────────────────────────────────┤
│ Nav │                Main Dashboard                  │ Quick │
│     │                                                │ Panel │
│ [📊]│ ┌─────────────────────────────────────────────┐│       │
│ [🥗]│ │           Status Overview                   ││ [+食材]│
│ [🛒]│ │ [期限間近:3] [在庫切れ:2] [期限切れ:0] [全:15]││ [🛒開始]│
│ [📈]│ └─────────────────────────────────────────────┘│ [📊分析]│
│ [⚙️]│                                                │       │
│     │ ┌─────────────────┐ ┌─────────────────────────┐│ Recent │
│     │ │  要注意食材     │ │    消費期限カレンダー    ││ Items │
│     │ │                 │ │                         ││       │
│     │ │ 🔴期限切れ      │ │  Jun 2025              ││ ・トマト│
│     │ │ ・なし          │ │ [29][30][ 1][ 2][ 3]   ││  -1個 │
│     │ │                 │ │ 🟡   🔴              ││  2h前 │
│     │ │ 🟡期限間近      │ │                         ││       │
│     │ │ ・牛乳(残2日)    │ │ [4] [5] [6] [7] [8]    ││ ・卵   │
│     │ │ ・トマト(残3日)  │ │                         ││  +12個│
│     │ │ ・卵(残4日)     │ │                         ││  1d前 │
│     │ │                 │ └─────────────────────────┘│       │
│     │ │ 🔵在庫不足      │                            │       │
│     │ │ ・にんじん      │ ┌─────────────────────────┐│       │
│     │ │                 │ │      活動グラフ          ││       │
│     │ └─────────────────┘ │                         ││       │
│     │                     │  消費 ■■■■□□□        ││       │
│     │                     │  追加 ■■□□□□□        ││       │
│     │                     │       月 火 水 木 金 土 日││       │
│     │                     └─────────────────────────┘│       │
└─────────────────────────────────────────────────────────────┘
```

### ステータスオーバーブューセクション

```typescript
interface PCStatusCard {
  title: string
  count: number
  trend: 'up' | 'down' | 'stable'
  change: number
  color: string
  icon: React.ReactNode
  clickAction: () => void
  hoverDetails: string[]
}

const PCStatusCards = () => (
  <div className="grid grid-cols-4 gap-6 mb-8">
    {statusCards.map(card => (
      <div
        key={card.title}
        className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={card.clickAction}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${card.color}`}>
            {card.icon}
          </div>
          <TrendIndicator trend={card.trend} change={card.change} />
        </div>

        <h3 className="text-sm font-medium text-gray-600 mb-1">
          {card.title}
        </h3>
        <p className="text-3xl font-bold text-gray-900">
          {card.count}
        </p>

        {/* ホバー時の詳細情報 */}
        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-xs text-gray-500 space-y-1">
            {card.hoverDetails.map((detail, index) => (
              <div key={index}>• {detail}</div>
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
)
```

### 3カラムメインコンテンツ

#### 左カラム: 要注意食材リスト

```jsx
const CriticalItemsPanel = ({ items }: { items: CriticalItem[] }) => (
  <div className="bg-white rounded-lg border p-6">
    <h2 className="text-lg font-semibold mb-4">要注意食材</h2>

    <div className="space-y-4">
      {/* 期限切れ */}
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <h3 className="font-medium text-red-700">期限切れ</h3>
          <span className="text-sm text-red-600">({items.expired.length}件)</span>
        </div>
        {items.expired.length === 0 ? (
          <p className="text-sm text-gray-500 ml-5">なし</p>
        ) : (
          <div className="ml-5 space-y-2">
            {items.expired.map(item => (
              <CriticalItemCard key={item.id} item={item} severity="high" />
            ))}
          </div>
        )}
      </div>

      {/* 期限間近 */}
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          <h3 className="font-medium text-yellow-700">期限間近</h3>
          <span className="text-sm text-yellow-600">({items.expiringSoon.length}件)</span>
        </div>
        <div className="ml-5 space-y-2">
          {items.expiringSoon.map(item => (
            <CriticalItemCard key={item.id} item={item} severity="medium" />
          ))}
        </div>
      </div>

      {/* 在庫不足 */}
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <h3 className="font-medium text-blue-700">在庫不足</h3>
          <span className="text-sm text-blue-600">({items.lowStock.length}件)</span>
        </div>
        <div className="ml-5 space-y-2">
          {items.lowStock.map(item => (
            <CriticalItemCard key={item.id} item={item} severity="low" />
          ))}
        </div>
      </div>
    </div>
  </div>
)
```

#### 中央カラム: カレンダーと活動グラフ

```jsx
const CentralContent = () => (
  <div className="space-y-6">
    {/* 消費期限カレンダー */}
    <div className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">消費期限カレンダー</h2>
      <ExpiryCalendar />
    </div>

    {/* 活動グラフ */}
    <div className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">週間活動グラフ</h2>
      <WeeklyActivityChart />
    </div>
  </div>
)

const ExpiryCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date())

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{format(currentDate, 'yyyy年 MM月')}</h3>
        <div className="flex space-x-2">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}

        {generateCalendarDays(currentDate).map((day, index) => (
          <CalendarDay
            key={index}
            date={day.date}
            isCurrentMonth={day.isCurrentMonth}
            expiringItems={day.expiringItems}
            expiredItems={day.expiredItems}
          />
        ))}
      </div>
    </div>
  )
}
```

#### 右カラム: クイックアクションパネル

```jsx
const QuickActionPanel = () => (
  <div className="w-80 space-y-6">
    {/* メインアクション */}
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 font-semibold">クイックアクション</h3>
      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full justify-start"
          onClick={() => navigate('/ingredients/new')}
        >
          <Plus className="mr-2 h-5 w-5" />
          食材を追加
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-full justify-start"
          onClick={() => navigate('/shopping')}
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          買い物を開始
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-full justify-start"
          onClick={() => navigate('/analytics')}
        >
          <BarChart3 className="mr-2 h-5 w-5" />
          分析を見る
        </Button>
      </div>
    </div>

    {/* 最近の活動 */}
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 font-semibold">最近の活動</h3>
      <div className="space-y-3">
        {recentActivities.slice(0, 5).map((activity) => (
          <div key={activity.id} className="flex items-center space-x-3">
            <ActivityIcon type={activity.type} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {activity.ingredientName}
              </p>
              <p className="text-xs text-gray-500">
                {activity.description} • {formatRelativeTime(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Button variant="ghost" size="sm" className="w-full">
          すべて見る
        </Button>
      </div>
    </div>

    {/* 統計サマリー */}
    <div className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <h3 className="mb-3 font-semibold text-blue-900">今月の統計</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-blue-800">
          <span>追加した食材</span>
          <span className="font-medium">24個</span>
        </div>
        <div className="flex justify-between text-blue-800">
          <span>消費した食材</span>
          <span className="font-medium">18個</span>
        </div>
        <div className="flex justify-between text-blue-800">
          <span>食材廃棄</span>
          <span className="font-medium">2個</span>
        </div>
        <div className="flex justify-between border-t border-blue-200 pt-2 font-medium text-blue-800">
          <span>廃棄率</span>
          <span>8.3%</span>
        </div>
      </div>
    </div>
  </div>
)
```

### キーボードショートカット

```typescript
const dashboardShortcuts = {
  // グローバル
  'Ctrl+K': () => focusSearch(),
  'Ctrl+N': () => navigate('/ingredients/new'),
  'Ctrl+S': () => navigate('/shopping'),

  // ダッシュボード固有
  '1': () => navigateToStatusCard('expiring-soon'),
  '2': () => navigateToStatusCard('out-of-stock'),
  '3': () => navigateToStatusCard('expired'),
  '4': () => navigateToStatusCard('all'),

  R: () => refreshDashboard(),
  A: () => navigate('/analytics'),
  C: () => navigate('/categories'),

  // カレンダー操作
  ArrowLeft: () => previousMonth(),
  ArrowRight: () => nextMonth(),
  T: () => goToToday(),
}
```

### ホバーエフェクトとツールチップ

```jsx
const StatusCardWithTooltip = ({ card }: { card: StatusCard }) => (
  <Tooltip content={
    <div className="space-y-1">
      <p className="font-medium">{card.title}</p>
      <div className="text-sm space-y-1">
        {card.items.map(item => (
          <div key={item.id} className="flex justify-between">
            <span>{item.name}</span>
            <span>{item.detail}</span>
          </div>
        ))}
      </div>
    </div>
  }>
    <div className="group cursor-pointer transform hover:scale-105 transition-all">
      <StatusCard {...card} />
    </div>
  </Tooltip>
)
```

### レスポンシブブレークポイント

```css
/* Large Desktop (1600px+) */
@media (min-width: 1600px) {
  .dashboard-grid {
    grid-template-columns: 320px 1fr 320px;
  }

  .status-cards {
    grid-template-columns: repeat(4, 1fr);
    gap: 32px;
  }
}

/* Standard Desktop (1200px - 1599px) */
@media (min-width: 1200px) and (max-width: 1599px) {
  .dashboard-grid {
    grid-template-columns: 280px 1fr 300px;
  }

  .status-cards {
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
}

/* Small Desktop (1024px - 1199px) */
@media (min-width: 1024px) and (max-width: 1199px) {
  .dashboard-grid {
    grid-template-columns: 1fr 300px;
  }

  .status-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}
```

### アクセシビリティ

- **セマンティックHTML**: 適切な見出し構造
- **ARIA属性**: スクリーンリーダー対応
- **キーボードナビゲーション**: Tab順序の最適化
- **高コントラスト**: WCAG 2.1 AA準拠

### パフォーマンス考慮

- **データキャッシュ**: React Query で5分間キャッシュ
- **画像最適化**: Next.js Image コンポーネント使用
- **プリフェッチ**: 頻繁にアクセスする画面の事前読み込み

### エラーハンドリング

- **ネットワークエラー**: リトライボタン付きエラー表示
- **データなし**: 初回利用ガイダンス表示
- **読み込み失敗**: スケルトン表示継続 + エラーメッセージ

## 技術実装

### Component構造

```
DashboardPage
├── DashboardHeader
├── StatusCardGrid
│   └── StatusCard (x4)
├── QuickActionSection
│   ├── AddIngredientButton
│   └── ShoppingModeButton
├── CriticalItemsList
│   └── CriticalItemCard
└── RecentActivitiesSection
    └── ActivityItem
```

### 状態管理

```typescript
// hooks/useDashboard.ts
export const useDashboard = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 5 * 60 * 1000, // 5分間フレッシュ
    cacheTime: 10 * 60 * 1000, // 10分間キャッシュ
  })

  return {
    dashboard: data,
    isLoading,
    error,
    refresh: refetch,
  }
}
```

## 今後の拡張

### フェーズ2機能

- **カスタマイズ可能なウィジェット**: ユーザーが表示項目を選択
- **統計チャート**: 消費傾向のグラフ表示
- **おすすめレシピ**: 在庫食材ベースの提案

### フェーズ3機能

- **AI提案**: 食材の最適な使用順序提案
- **共有機能**: 家族との在庫共有
- **通知設定**: プッシュ通知のカスタマイズ
