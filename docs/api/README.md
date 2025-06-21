# API仕様書ガイド

このディレクトリにはAPI仕様書を配置します。

## 📋 概要

本ドキュメントは、食材管理アプリケーションのREST APIの仕様を定義します。
すべてのAPIは統一された設計原則に従い、一貫性のあるインターフェースを提供します。

## 🏗️ ディレクトリ構成

```
api/
├── README.md          # このファイル
├── TEMPLATE.md        # エンドポイントテンプレート
├── common/            # 共通仕様
│   ├── overview.md    # API概要
│   ├── errors.md      # エラーハンドリング
│   ├── pagination.md  # ページネーション
│   └── formats.md     # データフォーマット
└── endpoints/         # エンドポイント仕様
    └── ingredients.md # 食材管理API
```

## 🔧 API設計原則

### RESTful設計

- リソース指向のURL設計
- 適切なHTTPメソッドの使用
- ステートレスな通信

### URL構造

```
https://api.example.com/api/v1/{resource}
```

- `api/v1/`: APIバージョン
- `{resource}`: リソース名（複数形）

### HTTPメソッド

| メソッド | 用途                   | 冪等性 |
| -------- | ---------------------- | ------ |
| GET      | リソースの取得         | Yes    |
| POST     | リソースの作成         | No     |
| PUT      | リソースの更新（全体） | Yes    |
| PATCH    | リソースの更新（部分） | Yes    |
| DELETE   | リソースの削除         | Yes    |

### ステータスコード

| コード | 意味                  | 使用場面                         |
| ------ | --------------------- | -------------------------------- |
| 200    | OK                    | 正常な取得・更新・削除           |
| 201    | Created               | リソース作成成功                 |
| 204    | No Content            | 削除成功（レスポンスボディなし） |
| 400    | Bad Request           | バリデーションエラー             |
| 401    | Unauthorized          | 認証エラー                       |
| 403    | Forbidden             | 権限エラー                       |
| 404    | Not Found             | リソースが存在しない             |
| 409    | Conflict              | 競合（重複登録など）             |
| 500    | Internal Server Error | サーバーエラー                   |

## 📝 仕様書の書き方

### 1. テンプレートの使用

`TEMPLATE.md`をコピーして新しいエンドポイントの仕様書を作成します。

### 2. 必須記載事項

- エンドポイントの目的と概要
- リクエスト/レスポンスの型定義
- エラーケースと対処法
- 実装例（cURL、TypeScript）

### 3. 型定義

TypeScriptの型定義を使用して、曖昧さを排除します。

```typescript
// Good: 明確な型定義
interface CreateIngredientRequest {
  name: string;        // 1-50文字
  categoryId: string;  // UUID形式
  quantity: number;    // 0より大きい数値
}

// Bad: 曖昧な定義
{
  name: "文字列",
  categoryId: "ID",
  quantity: "数値"
}
```

### 4. レスポンス形式の統一

**成功レスポンス**

```json
{
  "data": {
    /* リソースデータ */
  },
  "meta": {
    "timestamp": "2025-01-21T12:00:00Z"
  }
}
```

**エラーレスポンス**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": {
      /* 詳細情報 */
    }
  }
}
```

## 🔍 共通仕様の参照

詳細な共通仕様は以下のドキュメントを参照してください：

- [API概要](./common/overview.md) - ベースURL、認証方式など
- [エラーハンドリング](./common/errors.md) - 統一エラー形式
- [ページネーション](./common/pagination.md) - 一覧取得の標準実装
- [データフォーマット](./common/formats.md) - 日時形式、ID形式など

## 🚀 実装ガイドライン

### クライアント実装

1. 型定義を`src/types/api/`に配置
2. API関数を`src/modules/*/api/`に実装
3. TanStack Queryでのフック化

### サーバー実装

1. Next.js App Routerの`app/api/`に配置
2. Zodでリクエストバリデーション
3. Prismaでデータアクセス

## 📅 バージョニング

- URL パス方式: `/api/v1/`, `/api/v2/`
- 後方互換性を保ちながら新バージョンを追加
- 非推奨APIは6ヶ月間の移行期間を設定

## 🔒 セキュリティ

- HTTPS必須
- CORS設定（開発環境のみ緩和）
- レート制限の実装
- 入力値の厳密なバリデーション

## 💡 ベストプラクティス

### DO

- ✅ 一貫性のあるURL設計
- ✅ 適切なHTTPステータスコード
- ✅ 明確なエラーメッセージ
- ✅ ページネーションの実装
- ✅ 冪等性の保証

### DON'T

- ❌ 動詞を含むURL（`/api/getIngredients`）
- ❌ ステータスコードの誤用
- ❌ 巨大なレスポンス（ページネーション未実装）
- ❌ 同期的な重い処理
