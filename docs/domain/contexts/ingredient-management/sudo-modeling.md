# SUDOモデリング - 食材・在庫管理コンテキスト

## 概要

本ドキュメントは、食材・在庫管理コンテキスト（Ingredient & Inventory Management Context）に特化したSUDOモデリングの成果物です。
このコンテキストは、食材の登録・管理・期限管理に加え、買い物サポート機能を統合した、アプリケーションの中核機能を提供します。

## 1. システム関連図（System Context Diagram）

食材・在庫管理コンテキストと外部アクター、他コンテキストとの関係を示します。

```mermaid
graph TB
    subgraph "アクター"
        USER[認証済みユーザー<br/>- 田中健太<br/>- 佐藤美咲<br/>- 山田・鈴木]
    end

    subgraph "食材・在庫管理コンテキスト"
        IIM[食材・在庫管理システム]
    end

    subgraph "他のコンテキスト"
        UA[ユーザー認証<br/>コンテキスト]
        NT[通知サービス]
        SK[共有カーネル]
    end

    subgraph "外部システム"
        TIMER[システムタイマー<br/>日次バッチ]
        MOBILE[モバイルデバイス<br/>買い物モード]
    end

    %% アクターとの関係
    USER -->|食材登録・管理| IIM
    USER -->|買い物モード利用| IIM
    IIM -->|在庫情報提供| USER
    IIM -->|買い物支援| USER

    %% 他コンテキストとの関係
    UA -->|UserId提供| IIM
    IIM -->|認証確認| UA
    IIM -->|期限通知イベント| NT
    IIM -->|基本型使用| SK

    %% 外部システムとの関係
    TIMER -->|期限チェック起動| IIM
    MOBILE -->|モバイルアクセス| IIM

    style IIM fill:#ff6b6b,stroke:#c92a2a,stroke-width:4px
    style UA fill:#74c0fc,stroke:#339af0,stroke-width:2px
    style NT fill:#ffe066,stroke:#fab005,stroke-width:2px
    style SK fill:#ffd43b,stroke:#fab005,stroke-width:2px
```

## 2. ユースケース図（Use Case Diagram）

食材・在庫管理コンテキストの主要なユースケースを示します。すべてのユーザー操作は認証が前提となります。

```mermaid
graph TB
    subgraph "アクター"
        USER((認証済みユーザー))
        TIMER((タイマー))
    end

    subgraph "食材・在庫管理コンテキスト"
        subgraph "食材管理機能"
            UC1[食材を登録する]
            UC2[食材情報を更新する]
            UC3[食材を削除する]
            UC4[在庫を消費する]
            UC5[在庫を補充する]
            UC6[食材一覧を見る]
            UC7[期限切れ食材を確認する]
            UC8[カテゴリー別に表示する]
            UC9[保存場所別に表示する]
        end

        subgraph "買い物サポート機能"
            UC12[買い物モードを開始する]
            UC13[在庫を素早く確認する]
            UC14[最近確認した食材を見る]
            UC15[カテゴリー別クイックアクセス]
        end

        UC10[期限チェックを実行する]
        UC11[期限通知を生成する]
    end

    %% ユーザーのユースケース（食材管理）
    USER --> UC1
    USER --> UC2
    USER --> UC3
    USER --> UC4
    USER --> UC5
    USER --> UC6
    USER --> UC7
    USER --> UC8
    USER --> UC9

    %% ユーザーのユースケース（買い物サポート）
    USER --> UC12
    USER --> UC13
    USER --> UC14
    USER --> UC15

    %% タイマーのユースケース
    TIMER --> UC10

    %% 依存関係
    UC10 -.->|<<include>>| UC11
    UC6 -.->|<<extend>>| UC8
    UC6 -.->|<<extend>>| UC9
    UC1 -.->|<<include>>| UC6
    UC4 -.->|<<include>>| UC6
    UC5 -.->|<<include>>| UC6
    UC12 -.->|<<include>>| UC13
    UC13 -.->|<<extend>>| UC15
    UC13 -.->|<<extend>>| UC14
```

## 3. ドメインモデル図（Domain Model Diagram）

食材・在庫管理コンテキストの中核となるドメインモデルを示します。UserIdはユーザー認証コンテキストから提供される値オブジェクトです。

