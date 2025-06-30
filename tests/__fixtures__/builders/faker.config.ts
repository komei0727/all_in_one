import { faker } from '@faker-js/faker/locale/ja'
import { createId } from '@paralleldrive/cuid2'

import { ID_PREFIXES } from '@/modules/shared/server/domain/constants/id-prefixes'

/**
 * 日本語ロケール専用のFakerインスタンス
 * 日本語パッケージのみをインポートすることで読み込みを高速化
 */
export { faker }

// シードを設定して再現性を確保（必要に応じて）
// faker.seed(123)

/**
 * 日本の一般的な食材名リスト
 */
export const JAPANESE_INGREDIENTS = [
  // 野菜
  'トマト',
  'キャベツ',
  'レタス',
  'にんじん',
  'じゃがいも',
  'たまねぎ',
  'きゅうり',
  'ほうれん草',
  'ブロッコリー',
  'ピーマン',
  'なす',
  'だいこん',
  'ごぼう',
  'れんこん',
  'さつまいも',
  // 肉類
  '鶏むね肉',
  '鶏もも肉',
  '豚バラ肉',
  '豚ロース',
  '牛肉',
  'ひき肉',
  // 魚介類
  'さけ',
  'さば',
  'あじ',
  'いわし',
  'まぐろ',
  'えび',
  'いか',
  'たこ',
  // 調味料・その他
  'しょうゆ',
  'みそ',
  'みりん',
  'さとう',
  'しお',
  'こしょう',
  'マヨネーズ',
  'ケチャップ',
  // 乳製品
  '牛乳',
  'ヨーグルト',
  'チーズ',
  'バター',
  // 卵・豆腐
  'たまご',
  'とうふ',
  'なっとう',
  'あぶらあげ',
  // 主食
  'ごはん',
  'パン',
  'うどん',
  'そば',
  'パスタ',
  'ラーメン',
]

/**
 * 保存場所リスト
 */
export const STORAGE_LOCATIONS = ['冷蔵庫', '冷凍庫', '野菜室', 'パントリー', '調味料棚', 'その他']

/**
 * カテゴリー名リスト
 */
export const CATEGORY_NAMES = [
  '野菜',
  '肉・魚',
  '乳製品',
  '調味料',
  '主食',
  '冷凍食品',
  '缶詰・保存食品',
  'パン・シリアル',
  'お菓子',
  '飲料',
  'その他',
]

/**
 * 単位リスト
 */
export const UNITS = [
  { name: 'グラム', symbol: 'g' },
  { name: 'キログラム', symbol: 'kg' },
  { name: 'ミリリットル', symbol: 'ml' },
  { name: 'リットル', symbol: 'L' },
  { name: '個', symbol: '個' },
  { name: '本', symbol: '本' },
  { name: '枚', symbol: '枚' },
  { name: 'パック', symbol: 'パック' },
  { name: '袋', symbol: '袋' },
  { name: '箱', symbol: '箱' },
  { name: '缶', symbol: '缶' },
  { name: '片', symbol: '片' },
  { name: '束', symbol: '束' },
  { name: '尾', symbol: '尾' },
]

/**
 * カスタムヘルパー関数
 */
export const testDataHelpers = {
  /**
   * CUID生成
   */
  cuid: () => createId(),

  /**
   * プレフィックス付きID生成
   */
  ingredientId: () => ID_PREFIXES.ingredient + createId(),
  ingredientStockId: () => ID_PREFIXES.ingredientStock + createId(),
  categoryId: () => ID_PREFIXES.category + createId(),
  unitId: () => ID_PREFIXES.unit + createId(),
  userId: () => ID_PREFIXES.user + createId(),

  /**
   * ランダムなカテゴリー名を取得
   */
  categoryName: () => faker.helpers.arrayElement(CATEGORY_NAMES),

  /**
   * ランダムな単位を取得
   */
  unit: () => faker.helpers.arrayElement(UNITS),

  /**
   * ランダムな単位名を取得
   */
  unitName: () => faker.helpers.arrayElement(UNITS).name,

  /**
   * ランダムな単位記号を取得
   */
  unitSymbol: () => faker.helpers.arrayElement(UNITS).symbol,
  /**
   * ランダムな日本の食材名を取得
   */
  ingredientName: () => faker.helpers.arrayElement(JAPANESE_INGREDIENTS),

  /**
   * ランダムな保存場所を取得
   */
  storageLocation: () => faker.helpers.arrayElement(STORAGE_LOCATIONS),

  /**
   * 現実的な価格を生成（10円〜5000円）
   */
  price: () => faker.number.int({ min: 10, max: 5000 }),

  /**
   * 現実的な数量を生成（0.1〜100）
   */
  quantity: () => faker.number.float({ min: 0.1, max: 100, fractionDigits: 1 }),

  /**
   * 将来の日付を生成（デフォルトは1日〜90日後、または指定日数後）
   */
  futureDate: (days?: number) => {
    if (days !== undefined) {
      return testDataHelpers.daysFromNow(days)
    }
    return faker.date.future({ years: 0.25 })
  },

  /**
   * 過去の日付を生成（90日前〜昨日）
   */
  pastDate: () => faker.date.past({ years: 0.25 }),

  /**
   * 今日から指定日数後の日付を生成
   */
  daysFromNow: (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date
  },

  /**
   * 今日の日付をYYYY-MM-DD形式で取得
   */
  todayString: () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  },

  /**
   * 今日から指定日数後の日付をYYYY-MM-DD形式で取得
   */
  dateStringFromNow: (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  },
}
