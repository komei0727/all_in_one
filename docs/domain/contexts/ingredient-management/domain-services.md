# 食材管理コンテキスト - ドメインサービス仕様

## 概要

このドキュメントでは、食材管理コンテキストにおけるドメインサービスの仕様を定義します。
ドメインサービスは、特定のエンティティや値オブジェクトに属さないドメインロジックを実装します。

## ドメインサービスの設計原則

### いつドメインサービスを使うか

1. **複数の集約にまたがる操作**
   - 単一の集約では表現できないビジネスロジック
2. **ドメインの重要な概念**
   - エンティティや値オブジェクトに属さない操作
3. **外部リソースとの協調**
   - ただし、技術的詳細は隠蔽する

### ドメインサービスの特徴

- ステートレス（状態を持たない）
- ドメイン層に配置
- ビジネスロジックを含む
- インフラストラクチャに依存しない

## 在庫チェックサービス（StockCheckService）

### 概要

複数の食材の在庫状況を一括でチェックし、不足情報を提供するサービス。

### インターフェース定義

```typescript
// domain/services/stock-check-service.ts
export interface StockCheckService {
  /**
   * 複数食材の在庫をチェックする
   * @param requirements 必要な食材と数量のリスト
   * @param ingredients チェック対象の食材リスト
   * @returns 在庫チェック結果
   */
  checkMultipleStock(requirements: StockRequirement[], ingredients: Ingredient[]): StockCheckResult

  /**
   * レシピに必要な食材の在庫をチェックする
   * @param recipeRequirements レシピの材料リスト
   * @param ingredients 利用可能な食材リスト
   * @param servings 人数（倍率）
   * @returns 在庫チェック結果
   */
  checkStockForRecipe(
    recipeRequirements: RecipeRequirement[],
    ingredients: Ingredient[],
    servings: number
  ): RecipeStockCheckResult

  /**
   * カテゴリー別の在庫不足をチェックする
   * @param ingredients 食材リスト
   * @param thresholds カテゴリー別の閾値
   * @returns 在庫不足の食材リスト
   */
  findLowStockByCategory(
    ingredients: Ingredient[],
    thresholds: Map<CategoryId, Quantity>
  ): LowStockItem[]
}
```

### 関連する型定義

```typescript
// 在庫要件
export interface StockRequirement {
  ingredientId: IngredientId
  ingredientName: string
  requiredQuantity: Quantity
  allowSubstitutes?: boolean // 代替品を許可するか
}

// レシピ要件
export interface RecipeRequirement {
  ingredientName: string
  quantity: Quantity
  optional?: boolean // 任意の材料か
  substituteNames?: string[] // 代替可能な食材名
}

// 在庫チェック結果
export interface StockCheckResult {
  hasAllStock: boolean
  totalRequirements: number
  satisfiedRequirements: number
  insufficientItems: InsufficientItem[]
  suggestions?: StockSuggestion[]
}

// 不足アイテム
export interface InsufficientItem {
  ingredientId: IngredientId
  ingredientName: string
  required: Quantity
  available: Quantity
  shortage: Quantity
  percentageAvailable: number
}

// 在庫提案
export interface StockSuggestion {
  type: 'SUBSTITUTE' | 'PARTIAL' | 'SHOPPING'
  message: string
  items?: Array<{
    ingredientId: IngredientId
    name: string
    quantity: Quantity
  }>
}

// レシピ用在庫チェック結果
export interface RecipeStockCheckResult extends StockCheckResult {
  canCook: boolean
  maxServings: number // 作れる最大人数
  missingIngredients: string[]
  substituteOptions: Map<string, string[]>
}

// 在庫不足アイテム
export interface LowStockItem {
  ingredient: Ingredient
  threshold: Quantity
  shortageAmount: Quantity
  percentageRemaining: number
  suggestedPurchaseAmount: Quantity
}
```

### 実装例

