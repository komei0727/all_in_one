# Enhanced Modular Monolith アーキテクチャ概要

## アーキテクチャの特徴

### 1. Enhanced Modular Monolith

**定義**: モジュラーモノリスにDDD、Hexagonal Architecture、CQRSを統合したハイブリッドアーキテクチャ

**主な特徴**:

- 🏗️ **モジュール独立性**: 各ビジネス機能が完全に独立
- 🎯 **ドメイン中心設計**: ビジネスロジックがアーキテクチャの中核
- 🔄 **CQRS パターン**: 読み書き責務の最適分離
- 🔌 **Hexagonal 境界**: 外部システムとの疎結合
- 📡 **Event-Driven**: ドメインイベントによる非同期処理

### 2. 設計原則

```mermaid
graph TB
    subgraph "Design Principles"
        A[Domain-Driven Design]
        B[Dependency Inversion]
        C[Single Responsibility]
        D[Open/Closed Principle]
        E[Event-Driven Architecture]

        A --> B
        B --> C
        C --> D
        D --> E
    end
```

#### Domain-Driven Design (DDD)

- **Ubiquitous Language**: ビジネス用語をコードに反映
- **Bounded Context**: モジュール境界の明確化
- **Aggregate Root**: データ整合性の責任範囲定義
- **Value Objects**: 不変性とビジネスルールの保証

#### Dependency Inversion Principle

- **高レベルモジュール** は低レベルモジュールに依存しない
- **抽象化** に依存し、具象に依存しない
- **Ports & Adapters** による外部システム分離

#### Event-Driven Architecture

- **Domain Events**: ビジネス上重要な出来事の記録
- **Eventually Consistent**: 結果整合性による高性能
- **Loose Coupling**: モジュール間の疎結合

## 全体アーキテクチャ

### システム構成図（概要）

```mermaid
flowchart TB
    subgraph "Client (Browser)"
        UI[React UI]
    end
    
    subgraph "Enhanced Modular Monolith"
        subgraph "Presentation"
            ACL[Anti-Corruption Layer]
        end
        
        subgraph "Application"
            API[API Routes]
            CMD[Commands]
            QRY[Queries]
        end
        
        subgraph "Domain"
            LOGIC[Business Logic]
            EVENTS[Domain Events]
        end
        
        subgraph "Infrastructure"
            PERSIST[Persistence]
            EXTERNAL[External Services]
        end
    end
    
    subgraph "External"
        DB[(Database)]
        CACHE[(Cache)]
        SERVICES[External APIs]
    end
    
    UI --> ACL
    ACL --> API
    API --> CMD
    API --> QRY
    CMD --> LOGIC
    QRY --> LOGIC
    LOGIC --> EVENTS
    LOGIC --> PERSIST
    PERSIST --> DB
    PERSIST --> CACHE
    EXTERNAL --> SERVICES
    
    style UI fill:#bbdefb
    style ACL fill:#c5cae9
    style API fill:#d1c4e9
    style CMD fill:#b2dfdb
    style QRY fill:#b2dfdb
    style LOGIC fill:#ffccbc
    style EVENTS fill:#ffccbc
    style PERSIST fill:#f8bbd0
    style EXTERNAL fill:#f8bbd0
```

### システム構成図（詳細）

