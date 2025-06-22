# 値オブジェクト実装ガイド

## 概要

値オブジェクト（Value Object）は、ドメイン駆動設計における重要な構成要素です。概念的な同一性を持たず、その属性によってのみ識別されるドメインオブジェクトです。不変性、自己検証、ビジネスロジックのカプセル化が特徴です。

## 基本概念

### 値オブジェクトの特徴

1. **不変性（Immutability）**: 一度作成されたら変更不可
2. **等価性（Equality）**: 属性の値で比較
3. **自己検証（Self-Validation）**: 常に有効な状態を保証
4. **副作用なし（Side-Effect Free）**: メソッドは新しいインスタンスを返す

### エンティティとの違い

| 特徴 | 値オブジェクト | エンティティ |
|------|----------------|--------------|
| 同一性 | 属性値による | 識別子による |
| 可変性 | 不変 | 可変 |
| ライフサイクル | なし | あり |
| 等価性 | 全属性の比較 | IDの比較 |

## 実装例

### 1. 基本的な値オブジェクト

```typescript
// src/modules/shared/domain/value-objects/value-object.base.ts
export abstract class ValueObject<T> {
  protected readonly _value: T

  constructor(value: T) {
    this.validate(value)
    this._value = Object.freeze(value)
  }

  get value(): T {
    return this._value
  }

  protected abstract validate(value: T): void

  equals(other: ValueObject<T>): boolean {
    if (!other) return false
    if (!(other instanceof this.constructor)) return false
    
    return this.isEqual(this._value, other._value)
  }

  private isEqual(a: any, b: any): boolean {
    if (a === b) return true
    if (typeof a !== 'object' || typeof b !== 'object') return false
    
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    
    if (keysA.length !== keysB.length) return false
    
    return keysA.every(key => this.isEqual(a[key], b[key]))
  }
}
```

### 2. 単一値の値オブジェクト

```typescript
// src/modules/ingredients/server/domain/value-objects/ingredient-name.vo.ts
export class IngredientName extends ValueObject<string> {
  private static readonly MIN_LENGTH = 1
  private static readonly MAX_LENGTH = 50
  private static readonly VALID_PATTERN = /^[^\x00-\x1f]+$/

  constructor(value: string) {
    super(value.trim())
  }

  protected validate(value: string): void {
    if (!value) {
      throw new DomainError('食材名は必須です')
    }

    if (value.length < IngredientName.MIN_LENGTH) {
      throw new DomainError(
        `食材名は${IngredientName.MIN_LENGTH}文字以上である必要があります`
      )
    }

    if (value.length > IngredientName.MAX_LENGTH) {
      throw new DomainError(
        `食材名は${IngredientName.MAX_LENGTH}文字以下である必要があります`
      )
    }

    if (!IngredientName.VALID_PATTERN.test(value)) {
      throw new DomainError('食材名に不正な文字が含まれています')
    }
  }

  // ビジネスロジック
  contains(searchTerm: string): boolean {
    return this._value.toLowerCase().includes(searchTerm.toLowerCase())
  }

  toDisplayFormat(): string {
    return this._value.charAt(0).toUpperCase() + this._value.slice(1)
  }
}

// src/modules/ingredients/server/domain/value-objects/expiry-date.vo.ts
export class ExpiryDate extends ValueObject<Date> {
  constructor(value: Date | string) {
    const date = typeof value === 'string' ? new Date(value) : value
    super(date)
  }

  protected validate(value: Date): void {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new DomainError('有効な日付を指定してください')
    }

    const minDate = new Date()
    minDate.setFullYear(minDate.getFullYear() - 1)
    
    if (value < minDate) {
      throw new DomainError('賞味期限は1年以上前の日付を設定できません')
    }
  }

  isExpired(): boolean {
    return this._value < new Date()
  }

  daysUntilExpiry(): number {
    const now = new Date()
    const diffTime = this._value.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  getExpiryStatus(): ExpiryStatus {
    const days = this.daysUntilExpiry()
    
    if (days < 0) return ExpiryStatus.EXPIRED
    if (days <= 3) return ExpiryStatus.EXPIRING_SOON
    if (days <= 7) return ExpiryStatus.EXPIRING
    return ExpiryStatus.FRESH
  }

  // 新しいインスタンスを返すメソッド
  extend(days: number): ExpiryDate {
    const newDate = new Date(this._value)
    newDate.setDate(newDate.getDate() + days)
    return new ExpiryDate(newDate)
  }
}
```

