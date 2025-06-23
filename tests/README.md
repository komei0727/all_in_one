# テストディレクトリ構成ガイド

このドキュメントでは、プロジェクトのテスト戦略とディレクトリ構成について説明します。

## テストピラミッド

本プロジェクトは以下のテストピラミッド構成に従います：

- **単体テスト (70%)** - `tests/unit/` ✅ 実装済み
- **統合テスト (20%)** - `tests/integration/` ✅ 実装済み（SQLite使用）
- **E2Eテスト (10%)** - `tests/e2e/` ✅ 実装済み（SQLite使用）

## 現在の実装状況

すべてのテストレベルが実装されています。統合テストとE2EテストではSQLiteを使用した高速なインメモリデータベースを活用しています。

## ディレクトリ構成

```
tests/
├── __fixtures__/          # テスト用ヘルパー
│   ├── factories/        # エンティティファクトリー
│   └── mocks/           # モックオブジェクト
├── unit/                 # 単体テスト
│   ├── app/             # Next.js App Router
│   └── modules/         # ビジネスモジュール
│       └── ingredients/server/
│           ├── api/         # API層（handlers, validators）
│           ├── application/ # Application層（commands, queries, mappers）
│           ├── domain/      # Domain層（entities, value-objects, exceptions）
│           └── infrastructure/ # Infrastructure層（repositories）
├── integration/          # 統合テスト
├── e2e/                  # E2Eテスト
└── setup/               # テスト設定
```

### 機能別グループ化

各層のテストは機能別にグループ化されています：

- **Application層**: `commands/`, `queries/`, `mappers/`
- **Domain層**: `entities/`, `value-objects/`, `exceptions/`
- **API層**: `handlers/`, `validators/`
- **Infrastructure層**: `repositories/`

## テストファイル命名規則

### 基本原則

- ソースファイルと完全に一致させる + `.test.ts`
- 型情報を含める（entity, vo, exception, handler, mapper等）
- ディレクトリ構造で階層を表現（ファイル名では繰り返さない）

### 各層の命名規則

| レイヤー           | 対象           | 命名規則                    | 例                                     |
| ------------------ | -------------- | --------------------------- | -------------------------------------- |
| **Domain**         | エンティティ   | `{name}.entity.test.ts`     | `ingredient.entity.test.ts`            |
|                    | 値オブジェクト | `{name}.vo.test.ts`         | `ingredient-name.vo.test.ts`           |
|                    | 例外           | `{name}.exception.test.ts`  | `validation.exception.test.ts`         |
| **Application**    | コマンド       | `{name}.command.test.ts`    | `create-ingredient.command.test.ts`    |
|                    | ハンドラー     | `{name}.handler.test.ts`    | `create-ingredient.handler.test.ts`    |
|                    | クエリ         | `{name}.query.test.ts`      | `get-categories.query.test.ts`         |
|                    | マッパー       | `{name}.mapper.test.ts`     | `ingredient.mapper.test.ts`            |
| **API**            | ハンドラー     | `{name}.handler.test.ts`    | `create-ingredient.handler.test.ts`    |
|                    | バリデーター   | `{name}.validator.test.ts`  | `create-ingredient.validator.test.ts`  |
| **API Route**      | ルート         | `{resource}.route.test.ts`  | `ingredients.route.test.ts`            |
| **Infrastructure** | リポジトリ     | `{name}.repository.test.ts` | `prisma-ingredient.repository.test.ts` |

## 各テストタイプの詳細

### 単体テスト (`tests/unit/`)

**対象**: 個々のクラスや関数の独立したテスト

**特徴**:

- 外部依存をモック化
- 高速実行
- ビジネスロジックの詳細な検証

**例**:

- 値オブジェクトのバリデーション
- エンティティのビジネスルール
- ハンドラーのロジック（リポジトリをモック）

### 統合テスト (`tests/integration/`) - 実装予定

**対象**: 複数のコンポーネントの結合テスト

**特徴**:

- 実際のデータベースを使用
- モックを最小限に抑える
- ビジネスフロー全体の検証

**実装予定の例**:

- Repository + Database の結合
- Command Handler + Repository の結合
- DIコンテナの動作確認

### E2Eテスト (`tests/e2e/`) - 実装予定

**対象**: ユーザー視点での完全なシナリオテスト

**特徴**:

- HTTPレベルでのテスト
- 実際のAPIエンドポイントを使用
- ユーザーストーリーの実現を検証

**実装予定の例**:

- APIエンドポイントの動作確認
- 複数APIを組み合わせたシナリオ
- エラーハンドリングの確認

## テストヘルパー (`tests/__fixtures__/`)

### ファクトリー

テスト用のエンティティを簡単に作成するためのヘルパー関数：

```typescript
const category = createTestCategory({ name: 'テスト野菜' })
const ingredient = createTestIngredient({
  name: 'テストトマト',
  stock: { quantity: 5, unitId: '...' },
})
```

### モック

頻繁に使用するモックオブジェクトの生成：

```typescript
const mockRepo = createMockIngredientRepository()
mockRepo.findById.mockResolvedValue(testIngredient)
```

## テスト実行

```bash
# すべてのテストを実行
pnpm test

# 特定のテストタイプのみ実行
pnpm test tests/unit
pnpm test tests/integration
pnpm test tests/e2e

# カバレッジレポート付きで実行
pnpm test:coverage
```

## ベストプラクティス

1. **テストの独立性**: 各テストは他のテストに依存しない
2. **モックの活用**: 単体テストでは外部依存を適切にモック化
3. **適切な粒度**: テストタイプに応じた適切な粒度でテストを作成
4. **日本語コメント**: 何をテストしているか分かるように日本語でコメントを記載

## テストデータベース環境

### SQLiteを採用した理由

1. **高速実行**: インメモリDBとして動作し、テスト実行が高速
2. **独立性**: 各テストで独立したDBインスタンスを使用可能
3. **簡易性**: Dockerなどの外部依存が不要
4. **CI/CD対応**: GitHub Actionsで追加設定なしに動作

### テスト実行方法

```bash
# 単体テストのみ
pnpm test:unit

# 統合テスト
pnpm test:integration

# E2Eテスト
pnpm test:e2e

# 全テスト実行
pnpm test:all
```

### テストヘルパー

`tests/helpers/`にテスト用のユーティリティを用意：

- `database.helper.ts`: DB接続、リセット、トランザクション管理
- `factory.helper.ts`: テストデータファクトリー

## 今後の拡張予定

1. **Faker.jsの導入** (Issue #38)

   - より現実的なテストデータの生成
   - Test Data Builderパターンの実装

2. **パフォーマンステスト**
   - 大量データでの動作確認
   - レスポンスタイムの測定
