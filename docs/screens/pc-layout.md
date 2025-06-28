# PC版レイアウト設計

## 概要

デスクトップ環境での食材管理アプリのレイアウト設計。1200px以上の画面幅を活用し、効率的な情報表示と操作性を実現する。

## 全体レイアウト構造

### レイアウト概要

```
┌─────────────────────────────────────────────────────────────┐
│                        Top Bar                              │
│ [🥗 Food Manager] [🔍] [🛒] [🔔] [👤 User] [Settings]      │
├─────────────────────────────────────────────────────────────┤
│ Side │                                              │ Right │
│ Nav  │            Main Content Area                │ Panel │
│      │                                              │ (opt) │
│ [📊] │                                              │       │
│ [🥗] │                                              │ Quick │
│ [🛒] │                                              │ Info  │
│ [⚙️] │                                              │       │
│      │                                              │       │
│      │                                              │       │
│      │                                              │       │
└─────────────────────────────────────────────────────────────┘
```

### サイズ仕様

| Element      | Width   | Height     | Description                    |
| ------------ | ------- | ---------- | ------------------------------ |
| Total Layout | 1200px+ | 100vh      | 最小幅1200px、ビューポート全体 |
| Side Nav     | 240px   | 100vh-60px | 固定幅、トップバー以下全体     |
| Top Bar      | 100%    | 60px       | 固定高さ                       |
| Main Content | Auto    | 100vh-60px | 残り幅を使用                   |
| Right Panel  | 300px   | 100vh-60px | 表示時のみ                     |

## トップバー設計

### 構成要素

```typescript
interface TopBarElements {
  logo: {
    text: 'Food Manager'
    icon: '🥗'
    clickAction: 'navigate-to-dashboard'
  }
  globalSearch: {
    placeholder: '食材を検索...'
    shortcut: 'Ctrl+K'
    width: '300px'
  }
  quickActions: {
    shopping: {
      icon: '🛒'
      tooltip: '買い物モード'
      badge?: number // 未確認食材数
    }
    notifications: {
      icon: '🔔'
      tooltip: '通知'
      badge?: number // 未読数
    }
  }
  userMenu: {
    avatar: string | null
    name: string
    dropdown: UserMenuItems[]
  }
}
```

### レスポンシブ対応

```css
/* Desktop (1200px+) */
.top-bar {
  display: grid;
  grid-template-columns: 240px 1fr auto;
  gap: 24px;
  padding: 0 24px;
}

/* Large Desktop (1600px+) */
@media (min-width: 1600px) {
  .top-bar {
    grid-template-columns: 280px 1fr auto;
  }
}
```

## サイドナビゲーション設計

### ナビゲーション構造

```typescript
interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
  badge?: number
  children?: NavigationItem[]
  isActive?: boolean
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'ダッシュボード',
    icon: <BarChart3 className="w-5 h-5" />,
    href: '/dashboard'
  },
  {
    id: 'ingredients',
    label: '食材管理',
    icon: <Package className="w-5 h-5" />,
    href: '/ingredients',
    children: [
      { id: 'ingredients-list', label: '一覧', href: '/ingredients' },
      { id: 'ingredients-add', label: '追加', href: '/ingredients/new' },
      { id: 'categories', label: 'カテゴリー', href: '/categories' }
    ]
  },
  {
    id: 'shopping',
    label: '買い物',
    icon: <ShoppingCart className="w-5 h-5" />,
    href: '/shopping',
    badge: 5 // 購入推奨食材数
  },
  {
    id: 'analytics',
    label: '分析',
    icon: <TrendingUp className="w-5 h-5" />,
    href: '/analytics'
  },
  {
    id: 'settings',
    label: '設定',
    icon: <Settings className="w-5 h-5" />,
    href: '/settings'
  }
]
```

### サイドナビUI仕様

```jsx
const SideNavigation = () => (
  <nav className="h-full w-60 border-r border-gray-200 bg-white">
    <div className="p-6">
      <div className="space-y-2">
        {navigationItems.map((item) => (
          <NavigationItem key={item.id} item={item} />
        ))}
      </div>
    </div>

    {/* Status Section */}
    <div className="mt-auto border-t border-gray-200 p-6">
      <div className="rounded-lg bg-blue-50 p-4">
        <h4 className="mb-1 font-medium text-blue-900">在庫状況</h4>
        <div className="space-y-1 text-sm text-blue-700">
          <div className="flex justify-between">
            <span>期限間近</span>
            <span className="font-medium">3個</span>
          </div>
          <div className="flex justify-between">
            <span>在庫不足</span>
            <span className="font-medium">5個</span>
          </div>
        </div>
      </div>
    </div>
  </nav>
)
```

## メインコンテンツエリア

### レイアウトパターン

#### 1. シングルカラム（フォーム画面）

```css
.main-content-single {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px;
}
```

#### 2. ツーカラム（一覧 + 詳細）

```css
.main-content-two-column {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 24px;
  padding: 32px;
}
```

#### 3. スリーカラム（一覧 + 詳細 + アクション）

```css
.main-content-three-column {
  display: grid;
  grid-template-columns: 300px 1fr 300px;
  gap: 24px;
  padding: 32px;
}
```

