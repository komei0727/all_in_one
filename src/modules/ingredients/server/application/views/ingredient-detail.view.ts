/**
 * 食材詳細ビュー
 * 読み取り専用の軽量なデータ構造
 * CQRSパターンのQuery側で使用
 */
export interface IngredientDetailView {
  /** 食材ID */
  id: string
  /** ユーザーID */
  userId: string
  /** 食材名 */
  name: string
  /** カテゴリーID（nullable） */
  categoryId: string | null
  /** カテゴリー名（nullable） */
  categoryName: string | null
  /** 価格（nullable） */
  price: number | null
  /** 購入日（YYYY-MM-DD形式） */
  purchaseDate: string
  /** 賞味期限（YYYY-MM-DD形式、nullable） */
  bestBeforeDate: string | null
  /** 消費期限（YYYY-MM-DD形式、nullable） */
  useByDate: string | null
  /** 在庫数量 */
  quantity: number
  /** 単位ID */
  unitId: string
  /** 単位名 */
  unitName: string
  /** 単位記号 */
  unitSymbol: string
  /** 保存場所タイプ */
  storageType: string
  /** 保存場所詳細（nullable） */
  storageDetail: string | null
  /** 在庫閾値（nullable） */
  threshold: number | null
  /** メモ（nullable） */
  memo: string | null
  /** 作成日時（ISO文字列） */
  createdAt: string
  /** 更新日時（ISO文字列） */
  updatedAt: string
}
