# 食材登録・編集画面

## 概要

新規食材の登録と既存食材の編集を行う画面。ステップ形式の入力により、ユーザーの入力負荷を軽減し、正確な食材情報の登録をサポートする。

## ユーザーストーリー

**As a** 食材を管理するユーザー  
**I want to** 食材を簡単に登録したい  
**So that** 正確な在庫管理ができる

## 入力項目分析

### 必須情報（Step 1）

- **食材名**: 最も重要な情報
- **カテゴリー**: 分類のため必須
- **数量**: 在庫管理の基本
- **単位**: 数量とセット

### 重要情報（Step 2）

- **保存場所**: 実用性の高い情報
- **期限情報**: 食材管理の核心

### 補助情報（Step 3）

- **価格**: 家計管理用
- **購入日**: 履歴管理用
- **メモ**: 自由記述

## UI要件

### ステップ形式のレイアウト

```
┌─────────────────────────┐
│ Header                  │
│ [← 戻る] 食材を追加      │
│ ●●○ (2/3)               │
├─────────────────────────┤
│ Step Content            │
│                         │
│ Step 1: 基本情報         │
│ ┌─────────────────────┐ │
│ │ 食材名               │ │
│ │ [トマト_________]    │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ カテゴリー           │ │
│ │ [野菜 ▼]            │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────┐ ┌─────────┐ │
│ │ 数量     │ │ 単位     │ │
│ │ [3____] │ │ [個 ▼]  │ │
│ └─────────┘ └─────────┘ │
│                         │
├─────────────────────────┤
│ Navigation              │
│ [戻る]          [次へ>] │
└─────────────────────────┘
```

### Step 1: 基本情報

#### 1. 食材名入力

```typescript
interface IngredientNameField {
  value: string
  placeholder: string
  maxLength: number
  suggestions: string[]
  validation: {
    required: boolean
    minLength: number
    pattern?: RegExp
  }
}

const ingredientNameConfig: IngredientNameField = {
  value: '',
  placeholder: '例: トマト、鶏もも肉',
  maxLength: 50,
  suggestions: ['トマト', '鶏もも肉', '牛乳', '卵', '玉ねぎ'],
  validation: {
    required: true,
    minLength: 1,
    pattern: /^[ぁ-んァ-ヶー一-龠a-zA-Z0-9\s・]+$/,
  },
}
```

**機能**:

- **入力候補**: よく使われる食材名のサジェスト
- **リアルタイム検証**: 文字入力に応じた即座のバリデーション
- **重複チェック**: 既存食材との重複警告

#### 2. カテゴリー選択

```typescript
interface CategoryOption {
  id: string
  name: string
  icon: string
  color: string
  isActive: boolean
}

const categories: CategoryOption[] = [
  { id: 'vegetable', name: '野菜', icon: '🥬', color: '#10B981', isActive: true },
  { id: 'meat-fish', name: '肉・魚', icon: '🥩', color: '#EF4444', isActive: true },
  { id: 'dairy', name: '乳製品', icon: '🥛', color: '#3B82F6', isActive: true },
  { id: 'seasoning', name: '調味料', icon: '🧂', color: '#8B5CF6', isActive: true },
  { id: 'beverage', name: '飲料', icon: '🥤', color: '#F59E0B', isActive: true },
  { id: 'other', name: 'その他', icon: '📦', color: '#6B7280', isActive: true },
]
```

**UI仕様**:

- **グリッド表示**: 2×3または3×2のカード形式
- **視覚的選択**: アイコン + 色で直感的な選択
- **必須選択**: デフォルト選択なし、明示的な選択を促す

#### 3. 数量・単位入力

```typescript
interface QuantityUnitInput {
  quantity: {
    value: number | null
    min: 0
    max: 99999.99
    step: 0.01
    placeholder: string
  }
  unit: {
    selectedId: string | null
    options: UnitOption[]
    categoryFilter?: string // カテゴリーに応じた単位フィルター
  }
}

interface UnitOption {
  id: string
  name: string
  symbol: string
  type: 'COUNT' | 'WEIGHT' | 'VOLUME'
  defaultFor: string[] // デフォルトとなるカテゴリー
}
```

**レイアウト**:

- **横並び配置**: 数量（60%）+ 単位（40%）
- **スマート単位選択**: カテゴリーに応じた推奨単位の自動フィルター
- **数値入力最適化**: 数字キーボードの自動表示

