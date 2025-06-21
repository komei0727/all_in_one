# データフォーマット仕様

## 概要

API全体で使用されるデータフォーマットの標準仕様を定義します。一貫性のあるデータ形式により、実装の複雑さを軽減し、相互運用性を向上させます。

## 基本データ型

### 文字列（String）

- エンコーディング: UTF-8
- 最大長: フィールドごとに定義
- 空文字列: 許可しない（nullを使用）
- トリミング: APIで自動的に前後の空白を除去

```typescript
// Good
{
  "name": "牛乳",
  "memo": null  // 値がない場合
}

// Bad
{
  "name": "  牛乳  ",  // 前後の空白は自動除去される
  "memo": ""          // 空文字列は使わない
}
```

### 数値（Number）

- 整数: 32bit整数（-2,147,483,648 〜 2,147,483,647）
- 小数: 倍精度浮動小数点数
- 金額: 整数（円単位）
- パーセンテージ: 小数（0.15 = 15%）

```typescript
// 例
{
  "quantity": 2.5,      // 小数
  "price": 298,         // 金額（円）
  "taxRate": 0.1,       // 10%の税率
  "count": 10           // 整数
}
```

### 真偽値（Boolean）

- `true` または `false`
- 文字列表現は使用しない

```typescript
// Good
{
  "isActive": true,
  "isDeleted": false
}

// Bad
{
  "isActive": "true",   // 文字列は使わない
  "isDeleted": 1        // 数値は使わない
}
```

### Null値

- 値が存在しないことを表現
- 省略可能なフィールドで使用

```typescript
{
  "name": "牛乳",
  "expiryDate": null,     // 未設定
  "memo": null            // 未入力
}
```

## 特殊データ型

### ID（識別子）

**形式**: CUID (Collision-resistant Unique Identifier)

```typescript
{
  "id": "clm1234567890abcdef"
}
```

**特徴**:

- URLセーフ
- ソート可能（時系列）
- 衝突耐性
- 推測困難

### 日時（DateTime）

**形式**: ISO 8601（RFC 3339）、UTC

```typescript
{
  "createdAt": "2025-01-21T12:00:00Z",
  "updatedAt": "2025-01-21T15:30:45.123Z",
  "expiryDate": "2025-01-25T00:00:00Z"
}
```

**ルール**:

- 常にUTCで保存・送信
- タイムゾーン変換はクライアント側で実施
- 日付のみの場合も時刻を含める（00:00:00Z）
- ミリ秒は必要な場合のみ含める

### 日付（Date）

**形式**: ISO 8601の日付部分のみ

```typescript
{
  "purchaseDate": "2025-01-21"
}
```

**使用場面**:

- 時刻が不要な場合（購入日、誕生日など）
- UIでの日付選択

### 列挙型（Enum）

**形式**: 大文字スネークケース

```typescript
// 保存場所
enum StorageLocation {
  REFRIGERATED = "REFRIGERATED",      // 冷蔵
  FROZEN = "FROZEN",                  // 冷凍
  ROOM_TEMPERATURE = "ROOM_TEMPERATURE" // 常温
}

// 使用例
{
  "storageLocation": "REFRIGERATED"
}
```

### 配列（Array）

- 空配列を許可
- 要素の型は統一
- 最大要素数: 1000（デフォルト）

```typescript
{
  "tags": ["野菜", "有機", "国産"],
  "allergens": [],  // 空配列OK
  "quantities": [1, 2, 3, 4, 5]
}
```

### オブジェクト（Object）

- ネストは3階層まで
- 循環参照を避ける

```typescript
{
  "ingredient": {
    "id": "clm1234567890",
    "name": "牛乳",
    "category": {
      "id": "clm0987654321",
      "name": "乳製品"
    }
  }
}
```

## 命名規則

### フィールド名

**形式**: キャメルケース

```typescript
{
  "ingredientName": "牛乳",      // Good
  "ingredient_name": "牛乳",     // Bad: スネークケース
  "IngredientName": "牛乳"       // Bad: パスカルケース
}
```

### 特殊なフィールド名

