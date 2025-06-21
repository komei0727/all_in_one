# 食材登録画面

## 1. 基本情報

- **画面ID**: SCREEN_INGREDIENT_CREATE
- **パス**: /ingredients/create
- **作成日**: 2025-01-21
- **更新日**: 2025-01-21
- **ステータス**: 設計中
- **担当者**: @komei0727

## 2. 画面概要

### 目的

新しい食材を簡単かつ正確に登録できるようにし、必要な情報を漏れなく入力できるフォームを提供する。

### ユーザーストーリー

ユーザーとして、購入した食材をアプリに登録したい。食材名、数量、賞味期限などの基本情報を入力し、後で在庫管理に活用したい。

### 前提条件・制約

- **アクセス権限**: 認証不要（初期バージョン）
- **事前条件**: カテゴリー・単位マスタが登録済み
- **画面の制約事項**: モバイルでの入力しやすさを重視

## 3. UI設計

### 画面構成

```
┌─────────────────────────────────────┐
│ ← キャンセル    食材を追加    保存  │
├─────────────────────────────────────┤
│                                     │
│ 食材名 *                            │
│ ┌─────────────────────────────┐   │
│ │ 例: 牛乳                     │   │
│ └─────────────────────────────┘   │
│                                     │
│ カテゴリー *                        │
│ ┌─────────────────────────────┐   │
│ │ カテゴリーを選択 ▼          │   │
│ └─────────────────────────────┘   │
│                                     │
│ 数量 *              単位 *          │
│ ┌──────────┐ ┌──────────────┐   │
│ │ 1        │ │ 個を選択 ▼    │   │
│ └──────────┘ └──────────────┘   │
│                                     │
│ 保存場所 *                          │
│ ○ 冷蔵  ○ 冷凍  ○ 常温           │
│                                     │
│ 賞味期限                            │
│ ┌─────────────────────────────┐   │
│ │ 📅 日付を選択               │   │
│ └─────────────────────────────┘   │
│                                     │
│ 購入日                              │
│ ┌─────────────────────────────┐   │
│ │ 📅 今日（変更可）           │   │
│ └─────────────────────────────┘   │
│                                     │
│ 価格（円）                          │
│ ┌─────────────────────────────┐   │
│ │ 例: 198                      │   │
│ └─────────────────────────────┘   │
│                                     │
│ メモ                                │
│ ┌─────────────────────────────┐   │
│ │ 例: 特売品                   │   │
│ │                             │   │
│ └─────────────────────────────┘   │
│                                     │
│ * は必須項目です                    │
└─────────────────────────────────────┘
```

### コンポーネント構成

- **ヘッダー**: キャンセルボタン、タイトル、保存ボタン
- **メイン**:
  - 入力フォーム（各フィールド）
  - 必須項目の表示
- **フッター**: なし

### レスポンシブ対応

- **モバイル (< 768px)**: 1カラムフォーム
- **タブレット (768px - 1024px)**: 1カラム、最大幅600px
- **デスクトップ (> 1024px)**: 1カラム、最大幅600px、中央寄せ

## 4. 機能仕様

### アクション一覧

| アクション     | トリガー                     | 処理内容               | 結果                   |
| -------------- | ---------------------------- | ---------------------- | ---------------------- |
| キャンセル     | 「キャンセル」ボタンクリック | 確認ダイアログ表示     | 確認後、前画面へ戻る   |
| 保存           | 「保存」ボタンクリック       | バリデーション→API送信 | 成功時: 一覧画面へ遷移 |
| カテゴリー選択 | ドロップダウンクリック       | カテゴリー一覧表示     | 選択値をセット         |
| 単位選択       | ドロップダウンクリック       | 単位一覧表示           | 選択値をセット         |
| 日付選択       | 日付フィールドクリック       | カレンダー表示         | 選択値をセット         |

### フォーム仕様

| フィールド   | 型     | 必須 | バリデーション                       | 初期値       |
| ------------ | ------ | ---- | ------------------------------------ | ------------ |
| 食材名       | string | Yes  | 1-50文字                             | 空文字       |
| カテゴリーID | string | Yes  | 選択必須                             | 未選択       |
| 数量         | number | Yes  | 0より大きい数値、小数点以下2桁まで   | 1            |
| 単位ID       | string | Yes  | 選択必須                             | 未選択       |
| 保存場所     | enum   | Yes  | REFRIGERATED/FROZEN/ROOM_TEMPERATURE | REFRIGERATED |
| 賞味期限     | date   | No   | 現在日付以降                         | null         |
| 購入日       | date   | Yes  | -                                    | 今日         |
| 価格         | number | No   | 0以上の整数                          | null         |
| メモ         | string | No   | 最大200文字                          | 空文字       |

### 画面遷移