```mermaid
classDiagram
    class Ingredient {
        -IngredientId id
        -IngredientName name
        -CategoryId categoryId
        -UserId userId
        -Memo memo
        -CreatedAt createdAt
        -UpdatedAt updatedAt
        -DeletedAt deletedAt
        +consume(quantity: Quantity): void
        +replenish(quantity: Quantity): void
        +updateName(name: string): void
        +updateCategory(categoryId: CategoryId): void
        +updateMemo(memo: string): void
        +delete(): void
    }

    class UserId {
        <<value object from User Authentication Context>>
        -value: string
        +getValue(): string
        +equals(other: UserId): boolean
    }

    class IngredientStock {
        -Quantity quantity
        -UnitId unitId
        -Quantity threshold
        -StorageLocation location
        +isOutOfStock(): boolean
        +isLowStock(): boolean
        +add(amount: Quantity): void
        +subtract(amount: Quantity): void
    }

    class ExpiryInfo {
        -BestBeforeDate bestBeforeDate
        -UseByDate useByDate
        +getDaysUntilExpiry(): number
        +isExpired(): boolean
        +isExpiringSoon(days: number): boolean
        +getDisplayDate(): string
    }

    class ShoppingSession {
        -ShoppingSessionId id
        -UserId userId
        -StartedAt startedAt
        -CompletedAt completedAt
        -CheckedItems[] checkedItems
        +start(): void
        +checkItem(ingredientId: IngredientId): void
        +complete(): void
        +getDuration(): number
    }

    class QuickAccessView {
        <<view>>
        -UserId userId
        -RecentItems[] recentItems
        -CategoryGroups[] groups
        +getRecentItems(limit: number): Ingredient[]
        +getByCategory(categoryId: CategoryId): Ingredient[]
        +updateLastAccessed(ingredientId: IngredientId): void
    }

    class Category {
        -CategoryId id
        -CategoryName name
        -DisplayOrder order
        -IconType icon
        +changeName(name: string): void
        +changeOrder(order: number): void
    }

    class Unit {
        -UnitId id
        -UnitName name
        -UnitSymbol symbol
        -UnitType type
        -ConversionRate baseRate
        +isCompatibleWith(other: Unit): boolean
        +convert(quantity: Quantity, to: Unit): Quantity
    }

    class IngredientRepository {
        <<interface>>
        +save(ingredient: Ingredient): void
        +findById(id: IngredientId): Ingredient
        +findAll(): Ingredient[]
        +findByCategory(categoryId: CategoryId): Ingredient[]
        +findExpiringSoon(days: number): Ingredient[]
        +delete(id: IngredientId): void
    }

    class DomainService {
        <<service>>
        +ExpiryCheckService
        +DuplicateCheckService
        +StockCalculationService
        +ShoppingAssistService
    }

    %% 関連
    Ingredient "1" *-- "1" IngredientStock : has
    Ingredient "1" *-- "1" ExpiryInfo : has
    Ingredient "0..*" --> "1" Category : belongs to
    Ingredient --> UserId : has
    IngredientStock "1" --> "1" Unit : measured in
    ShoppingSession --> UserId : has
    ShoppingSession "0..*" --> "0..*" Ingredient : checks
    QuickAccessView --> UserId : has
    QuickAccessView "1" --> "0..*" Ingredient : displays
    IngredientRepository ..> Ingredient : manages
    DomainService ..> Ingredient : uses
    DomainService ..> ShoppingSession : uses
```

## 4. オブジェクト図（Object Diagram）

具体的なシナリオでのオブジェクトの状態を示します。

### シナリオ1: 田中健太の食材管理

```mermaid
graph LR
    subgraph "田中健太の食材"
        CHICKEN[chicken:Ingredient<br/>id='ing1'<br/>name='鶏もも肉'<br/>userId='user_01HX5K3J2BXVMH3Z4K5N6P7Q8R']
        CHICKEN_STOCK[stock:Stock<br/>quantity=2<br/>unitId='pack'<br/>location='冷凍庫']
        CHICKEN_EXPIRY[expiry:ExpiryInfo<br/>bestBefore='2025-01-27'<br/>useBy='2025-01-29']

        TOMATO[tomato:Ingredient<br/>id='ing2'<br/>name='トマト'<br/>userId='user_01HX5K3J2BXVMH3Z4K5N6P7Q8R']
        TOMATO_STOCK[stock:Stock<br/>quantity=3<br/>unitId='piece'<br/>location='冷蔵庫']
        TOMATO_EXPIRY[expiry:ExpiryInfo<br/>bestBefore='2025-01-26'<br/>useBy='2025-01-28']
    end

    subgraph "カテゴリー"
        MEAT[meat:Category<br/>id='cat1'<br/>name='肉類']
        VEG[veg:Category<br/>id='cat2'<br/>name='野菜']
    end

    subgraph "単位"
        PACK[pack:Unit<br/>id='unit1'<br/>name='パック'<br/>type='PACKAGE']
        PIECE[piece:Unit<br/>id='unit2'<br/>name='個'<br/>type='COUNT']
    end

    CHICKEN --> CHICKEN_STOCK
    CHICKEN --> CHICKEN_EXPIRY
    CHICKEN --> MEAT
    CHICKEN_STOCK --> PACK

    TOMATO --> TOMATO_STOCK
    TOMATO --> TOMATO_EXPIRY
    TOMATO --> VEG
    TOMATO_STOCK --> PIECE
```

### シナリオ2: 期限切れ間近の検出