### 3. 複合値オブジェクト

```typescript
// src/modules/ingredients/server/domain/value-objects/quantity.vo.ts
export class Quantity extends ValueObject<{ amount: number; unit: Unit }> {
  constructor(amount: number, unit: Unit) {
    super({ amount, unit })
  }

  protected validate(value: { amount: number; unit: Unit }): void {
    if (typeof value.amount !== 'number' || isNaN(value.amount)) {
      throw new DomainError('数量は数値である必要があります')
    }

    if (value.amount < 0) {
      throw new DomainError('数量は0以上である必要があります')
    }

    if (value.amount > 999999) {
      throw new DomainError('数量は999,999以下である必要があります')
    }

    if (!value.unit) {
      throw new DomainError('単位は必須です')
    }
  }

  get amount(): number {
    return this._value.amount
  }

  get unit(): Unit {
    return this._value.unit
  }

  // 算術演算（新しいインスタンスを返す）
  add(amount: number): Quantity {
    return new Quantity(this._value.amount + amount, this._value.unit)
  }

  subtract(amount: number): Quantity {
    return new Quantity(this._value.amount - amount, this._value.unit)
  }

  multiply(factor: number): Quantity {
    return new Quantity(this._value.amount * factor, this._value.unit)
  }

  // 単位変換
  convertTo(targetUnit: Unit): Quantity {
    if (this._value.unit.type !== targetUnit.type) {
      throw new DomainError(
        `${this._value.unit.name}から${targetUnit.name}への変換はできません`
      )
    }

    const convertedAmount = this._value.amount * 
      (this._value.unit.conversionFactor / targetUnit.conversionFactor)
    
    return new Quantity(convertedAmount, targetUnit)
  }

  // ビジネスロジック
  isLessThan(other: Quantity): boolean {
    const normalized = other.convertTo(this._value.unit)
    return this._value.amount < normalized.amount
  }

  canSatisfy(required: Quantity): boolean {
    const normalized = required.convertTo(this._value.unit)
    return this._value.amount >= normalized.amount
  }

  // 表示用フォーマット
  toString(): string {
    const rounded = Math.round(this._value.amount * 100) / 100
    return `${rounded}${this._value.unit.symbol}`
  }

  toDisplayString(): string {
    const rounded = Math.round(this._value.amount * 100) / 100
    return `${rounded} ${this._value.unit.name}`
  }
}
```

### 4. 列挙型の値オブジェクト

```typescript
// src/modules/ingredients/server/domain/value-objects/storage-location.vo.ts
export enum StorageLocationType {
  REFRIGERATED = 'REFRIGERATED',
  FROZEN = 'FROZEN',
  ROOM_TEMPERATURE = 'ROOM_TEMPERATURE',
  COOL_DARK_PLACE = 'COOL_DARK_PLACE'
}

export class StorageLocation extends ValueObject<{
  type: StorageLocationType
  detail?: string
}> {
  private static readonly LOCATION_CONFIGS = {
    [StorageLocationType.REFRIGERATED]: {
      name: '冷蔵',
      temperatureRange: { min: 0, max: 10 },
      defaultShelfLife: 7
    },
    [StorageLocationType.FROZEN]: {
      name: '冷凍',
      temperatureRange: { min: -20, max: -15 },
      defaultShelfLife: 30
    },
    [StorageLocationType.ROOM_TEMPERATURE]: {
      name: '常温',
      temperatureRange: { min: 15, max: 25 },
      defaultShelfLife: 14
    },
    [StorageLocationType.COOL_DARK_PLACE]: {
      name: '冷暗所',
      temperatureRange: { min: 10, max: 15 },
      defaultShelfLife: 21
    }
  }

  constructor(type: StorageLocationType, detail?: string) {
    super({ type, detail: detail?.trim() })
  }

  protected validate(value: { type: StorageLocationType; detail?: string }): void {
    if (!Object.values(StorageLocationType).includes(value.type)) {
      throw new DomainError('無効な保存場所タイプです')
    }

    if (value.detail && value.detail.length > 50) {
      throw new DomainError('保存場所の詳細は50文字以下で入力してください')
    }
  }

  get type(): StorageLocationType {
    return this._value.type
  }

  get detail(): string | undefined {
    return this._value.detail
  }

  getConfig() {
    return StorageLocation.LOCATION_CONFIGS[this._value.type]
  }

  getDisplayName(): string {
    const config = this.getConfig()
    return this._value.detail 
      ? `${config.name}（${this._value.detail}）`
      : config.name
  }

  getDefaultShelfLife(): number {
    return this.getConfig().defaultShelfLife
  }

  isTemperatureControlled(): boolean {
    return [
      StorageLocationType.REFRIGERATED,
      StorageLocationType.FROZEN
    ].includes(this._value.type)
  }

  // ファクトリーメソッド
  static refrigerated(detail?: string): StorageLocation {
    return new StorageLocation(StorageLocationType.REFRIGERATED, detail)
  }

  static frozen(detail?: string): StorageLocation {
    return new StorageLocation(StorageLocationType.FROZEN, detail)
  }

  static roomTemperature(detail?: string): StorageLocation {
    return new StorageLocation(StorageLocationType.ROOM_TEMPERATURE, detail)
  }

  // 永続化用メソッド
  static fromPersistence(data: { type: string; detail?: string }): StorageLocation {
    return new StorageLocation(
      data.type as StorageLocationType,
      data.detail
    )
  }
}
```

