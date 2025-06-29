import { useMutation, useQuery } from '@tanstack/react-query'

import type { Category, CreateIngredientRequest, IngredientResponse, Unit } from '../types'

// 食材一覧取得のパラメータ型
export interface IngredientsParams {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  expiryStatus?: 'all' | 'expired' | 'expiring' | 'fresh'
  sortBy?: 'name' | 'purchaseDate' | 'expiryDate' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

// 食材一覧レスポンス型
export interface IngredientsListResponse {
  ingredients: IngredientResponse['ingredient'][]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

/**
 * 食材API関連のカスタムフック
 */

/**
 * カテゴリー一覧を取得するフック
 */
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/v1/ingredients/categories')
      if (!response.ok) {
        throw new Error('カテゴリーの取得に失敗しました')
      }
      const data = (await response.json()) as { categories: Category[] }
      return data.categories
    },
  })
}

/**
 * 単位一覧を取得するフック
 */
export function useUnits() {
  return useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const response = await fetch('/api/v1/ingredients/units')
      if (!response.ok) {
        throw new Error('単位の取得に失敗しました')
      }
      const data = (await response.json()) as { units: Unit[] }
      return data.units
    },
  })
}

/**
 * 食材を作成するフック
 */
export function useCreateIngredient() {
  return useMutation<IngredientResponse, Error, CreateIngredientRequest>({
    mutationFn: async (data: CreateIngredientRequest) => {
      const response = await fetch('/api/v1/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = (await response.json()) as { error?: { message?: string } }
        throw new Error(error.error?.message || '食材の登録に失敗しました')
      }

      return response.json() as Promise<IngredientResponse>
    },
  })
}

/**
 * 食材一覧を取得するフック
 */
export function useIngredients(params: IngredientsParams = {}) {
  // URLSearchParamsを構築
  const searchParams = new URLSearchParams()

  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  if (params.search) searchParams.set('search', params.search)
  if (params.categoryId) searchParams.set('categoryId', params.categoryId)
  if (params.expiryStatus) searchParams.set('expiryStatus', params.expiryStatus)
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)

  const queryString = searchParams.toString()

  return useQuery<IngredientsListResponse>({
    queryKey: ['ingredients', params],
    queryFn: async () => {
      const url = queryString ? `/api/v1/ingredients?${queryString}` : '/api/v1/ingredients'
      const response = await fetch(url)

      if (!response.ok) {
        const error = (await response.json()) as { error?: { message?: string } }
        throw new Error(error.error?.message || '食材の取得に失敗しました')
      }

      return response.json() as Promise<IngredientsListResponse>
    },
  })
}
