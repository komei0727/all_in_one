# 食材詳細画面

## 概要

選択した食材の詳細情報を表示し、在庫操作（消費・補充・調整）、編集、削除など、食材に関するあらゆる操作を実行できる画面。

## ユーザーストーリー

**As a** 食材を管理するユーザー  
**I want to** 食材の詳細を確認し操作したい  
**So that** 正確な在庫管理と効率的な食材活用ができる

## UI要件

### レイアウト構造

```
┌─────────────────────────┐
│ Header                  │
│ [← 戻る] [編集] [⋮メニュー] │
├─────────────────────────┤
│ Ingredient Hero         │
│ ┌─────────┐ トマト       │
│ │  🍅     │ 野菜・冷蔵庫  │
│ │  IMAGE  │ 🟡 在庫不足   │
│ └─────────┘ 期限: 残り2日 │
├─────────────────────────┤
│ Stock Info              │
│ 現在の在庫: 2個 (閾値:5個) │
│ 購入日: 2025-06-26      │
│ 価格: ¥298              │
├─────────────────────────┤
│ Quick Actions           │
│ [消費] [補充] [調整] [廃棄] │
├─────────────────────────┤
│ Storage Details         │
│ 保存場所: 冷蔵庫・野菜室   │
│ 賞味期限: 2025-06-30    │
│ 消費期限: 2025-06-28    │
│ メモ: 有機栽培           │
├─────────────────────────┤
│ Recent Activities       │
│ 📈 +3個補充 (2日前)     │
│ 📉 -1個消費 (3時間前)   │
│ 📝 編集 (1週間前)       │
└─────────────────────────┘
```

### 詳細仕様

#### 1. ヒーローセクション

```typescript
interface IngredientHero {
  id: string
  name: string
  image?: string
  category: {
    id: string
    name: string
    icon: string
  }
  stockStatus: {
    level: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
    message: string
    color: string
  }
  expiryStatus: {
    level: 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED'
    message: string
    daysUntilExpiry?: number
  }
}

const stockStatusConfig = {
  IN_STOCK: {
    message: '在庫十分',
    color: '#10B981',
    icon: '🟢',
  },
  LOW_STOCK: {
    message: '在庫不足',
    color: '#F59E0B',
    icon: '🟡',
  },
  OUT_OF_STOCK: {
    message: '在庫切れ',
    color: '#EF4444',
    icon: '🔴',
  },
}
```

**デザイン仕様**:

- **画像**: 120px × 120px、角丸、デフォルト画像対応
- **ステータス表示**: アイコン + 色 + テキストで明確な状態表現
- **レスポンシブ**: モバイルでは縦並び、タブレット以上で横並び

#### 2. 在庫情報セクション

```typescript
interface StockInfo {
  currentQuantity: {
    amount: number
    unit: string
  }
  threshold?: number
  purchaseDate: Date
  price?: number
  stockValue?: number // price × quantity
}

const StockInfoDisplay = ({ stockInfo }: { stockInfo: StockInfo }) => (
  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-gray-600">現在の在庫</span>
      <span className="text-lg font-semibold">
        {stockInfo.currentQuantity.amount} {stockInfo.currentQuantity.unit}
      </span>
    </div>

    {stockInfo.threshold && (
      <div className="flex justify-between items-center">
        <span className="text-gray-600">在庫閾値</span>
        <span className="text-sm text-gray-500">
          {stockInfo.threshold} {stockInfo.currentQuantity.unit}
        </span>
      </div>
    )}

    <div className="flex justify-between items-center">
      <span className="text-gray-600">購入日</span>
      <span className="text-sm">
        {format(stockInfo.purchaseDate, 'yyyy-MM-dd')}
      </span>
    </div>

    {stockInfo.price && (
      <div className="flex justify-between items-center">
        <span className="text-gray-600">価格</span>
        <span className="text-sm">¥{stockInfo.price}</span>
      </div>
    )}
  </div>
)
```

#### 3. クイックアクション