### 5. コレクション型の値オブジェクト

```typescript
// src/modules/ingredients/server/domain/value-objects/nutrition-facts.vo.ts
export class NutritionFacts extends ValueObject<{
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber?: number
  sodium?: number
}> {
  constructor(facts: {
    calories: number
    protein: number
    carbohydrates: number
    fat: number
    fiber?: number
    sodium?: number
  }) {
    super(facts)
  }

  protected validate(value: any): void {
    const required = ['calories', 'protein', 'carbohydrates', 'fat']
    
    for (const field of required) {
      if (typeof value[field] !== 'number' || value[field] < 0) {
        throw new DomainError(`${field}は0以上の数値である必要があります`)
      }
    }

    // オプションフィールドの検証
    if (value.fiber !== undefined && (typeof value.fiber !== 'number' || value.fiber < 0)) {
      throw new DomainError('食物繊維は0以上の数値である必要があります')
    }

    if (value.sodium !== undefined && (typeof value.sodium !== 'number' || value.sodium < 0)) {
      throw new DomainError('ナトリウムは0以上の数値である必要があります')
    }
  }

  // 栄養素の計算
  getTotalCaloriesFromMacros(): number {
    return (this._value.protein * 4) + 
           (this._value.carbohydrates * 4) + 
           (this._value.fat * 9)
  }

  // 栄養バランスのチェック
  isBalanced(): boolean {
    const total = this._value.protein + this._value.carbohydrates + this._value.fat
    if (total === 0) return false

    const proteinRatio = this._value.protein / total
    const carbRatio = this._value.carbohydrates / total
    const fatRatio = this._value.fat / total

    return proteinRatio >= 0.15 && proteinRatio <= 0.35 &&
           carbRatio >= 0.45 && carbRatio <= 0.65 &&
           fatRatio >= 0.20 && fatRatio <= 0.35
  }

  // 新しいインスタンスを返す操作
  scale(factor: number): NutritionFacts {
    return new NutritionFacts({
      calories: this._value.calories * factor,
      protein: this._value.protein * factor,
      carbohydrates: this._value.carbohydrates * factor,
      fat: this._value.fat * factor,
      fiber: this._value.fiber ? this._value.fiber * factor : undefined,
      sodium: this._value.sodium ? this._value.sodium * factor : undefined
    })
  }

  // 複数の栄養成分を合計
  static sum(nutritionFactsList: NutritionFacts[]): NutritionFacts {
    const totals = nutritionFactsList.reduce(
      (acc, facts) => ({
        calories: acc.calories + facts._value.calories,
        protein: acc.protein + facts._value.protein,
        carbohydrates: acc.carbohydrates + facts._value.carbohydrates,
        fat: acc.fat + facts._value.fat,
        fiber: (acc.fiber ?? 0) + (facts._value.fiber ?? 0),
        sodium: (acc.sodium ?? 0) + (facts._value.sodium ?? 0)
      }),
      { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sodium: 0 }
    )

    return new NutritionFacts(totals)
  }
}
```

