/**
 * IDプレフィックス定義
 *
 * 各エンティティのIDに付与するプレフィックスを定義します。
 * プレフィックスにより、IDを見ただけでどのエンティティのものか識別可能になります。
 */
export const ID_PREFIXES = {
  /** 食材ID */
  ingredient: 'ing_',
  /** 食材在庫ID */
  ingredientStock: 'stk_',
  /** カテゴリーID */
  category: 'cat_',
  /** 単位ID */
  unit: 'unt_',
  /** ユーザーID */
  user: 'usr_',
} as const

/** IDプレフィックスの型 */
export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES]