```typescript
interface QuickAction {
  type: 'CONSUME' | 'REPLENISH' | 'ADJUST' | 'DISCARD'
  label: string
  icon: React.ReactNode
  color: string
  disabled?: boolean
  disabledReason?: string
}

const quickActions: QuickAction[] = [
  {
    type: 'CONSUME',
    label: '消費',
    icon: <Minus className="w-4 h-4" />,
    color: 'bg-blue-500 hover:bg-blue-600',
    disabled: stockInfo.currentQuantity.amount === 0,
    disabledReason: '在庫がありません'
  },
  {
    type: 'REPLENISH',
    label: '補充',
    icon: <Plus className="w-4 h-4" />,
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    type: 'ADJUST',
    label: '調整',
    icon: <Edit className="w-4 h-4" />,
    color: 'bg-yellow-500 hover:bg-yellow-600'
  },
  {
    type: 'DISCARD',
    label: '廃棄',
    icon: <Trash className="w-4 h-4" />,
    color: 'bg-red-500 hover:bg-red-600',
    disabled: stockInfo.currentQuantity.amount === 0,
    disabledReason: '在庫がありません'
  }
]
```

**アクション実行フロー**:

```typescript
const handleQuickAction = (action: QuickAction) => {
  setSelectedAction(action)
  setShowActionModal(true)
}

const ActionModal = ({ action, onConfirm, onCancel }) => (
  <Modal>
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">
        {action.label}する
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            数量
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              min="0"
              step="0.01"
              className="flex-1 border rounded-lg px-3 py-2"
              placeholder={`${action.label}する数量`}
            />
            <span className="flex items-center px-3 py-2 text-gray-500">
              {stockInfo.currentQuantity.unit}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            理由・メモ
          </label>
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            rows={3}
            placeholder={`${action.label}の理由やメモ`}
          />
        </div>
      </div>

      <div className="flex space-x-3 mt-6">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border rounded-lg"
        >
          キャンセル
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 px-4 py-2 text-white rounded-lg ${action.color}`}
        >
          {action.label}する
        </button>
      </div>
    </div>
  </Modal>
)
```

#### 4. 詳細情報セクション

```typescript
interface DetailedInfo {
  storageLocation: {
    type: string
    detail?: string
    icon: string
  }
  expiryInfo: {
    bestBeforeDate?: Date
    useByDate?: Date
  }
  memo?: string
  nutritionInfo?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }
}

const DetailedInfoSection = ({ info }: { info: DetailedInfo }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-3">
      <span className="text-xl">{info.storageLocation.icon}</span>
      <div>
        <p className="font-medium">保存場所</p>
        <p className="text-sm text-gray-600">
          {info.storageLocation.type}
          {info.storageLocation.detail && ` ・ ${info.storageLocation.detail}`}
        </p>
      </div>
    </div>

    <div className="border-t pt-4">
      <h4 className="font-medium mb-2">期限情報</h4>
      <div className="space-y-2 text-sm">
        {info.expiryInfo.bestBeforeDate && (
          <div className="flex justify-between">
            <span className="text-gray-600">賞味期限</span>
            <span>{format(info.expiryInfo.bestBeforeDate, 'yyyy-MM-dd')}</span>
          </div>
        )}
        {info.expiryInfo.useByDate && (
          <div className="flex justify-between">
            <span className="text-gray-600">消費期限</span>
            <span>{format(info.expiryInfo.useByDate, 'yyyy-MM-dd')}</span>
          </div>
        )}
      </div>
    </div>

    {info.memo && (
      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">メモ</h4>
        <p className="text-sm text-gray-600">{info.memo}</p>
      </div>
    )}
  </div>
)
```

#### 5. 活動履歴セクション

```typescript
interface ActivityItem {
  id: string
  type: 'CONSUME' | 'REPLENISH' | 'ADJUST' | 'EDIT' | 'CREATE'
  quantity?: number
  unit?: string
  reason?: string
  performedAt: Date
  performedBy: string
}

