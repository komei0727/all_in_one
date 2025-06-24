# 画面設計書ガイド

このディレクトリには各画面の設計書を配置します。

## 📋 テンプレートの使い方

1. `TEMPLATE.md`をコピーして新しい画面の設計書を作成
2. プレースホルダー（[]で囲まれた箇所）を実際の内容に置き換え
3. 不要なセクションは削除可能

## 📁 ディレクトリ構成

```
screens/
├── TEMPLATE.md          # テンプレート（編集禁止）
├── README.md           # このファイル
├── home.md             # ホーム画面
├── auth/               # 認証機能
│   ├── login.md        # ログイン画面
│   ├── register.md     # 新規登録画面
│   ├── forgot-password.md # パスワードリセット画面
│   └── reset-password.md  # パスワード再設定画面
└── ingredients/        # 食材管理機能
    ├── list.md         # 一覧画面
    ├── create.md       # 登録画面
    └── edit.md         # 編集画面
```

## 🔧 設計書の書き方

### 1. 基本情報

- **画面ID**: 一意の識別子（例: SCREEN_INGREDIENT_LIST）
- **パス**: 実際のURLパス（例: /ingredients）
- **ステータス**: 現在の進捗状況を記載

### 2. 画面概要

- ユーザーストーリーは「誰が」「何を」「なぜ」の形式で記載
- 前提条件は実装に影響する重要な制約を記載

### 3. UI設計

- ASCII図で簡潔に画面構成を表現
- 詳細なデザインはFigmaなどの外部ツールへのリンクでも可

### 4. 機能仕様

- アクション一覧は画面内のすべての操作を網羅
- フォーム仕様はバリデーションルールを具体的に記載

### 5. API仕様

- TypeScript型定義を使用して曖昧さを排除
- エラーハンドリングは実装時の処理を具体的に記載

### 6. 状態管理

- TanStack QueryのqueryKeyは実装と一致させる
- キャッシュ戦略は具体的な時間や条件を明記

### 7. 実装ガイド

- 使用するコンポーネントは具体的なコンポーネント名を記載
- テスト観点はE2Eテストのシナリオとしても利用可能

## 💡 Tips

### 良い設計書の特徴

- ✅ 実装者が迷わない具体性
- ✅ 変更履歴が追跡できる
- ✅ 他の画面との整合性が取れている

### 避けるべきこと

- ❌ 曖昧な表現（「適切に処理する」など）
- ❌ 実装と乖離した内容
- ❌ 更新されていない古い情報

## 🔄 更新ルール

1. 実装中に仕様変更があった場合は必ず設計書も更新
2. レビューで指摘された内容は設計書に反映
3. 更新日とステータスを忘れずに変更

## 📝 型定義の例

```typescript
// リクエスト型の例
interface CreateIngredientRequest {
  name: string
  category: string
  quantity: number
  unit: string
  expiryDate: string // ISO 8601形式
}

// レスポンス型の例
interface IngredientResponse {
  id: string
  userId: string // ユーザー認証対応で追加
  name: string
  category: string
  quantity: number
  unit: string
  expiryDate: string
  createdAt: string
  updatedAt: string
}

// 認証関連の型定義例
interface UserResponse {
  id: string
  email: string
  displayName: string
  emailVerified: boolean
}

interface AuthSession {
  token: string
  expiresAt: string // ISO 8601形式
}

// エラーレスポンスの例
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}
```

## 🔗 関連ドキュメント

- [API仕様](../api/) - 詳細なAPI設計資料
- [データベース設計](../database/) - 詳細なDB設計資料
- [アーキテクチャ設計](../ARCHITECTURE.md) - システム設計概要