```typescript
// domain/services/stock-check-service-impl.ts
export class StockCheckServiceImpl implements StockCheckService {
  checkMultipleStock(
    requirements: StockRequirement[],
    ingredients: Ingredient[]
  ): StockCheckResult {
    const ingredientMap = new Map(ingredients.map((ing) => [ing.id.toString(), ing]))

    const insufficientItems: InsufficientItem[] = []
    let satisfiedCount = 0

    for (const requirement of requirements) {
      const ingredient = ingredientMap.get(requirement.ingredientId.toString())

      if (!ingredient || ingredient.quantity.isLessThan(requirement.requiredQuantity)) {
        const available = ingredient?.quantity || new Quantity(0, requirement.requiredQuantity.unit)
        const shortage = requirement.requiredQuantity.subtract(available)

        insufficientItems.push({
          ingredientId: requirement.ingredientId,
          ingredientName: requirement.ingredientName,
          required: requirement.requiredQuantity,
          available,
          shortage,
          percentageAvailable: (available.amount / requirement.requiredQuantity.amount) * 100,
        })
      } else {
        satisfiedCount++
      }
    }

    const suggestions = this.generateSuggestions(insufficientItems, ingredients)

    return {
      hasAllStock: insufficientItems.length === 0,
      totalRequirements: requirements.length,
      satisfiedRequirements: satisfiedCount,
      insufficientItems,
      suggestions,
    }
  }

  checkStockForRecipe(
    recipeRequirements: RecipeRequirement[],
    ingredients: Ingredient[],
    servings: number
  ): RecipeStockCheckResult {
    // レシピ要件を在庫要件に変換
    const stockRequirements = this.convertToStockRequirements(
      recipeRequirements,
      ingredients,
      servings
    )

    const baseResult = this.checkMultipleStock(stockRequirements, ingredients)

    // 最大何人分作れるか計算
    const maxServings = this.calculateMaxServings(recipeRequirements, ingredients, servings)

    // 代替オプションを検索
    const substituteOptions = this.findSubstituteOptions(recipeRequirements, ingredients)

    return {
      ...baseResult,
      canCook: baseResult.hasAllStock && !recipeRequirements.some((r) => !r.optional),
      maxServings,
      missingIngredients: baseResult.insufficientItems.map((item) => item.ingredientName),
      substituteOptions,
    }
  }

  findLowStockByCategory(
    ingredients: Ingredient[],
    thresholds: Map<CategoryId, Quantity>
  ): LowStockItem[] {
    const lowStockItems: LowStockItem[] = []

    for (const ingredient of ingredients) {
      const threshold = thresholds.get(ingredient.categoryId)
      if (!threshold) continue

      // 単位が異なる場合はスキップ（本来は変換すべき）
      if (!ingredient.quantity.unit.equals(threshold.unit)) continue

      if (ingredient.quantity.isLessThan(threshold)) {
        const shortage = threshold.subtract(ingredient.quantity)
        const percentageRemaining = (ingredient.quantity.amount / threshold.amount) * 100

        // 購入推奨量を計算（閾値の2倍 - 現在量）
        const suggestedAmount = threshold.amount * 2 - ingredient.quantity.amount
        const suggestedPurchase = new Quantity(
          Math.max(suggestedAmount, threshold.amount),
          threshold.unit
        )

        lowStockItems.push({
          ingredient,
          threshold,
          shortageAmount: shortage,
          percentageRemaining,
          suggestedPurchaseAmount: suggestedPurchase,
        })
      }
    }

    // 不足率が高い順にソート
    return lowStockItems.sort((a, b) => a.percentageRemaining - b.percentageRemaining)
  }

  private generateSuggestions(
    insufficientItems: InsufficientItem[],
    availableIngredients: Ingredient[]
  ): StockSuggestion[] {
    const suggestions: StockSuggestion[] = []

    // 買い物リスト提案
    if (insufficientItems.length > 0) {
      suggestions.push({
        type: 'SHOPPING',
        message: '以下の食材を購入することをおすすめします',
        items: insufficientItems.map((item) => ({
          ingredientId: item.ingredientId,
          name: item.ingredientName,
          quantity: item.shortage,
        })),
      })
    }

    // 部分的に作れる場合の提案
    const partialItems = insufficientItems.filter((item) => item.percentageAvailable > 50)
    if (partialItems.length > 0) {
      suggestions.push({
        type: 'PARTIAL',
        message: '分量を減らせば作ることができます',
        items: partialItems.map((item) => ({
          ingredientId: item.ingredientId,
          name: item.ingredientName,
          quantity: item.available,
        })),
      })
    }

    return suggestions
  }

  private calculateMaxServings(
    requirements: RecipeRequirement[],
    ingredients: Ingredient[],
    baseServings: number
  ): number {
    let maxServings = Infinity

    for (const req of requirements) {
      if (req.optional) continue

      const ingredient = this.findIngredientByName(req.ingredientName, ingredients)
      if (!ingredient) {
        return 0
      }

      const possibleServings = Math.floor(
        ingredient.quantity.amount / (req.quantity.amount * baseServings)
      )
      maxServings = Math.min(maxServings, possibleServings)
    }

    return maxServings === Infinity ? 0 : maxServings
  }
}
```

## 期限管理サービス（ExpiryManagementService）

### 概要