const activityConfig = {
  'CONSUME': {
    icon: '📉',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    prefix: '-'
  },
  'REPLENISH': {
    icon: '📈',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    prefix: '+'
  },
  'ADJUST': {
    icon: '⚖️',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    prefix: '±'
  },
  'EDIT': {
    icon: '📝',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    prefix: ''
  },
  'CREATE': {
    icon: '✨',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    prefix: ''
  }
}

const ActivityList = ({ activities }: { activities: ActivityItem[] }) => (
  <div className="space-y-3">
    <h3 className="font-semibold">最近の活動</h3>
    {activities.length === 0 ? (
      <p className="text-gray-500 text-sm py-4 text-center">
        活動履歴はありません
      </p>
    ) : (
      <div className="space-y-2">
        {activities.map(activity => {
          const config = activityConfig[activity.type]
          return (
            <div
              key={activity.id}
              className={`flex items-center space-x-3 p-3 rounded-lg ${config.bgColor}`}
            >
              <span className="text-lg">{config.icon}</span>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${config.color}`}>
                    {activity.type === 'EDIT' ? '編集' :
                     activity.type === 'CREATE' ? '作成' :
                     `${config.prefix}${activity.quantity}${activity.unit}${
                       activity.type === 'CONSUME' ? '消費' :
                       activity.type === 'REPLENISH' ? '補充' : '調整'
                     }`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(activity.performedAt, { locale: ja })}前
                  </span>
                </div>
                {activity.reason && (
                  <p className="text-xs text-gray-600 mt-1">
                    {activity.reason}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )}
  </div>
)
```

### ナビゲーションとアクション

#### ヘッダーメニュー

```typescript
const HeaderActions = ({ ingredient, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false)

  const menuItems = [
    {
      label: '編集',
      icon: <Edit className="w-4 h-4" />,
      action: onEdit,
      color: 'text-blue-600'
    },
    {
      label: '複製',
      icon: <Copy className="w-4 h-4" />,
      action: () => onDuplicate(ingredient),
      color: 'text-green-600'
    },
    {
      label: '削除',
      icon: <Trash className="w-4 h-4" />,
      action: onDelete,
      color: 'text-red-600'
    }
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 rounded-lg hover:bg-gray-100"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border z-10">
          {menuItems.map(item => (
            <button
              key={item.label}
              onClick={() => {
                item.action()
                setShowMenu(false)
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 ${item.color}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

#### 削除確認

```typescript
const DeleteConfirmationModal = ({ ingredient, onConfirm, onCancel }) => (
  <Modal>
    <div className="p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <Trash className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">食材を削除</h3>
          <p className="text-gray-600">この操作は取り消せません</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-lg">{ingredient.category.icon}</span>
          </div>
          <div>
            <p className="font-medium">{ingredient.name}</p>
            <p className="text-sm text-gray-600">
              現在の在庫: {ingredient.currentQuantity.amount} {ingredient.currentQuantity.unit}
            </p>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        この食材と関連する履歴データが削除されます。本当に削除しますか？
      </p>

      <div className="flex space-x-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border rounded-lg"
        >
          キャンセル
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          削除する
        </button>
      </div>
    </div>
  </Modal>
)
```

### API仕様

#### 食材詳細取得

**エンドポイント**: `GET /api/v1/ingredients/{id}`

**レスポンス**:

```json
{
  "data": {
    "id": "ing_abc123",
    "name": "トマト",
    "category": {
      "id": "cat_vegetable",
      "name": "野菜",
      "icon": "🥬"
    },
    "currentQuantity": {
      "amount": 2,
      "unit": {
        "id": "unt_piece",
        "symbol": "個"
      }
    },
    "threshold": 5,
    "stockStatus": "LOW_STOCK",
    "expiryStatus": "EXPIRING_SOON",
    "daysUntilExpiry": 2,
    "storageLocation": {
      "type": "REFRIGERATED",
      "detail": "野菜室"
    },
    "expiryInfo": {
      "bestBeforeDate": "2025-06-30",
      "useByDate": "2025-06-28"
    },
    "price": 298,
    "purchaseDate": "2025-06-26",
    "memo": "有機栽培",
    "createdAt": "2025-06-26T10:00:00Z",
    "updatedAt": "2025-06-28T08:30:00Z"
  }
}
```

#### 活動履歴取得

**エンドポイント**: `GET /api/v1/ingredients/{id}/events`

**レスポンス**:

```json
{
  "data": [
    {
      "id": "evt_abc123",
      "type": "CONSUME",
      "quantity": 1,
      "unit": "個",
      "reason": "夕食で使用",
      "performedAt": "2025-06-28T18:30:00Z",
      "performedBy": "usr_def456"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "hasNext": true
  }
}
```

#### 在庫操作

**エンドポイント**: `POST /api/v1/ingredients/{id}/consume`

**リクエスト**:

```json
{
  "quantity": 1,
  "reason": "夕食で使用"
}
```

### パフォーマンス最適化

#### データ最適化

```typescript
// 詳細データと履歴データの並列取得
const useIngredientDetail = (id: string) => {
  const ingredientQuery = useQuery({
    queryKey: ['ingredient', id],
    queryFn: () => fetchIngredient(id),
  })

  const activitiesQuery = useQuery({
    queryKey: ['ingredient-activities', id],
    queryFn: () => fetchIngredientActivities(id),
    enabled: !!ingredientQuery.data, // 食材データ取得後に実行
  })

  return {
    ingredient: ingredientQuery.data,
    activities: activitiesQuery.data,
    isLoading: ingredientQuery.isLoading || activitiesQuery.isLoading,
    error: ingredientQuery.error || activitiesQuery.error,
  }
}
```

#### 画像最適化

```typescript
const IngredientImage = ({ src, alt, fallback }) => (
  <div className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
    {src ? (
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="96px"
        priority
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-2xl">
        {fallback || '🥗'}
      </div>
    )}
  </div>
)
```

## 技術実装

### Component構造

```
IngredientDetailPage
├── IngredientHeader
│   ├── BackButton
│   ├── Title
│   └── ActionMenu
├── IngredientHero
│   ├── IngredientImage
│   ├── BasicInfo
│   └── StatusIndicators
├── StockInfoSection
├── QuickActionsGrid
│   └── QuickActionButton
├── DetailedInfoSection
├── ActivityHistorySection
│   └── ActivityItem
├── ActionModal (conditional)
├── DeleteConfirmModal (conditional)
└── LoadingState (conditional)
```

### 状態管理

```typescript
export const useIngredientDetail = (id: string) => {
  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const {
    data: ingredient,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ingredient', id],
    queryFn: () => fetchIngredient(id),
  })

  const stockOperation = useMutation({
    mutationFn: ({ type, quantity, reason }) => performStockOperation(id, type, quantity, reason),
    onSuccess: () => {
      refetch()
      setSelectedAction(null)
      toast.success('在庫を更新しました')
    },
  })

  const deleteIngredient = useMutation({
    mutationFn: () => deleteIngredientById(id),
    onSuccess: () => {
      router.push('/ingredients')
      toast.success('食材を削除しました')
    },
  })

  return {
    ingredient,
    isLoading,
    error,
    selectedAction,
    setSelectedAction,
    showDeleteModal,
    setShowDeleteModal,
    performStockOperation: stockOperation.mutate,
    deleteIngredient: deleteIngredient.mutate,
    isOperating: stockOperation.isLoading || deleteIngredient.isLoading,
  }
}
```

## 今後の拡張

### フェーズ2機能

- **レシピ連携**: この食材を使ったレシピ提案
- **栄養情報**: カロリー・栄養成分の表示
- **価格推移**: 価格変動のグラフ表示

### フェーズ3機能

- **写真管理**: 複数写真のギャラリー表示
- **賞味期限アラート**: プッシュ通知設定
- **共有機能**: 食材情報の家族間共有