### Step 2: 保存・期限情報

#### 1. 保存場所選択

```typescript
interface StorageLocationInput {
  type: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
  detail: string
  presets: StoragePreset[]
}

interface StoragePreset {
  type: string
  detail: string
  icon: string
  isPopular: boolean
}

const storagePresets: StoragePreset[] = [
  { type: 'REFRIGERATED', detail: '野菜室', icon: '🥬', isPopular: true },
  { type: 'REFRIGERATED', detail: 'チルド室', icon: '❄️', isPopular: true },
  { type: 'REFRIGERATED', detail: 'ドアポケット', icon: '🚪', isPopular: true },
  { type: 'FROZEN', detail: '冷凍庫', icon: '🧊', isPopular: true },
  { type: 'ROOM_TEMPERATURE', detail: '食器棚', icon: '🏠', isPopular: false },
]
```

**UI設計**:

- **3段階選択**: タイプ選択 → 詳細選択 → カスタム入力
- **プリセット活用**: よく使う保存場所のクイック選択
- **カテゴリー連動**: 食材カテゴリーに応じた推奨保存場所

#### 2. 期限情報入力

```typescript
interface ExpiryInfoInput {
  bestBeforeDate: Date | null // 賞味期限
  useByDate: Date | null // 消費期限
  presetOptions: ExpiryPreset[]
  validationRules: {
    bestBeforeAfterToday: boolean
    useByBeforeBestBefore: boolean
  }
}

interface ExpiryPreset {
  label: string
  days: number
  category: string[]
}

const expiryPresets: ExpiryPreset[] = [
  { label: '今日', days: 0, category: ['meat-fish'] },
  { label: '明日', days: 1, category: ['meat-fish'] },
  { label: '3日後', days: 3, category: ['vegetable'] },
  { label: '1週間後', days: 7, category: ['vegetable', 'dairy'] },
  { label: '2週間後', days: 14, category: ['dairy'] },
  { label: '1ヶ月後', days: 30, category: ['seasoning'] },
]
```

**入力方式**:

- **プリセット + カスタム**: よく使う期限のクイック選択 + カレンダー入力
- **スマート提案**: カテゴリーに応じた期限プリセットの表示
- **バリデーション**: 消費期限 ≤ 賞味期限の自動チェック

### Step 3: 補助情報（オプション）

#### 1. 価格・購入日

```typescript
interface PurchaseInfoInput {
  price: {
    value: number | null
    currency: 'JPY'
    placeholder: '例: 298'
  }
  purchaseDate: {
    value: Date
    defaultToToday: boolean
    maxDate: Date // 今日まで
  }
}
```

#### 2. メモ

```typescript
interface MemoInput {
  value: string
  maxLength: 200
  placeholder: string
  suggestions: string[]
}

const memoSuggestions = ['有機栽培', '国産', '特価品', 'セール', 'Lサイズ', '冷凍品', '開封済み']
```

### フォーム全体の状態管理

```typescript
interface IngredientFormState {
  currentStep: number
  totalSteps: number
  data: {
    // Step 1
    name: string
    categoryId: string
    quantity: number
    unitId: string

    // Step 2
    storageLocation: {
      type: string
      detail?: string
    }
    expiryInfo: {
      bestBeforeDate?: Date
      useByDate?: Date
    }

    // Step 3
    price?: number
    purchaseDate: Date
    memo?: string
  }
  validation: {
    [field: string]: {
      isValid: boolean
      message?: string
    }
  }
  isLoading: boolean
}
```

### バリデーション仕様

#### リアルタイムバリデーション

```typescript
const validationRules = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 50,
    pattern: /^[ぁ-んァ-ヶー一-龠a-zA-Z0-9\s・]+$/,
    customValidation: async (value: string) => {
      // 重複チェック（編集時は自身を除外）
      const isDuplicate = await checkDuplicateIngredient(value)
      return !isDuplicate || '同じ名前の食材が既に登録されています'
    },
  },
  quantity: {
    required: true,
    min: 0,
    max: 99999.99,
    precision: 2,
  },
  expiryInfo: {
    customValidation: (data: ExpiryInfoInput) => {
      if (data.useByDate && data.bestBeforeDate) {
        return data.useByDate <= data.bestBeforeDate || '消費期限は賞味期限以前に設定してください'
      }
      return true
    },
  },
}
```

#### エラー表示