食材の期限に関する複雑な計算や判定を行うサービス。

### インターフェース定義

```typescript
// domain/services/expiry-management-service.ts
export interface ExpiryManagementService {
  /**
   * 期限切れリスクを評価する
   * @param ingredient 評価対象の食材
   * @returns リスク評価結果
   */
  assessExpiryRisk(ingredient: Ingredient): ExpiryRiskAssessment

  /**
   * 期限別に食材をグループ化する
   * @param ingredients 食材リスト
   * @returns 期限別グループ
   */
  groupByExpiryStatus(ingredients: Ingredient[]): ExpiryGroups

  /**
   * 消費優先順位を計算する
   * @param ingredients 食材リスト
   * @returns 優先順位付きリスト
   */
  calculateConsumptionPriority(ingredients: Ingredient[]): PrioritizedIngredient[]

  /**
   * 期限延長可能かチェックする
   * @param ingredient 対象食材
   * @param newStorageLocation 新しい保存場所
   * @returns 延長可能性の評価
   */
  canExtendExpiry(
    ingredient: Ingredient,
    newStorageLocation: StorageLocation
  ): ExpiryExtensionAssessment
}
```

### 関連する型定義

```typescript
// 期限リスク評価
export interface ExpiryRiskAssessment {
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  score: number // 0-100
  daysUntilExpiry: number | null
  consumptionUrgency: string
  recommendations: string[]
}

// 期限別グループ
export interface ExpiryGroups {
  expired: Ingredient[]
  critical: Ingredient[] // 1日以内
  urgent: Ingredient[] // 3日以内
  soon: Ingredient[] // 7日以内
  safe: Ingredient[] // 7日超
  noExpiry: Ingredient[] // 期限なし
}

// 優先順位付き食材
export interface PrioritizedIngredient {
  ingredient: Ingredient
  priority: number // 1が最優先
  reason: string
  daysUntilExpiry: number | null
  wasteRisk: number // 廃棄リスク（0-100）
}

// 期限延長評価
export interface ExpiryExtensionAssessment {
  canExtend: boolean
  estimatedExtensionDays: number
  newExpiryDate: Date | null
  conditions: string[]
  warnings: string[]
}
```

### 実装例

```typescript
export class ExpiryManagementServiceImpl implements ExpiryManagementService {
  assessExpiryRisk(ingredient: Ingredient): ExpiryRiskAssessment {
    const expiryDate = ingredient.expiryDate || ingredient.bestBeforeDate

    if (!expiryDate) {
      return {
        riskLevel: 'NONE',
        score: 0,
        daysUntilExpiry: null,
        consumptionUrgency: '期限設定なし',
        recommendations: [],
      }
    }

    const daysUntilExpiry = expiryDate.daysUntilExpiry()
    let riskLevel: ExpiryRiskAssessment['riskLevel']
    let score: number
    let urgency: string
    const recommendations: string[] = []

    if (daysUntilExpiry < 0) {
      riskLevel = 'CRITICAL'
      score = 100
      urgency = '期限切れ - 廃棄を検討してください'
      recommendations.push('直ちに使用するか廃棄してください')
    } else if (daysUntilExpiry === 0) {
      riskLevel = 'CRITICAL'
      score = 95
      urgency = '本日中に消費必要'
      recommendations.push('本日中に使い切ってください')
    } else if (daysUntilExpiry <= 1) {
      riskLevel = 'HIGH'
      score = 80
      urgency = '明日までに消費推奨'
      recommendations.push('優先的に使用してください')
    } else if (daysUntilExpiry <= 3) {
      riskLevel = 'MEDIUM'
      score = 60
      urgency = '3日以内に消費推奨'
      recommendations.push('メニューに組み込むことを検討してください')
    } else if (daysUntilExpiry <= 7) {
      riskLevel = 'LOW'
      score = 30
      urgency = '計画的な消費を推奨'
      recommendations.push('今週中の使用を計画してください')
    } else {
      riskLevel = 'NONE'
      score = 10
      urgency = '余裕あり'
      recommendations.push('通常通り使用できます')
    }

    // 保存場所による追加の推奨事項
    if (
      ingredient.storageLocation.getType() === StorageLocationType.ROOM_TEMP &&
      daysUntilExpiry <= 3
    ) {
      recommendations.push('冷蔵保存への移動を検討してください')
    }

    return {
      riskLevel,
      score,
      daysUntilExpiry,
      consumptionUrgency: urgency,
      recommendations,
    }
  }

  calculateConsumptionPriority(ingredients: Ingredient[]): PrioritizedIngredient[] {
    const prioritized = ingredients
      .map((ingredient) => {
        const assessment = this.assessExpiryRisk(ingredient)
        const expiryDate = ingredient.expiryDate || ingredient.bestBeforeDate
        const daysUntilExpiry = expiryDate?.daysUntilExpiry() || null

        // 優先度スコアを計算（低いほど優先）
        let priorityScore = 1000 // デフォルト（期限なし）

        if (daysUntilExpiry !== null) {
          if (daysUntilExpiry < 0) {
            priorityScore = 0 // 期限切れは最優先
          } else {
            priorityScore = daysUntilExpiry
          }
        }

        // 廃棄リスクを計算
        const wasteRisk = this.calculateWasteRisk(ingredient, assessment)

        return {
          ingredient,
          priority: 0, // 後で設定
          reason: this.getPriorityReason(assessment, daysUntilExpiry),
          daysUntilExpiry,
          wasteRisk,
          _score: priorityScore, // ソート用の内部スコア
        }
      })
      .sort((a, b) => a._score - b._score)
      .map((item, index) => ({
        ...item,
        priority: index + 1,
        _score: undefined,
      }))

    return prioritized
  }

  private calculateWasteRisk(ingredient: Ingredient, assessment: ExpiryRiskAssessment): number {
    // 基本リスク = 期限リスクスコア
    let risk = assessment.score

    // 数量による調整（量が多いほどリスク高）
    if (ingredient.quantity.amount > 100) {
      risk = Math.min(100, risk * 1.2)
    }

    // 価値による調整（実装では価格情報が必要）
    // ここでは仮の実装

    return Math.round(risk)
  }

  private getPriorityReason(
    assessment: ExpiryRiskAssessment,
    daysUntilExpiry: number | null
  ): string {
    if (daysUntilExpiry === null) {
      return '期限設定なし'
    }

    if (daysUntilExpiry < 0) {
      return `${Math.abs(daysUntilExpiry)}日前に期限切れ`
    }

    if (daysUntilExpiry === 0) {
      return '本日期限'
    }

    return `あと${daysUntilExpiry}日で期限`
  }
}
```

