# ユビキタス言語 v2.0（ビジネス要求対応版）

## 1. 概要

本ドキュメントは、ビジネス要求文書とペルソナ分析から抽出したユビキタス言語を定義します。
開発チーム、ドメインエキスパート、ステークホルダー全員が共通の理解を持つための用語集です。

## 2. コア概念（MVP必須）

### 2.1 食材管理関連

| 用語             | 英語             | 定義                                                      | ペルソナとの関連   |
| ---------------- | ---------------- | --------------------------------------------------------- | ------------------ |
| **食材**         | Ingredient       | 料理に使用する材料。在庫管理の対象となる最小単位          | 全ペルソナ         |
| **在庫**         | Stock/Inventory  | 現在保有している食材の数量                                | 全ペルソナ         |
| **賞味期限**     | Best Before Date | 品質が保証される期限。過ぎても安全性に問題はない          | 全ペルソナ         |
| **消費期限**     | Expiry Date      | 安全に消費できる期限。過ぎたら廃棄推奨                    | 全ペルソナ         |
| **期限切れ間近** | Expiring Soon    | 賞味期限まで3日以内の状態（田中健太は3日前通知を希望）    | 田中健太           |
| **食材ロス**     | Food Waste       | 期限切れや腐敗により廃棄される食材。月3,000-5,000円の損失 | 田中健太、佐藤美咲 |

### 2.2 買い物サポート関連

| 用語               | 英語               | 定義                                           | ペルソナとの関連     |
| ------------------ | ------------------ | ---------------------------------------------- | -------------------- |
| **買い物モード**   | Shopping Mode      | 店内で在庫を素早く確認できる簡易表示モード     | 田中健太、佐藤美咲   |
| **重複購入**       | Duplicate Purchase | 既に在庫があるのに同じ食材を購入してしまうこと | 田中健太、山田・鈴木 |
| **まとめ買い**     | Bulk Purchase      | 週末などに1週間分の食材を一度に購入すること    | 佐藤美咲、山田・鈴木 |
| **オフライン対応** | Offline Support    | インターネット接続なしでも基本機能が使えること | 全ペルソナ           |

### 2.3 保存・分類関連

| 用語           | 英語             | 定義                           | 使用例                       |
| -------------- | ---------------- | ------------------------------ | ---------------------------- |
| **保存場所**   | Storage Location | 食材を保管している場所         | 冷蔵、冷凍、常温             |
| **カテゴリー** | Category         | 食材を分類するためのグループ   | 野菜、肉・魚、乳製品、調味料 |
| **単位**       | Unit             | 食材の数量を表す単位           | 個、g、ml、本、パック        |
| **作り置き**   | Prepared Food    | 事前に調理して保存している料理 | 佐藤美咲が週末に準備         |

## 3. Phase 2 概念（共有機能）

### 3.1 ユーザー・共有関連

| 用語               | 英語                 | 定義                                           | ペルソナとの関連   |
| ------------------ | -------------------- | ---------------------------------------------- | ------------------ |
| **世帯**           | Household            | 食材を共有する生活単位（カップル、家族等）     | 山田・鈴木カップル |
| **アカウント共有** | Account Sharing      | 複数ユーザーが同じ食材データにアクセスすること | 山田・鈴木カップル |
| **パートナー**     | Partner              | 食材を共有している相手                         | 山田・鈴木カップル |
| **同期**           | Sync/Synchronization | 複数デバイス間でデータを一致させること         | 山田・鈴木カップル |
| **編集権限**       | Edit Permission      | 食材情報を変更できる権限                       | 山田・鈴木カップル |

### 3.2 コミュニケーション関連

| 用語           | 英語                | 定義                                         | 具体例                           |
| -------------- | ------------------- | -------------------------------------------- | -------------------------------- |
| **更新通知**   | Update Notification | パートナーが食材を更新したことを知らせる通知 | 「翔太さんが牛乳を購入しました」 |
| **操作履歴**   | Operation History   | 誰がいつ何をしたかの記録                     | 「愛さんが卵を使い切りました」   |
| **買い物分担** | Shopping Division   | 誰が何を買うかの役割分担                     | 「今回は私が野菜担当」           |

## 4. ビジネスルール用語

### 4.1 在庫状態

| 状態         | 定義                   | 表示 | アクション             |
| ------------ | ---------------------- | ---- | ---------------------- |
| **在庫あり** | 数量が1以上の状態      | 🟢   | -                      |
| **在庫なし** | 数量が0の状態          | ⚪   | 買い物リストに追加提案 |
| **在庫不足** | 設定した閾値以下の状態 | 🟡   | 補充提案               |
| **期限切れ** | 賞味期限を過ぎた状態   | 🔴   | 廃棄提案               |

### 4.2 期限管理