| 用途       | フィールド名 | 型             | 説明         |
| ---------- | ------------ | -------------- | ------------ |
| 識別子     | id           | string         | CUID形式     |
| 作成日時   | createdAt    | string         | ISO 8601     |
| 更新日時   | updatedAt    | string         | ISO 8601     |
| 削除フラグ | deletedAt    | string \| null | 論理削除時刻 |
| 有効フラグ | isActive     | boolean        | 有効/無効    |

## バリデーションルール

### 文字列

```typescript
// 食材名: 1-50文字
{
  "name": {
    "type": "string",
    "minLength": 1,
    "maxLength": 50,
    "pattern": "^[\\u0020-\\u007E\\u00A1-\\u00FF\\u3000-\\u303F\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FAF]+$"
  }
}
```

### 数値

```typescript
// 数量: 0より大きい、小数点以下2桁まで
{
  "quantity": {
    "type": "number",
    "minimum": 0.01,
    "multipleOf": 0.01
  }
}
```

### 配列

```typescript
// タグ: 最大10個、各タグは1-20文字
{
  "tags": {
    "type": "array",
    "maxItems": 10,
    "items": {
      "type": "string",
      "minLength": 1,
      "maxLength": 20
    }
  }
}
```

## 特殊なケース

### 金額の扱い

```typescript
// 整数で円単位
{
  "price": 298,           // 298円
  "taxAmount": 29,        // 29円
  "totalAmount": 327      // 327円
}

// 計算例
const price = 298;
const taxRate = 0.1;  // 10%
const taxAmount = Math.floor(price * taxRate);
const totalAmount = price + taxAmount;
```

### 座標・位置情報

```typescript
{
  "location": {
    "latitude": 35.6762,    // 緯度
    "longitude": 139.6503,  // 経度
    "accuracy": 10.5        // 精度（メートル）
  }
}
```

### ファイルメタデータ

```typescript
{
  "file": {
    "name": "receipt.jpg",
    "size": 1048576,              // バイト単位
    "mimeType": "image/jpeg",
    "url": "https://example.com/files/receipt.jpg",
    "uploadedAt": "2025-01-21T12:00:00Z"
  }
}
```

## 国際化（i18n）

### 多言語対応

```typescript
// 将来の実装例
{
  "name": {
    "ja": "牛乳",
    "en": "Milk",
    "zh": "牛奶"
  }
}

// 現在の実装（日本語のみ）
{
  "name": "牛乳"
}
```

### 通貨

```typescript
// 現在: 日本円のみ
{
  "price": 298,
  "currency": "JPY"
}

// 将来: 多通貨対応
{
  "price": {
    "amount": 298,
    "currency": "JPY"
  }
}
```

## エラー時のデータ形式

### バリデーションエラーの詳細

```typescript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": {
      "name": ["必須項目です"],
      "quantity": ["0より大きい値を入力してください"],
      "expiryDate": ["日付の形式が正しくありません"]
    }
  }
}
```

## 型定義サンプル

### 基本的な型定義

```typescript
// 共通の型定義
type ID = string
type DateTime = string // ISO 8601
type Date = string // YYYY-MM-DD

// 金額の型
type Money = number // 円単位の整数

// ベースとなるモデル
interface BaseModel {
  id: ID
  createdAt: DateTime
  updatedAt: DateTime
}

// 食材モデル
interface Ingredient extends BaseModel {
  name: string
  categoryId: ID
  quantity: number
  unitId: ID
  expiryDate: DateTime | null
  bestBeforeDate: DateTime | null
  purchaseDate: Date
  price: Money | null
  storageLocation: StorageLocation
  memo: string | null
}
```

## セキュリティ考慮事項

### サニタイゼーション

- HTMLタグは自動的にエスケープ
- SQLインジェクション対策（Prisma使用）
- 特殊文字の適切な処理

### 機密情報の扱い

```typescript
// レスポンスに含めない
{
  "password": "******",           // マスク表示
  "creditCardNumber": "****1234", // 部分マスク
  "apiKey": null                  // 完全に除外
}
```

## パフォーマンス考慮事項

### データサイズ

- レスポンスは1MB以下を推奨
- 大きなデータはページネーション使用
- 不要なフィールドは含めない

### 圧縮

- gzip圧縮を使用
- Content-Encoding: gzip

## 将来の拡張

### Protocol Buffers

- バイナリ形式での高速通信
- スキーマ定義による型安全性

### GraphQL

- 必要なフィールドのみ取得
- 過剰/過少取得の解決