## カテゴリー分類サービス（CategoryClassificationService）

### 概要

食材名から適切なカテゴリーを推定したり、カテゴリーに基づく分析を行うサービス。

### インターフェース定義

```typescript
// domain/services/category-classification-service.ts
export interface CategoryClassificationService {
  /**
   * 食材名から適切なカテゴリーを推定する
   * @param ingredientName 食材名
   * @param categories 利用可能なカテゴリーリスト
   * @returns 推定されたカテゴリーまたはnull
   */
  suggestCategory(ingredientName: string, categories: Category[]): CategorySuggestion | null

  /**
   * カテゴリー別の統計情報を生成する
   * @param ingredients 食材リスト
   * @param categories カテゴリーリスト
   * @returns カテゴリー別統計
   */
  generateCategoryStatistics(
    ingredients: Ingredient[],
    categories: Category[]
  ): CategoryStatistics[]

  /**
   * カテゴリーの使用頻度を分析する
   * @param ingredients 食材リスト
   * @returns 使用頻度分析結果
   */
  analyzeCategoryUsage(ingredients: Ingredient[]): CategoryUsageAnalysis
}
```

### 実装例

```typescript
export class CategoryClassificationServiceImpl implements CategoryClassificationService {
  // カテゴリーキーワードマッピング
  private readonly categoryKeywords = new Map<string, string[]>([
    ['野菜', ['菜', 'レタス', 'キャベツ', 'トマト', '人参', '玉ねぎ', '芋']],
    ['肉・魚', ['肉', '豚', '牛', '鶏', '魚', 'サーモン', '鮭', 'エビ']],
    ['乳製品', ['牛乳', 'ミルク', 'チーズ', 'ヨーグルト', 'バター']],
    ['調味料', ['醤油', '味噌', '塩', '砂糖', 'ソース', '油', '酢']],
    ['主食', ['米', 'パン', '麺', 'パスタ', 'うどん', 'そば']],
    ['飲料', ['水', 'お茶', 'ジュース', 'コーヒー', '紅茶']],
    ['その他', []], // デフォルト
  ])

  suggestCategory(ingredientName: string, categories: Category[]): CategorySuggestion | null {
    const normalizedName = ingredientName.toLowerCase()
    let bestMatch: Category | null = null
    let confidence = 0
    const reasons: string[] = []

    for (const category of categories) {
      const keywords = this.categoryKeywords.get(category.name.toString()) || []

      for (const keyword of keywords) {
        if (normalizedName.includes(keyword)) {
          bestMatch = category
          confidence = 0.8
          reasons.push(`「${keyword}」を含む`)
          break
        }
      }

      if (bestMatch) break
    }

    if (!bestMatch) {
      // デフォルトカテゴリーを返す
      bestMatch = categories.find((c) => c.name.toString() === 'その他') || null
      confidence = 0.3
      reasons.push('該当するキーワードなし')
    }

    return bestMatch
      ? {
          category: bestMatch,
          confidence,
          reasons,
        }
      : null
  }

  generateCategoryStatistics(
    ingredients: Ingredient[],
    categories: Category[]
  ): CategoryStatistics[] {
    const statsMap = new Map<string, CategoryStatistics>()

    // 初期化
    for (const category of categories) {
      statsMap.set(category.id.toString(), {
        category,
        totalItems: 0,
        itemsWithStock: 0,
        itemsExpired: 0,
        itemsExpiringSoon: 0,
        averageStockLevel: 0,
        totalValue: 0,
      })
    }

    // 集計
    for (const ingredient of ingredients) {
      const stats = statsMap.get(ingredient.categoryId.toString())
      if (!stats) continue

      stats.totalItems++

      if (ingredient.hasStock()) {
        stats.itemsWithStock++
      }

      if (ingredient.isExpired()) {
        stats.itemsExpired++
      }

      if (ingredient.isExpiringSoon(7)) {
        stats.itemsExpiringSoon++
      }
    }

    return Array.from(statsMap.values())
  }
}
```

