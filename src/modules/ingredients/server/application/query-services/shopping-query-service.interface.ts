import type { ShoppingSessionDto } from '../dtos/shopping-session.dto'

/**
 * 買い物セッション関連のクエリサービスインターフェース
 *
 * 複雑な検索や統計、履歴取得などのread操作を担当する
 */
export interface ShoppingQueryService {
  /**
   * ユーザーの直近の買い物セッション履歴を取得
   * @param userId ユーザーID
   * @param limit 取得件数（デフォルト: 10）
   * @returns 買い物セッション履歴
   */
  getRecentSessions(userId: string, limit?: number): Promise<ShoppingSessionDto[]>

  /**
   * ユーザーの買い物セッション履歴を検索条件付きで取得
   * @param userId ユーザーID
   * @param criteria 検索条件
   * @returns 買い物セッション履歴とページネーション情報
   */
  getSessionHistory(userId: string, criteria: SessionHistoryCriteria): Promise<SessionHistoryResult>

  /**
   * ユーザーの買い物統計を取得
   * @param userId ユーザーID
   * @param periodDays 期間（日数、デフォルト: 30日）
   * @returns 買い物統計
   */
  getShoppingStatistics(userId: string, periodDays?: number): Promise<ShoppingStatistics>

  /**
   * よくチェックする食材のクイックアクセスリストを取得
   * @param userId ユーザーID
   * @param limit 取得件数（デフォルト: 10）
   * @returns クイックアクセス用食材リスト
   */
  getQuickAccessIngredients(userId: string, limit?: number): Promise<QuickAccessIngredient[]>

  /**
   * 食材ごとのチェック履歴統計を取得
   * @param userId ユーザーID
   * @param ingredientId 食材ID（オプション）
   * @returns 食材チェック統計
   */
  getIngredientCheckStatistics(
    userId: string,
    ingredientId?: string
  ): Promise<IngredientCheckStatistics[]>
}

/**
 * セッション履歴検索条件
 */
export interface SessionHistoryCriteria {
  /** ページ番号（1から開始） */
  page?: number
  /** 1ページあたりの件数 */
  limit?: number
  /** 開始日時（ISO 8601形式） */
  from?: string
  /** 終了日時（ISO 8601形式） */
  to?: string
  /** ステータスフィルタ */
  status?: 'COMPLETED' | 'ABANDONED'
}

/**
 * セッション履歴取得結果
 */
export interface SessionHistoryResult {
  /** セッション履歴データ */
  data: SessionHistoryItem[]
  /** ページネーション情報 */
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * セッション履歴アイテム
 */
export interface SessionHistoryItem {
  sessionId: string
  status: 'COMPLETED' | 'ABANDONED'
  startedAt: string
  completedAt?: string
  duration: number // 秒単位
  checkedItemsCount: number
  totalSpent?: number
  deviceType?: 'MOBILE' | 'TABLET' | 'DESKTOP'
  location?: {
    name?: string
    latitude: number
    longitude: number
  }
}

/**
 * 買い物統計データ
 */
export interface ShoppingStatistics {
  /** 期間内の総セッション数 */
  totalSessions: number
  /** 期間内の総チェック食材数 */
  totalCheckedIngredients: number
  /** 期間内の平均セッション時間（分） */
  averageSessionDurationMinutes: number
  /** 最も頻繁にチェックされた食材Top5 */
  topCheckedIngredients: TopCheckedIngredient[]
  /** 月別セッション数推移 */
  monthlySessionCounts: MonthlySessionCount[]
}

/**
 * クイックアクセス用食材データ
 */
export interface QuickAccessIngredient {
  /** 食材ID */
  ingredientId: string
  /** 食材名 */
  ingredientName: string
  /** チェック回数 */
  checkCount: number
  /** 最終チェック日時 */
  lastCheckedAt: string
  /** 現在の在庫状態 */
  currentStockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  /** 現在の期限状態 */
  currentExpiryStatus: 'FRESH' | 'NEAR_EXPIRY' | 'EXPIRING_SOON' | 'CRITICAL' | 'EXPIRED'
}

/**
 * 頻繁にチェックされた食材データ
 */
export interface TopCheckedIngredient {
  /** 食材ID */
  ingredientId: string
  /** 食材名 */
  ingredientName: string
  /** チェック回数 */
  checkCount: number
  /** チェック率（全セッションに対する割合） */
  checkRatePercentage: number
  /** 最終チェック日時 */
  lastCheckedAt: string
}

/**
 * 食材チェック統計データ
 */
export interface IngredientCheckStatistics {
  /** 食材ID */
  ingredientId: string
  /** 食材名 */
  ingredientName: string
  /** 総チェック回数 */
  totalCheckCount: number
  /** 最初のチェック日時 */
  firstCheckedAt: string
  /** 最終チェック日時 */
  lastCheckedAt: string
  /** 月別チェック回数 */
  monthlyCheckCounts: MonthlyCheckCount[]
  /** 在庫状態別チェック回数 */
  stockStatusBreakdown: StockStatusBreakdown
}

/**
 * 月別セッション数データ
 */
export interface MonthlySessionCount {
  /** 年月（YYYY-MM形式） */
  yearMonth: string
  /** セッション数 */
  sessionCount: number
}

/**
 * 月別チェック回数データ
 */
export interface MonthlyCheckCount {
  /** 年月（YYYY-MM形式） */
  yearMonth: string
  /** チェック回数 */
  checkCount: number
}

/**
 * 在庫状態別チェック回数データ
 */
export interface StockStatusBreakdown {
  /** 在庫ありでのチェック回数 */
  inStockChecks: number
  /** 在庫少でのチェック回数 */
  lowStockChecks: number
  /** 在庫なしでのチェック回数 */
  outOfStockChecks: number
}
