/**
 * 食材作成リクエストの型定義
 */
export interface CreateIngredientRequest {
  name: string
  categoryId: string
  quantity: {
    amount: number
    unitId: string
  }
  storageLocation: {
    type: 'REFRIGERATED' | 'FROZEN' | 'ROOM_TEMPERATURE'
    detail?: string
  }
  threshold?: number
  expiryInfo?: {
    bestBeforeDate?: string
    useByDate?: string
  }
  purchaseDate: string
  price?: number
  memo?: string
}

/**
 * 食材レスポンスの型定義
 */
export interface IngredientResponse {
  ingredient: {
    id: string
    userId: string
    name: string
    category: {
      id: string
      name: string
    } | null
    price: number | null
    purchaseDate: string
    expiryInfo: {
      bestBeforeDate: string | null
      useByDate: string | null
    } | null
    stock: {
      quantity: number
      unit: {
        id: string
        name: string
        symbol: string
      }
      storageLocation: {
        type: string
        detail: string | null
      }
      threshold: number | null
    }
    memo: string | null
    createdAt: string
    updatedAt: string
  }
}

/**
 * カテゴリーの型定義
 */
export interface Category {
  id: string
  name: string
  description: string | null
  displayOrder: number
}

/**
 * 単位の型定義
 */
export interface Unit {
  id: string
  name: string
  symbol: string
  type: string
  description: string | null
  displayOrder: number
}

/**
 * エラーレスポンスの型定義
 */
export interface ErrorResponse {
  error: {
    code: string
    message: string
    timestamp: string
    path: string
  }
}
