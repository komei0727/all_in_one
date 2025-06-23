# 食材編集画面

## 1. 基本情報

- **画面ID**: SCREEN_INGREDIENT_EDIT
- **パス**: /ingredients/[id]/edit
- **作成日**: 2025-01-21
- **更新日**: 2025-01-22
- **ステータス**: 設計中
- **担当者**: @komei0727

## 2. 画面概要

### 目的

既存の食材情報を編集・更新できるようにし、在庫数の変更や賞味期限の更新などを簡単に行える画面を提供する。

### ユーザーストーリー

ユーザーとして、登録済みの食材情報を更新したい。食材を使った時の数量変更や、賞味期限の確認・更新、削除などを行いたい。

### 前提条件・制約

- **アクセス権限**: 認証不要（初期バージョン）
- **事前条件**: 編集対象の食材が存在すること
- **画面の制約事項**: 削除は確認ダイアログを表示

## 3. UI設計

### 画面構成

```
┌─────────────────────────────────────┐
│ ← 戻る      食材を編集      保存   │
├─────────────────────────────────────┤
│                                     │
│ 食材名 *                            │
│ ┌─────────────────────────────┐   │
│ │ 牛乳                         │   │
│ └─────────────────────────────┘   │
│                                     │
│ カテゴリー *                        │
│ ┌─────────────────────────────┐   │
│ │ 乳製品 ▼                   │   │
│ └─────────────────────────────┘   │
│                                     │
│ 数量 *              単位 *          │
│ ┌──────────┐ ┌──────────────┐   │
│ │ 500      │ │ ml ▼         │   │
│ └──────────┘ └──────────────┘   │
│                                     │
│ 保存場所 *                          │
│ ● 冷蔵  ○ 冷凍  ○ 常温           │
│                                     │
│ 賞味期限                            │
│ ┌─────────────────────────────┐   │
│ │ 📅 2025-01-25               │   │
│ └─────────────────────────────┘   │
│                                     │
│ 購入日                              │
│ ┌─────────────────────────────┐   │
│ │ 📅 2025-01-20               │   │
│ └─────────────────────────────┘   │
│                                     │
│ 価格（円）                          │
│ ┌─────────────────────────────┐   │
│ │ 198                          │   │
│ └─────────────────────────────┘   │
│                                     │
│ メモ                                │
│ ┌─────────────────────────────┐   │
│ │ 特売品                       │   │
│ │                             │   │
│ └─────────────────────────────┘   │
│                                     │
│ * は必須項目です                    │
│                                     │
│ ─────────────────────────────────   │
│                                     │
│ 登録日: 2025-01-20 10:30            │
│ 更新日: 2025-01-21 15:45            │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ 🗑️ この食材を削除           │   │
│ └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### コンポーネント構成

- **ヘッダー**: 戻るボタン、タイトル、保存ボタン
- **メイン**:
  - 編集フォーム（登録画面と同じフィールド）
  - 作成日時・更新日時の表示
  - 削除ボタン
- **フッター**: なし

### レスポンシブ対応

- **モバイル (< 768px)**: 1カラムフォーム
- **タブレット (768px - 1024px)**: 1カラム、最大幅600px
- **デスクトップ (> 1024px)**: 1カラム、最大幅600px、中央寄せ

## 4. 機能仕様

### アクション一覧

| アクション     | トリガー               | 処理内容               | 結果                   |
| -------------- | ---------------------- | ---------------------- | ---------------------- |
| 戻る           | 「戻る」ボタンクリック | 変更確認→前画面へ      | 一覧画面へ遷移         |
| 保存           | 「保存」ボタンクリック | バリデーション→API送信 | 成功時: 一覧画面へ遷移 |
| 削除           | 「削除」ボタンクリック | 確認ダイアログ表示     | 確認後: 削除API実行    |
| フィールド編集 | 各フィールド変更       | 値の更新               | isDirtyフラグをtrue    |

### フォーム仕様

| フィールド   | 型     | 必須 | バリデーション                       | 初期値 |
| ------------ | ------ | ---- | ------------------------------------ | ------ |
| 食材名       | string | Yes  | 1-50文字                             | 現在値 |
| カテゴリーID | string | Yes  | 選択必須                             | 現在値 |
| 数量         | number | Yes  | 0より大きい数値、小数点以下2桁まで   | 現在値 |
| 単位ID       | string | Yes  | 選択必須                             | 現在値 |
| 保存場所     | enum   | Yes  | REFRIGERATED/FROZEN/ROOM_TEMPERATURE | 現在値 |
| 賞味期限     | date   | No   | -                                    | 現在値 |
| 購入日       | date   | Yes  | -                                    | 現在値 |
| 価格         | number | No   | 0以上の数値、小数点以下2桁まで       | 現在値 |
| メモ         | string | No   | 最大200文字                          | 現在値 |

### 画面遷移

- **前画面**: 食材一覧画面（/ingredients）
- **次画面**:
  - 保存成功時: 食材一覧画面（/ingredients）
  - 削除成功時: 食材一覧画面（/ingredients）
  - 戻る時: 食材一覧画面（/ingredients）
- **エラー時**: エラーメッセージを表示、フォームに留まる

## 5. API仕様

### 使用するAPI

#### 1. 食材詳細取得

- **エンドポイント**: `GET /api/v1/ingredients/[id]`
- **目的**: 編集対象の食材情報を取得
- **呼び出しタイミング**: 画面初期表示時

**リクエスト**

```typescript
// URLパラメータ: id
```

**レスポンス**

```typescript
interface IngredientDetailResponse {
  data: {
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
    bestBeforeDate: string | null
    expiryDate: string | null
    purchaseDate: string
    price: number | null // 小数点対応
    memo: string | null
    daysUntilExpiry: number | null
    expiryStatus: 'FRESH' | 'NEAR_EXPIRY' | 'EXPIRING_SOON' | 'CRITICAL' | 'EXPIRED'
    isExpired: boolean
    isExpiringSoon: boolean
    hasStock: boolean
    createdAt: string
    updatedAt: string
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

#### 2. カテゴリー一覧取得

- **エンドポイント**: `GET /api/v1/ingredients/categories`
- **目的**: カテゴリー選択肢の取得
- **呼び出しタイミング**: 画面初期表示時

（登録画面と同じ）

#### 3. 単位一覧取得

- **エンドポイント**: `GET /api/v1/ingredients/units`
- **目的**: 単位選択肢の取得
- **呼び出しタイミング**: 画面初期表示時

（登録画面と同じ）

#### 4. 食材更新

- **エンドポイント**: `PUT /api/v1/ingredients/[id]`
- **目的**: 食材情報の更新
- **呼び出しタイミング**: 保存ボタンクリック時

**リクエスト**

```typescript
interface UpdateIngredientRequest {
  name: string
  categoryId: string
  quantity: {
    amount: number
    unitId: string
  }
  storageLocation: {
    type: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
    detail?: string
  }
  expiryDate?: string | null
  bestBeforeDate?: string | null
  purchaseDate: string
  price?: number | null // 小数点対応（例: 198.50）
  memo?: string | null
}
```

**レスポンス**

```typescript
interface UpdateIngredientResponse {
  ingredient: {
    id: string
    name: string
    categoryId: string
    memo: string | null
    category: {
      id: string
      name: string
    }
    currentStock: {
      quantity: number
      isInStock: boolean
      unit: {
        id: string
        name: string
        symbol: string
      }
      storageLocation: {
        type: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
        detail?: string
      }
      bestBeforeDate?: string
      expiryDate?: string
      purchaseDate: string
      price?: number // 小数点対応
    }
  }
}
```

#### 5. 食材削除

- **エンドポイント**: `DELETE /api/v1/ingredients/[id]`
- **目的**: 食材の削除
- **呼び出しタイミング**: 削除確認後

**リクエスト**

```typescript
// URLパラメータ: id
```

**レスポンス**

```typescript
// 204 No Content
// レスポンスボディなし
```

**エラーハンドリング**
| エラーコード | 処理 |
|------------|------|
| 400 | バリデーションエラーを各フィールドに表示 |
| 401 | （将来）ログイン画面へリダイレクト |
| 404 | 「食材が見つかりません」を表示→一覧へ |
| 409 | 「他のユーザーが更新しています」を表示 |
| 500 | 「更新/削除に失敗しました」をトースト表示 |

## 6. 状態管理

### クライアント状態

```typescript
interface EditIngredientFormState {
  isSubmitting: boolean
  isDeleting: boolean
  isDirty: boolean // 編集があったか
  errors: Record<string, string> // フィールドごとのエラー
  showDeleteConfirm: boolean // 削除確認ダイアログ
}
```

### サーバー状態（TanStack Query）

- **queryKey**:
  - `['ingredients', id]` // 食材詳細
  - `['categories']`
  - `['units']`
- **キャッシュ戦略**:
  - 食材詳細: キャッシュなし（常に最新を取得）
  - マスタデータ: 10分間キャッシュ
- **mutation**:
  - 更新用のuseMutation
  - 削除用のuseMutation
  - 成功時にキャッシュ無効化: `['ingredients']`

### URL状態

- **パスパラメータ**: 食材ID（/ingredients/[id]/edit）

## 7. 実装ガイド

### 使用コンポーネント

- **shadcn/ui**:
  - Form（React Hook Form統合）
  - Input（テキスト入力）
  - Select（カテゴリー、単位）
  - RadioGroup（保存場所）
  - DatePicker（日付選択）
  - Textarea（メモ）
  - Button（保存、戻る、削除）
  - Dialog（削除確認、変更破棄確認）
  - Toast（エラー/成功メッセージ）
  - Skeleton（初期ローディング）
- **カスタムコンポーネント**:
  - IngredientForm（登録画面と共通化）
  - DeleteConfirmDialog

### ディレクトリ構成

```
src/
├── app/ingredients/[id]/edit/
│   └── page.tsx                    # 編集画面
└── modules/ingredients/
    ├── components/
    │   ├── IngredientForm.tsx      # 登録/編集共通
    │   └── DeleteConfirmDialog.tsx
    ├── hooks/
    │   ├── useIngredient.ts        # 詳細取得
    │   ├── useUpdateIngredient.ts
    │   └── useDeleteIngredient.ts
    ├── schemas/
    │   └── ingredient.schema.ts    # Zodスキーマ
    └── api/
        └── ingredients.api.ts
```

### 実装時の注意点

- 初期表示時はローディングスケルトンを表示
- 404エラー時は一覧画面へリダイレクト
- 楽観的更新は行わない（データ整合性重視）
- 削除は必ず確認ダイアログを表示
- 変更がある場合の離脱防止

### テスト観点

- [ ] **正常系**:
  - 既存データが正しく表示される
  - 各フィールドの更新が成功する
  - 削除が成功する
  - 更新/削除後、一覧画面へ遷移
- [ ] **異常系**:
  - 存在しない食材IDでアクセス時の処理
  - APIエラー時のエラーメッセージ
  - 同時更新の競合エラー処理
- [ ] **エッジケース**:
  - 編集中の離脱防止機能
  - 削除確認のキャンセル動作
  - ネットワークエラー後のリトライ