```mermaid
flowchart TB
    %% Styling
    classDef presentationClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef apiClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef applicationClass fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef domainClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef infrastructureClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef externalClass fill:#f5f5f5,stroke:#424242,stroke-width:2px
    
    %% Presentation Layer
    subgraph PL["🖥️ Presentation Layer (client/)"]
        direction LR
        UI[React<br/>Components]
        HOOKS[Custom<br/>Hooks]
        STATE[Client<br/>State]
        ACL[Anti-Corruption<br/>Layer]
        UI --> HOOKS
        HOOKS --> STATE
        HOOKS --> ACL
    end
    
    %% API Layer
    subgraph AL["🔌 API Layer (server/api/)"]
        direction LR
        ROUTES[API Routes]
        VALID[Validation]
        SERIAL[Serializers]
        ROUTES --> VALID
        VALID --> SERIAL
    end
    
    %% Application Layer
    subgraph APL["⚙️ Application Layer (server/application/)"]
        direction LR
        CMD[Command<br/>Handlers]
        QRY[Query<br/>Handlers]
        SVC[Application<br/>Services]
        DTO[DTOs]
        CMD --> SVC
        QRY --> SVC
        SVC --> DTO
    end
    
    %% Domain Layer
    subgraph DL["💎 Domain Layer (server/domain/)"]
        direction LR
        ENT[Entities]
        VO[Value<br/>Objects]
        DS[Domain<br/>Services]
        EVT[Domain<br/>Events]
        REPO[Repository<br/>Interfaces]
        SPEC[Specifications]
        ENT --> VO
        ENT --> EVT
        DS --> ENT
        DS --> SPEC
    end
    
    %% Infrastructure Layer
    subgraph IL["🔧 Infrastructure Layer (server/infrastructure/)"]
        direction LR
        REPOIMPL[Repository<br/>Impl]
        EXTADP[External<br/>Adapters]
        EBUS[Event Bus]
        CACHE[Cache]
    end
    
    %% External Systems
    subgraph EXT["☁️ External Systems"]
        direction LR
        DB[(PostgreSQL)]
        REDIS[(Redis)]
        APIS[External<br/>APIs]
    end
    
    %% Layer connections
    ACL --> ROUTES
    VALID --> CMD
    VALID --> QRY
    SVC --> ENT
    SVC --> DS
    SVC --> REPO
    REPO -.-> REPOIMPL
    EVT -.-> EBUS
    REPOIMPL --> DB
    CACHE --> REDIS
    EXTADP --> APIS
    
    %% Apply styles
    class PL presentationClass
    class AL apiClass
    class APL applicationClass
    class DL domainClass
    class IL infrastructureClass
    class EXT externalClass
```

## データフロー

### Command Flow (書き込み処理)

```mermaid
sequenceDiagram
    participant C as Client
    participant ACL as Anti-Corruption Layer
    participant API as API Layer
    participant CH as Command Handler
    participant AS as Application Service
    participant E as Entity
    participant VO as Value Object
    participant DS as Domain Service
    participant R as Repository
    participant EB as Event Bus

    C->>ACL: User Action
    ACL->>API: HTTP POST Request
    API->>API: Validate Request
    API->>CH: Execute Command
    CH->>AS: Call Application Service
    AS->>R: Load Entity
    AS->>E: Execute Domain Logic
    E->>VO: Create/Update Value Object
    E->>E: Generate Domain Event
    
    alt Complex Business Logic
        AS->>DS: Call Domain Service
        DS->>E: Update Entity
    end
    
    AS->>R: Save Entity
    AS->>EB: Publish Domain Events
    AS->>CH: Return Result
    CH->>API: Create Response DTO
    API->>ACL: HTTP Response
    ACL->>C: Update UI State
```

### Query Flow (読み取り処理)

```mermaid
sequenceDiagram
    participant C as Client
    participant ACL as Anti-Corruption Layer
    participant API as API Layer
    participant QH as Query Handler
    participant CACHE as Cache
    participant R as Repository

    C->>ACL: Query Request
    ACL->>API: HTTP GET Request
    API->>API: Validate Query Parameters
    API->>QH: Execute Query
    QH->>CACHE: Check Cache
    
    alt Cache Hit
        CACHE->>QH: Return Cached Data
    else Cache Miss
        QH->>R: Fetch Data
        R->>QH: Return Domain Objects
        QH->>QH: Build Read Model/DTO
        QH->>CACHE: Store in Cache
    end
    
    QH->>API: Return DTO
    API->>ACL: HTTP Response
    ACL->>C: Update UI
```

### Event-Driven Flow (イベント駆動処理)

```mermaid
sequenceDiagram
    participant E as Entity
    participant DE as Domain Event
    participant EB as Event Bus
    participant EH1 as Event Handler<br/>(Same Module)
    participant EH2 as Event Handler<br/>(Other Module)
    participant PROJ as Read Model Projection
    participant EXT as External Service

    E->>DE: Generate Domain Event
    E->>EB: Publish Event
    
    par Async Processing
        EB->>EH1: Handle Event (Same Module)
        EH1->>PROJ: Update Read Model
    and
        EB->>EH2: Handle Event (Cross Module)
        EH2->>EXT: Trigger External Action
    end
    
    Note over EB,EH2: Events enable loose coupling<br/>between modules
```

## 関連ドキュメント

- [レイヤー責務定義](./LAYERS.md) - 各レイヤーの詳細な責務
- [モジュール構成](./MODULE_STRUCTURE.md) - ディレクトリ構造とファイル配置
- [実装パターン](../implementation/PATTERNS.md) - 具体的な実装例