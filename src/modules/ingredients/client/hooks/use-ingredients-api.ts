import { useMutation, useQuery } from '@tanstack/react-query'

import type { Category, CreateIngredientRequest, IngredientResponse, Unit } from '../types'

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
      const data = await response.json()
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
      const data = await response.json()
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
        const error = await response.json()
        throw new Error(error.error?.message || '食材の登録に失敗しました')
      }

      return response.json()
    },
  })
}
