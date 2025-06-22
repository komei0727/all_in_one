# プロジェクト設計資料

本プロジェクトの設計に関する包括的な資料集です。

## 📁 ディレクトリ構成

### 🏗️ アーキテクチャ設計

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - アーキテクチャ概要
- **[architecture/](./architecture/)** - 詳細なアーキテクチャ設計資料
  - Enhanced Modular Monolith の完全設計仕様
  - アーキテクチャパターン比較分析
  - 段階的移行計画

### 🎯 ドメイン設計（DDD）

- **[domain/](./domain/)** - ドメイン駆動設計資料
  - ドメインモデルと境界コンテキスト
  - ユビキタス言語とドメインサービス
  - 集約とリポジトリパターン

### 📊 API設計

- **[api/](./api/)** - 詳細なAPI設計資料
  - RESTful API エンドポイント
  - リクエスト/レスポンス仕様
  - エラーハンドリング

### 🗃️ データベース設計

- **[database/](./database/)** - 詳細なDB設計資料
  - DDDに基づくテーブル設計
  - マイグレーション戦略
  - インデックス最適化

### 📱 画面設計

- **[screens/](./screens/)** - 画面設計資料
  - UI/UX設計とワイヤーフレーム
  - API連携仕様
  - ユーザーフロー

### 📋 基本設計書

- **[USER_STORY.md](./USER_STORY.md)** - ユーザーストーリーと機能要求
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - 開発環境セットアップ
- **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** - 開発ガイドライン
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - 実装計画

## 🎯 読み進め方

### 🆕 新規参加者向け

1. **[USER_STORY.md](./USER_STORY.md)** - プロジェクト概要とビジネス価値
2. **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - 開発環境構築
3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - アーキテクチャ概要
4. **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** - 開発ルールとワークフロー

### 🏗️ アーキテクト・設計者向け

1. **[architecture/ARCHITECTURE_ENHANCED.md](./architecture/ARCHITECTURE_ENHANCED.md)** - 完全なアーキテクチャ設計
2. **[architecture/ARCHITECTURE_PATTERNS_COMPARISON.md](./architecture/ARCHITECTURE_PATTERNS_COMPARISON.md)** - パターン比較分析
3. **[domain/](./domain/)** - ドメインモデリング詳細
4. **[database/](./database/)** - データベース設計

### 🔧 実装者向け

1. **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - 実装ロードマップ
2. **[api/](./api/)** - API詳細仕様とエンドポイント
3. **[screens/](./screens/)** - 画面詳細仕様とUI設計
4. **[database/](./database/)** - テーブル設計とマイグレーション

### 📊 技術的詳細を確認したい場合

1. **[domain/contexts/ingredient-management/](./domain/contexts/ingredient-management/)** - DDD実装詳細
2. **[api/endpoints/](./api/endpoints/)** - API実装仕様

## 🌟 推奨学習パス

### Phase 1: 理解 (1-2日)

- プロジェクト概要とビジネス要件
- アーキテクチャの全体像
- 開発環境セットアップ

### Phase 2: 設計深掘り (3-5日)

- Enhanced Modular Monolith の詳細
- DDD原則と実装パターン
- API設計とデータモデル

### Phase 3: 実装準備 (1-2日)

- 実装計画と優先順位
- 開発ワークフローとルール
- 具体的な実装例の確認

---

> 💡 **ヒント**: アーキテクチャの理解を深めるため、図表や実装例を中心に読み進めることをお勧めします。疑問点があれば、関連する設計資料も併せて参照してください。