- **前画面**:
  - ホーム画面（/）
  - 食材一覧画面（/ingredients）
- **次画面**:
  - 成功時: 食材一覧画面（/ingredients）
  - キャンセル時: 前画面
- **エラー時**: エラーメッセージを表示、フォームに留まる

## 5. API仕様

### 使用するAPI

#### 1. カテゴリー一覧取得

- **エンドポイント**: `GET /api/ingredients/categories`
- **目的**: カテゴリー選択肢の取得
- **呼び出しタイミング**: 画面初期表示時

**リクエスト**

```typescript
// パラメータなし
```

**レスポンス**

```typescript
interface CategoriesResponse {
  categories: Array<{
    id: string
    name: string
    description: string | null
  }>
}
```

#### 2. 単位一覧取得

- **エンドポイント**: `GET /api/ingredients/units`
- **目的**: 単位選択肢の取得
- **呼び出しタイミング**: 画面初期表示時

**リクエスト**

```typescript
// パラメータなし
```

**レスポンス**

```typescript
interface UnitsResponse {
  units: Array<{
    id: string
    name: string
    description: string | null
  }>
}
```

#### 3. 食材登録

- **エンドポイント**: `POST /api/ingredients`
- **目的**: 新規食材の登録
- **呼び出しタイミング**: 保存ボタンクリック時

**リクエスト**

```typescript
interface CreateIngredientRequest {
  name: string
  categoryId: string
  quantity: number
  unitId: string
  storageLocation: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
  expiryDate?: string | null // ISO 8601形式
  bestBeforeDate?: string | null // ISO 8601形式
  purchaseDate: string // ISO 8601形式
  price?: number | null
  memo?: string | null
}
```

**レスポンス**

```typescript
interface CreateIngredientResponse {
  ingredient: {
    id: string
    name: string
    categoryId: string
    quantity: number
    unitId: string
    storageLocation: string
    expiryDate: string | null
    bestBeforeDate: string | null
    purchaseDate: string
    price: number | null
    memo: string | null
    createdAt: string
    updatedAt: string
  }
}
```

**エラーハンドリング**
| エラーコード | 処理 |
|------------|------|
| 400 | バリデーションエラーを各フィールドに表示 |
| 401 | （将来）ログイン画面へリダイレクト |
| 409 | 「同じ食材が既に登録されています」を表示 |
| 500 | 「登録に失敗しました」をトースト表示 |

## 6. 状態管理

### クライアント状態

```typescript
interface CreateIngredientFormState {
  isSubmitting: boolean
  isDirty: boolean // 編集があったか
  errors: Record<string, string> // フィールドごとのエラー
}
```

### サーバー状態（TanStack Query）

- **queryKey**:
  - `['categories']`
  - `['units']`
- **キャッシュ戦略**: 10分間キャッシュ（マスタデータのため）
- **mutation**:
  - 食材登録用のuseMutation
  - 成功時にキャッシュ無効化: `['ingredients']`

### URL状態

なし

## 7. 実装ガイド

### 使用コンポーネント

- **shadcn/ui**:
  - Form（React Hook Form統合）
  - Input（テキスト入力）
  - Select（カテゴリー、単位）
  - RadioGroup（保存場所）
  - DatePicker（日付選択）
  - Textarea（メモ）
  - Button（保存、キャンセル）
  - Dialog（確認ダイアログ）
  - Toast（エラー/成功メッセージ）
- **カスタムコンポーネント**:
  - IngredientForm（フォーム全体）

### ディレクトリ構成

```
src/
├── app/ingredients/create/
│   └── page.tsx                    # 登録画面
└── modules/ingredients/
    ├── components/
    │   └── IngredientForm.tsx
    ├── hooks/
    │   ├── useCategories.ts
    │   ├── useUnits.ts
    │   └── useCreateIngredient.ts
    ├── schemas/
    │   └── ingredient.schema.ts    # Zodスキーマ
    └── api/
        └── ingredients.api.ts
```

### 実装時の注意点

- React Hook Form + Zodでフォーム管理
- 離脱防止（isDirtyの場合は確認ダイアログ）
- 購入日のデフォルトは今日の日付
- 数値入力は半角数字のみ受け付ける
- 送信中は保存ボタンを無効化

### テスト観点

- [ ] **正常系**:
  - 必須項目のみで登録成功
  - すべての項目を入力して登録成功
  - 登録後、一覧画面へ遷移
- [ ] **異常系**:
  - 必須項目未入力時のエラー表示
  - 不正な値のバリデーションエラー
  - APIエラー時のエラーメッセージ
  - ネットワークエラー時の処理
- [ ] **エッジケース**:
  - 長い食材名（50文字）の入力
  - 小数点を含む数量の入力
  - 編集中の離脱防止機能