### ページヘッダー

```jsx
const PageHeader = ({
  title,
  subtitle,
  actions,
  breadcrumbs
}: PageHeaderProps) => (
  <header className="border-b border-gray-200 pb-6 mb-8">
    {breadcrumbs && (
      <nav className="mb-4">
        <Breadcrumbs items={breadcrumbs} />
      </nav>
    )}

    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-600 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex space-x-3">
          {actions.map(action => (
            <Button key={action.id} {...action} />
          ))}
        </div>
      )}
    </div>
  </header>
)
```

## 右サイドパネル設計

### パネルタイプ

#### 1. 情報パネル

```jsx
const InfoPanel = ({ ingredient }: { ingredient: Ingredient }) => (
  <aside className="w-80 bg-gray-50 p-6">
    <h3 className="font-semibold mb-4">食材詳細</h3>

    {/* クイック情報 */}
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-200 rounded-lg" />
          <div>
            <h4 className="font-medium">{ingredient.name}</h4>
            <p className="text-sm text-gray-600">
              {ingredient.category.name}
            </p>
          </div>
        </div>
      </div>

      {/* 在庫情報 */}
      <div className="bg-white rounded-lg p-4">
        <h5 className="font-medium mb-2">在庫情報</h5>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>現在の在庫</span>
            <span className="font-medium">
              {ingredient.quantity} {ingredient.unit}
            </span>
          </div>
          <div className="flex justify-between">
            <span>期限</span>
            <span className="font-medium">
              残り{ingredient.daysUntilExpiry}日
            </span>
          </div>
        </div>
      </div>
    </div>
  </aside>
)
```

#### 2. アクションパネル

```jsx
const ActionPanel = ({ onAction }: { onAction: (action: string) => void }) => (
  <aside className="w-80 bg-white border-l border-gray-200 p-6">
    <h3 className="font-semibold mb-4">クイックアクション</h3>

    <div className="space-y-3">
      <Button
        variant="primary"
        size="lg"
        className="w-full justify-start"
        onClick={() => onAction('add-ingredient')}
      >
        <Plus className="w-5 h-5 mr-2" />
        食材を追加
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="w-full justify-start"
        onClick={() => onAction('start-shopping')}
      >
        <ShoppingCart className="w-5 h-5 mr-2" />
        買い物を開始
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="w-full justify-start"
        onClick={() => onAction('export-data')}
      >
        <Download className="w-5 h-5 mr-2" />
        データ出力
      </Button>
    </div>

    {/* 最近の活動 */}
    <div className="mt-8">
      <h4 className="font-medium mb-3">最近の活動</h4>
      <div className="space-y-2">
        {recentActivities.map(activity => (
          <div key={activity.id} className="text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>{activity.description}</span>
            </div>
            <p className="text-gray-500 text-xs ml-4">
              {formatRelativeTime(activity.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  </aside>
)
```

## キーボードショートカット

### グローバルショートカット

```typescript
const globalShortcuts = {
  'Ctrl+K': 'global-search',
  'Ctrl+N': 'new-ingredient',
  'Ctrl+S': 'start-shopping',
  'Ctrl+D': 'go-to-dashboard',
  'Ctrl+I': 'go-to-ingredients',
  'Ctrl+/': 'show-shortcuts',
  Escape: 'close-modal-or-panel',
}
```

### ページ固有ショートカット

```typescript
// 食材一覧ページ
const ingredientListShortcuts = {
  J: 'select-next-item',
  K: 'select-previous-item',
  Enter: 'open-selected-item',
  E: 'edit-selected-item',
  D: 'delete-selected-item',
  F: 'focus-filter',
  R: 'refresh-list',
}
```

## ホバーエフェクトとアニメーション

### ホバー状態

```css
/* カード要素 */
.card {
  transition: all 0.2s ease-in-out;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* ボタン要素 */
.button {
  transition: all 0.15s ease-in-out;
}

.button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* ナビゲーション要素 */
.nav-item {
  transition: background-color 0.15s ease-in-out;
}

.nav-item:hover {
  background-color: rgba(59, 130, 246, 0.05);
}
```

### アニメーション

```css
/* フェードイン */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

/* スライドイン */
@keyframes slideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

.slide-in {
  animation: slideIn 0.25s ease-out;
}
```

## モーダルとオーバーレイ

### モーダル設計

```jsx
const Modal = ({
  isOpen,
  onClose,
  title,
  size = 'medium',
  children
}: ModalProps) => {
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    fullscreen: 'max-w-full m-4'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`
          relative bg-white rounded-lg shadow-xl w-full
          ${sizeClasses[size]}
          transform transition-all
        `}>
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button onClick={onClose}>
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* コンテンツ */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
```

## 今後の拡張

### フェーズ2機能

- **ドラッグ&ドロップ**: 食材の並び替え、カテゴリー移動
- **複数選択**: Shift+Click、Ctrl+Clickでの一括操作
- **分割ビュー**: 複数の食材を同時編集

### フェーズ3機能

- **ウィンドウ分割**: 複数タブでの作業
- **カスタマイズ可能レイアウト**: パネルのリサイズ、移動
- **ダークモード**: システムテーマとの連動