### 6. カスタム等価性の実装

```typescript
// src/modules/ingredients/server/domain/value-objects/ingredient-id.vo.ts
export class IngredientId extends ValueObject<string> {
  constructor(value?: string) {
    super(value || IngredientId.generate())
  }

  protected validate(value: string): void {
    if (!value) {
      throw new DomainError('IDは必須です')
    }

    // CUID形式の検証
    if (!/^c[a-z0-9]{24}$/.test(value)) {
      throw new DomainError('無効なID形式です')
    }
  }

  static generate(): string {
    // CUID生成ロジック
    return generateCUID()
  }

  // カスタム等価性（大文字小文字を無視）
  equals(other: IngredientId): boolean {
    if (!other) return false
    return this._value.toLowerCase() === other._value.toLowerCase()
  }
}

// src/modules/ingredients/server/domain/value-objects/money.vo.ts
export class Money extends ValueObject<{ amount: number; currency: Currency }> {
  constructor(amount: number, currency: Currency) {
    super({ amount: Math.round(amount * 100) / 100, currency })
  }

  protected validate(value: { amount: number; currency: Currency }): void {
    if (typeof value.amount !== 'number' || isNaN(value.amount)) {
      throw new DomainError('金額は数値である必要があります')
    }

    if (!value.currency) {
      throw new DomainError('通貨は必須です')
    }
  }

  // カスタム等価性（通貨が異なる場合は常にfalse）
  equals(other: Money): boolean {
    if (!other) return false
    if (this._value.currency.code !== other._value.currency.code) return false
    return Math.abs(this._value.amount - other._value.amount) < 0.01
  }

  // 金額操作
  add(other: Money): Money {
    if (this._value.currency.code !== other._value.currency.code) {
      throw new DomainError('異なる通貨の加算はできません')
    }
    return new Money(
      this._value.amount + other._value.amount,
      this._value.currency
    )
  }

  multiply(factor: number): Money {
    return new Money(
      this._value.amount * factor,
      this._value.currency
    )
  }

  // フォーマット
  format(): string {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: this._value.currency.code
    }).format(this._value.amount)
  }
}
```

## ベストプラクティス

### 1. 設計原則

- **小さく保つ**: 単一の概念を表現
- **不変性の徹底**: すべてのプロパティをreadonlyに
- **ファクトリーメソッド**: 複雑な生成ロジックの隠蔽
- **明示的な名前**: ビジネス用語を使用

### 2. 実装のガイドライン

```typescript
// ✅ 良い例：明確なビジネスルール
export class EmailAddress extends ValueObject<string> {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  protected validate(value: string): void {
    if (!EmailAddress.EMAIL_REGEX.test(value)) {
      throw new DomainError('有効なメールアドレスを入力してください')
    }
  }

  getDomain(): string {
    return this._value.split('@')[1]
  }

  isBusinessEmail(): boolean {
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com']
    return !personalDomains.includes(this.getDomain())
  }
}

// ❌ 悪い例：ビジネスルールなし
export class StringValue extends ValueObject<string> {
  protected validate(value: string): void {
    // 汎用的すぎる
  }
}
```

### 3. パフォーマンス考慮

```typescript
// メモ化
export abstract class MemoizedValueObject<T> extends ValueObject<T> {
  private memoCache = new Map<string, any>()

  protected memoize<R>(key: string, fn: () => R): R {
    if (this.memoCache.has(key)) {
      return this.memoCache.get(key)
    }
    
    const result = fn()
    this.memoCache.set(key, result)
    return result
  }
}

// 使用例
export class ComplexCalculation extends MemoizedValueObject<number[]> {
  getAverage(): number {
    return this.memoize('average', () => {
      const sum = this._value.reduce((a, b) => a + b, 0)
      return sum / this._value.length
    })
  }
}
```

## 関連ドキュメント

- [ドメインエンティティ実装ガイド](./DOMAIN_ENTITIES.md)
- [ドメインサービス実装ガイド](./DOMAIN_SERVICES.md)
- [仕様パターン実装ガイド](./SPECIFICATION_PATTERN.md)