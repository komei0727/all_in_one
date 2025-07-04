# ホーム画面

## 1. 基本情報

- **画面ID**: SCREEN_HOME
- **パス**: /
- **作成日**: 2025-06-21
- **更新日**: 2025-06-24
- **ステータス**: 設計中
- **担当者**: @komei0727

## 2. 画面概要

### 目的

アプリケーションのエントリーポイントとして、各機能への導線を提供する。

### ユーザーストーリー

ユーザーとして、アプリケーションの主要機能にすぐにアクセスしたい。

### 前提条件・制約

- **アクセス権限**: 認証必須（ログイン済みユーザーのみアクセス可能）
- **事前条件**: ユーザーがログイン済みであること
- **画面の制約事項**: シンプルなナビゲーション画面

## 3. UI設計

### 画面構成

```
┌─────────────────────────────────────┐
│ 🍳 食材管理アプリ        👤 山田太郎 ▼│
├─────────────────────────────────────┤
│                                     │
│     山田太郎さん、こんにちは！       │
│     食材管理アプリへようこそ         │
│                                     │
│ ┌─────────────────────────────┐   │
│ │    📋 食材一覧を見る         │   │
│ └─────────────────────────────┘   │
│                                     │
│ ┌─────────────────────────────┐   │
│ │    ➕ 食材を追加する         │   │
│ └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### コンポーネント構成

- **ヘッダー**: アプリタイトル、ユーザー情報（名前、ドロップダウンメニュー）
- **ヘッダードロップダウン**:
  - マイページ（将来実装）
  - 設定（将来実装）
  - ログアウト
- **メイン**:
  - パーソナライズされたウェルカムメッセージ
  - ナビゲーションボタン（食材一覧、食材追加）
- **フッター**: なし

### レスポンシブ対応

- **モバイル (< 768px)**: 1カラムレイアウト
- **タブレット (768px - 1024px)**: 中央寄せ、最大幅600px
- **デスクトップ (> 1024px)**: 中央寄せ、最大幅600px

## 4. 機能仕様

### アクション一覧

| アクション           | トリガー                         | 処理内容                   | 結果                       |
| -------------------- | -------------------------------- | -------------------------- | -------------------------- |
| 食材一覧画面へ遷移   | 「食材一覧を見る」ボタンクリック | 食材一覧画面へ遷移         | /ingredients へ遷移        |
| 食材追加画面へ遷移   | 「食材を追加する」ボタンクリック | 食材登録画面へ遷移         | /ingredients/create へ遷移 |
| ユーザーメニュー表示 | ユーザー名クリック               | ドロップダウンメニュー表示 | メニュー表示               |
| ログアウト           | 「ログアウト」クリック           | NextAuth signOut呼び出し   | /auth/login へ遷移         |

### フォーム仕様

なし（ナビゲーションのみの画面）

### 画面遷移

- **前画面**: ログイン画面（/auth/login）※認証後のリダイレクト
- **次画面**:
  - 食材一覧画面（/ingredients）
  - 食材登録画面（/ingredients/create）
- **エラー時**: なし（静的画面）

## 5. API仕様

### 使用するAPI

#### 1. セッション情報取得（NextAuth）

- **使用方法**: NextAuthのuseSession()フック
- **目的**: ログインユーザーのセッション情報取得
- **呼び出しタイミング**: コンポーネントマウント時

**実装例**

```typescript
import { useSession } from 'next-auth/react'

const { data: session, status } = useSession()

// セッションデータ構造
interface Session {
  user: {
    email: string
    id: string // NextAuthユーザーID
    userId?: string // ドメインユーザーID（オプション）
  }
  expires: string
}
```

#### 2. ドメインユーザー情報取得（オプション）

- **エンドポイント**: `GET /api/v1/users/me`
- **目的**: ドメインユーザーの詳細情報取得
- **呼び出しタイミング**: 必要に応じて

**レスポンス**

```typescript
interface DomainUserResponse {
  data: {
    id: string // ドメインユーザーID
    nextAuthId: string // NextAuthユーザーID
    email: string
    name: string | null
    status: 'ACTIVE' | 'DEACTIVATED'
    createdAt: string
    updatedAt: string
  }
  meta: {
    timestamp: string
    version: string
  }
}
```

**エラーハンドリング**
| エラーケース | 処理 |
|------------|------|
| 未認証（status === 'unauthenticated'） | ログイン画面（/auth/login）へリダイレクト |
| APIエラー (401) | NextAuth signIn()を呼び出し |
| APIエラー (500) | 「エラーが発生しました」をトースト表示 |

## 6. 状態管理

### クライアント状態

```typescript
interface HomeScreenState {
  showUserMenu: boolean // ユーザーメニューの表示状態
}
```

### サーバー状態

#### NextAuthセッション

- useSession()フックで管理
- 自動的にセッション状態を管理
- 認証状態: 'authenticated' | 'loading' | 'unauthenticated'

#### TanStack Query（ドメインユーザー情報）

- **queryKey**: `['users', 'me']`
- **キャッシュ戦略**: 5分間キャッシュ
- **再検証タイミング**: ウィンドウフォーカス時

### URL状態

なし

## 7. 実装ガイド

### 使用コンポーネント

- **shadcn/ui**:
  - Button（ナビゲーションボタン）
  - DropdownMenu（ユーザーメニュー）
  - Avatar（ユーザーアイコン）
  - Skeleton（ローディング中）
- **NextAuth**:
  - useSessionフック
  - signOut関数
- **カスタムコンポーネント**:
  - UserMenu（ユーザー情報とドロップダウン）

### ディレクトリ構成

```
src/
└── app/
    └── page.tsx    # ホーム画面
```

### 実装時の注意点

- Next.js App RouterのLinkコンポーネントを使用
- ボタンは大きめにしてモバイルでもタップしやすく
- アイコンを使って視覚的にわかりやすく
- 認証チェックはNextAuthのmiddlewareで実施
- セッションローディング中はSkeletonを表示
- ユーザー名はメールアドレスを使用（名前がない場合）
- メールアドレスが長い場合は省略表示（最大20文字）

### テスト観点

- [ ] **正常系**:
  - 各ボタンから適切な画面へ遷移する
  - セッション情報が正しく表示される
  - ログアウトが正常に動作する
- [ ] **異常系**:
  - 未認証時のアクセス（ログイン画面へリダイレクト）
  - セッションローディング中の表示
  - ドメインユーザーAPIエラー時の処理
- [ ] **エッジケース**:
  - セッション期限切れ時の処理
  - 長いメールアドレスの表示
  - NextAuthユーザーは存在するがドメインユーザーが未作成の場合