```mermaid
graph TB
    subgraph "期限チェックサービス実行時"
        SERVICE[expiryCheck:ExpiryCheckService<br/>checkDate='2025-01-24']

        ING1[milk:Ingredient<br/>bestBefore='2025-01-25'<br/>status='EXPIRING_SOON']
        ING2[egg:Ingredient<br/>bestBefore='2025-01-27'<br/>status='EXPIRING_SOON']
        ING3[bread:Ingredient<br/>bestBefore='2025-01-30'<br/>status='NORMAL']

        EVENT1[event1:IngredientExpiringSoon<br/>ingredientId='milk'<br/>daysUntil=1]
        EVENT2[event2:IngredientExpiringSoon<br/>ingredientId='egg'<br/>daysUntil=3]
    end

    SERVICE -->|checks| ING1
    SERVICE -->|checks| ING2
    SERVICE -->|checks| ING3

    ING1 -->|generates| EVENT1
    ING2 -->|generates| EVENT2
```

### シナリオ3: 在庫消費フロー

```mermaid
stateDiagram-v2
    [*] --> 在庫あり: 初期状態<br/>quantity=5

    在庫あり --> 在庫少: consume(3)<br/>quantity=2

    在庫少 --> 在庫切れ: consume(2)<br/>quantity=0

    在庫切れ --> 在庫あり: replenish(5)<br/>quantity=5

    在庫少 --> 在庫あり: replenish(3)<br/>quantity=5

    note right of 在庫少
        threshold=3の場合
        quantity <= 3で在庫少
    end note

    note right of 在庫切れ
        StockDepletedイベント発行
        買い物リストへ自動追加
    end note
```

### シナリオ4: 買い物モードでの在庫確認

```mermaid
graph LR
    subgraph "買い物セッション"
        SESSION[session:ShoppingSession<br/>id='ss_001'<br/>userId='user_01HX5K3J2BXVMH3Z4K5N6P7Q8R'<br/>startedAt='2025-01-24 18:30']

        CHECK1[check1:ItemCheck<br/>ingredientId='ing1'<br/>name='鶏もも肉'<br/>stock='在庫あり'<br/>checkedAt='18:31']
        CHECK2[check2:ItemCheck<br/>ingredientId='ing2'<br/>name='トマト'<br/>stock='在庫なし'<br/>checkedAt='18:32']
    end

    subgraph "クイックアクセスビュー"
        QAV[quickAccess:QuickAccessView<br/>userId='user_01HX5K3J2BXVMH3Z4K5N6P7Q8R']
        RECENT["recentItems:<br/>['トマト', '鶏もも肉', '牛乳']"]
        CAT_VIEW["categoryView:<br/>野菜: ['トマト', 'キャベツ']<br/>肉類: ['鶏もも肉', '豚肉']"]
    end

    SESSION --> CHECK1
    SESSION --> CHECK2
    QAV --> RECENT
    QAV --> CAT_VIEW
    CHECK2 -->|updates| RECENT
```

## 5. コンテキスト内の重要な不変条件

1. **認証の必須性**

   - すべての食材操作は認証済みユーザーのみ実行可能
   - UserIdは必須かつ不変

2. **アクセス制御**

   - ユーザーは自分のUserIdに紐づく食材のみ操作可能
   - 他ユーザーの食材へのアクセスは禁止

3. **在庫の整合性**

   - 在庫数量は常に0以上
   - 消費時は在庫量を超えられない

4. **期限の整合性**

   - 消費期限 ≤ 賞味期限
   - 過去の日付での新規登録は警告

5. **一意性の保証**

   - 同一ユーザー内で「名前＋賞味期限＋保存場所」の組み合わせは一意

6. **削除の制約**

   - 論理削除のみ（履歴保持）
   - カテゴリー・単位は使用中は削除不可

7. **買い物モードの制約**
   - 買い物セッションは同時に1つのみアクティブ
   - 在庫確認は読み取り専用（買い物モードでは更新不可）
   - クイックアクセスの履歴は最新20件まで保持

## 6. 他コンテキストとの連携

### ユーザー認証コンテキストからの取得

- `UserId`: 認証済みユーザーの識別子
- 認証状態の確認API
- セッション検証

### 通知サービスへのイベント発行

- `IngredientExpiringSoon`: 期限3日前
- `StockDepleted`: 在庫切れ
- `IngredientExpired`: 期限切れ
- `ShoppingSessionCompleted`: 買い物セッション完了

### 共有カーネルの利用

- `UserId`: ユーザー識別子（ユーザー認証コンテキストと共有）
- `Quantity`: 数量の値オブジェクト
- `Money`: 金額の値オブジェクト（将来拡張用）
- `DateRange`: 期間の値オブジェクト

## 更新履歴

| 日付       | 内容                                       | 作成者     |
| ---------- | ------------------------------------------ | ---------- |
| 2025-06-24 | 初版作成                                   | @komei0727 |
| 2025-06-24 | ユーザー認証コンテキストとの統合に伴う修正 | Claude     |
| 2025-06-28 | 買い物サポート機能の統合に伴う修正         | Claude     |