| 用語         | 定義                 | 通知タイミング |
| ------------ | -------------------- | -------------- |
| **新鮮**     | 賞味期限まで8日以上  | -              |
| **要注意**   | 賞味期限まで4-7日    | 初回通知       |
| **期限間近** | 賞味期限まで3日以内  | 毎日通知       |
| **期限切れ** | 賞味期限を過ぎた状態 | 即座に通知     |

## 5. アクション用語

### 5.1 基本操作

| アクション   | 英語          | 説明                     | 利用シーン     |
| ------------ | ------------- | ------------------------ | -------------- |
| **登録する** | Register      | 新しい食材を追加         | 買い物後       |
| **使い切る** | Use Up        | 在庫を0にする            | 料理で全部使用 |
| **少し使う** | Use Partially | 在庫を減らす             | 料理で一部使用 |
| **廃棄する** | Discard       | 期限切れ等で処分         | 腐敗・期限切れ |
| **共有する** | Share         | パートナーとデータを共有 | 同棲開始時     |

### 5.2 買い物関連

| アクション     | 説明                             | ペルソナの利用例         |
| -------------- | -------------------------------- | ------------------------ |
| **在庫確認**   | 買い物前に家にあるものを確認     | 田中：コンビニ立ち寄り前 |
| **買い物メモ** | 買うべきものをメモ               | 佐藤：週末の計画時       |
| **購入報告**   | 買ったものをパートナーに知らせる | 山田：仕事帰りの買い物後 |

## 6. 数量表現

### 6.1 一人暮らし向け単位

| 単位           | 適用例                   | 備考                 |
| -------------- | ------------------------ | -------------------- |
| **1人前**      | カレールー、パスタソース | 一人暮らしの基準量   |
| **少量パック** | 肉100g、野菜1/4個        | 使い切りサイズ       |
| **ミニサイズ** | 牛乳500ml、食パン4枚切り | 賞味期限内に消費可能 |

### 6.2 カップル向け単位

| 単位           | 適用例                | 備考                |
| -------------- | --------------------- | ------------------- |
| **2人前**      | 肉200-300g            | 1食分の目安         |
| **通常パック** | 牛乳1L、食パン6枚切り | 2人で消費する標準量 |
| **大容量**     | 調味料、米            | 長期保存可能なもの  |

## 7. システム状態用語

| 用語           | 説明                     | 技術的実装             |
| -------------- | ------------------------ | ---------------------- |
| **同期中**     | データを更新している状態 | ローディング表示       |
| **オフライン** | ネット接続なしの状態     | ローカルキャッシュ使用 |
| **競合**       | 同時に編集された状態     | 最終更新優先           |

## 8. ドメインイベント用語

| イベント             | 発生条件             | 通知対象                |
| -------------------- | -------------------- | ----------------------- |
| **食材登録完了**     | 新規食材が追加された | （ログのみ）            |
| **在庫更新完了**     | 数量が変更された     | 共有相手                |
| **期限アラート発生** | 期限3日前になった    | 本人（Phase2:世帯全員） |
| **在庫切れ発生**     | 在庫が0になった      | 本人（Phase2:世帯全員） |

## 9. UI/UX用語

| 用語             | 説明                       | 表示場所     |
| ---------------- | -------------------------- | ------------ |
| **ホーム画面**   | アプリ起動時の画面         | /            |
| **食材一覧**     | 全食材を表示する画面       | /ingredients |
| **クイック登録** | 3タップで完了する簡易登録  | FABボタン    |
| **フィルター**   | 表示する食材を絞り込む機能 | 一覧画面上部 |

## 10. 命名規則

### コード内表記

```typescript
// エンティティ
class Ingredient {}
class Category {}
class Unit {}

// 値オブジェクト
class IngredientId {}
class IngredientName {}
class Quantity {}
class ExpiryDate {}
class StorageLocation {}

// ドメインイベント
class IngredientRegistered {}
class StockUpdated {}
class IngredientExpiringSoon {}
```

### API エンドポイント

```
GET    /api/v1/ingredients          # 一覧取得
POST   /api/v1/ingredients          # 新規登録
PUT    /api/v1/ingredients/:id      # 更新
DELETE /api/v1/ingredients/:id      # 削除
GET    /api/v1/shopping/quick-check # 買い物モード
```

## 11. 用語使用ガイドライン

### ユーザー向けメッセージ

- ✅ 「賞味期限が近づいています」
- ❌ 「ExpiryDateエンティティの値が閾値を下回りました」

### エラーメッセージ

- ✅ 「食材名を入力してください」
- ❌ 「IngredientNameは必須項目です」

### 通知メッセージ

- ✅ 「牛乳があと3日で期限切れです」
- ❌ 「ID: abc123の賞味期限アラート」

## 更新履歴

| 日付       | 内容 | 作成者     |
| ---------- | ---- | ---------- |
| 2025-06-24 | 初版 | @komei0727 |