```typescript
const ErrorMessage = ({ message, type = 'error' }: {
  message: string
  type?: 'error' | 'warning' | 'info'
}) => (
  <div className={`mt-1 text-sm flex items-center ${
    type === 'error' ? 'text-red-600' :
    type === 'warning' ? 'text-yellow-600' :
    'text-blue-600'
  }`}>
    <AlertCircle className="w-4 h-4 mr-1" />
    {message}
  </div>
)
```

### ナビゲーション

#### ステップ間移動

```typescript
const StepNavigation = ({
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  onSubmit,
  isValid,
  isLoading
}) => (
  <div className="flex justify-between items-center p-4 border-t">
    <button
      onClick={onPrev}
      disabled={currentStep === 1}
      className="px-4 py-2 text-gray-600 disabled:opacity-50"
    >
      戻る
    </button>

    <div className="flex space-x-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full ${
            i < currentStep ? 'bg-primary' :
            i === currentStep - 1 ? 'bg-primary' :
            'bg-gray-300'
          }`}
        />
      ))}
    </div>

    <button
      onClick={currentStep === totalSteps ? onSubmit : onNext}
      disabled={!isValid || isLoading}
      className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
    >
      {isLoading ? '保存中...' :
       currentStep === totalSteps ? '保存' : '次へ'}
    </button>
  </div>
)
```

### API仕様

#### 食材登録

**エンドポイント**: `POST /api/v1/ingredients`

**リクエスト**:

```json
{
  "name": "トマト",
  "categoryId": "cat_vegetable",
  "quantity": 3,
  "unitId": "unt_piece",
  "storageLocation": {
    "type": "REFRIGERATED",
    "detail": "野菜室"
  },
  "expiryInfo": {
    "bestBeforeDate": "2025-07-05",
    "useByDate": "2025-07-03"
  },
  "price": 298,
  "purchaseDate": "2025-06-28",
  "memo": "有機栽培"
}
```

#### 食材編集

**エンドポイント**: `PUT /api/v1/ingredients/{id}`

**リクエスト**: 登録と同じ形式

### レスポンシブ対応

#### Mobile (375px~)

- **1カラムレイアウト**: 縦積みフォーム
- **大きな入力フィールド**: 48px以上の高さ
- **フルスクリーン**: ステップごとに画面全体を使用

#### Tablet (768px~)

- **2カラムレイアウト**: 数量・単位などの関連項目を横並び
- **サイドバー**: プレビュー表示を右側に配置

#### Desktop (1024px~)

- **モーダル形式**: オーバーレイでフォーム表示
- **ライブプレビュー**: 入力内容のリアルタイム反映

## PC版詳細設計

### 全体レイアウト (1200px以上)

```
┌─────────────────────────────────────────────────────────────┐
│                        Top Bar                              │
│ [🥗 Food Manager] [🔍] [🛒] [🔔] [👤 User] [Settings]      │
├─────────────────────────────────────────────────────────────┤
│ Nav │                Ingredient Form                  │ Live │
│     │                                                │ Preview│
│ [📊]│ ┌─────────────────────────────────────────────┐│       │
│ [🥗]│ │  食材登録・編集 [Step 1/3]                 ││ 🍅トマト│
│ [🛒]│ │  ●●○ Progress                              ││       │
│ [📈]│ └─────────────────────────────────────────────┘│ カテゴリ│
│     │                                                │ 野菜   │
│     │ ┌─────────────────┐ ┌─────────────────────────┐│       │
│     │ │  Step Content   │ │    Smart Suggestions    ││ 数量   │
│     │ │                 │ │                         ││ 3個    │
│     │ │ [食材名_______] │ │ ⚡ 入力候補              ││       │
│     │ │                 │ │ ・トマト                ││ 期限   │
│     │ │ カテゴリー:      │ │ ・ミニトマト            ││ 残り3日│
│     │ │ [🥬野菜] [🥩肉] │ │ ・フルーツトマト        ││       │
│     │ │ [🥛乳製品][🧂調味]│ │                         ││ 保存場所│
│     │ │                 │ │ 💡 おすすめ設定         ││ 冷蔵庫 │
│     │ │ 数量: [3____]   │ │ ・保存場所: 冷蔵庫      ││       │
│     │ │ 単位: [個 ▼]    │ │ ・期限: 3-5日          ││ その他 │
│     │ │                 │ │ ・推奨在庫: 5個         ││ ・画像 │
│     │ │ [バリデーション] │ │                         ││ ・メモ │
│     │ │ ✓ 名前OK        │ │ 📊 統計                ││       │
│     │ │ ✓ カテゴリーOK  │ │ ・このカテゴリー: 5件   ││       │
│     │ │ ✓ 数量OK        │ │ ・平均価格: ¥250       ││       │
│     │ └─────────────────┘ └─────────────────────────┘│       │
│     │                                                │       │
│     │ ┌─────────────────────────────────────────────┐│       │
│     │ │           Navigation                        ││       │
│     │ │  [< 戻る]  [下書き保存]  [次へ: 保存・期限>] ││       │
│     │ └─────────────────────────────────────────────┘│       │
└─────────────────────────────────────────────────────────────┘
```

### モーダル版レイアウト

```jsx
const IngredientFormModal = ({ isOpen, onClose, ingredientToEdit, onSuccess }) => (
  <Modal size="large" isOpen={isOpen} onClose={onClose}>
    <div className="grid h-[80vh] grid-cols-3">
      {/* メインフォーム */}
      <div className="col-span-2 p-6">
        <IngredientFormMain />
      </div>

      {/* ライブプレビュー */}
      <div className="col-span-1 border-l bg-gray-50 p-6">
        <IngredientPreview />
      </div>
    </div>
  </Modal>
)
```

### 3カラムレイアウト

#### 左・中央カラム: フォームコンテンツ

```jsx
const EnhancedIngredientForm = ({ currentStep, formData, onStepChange, onFieldChange }) => (
  <div className="mx-auto max-w-4xl flex-1 p-6">
    {/* プログレスヘッダー */}
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          {formData.id ? '食材を編集' : '新しい食材を追加'}
        </h1>
        <div className="text-sm text-gray-500">Step {currentStep} / 3</div>
      </div>

      {/* 強化されたプログレスバー */}
      <div className="relative">
        <div className="flex items-center">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <button
                onClick={() => onStepChange(step)}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-medium transition-all ${
                  step < currentStep
                    ? 'border-green-500 bg-green-500 text-white'
                    : step === currentStep
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 bg-gray-100 text-gray-400'
                }`}
              >
                {step < currentStep ? <Check className="h-5 w-5" /> : step}
              </button>

              {step < 3 && (
                <div
                  className={`mx-2 h-1 w-16 ${step < currentStep ? 'bg-green-500' : 'bg-gray-300'}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* ステップラベル */}
        <div className="mt-2 flex justify-between text-sm">
          <span className={currentStep >= 1 ? 'font-medium text-blue-600' : 'text-gray-500'}>
            基本情報
          </span>
          <span className={currentStep >= 2 ? 'font-medium text-blue-600' : 'text-gray-500'}>
            保存・期限
          </span>
          <span className={currentStep >= 3 ? 'font-medium text-blue-600' : 'text-gray-500'}>
            補助情報
          </span>
        </div>
      </div>
    </div>

    {/* 2カラムコンテンツ */}
    <div className="grid grid-cols-3 gap-8">
      {/* メインフォーム */}
      <div className="col-span-2">
        {currentStep === 1 && (
          <Step1BasicInfoEnhanced formData={formData} onChange={onFieldChange} />
        )}
        {currentStep === 2 && (
          <Step2StorageExpiryEnhanced formData={formData} onChange={onFieldChange} />
        )}
        {currentStep === 3 && (
          <Step3AdditionalEnhanced formData={formData} onChange={onFieldChange} />
        )}
      </div>

      {/* サジェスト・ヘルプパネル */}
      <div className="col-span-1">
        <SmartSuggestionPanel
          currentStep={currentStep}
          formData={formData}
          onSuggestionSelect={onFieldChange}
        />
      </div>
    </div>
  </div>
)
```

#### Step 1: 拡張された基本情報

```jsx
const Step1BasicInfoEnhanced = ({ formData, onChange }) => (
  <div className="space-y-8">
    {/* 食材名入力 */}
    <div>
      <label className="mb-3 block text-lg font-semibold text-gray-900">
        食材名 <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="例: トマト、鶏もも肉"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          autoFocus
        />

        {/* リアルタイム検証表示 */}
        <div className="absolute top-3 right-3">
          {formData.name && validateIngredientName(formData.name) ? (
            <Check className="h-6 w-6 text-green-500" />
          ) : formData.name ? (
            <X className="h-6 w-6 text-red-500" />
          ) : null}
        </div>
      </div>

      {/* 入力候補 */}
      {formData.name && (
        <IngredientSuggestions
          query={formData.name}
          onSelect={(suggestion) => onChange('name', suggestion)}
        />
      )}
    </div>

    {/* カテゴリー選択 */}
    <div>
      <label className="mb-3 block text-lg font-semibold text-gray-900">
        カテゴリー <span className="text-red-500">*</span>
      </label>

      <div className="grid grid-cols-3 gap-3">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onChange('categoryId', category.id)}
            className={`rounded-lg border-2 p-4 transition-all hover:shadow-md ${
              formData.categoryId === category.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <div className="mb-2 text-3xl">{category.icon}</div>
              <div className="font-medium text-gray-900">{category.name}</div>
              <div className="mt-1 text-xs text-gray-500">{category.count}件登録済み</div>
            </div>
          </button>
        ))}
      </div>
    </div>

    {/* 数量・単位入力 */}
    <div className="grid grid-cols-2 gap-6">
      <div>
        <label className="mb-3 block text-lg font-semibold text-gray-900">
          数量 <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={formData.quantity}
          onChange={(e) => onChange('quantity', parseFloat(e.target.value))}
          min="0"
          step="0.01"
          placeholder="0"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-3 block text-lg font-semibold text-gray-900">
          単位 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.unitId}
          onChange={(e) => onChange('unitId', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">単位を選択</option>
          {getUnitsForCategory(formData.categoryId).map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name} ({unit.symbol})
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* リアルタイム検証結果 */}
    <ValidationSummary
      validations={[
        {
          field: 'name',
          isValid: validateIngredientName(formData.name),
          message: '食材名が入力されています',
        },
        {
          field: 'category',
          isValid: !!formData.categoryId,
          message: 'カテゴリーが選択されています',
        },
        {
          field: 'quantity',
          isValid: formData.quantity > 0,
          message: '有効な数量が入力されています',
        },
        { field: 'unit', isValid: !!formData.unitId, message: '単位が選択されています' },
      ]}
    />
  </div>
)
```

#### スマートサジェストパネル

```jsx
const SmartSuggestionPanel = ({ currentStep, formData, onSuggestionSelect }) => (
  <div className="sticky top-6 rounded-lg border border-gray-200 bg-white p-6">
    <h3 className="mb-4 font-semibold text-gray-900">スマートサジェスト</h3>

    {currentStep === 1 && (
      <div className="space-y-4">
        {/* 入力候補 */}
        {formData.name && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">⚡ 入力候補</h4>
            <div className="space-y-1">
              {getSimilarIngredients(formData.name).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSuggestionSelect('name', suggestion)}
                  className="block w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* カテゴリー推奨 */}
        {formData.name && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">💡 推奨カテゴリー</h4>
            <div className="space-y-1">
              {suggestCategoryFromName(formData.name).map((category) => (
                <button
                  key={category.id}
                  onClick={() => onSuggestionSelect('categoryId', category.id)}
                  className="flex w-full items-center rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 統計情報 */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">📊 統計</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>このカテゴリー</span>
              <span>{getCategoryStats(formData.categoryId).count}件</span>
            </div>
            <div className="flex justify-between">
              <span>平均価格</span>
              <span>¥{getCategoryStats(formData.categoryId).averagePrice}</span>
            </div>
          </div>
        </div>
      </div>
    )}

    {currentStep === 2 && (
      <div className="space-y-4">
        {/* 保存場所推奨 */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">💡 おすすめ保存場所</h4>
          <div className="space-y-1">
            {getRecommendedStorage(formData.categoryId).map((storage) => (
              <button
                key={storage.type}
                onClick={() => onSuggestionSelect('storageLocation', storage)}
                className="flex w-full items-center rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="mr-2">{storage.icon}</span>
                {storage.label}
              </button>
            ))}
          </div>
        </div>

        {/* 期限推奨 */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">📅 推奨期限</h4>
          <div className="space-y-1">
            {getRecommendedExpiry(formData.categoryId).map((expiry) => (
              <button
                key={expiry.days}
                onClick={() => onSuggestionSelect('expiryInfo', expiry)}
                className="block w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                {expiry.label} ({expiry.days}日後)
              </button>
            ))}
          </div>
        </div>
      </div>
    )}

    {currentStep === 3 && (
      <div className="space-y-4">
        {/* 価格推奨 */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">💰 価格参考</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>平均価格</span>
              <span>¥{getAveragePrice(formData.name)}</span>
            </div>
            <div className="flex justify-between">
              <span>最安値</span>
              <span>¥{getMinPrice(formData.name)}</span>
            </div>
            <div className="flex justify-between">
              <span>最高値</span>
              <span>¥{getMaxPrice(formData.name)}</span>
            </div>
          </div>
        </div>

        {/* メモテンプレート */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">📝 メモテンプレート</h4>
          <div className="space-y-1">
            {getMemoTemplates(formData.categoryId).map((template) => (
              <button
                key={template}
                onClick={() => onSuggestionSelect('memo', template)}
                className="block w-full rounded px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                {template}
              </button>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
)
```

#### 右サイドパネル: ライブプレビュー

```jsx
const IngredientPreviewPanel = ({ formData }) => (
  <aside className="w-80 border-l border-gray-200 bg-gray-50 p-6">
    <div className="sticky top-6">
      <h2 className="mb-6 text-lg font-semibold">プレビュー</h2>

      {/* プレビューカード */}
      <div className="mb-6 rounded-lg border bg-white p-6">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100">
            {formData.image ? (
              <img
                src={formData.image}
                alt={formData.name}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : formData.categoryId ? (
              <span className="text-2xl">{getCategoryIcon(formData.categoryId)}</span>
            ) : (
              <Package className="h-8 w-8 text-gray-400" />
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-900">
            {formData.name || '食材名を入力してください'}
          </h3>

          {formData.categoryId && (
            <p className="text-sm text-gray-600">{getCategoryName(formData.categoryId)}</p>
          )}
        </div>

        {/* 詳細情報 */}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">数量</span>
            <span className="font-medium">
              {formData.quantity || 0} {getUnitSymbol(formData.unitId) || '単位'}
            </span>
          </div>

          {formData.storageLocation && (
            <div className="flex justify-between">
              <span className="text-gray-600">保存場所</span>
              <span className="font-medium">
                {getStorageLocationLabel(formData.storageLocation)}
              </span>
            </div>
          )}

          {formData.expiryInfo?.bestBeforeDate && (
            <div className="flex justify-between">
              <span className="text-gray-600">賞味期限</span>
              <span className="font-medium">
                {format(formData.expiryInfo.bestBeforeDate, 'MM/dd')}
              </span>
            </div>
          )}

          {formData.price && (
            <div className="flex justify-between">
              <span className="text-gray-600">価格</span>
              <span className="font-medium">¥{formData.price}</span>
            </div>
          )}
        </div>
      </div>

      {/* 入力進捗 */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <h4 className="mb-3 font-medium">入力進捗</h4>

        <div className="space-y-2">
          {[
            { label: '基本情報', completed: isStep1Complete(formData) },
            { label: '保存・期限', completed: isStep2Complete(formData) },
            { label: '補助情報', completed: isStep3Complete(formData) },
          ].map((step, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className={`h-4 w-4 rounded-full ${
                  step.completed ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              <span className={`text-sm ${step.completed ? 'text-green-700' : 'text-gray-600'}`}>
                {step.label}
              </span>
              {step.completed && <Check className="h-4 w-4 text-green-500" />}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm">
            <span>完了率</span>
            <span>{getCompletionPercentage(formData)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${getCompletionPercentage(formData)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 関連食材 */}
      {formData.name && (
        <div className="rounded-lg border bg-white p-4">
          <h4 className="mb-3 font-medium">関連食材</h4>
          <div className="space-y-2">
            {getRelatedIngredients(formData.name)
              .slice(0, 3)
              .map((ingredient) => (
                <div key={ingredient.id} className="flex items-center space-x-2">
                  <span className="text-lg">{ingredient.category.icon}</span>
                  <span className="text-sm text-gray-700">{ingredient.name}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  </aside>
)
```

### キーボードショートカット

```typescript
const ingredientFormShortcuts = {
  // ナビゲーション
  'Ctrl+Enter': () => submitForm(),
  'Ctrl+S': () => saveDraft(),
  Escape: () => closeForm(),

  // ステップ移動
  'Ctrl+ArrowRight': () => nextStep(),
  'Ctrl+ArrowLeft': () => previousStep(),

  // フィールド移動
  Tab: () => focusNextField(),
  'Shift+Tab': () => focusPreviousField(),

  // クイック入力
  'Ctrl+1': () => focusField('name'),
  'Ctrl+2': () => focusField('category'),
  'Ctrl+3': () => focusField('quantity'),

  // サジェスト
  'Ctrl+Space': () => showSuggestions(),
  Enter: () => selectFirstSuggestion(),

  // プレビュー
  'Ctrl+P': () => togglePreview(),
  F11: () => toggleFullscreen(),
}
```

### バッチ入力機能

```jsx
const BatchIngredientInput = ({ onBatchSubmit }) => (
  <div className="rounded-lg border bg-white p-6">
    <h3 className="mb-4 font-semibold">一括入力</h3>

    <div className="space-y-4">
      {/* CSVアップロード */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          CSVファイルからインポート
        </label>
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
          <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-600">
            CSVファイルをドラッグ&ドロップまたはクリックしてアップロード
          </p>
          <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
        </div>
      </div>

      {/* テキスト入力 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          テキスト形式で一括入力
        </label>
        <textarea
          placeholder="例:&#10;トマト,野菜,3,個&#10;牛乳,乳製品,1,L&#10;鶏肉,肉類,500,g"
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          形式: 食材名,カテゴリー,数量,単位（1行につき1食材）
        </p>
      </div>

      <button
        onClick={processBatchInput}
        className="w-full rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        一括追加
      </button>
    </div>
  </div>
)
```

### アクセシビリティ

#### フォーカス管理

- **自動フォーカス**: ステップ移動時の適切なフィールドにフォーカス
- **Tab順序**: 論理的な入力順序
- **Enter送信**: 最終ステップでEnterキーによる送信

#### スクリーンリーダー対応

- **フィールドラベル**: 明確な関連付け
- **エラー通知**: aria-describedby でエラーメッセージと関連付け
- **進捗表示**: aria-label で現在のステップを音声案内

## 技術実装

### Component構造

```
IngredientFormPage
├── FormHeader
│   ├── BackButton
│   ├── Title
│   └── StepIndicator
├── FormContent
│   ├── Step1BasicInfo
│   │   ├── NameInput
│   │   ├── CategorySelect
│   │   └── QuantityUnitInput
│   ├── Step2StorageExpiry
│   │   ├── StorageLocationSelect
│   │   └── ExpiryInfoInput
│   └── Step3Additional
│       ├── PriceInput
│       ├── PurchaseDateInput
│       └── MemoInput
├── StepNavigation
└── LoadingOverlay (conditional)
```

### 状態管理

```typescript
export const useIngredientForm = (initialData?: Ingredient) => {
  const [formState, setFormState] = useState<IngredientFormState>({
    currentStep: 1,
    totalSteps: 3,
    data: initialData || getDefaultFormData(),
    validation: {},
    isLoading: false,
  })

  const validateStep = useCallback(
    (step: number) => {
      // ステップごとのバリデーション実行
      const fieldsToValidate = getFieldsForStep(step)
      return validateFields(formState.data, fieldsToValidate)
    },
    [formState.data]
  )

  const nextStep = useCallback(() => {
    if (validateStep(formState.currentStep)) {
      setFormState((prev) => ({
        ...prev,
        currentStep: prev.currentStep + 1,
      }))
    }
  }, [formState.currentStep, validateStep])

  const submitForm = useMutation({
    mutationFn: initialData ? updateIngredient : createIngredient,
    onSuccess: () => {
      router.push('/ingredients')
      toast.success('食材を保存しました')
    },
    onError: (error) => {
      toast.error('保存に失敗しました')
    },
  })

  return {
    formState,
    setFormState,
    nextStep,
    prevStep: () =>
      setFormState((prev) => ({
        ...prev,
        currentStep: Math.max(1, prev.currentStep - 1),
      })),
    submitForm: submitForm.mutate,
    isSubmitting: submitForm.isLoading,
  }
}
```

## 今後の拡張

### フェーズ2機能

- **画像アップロード**: 食材の写真登録
- **バーコードスキャン**: 商品情報の自動入力
- **テンプレート機能**: よく登録する食材のテンプレート保存

### フェーズ3機能

- **OCR機能**: レシートからの自動入力
- **音声入力**: 「トマト3個を冷蔵庫に」の音声登録
- **AI提案**: 購入履歴に基づく期限・価格の自動提案