## 単位変換サービス（UnitConversionService）

### 概要

異なる単位間の変換を行うサービス。

### インターフェース定義

```typescript
// domain/services/unit-conversion-service.ts
export interface UnitConversionService {
  /**
   * 単位を変換する
   * @param quantity 変換元の数量
   * @param toUnit 変換先の単位
   * @returns 変換後の数量またはnull（変換不可の場合）
   */
  convert(quantity: Quantity, toUnit: Unit): Quantity | null

  /**
   * 変換可能かチェックする
   * @param fromUnit 変換元の単位
   * @param toUnit 変換先の単位
   * @returns 変換可能な場合true
   */
  canConvert(fromUnit: Unit, toUnit: Unit): boolean

  /**
   * 標準単位に変換する
   * @param quantity 数量
   * @returns 標準単位での数量
   */
  toStandardUnit(quantity: Quantity): Quantity
}
```

### 実装例

```typescript
export class UnitConversionServiceImpl implements UnitConversionService {
  // 変換テーブル（実際はDBや設定ファイルから読み込む）
  private readonly conversionTable = new Map<string, Map<string, number>>([
    // 重量系
    [
      'g',
      new Map([
        ['kg', 0.001],
        ['mg', 1000],
      ]),
    ],
    [
      'kg',
      new Map([
        ['g', 1000],
        ['mg', 1000000],
      ]),
    ],
    [
      'mg',
      new Map([
        ['g', 0.001],
        ['kg', 0.000001],
      ]),
    ],

    // 容量系
    ['ml', new Map([['L', 0.001]])],
    ['L', new Map([['ml', 1000]])],
  ])

  convert(quantity: Quantity, toUnit: Unit): Quantity | null {
    if (quantity.unit.equals(toUnit)) {
      return quantity
    }

    if (!this.canConvert(quantity.unit, toUnit)) {
      return null
    }

    const factor = this.getConversionFactor(quantity.unit, toUnit)
    if (factor === null) {
      return null
    }

    return new Quantity(quantity.amount * factor, toUnit)
  }

  canConvert(fromUnit: Unit, toUnit: Unit): boolean {
    // 同じタイプの単位のみ変換可能
    if (fromUnit.type !== toUnit.type) {
      return false
    }

    // 変換テーブルに存在するかチェック
    return this.getConversionFactor(fromUnit, toUnit) !== null
  }

  private getConversionFactor(fromUnit: Unit, toUnit: Unit): number | null {
    const fromTable = this.conversionTable.get(fromUnit.symbol)
    if (fromTable) {
      const factor = fromTable.get(toUnit.symbol)
      if (factor !== undefined) {
        return factor
      }
    }

    // 逆方向の変換を試す
    const toTable = this.conversionTable.get(toUnit.symbol)
    if (toTable) {
      const inverseFactor = toTable.get(fromUnit.symbol)
      if (inverseFactor !== undefined) {
        return 1 / inverseFactor
      }
    }

    return null
  }
}
```

## 更新履歴

| 日付       | 内容     | 作成者  |
| ---------- | -------- | ------- |
| 2025-01-21 | 初版作成 | @system |
