'use client'

import { useState, useEffect, useRef } from 'react'

import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/modules/shared/client/components/ui/button'
import { Input } from '@/modules/shared/client/components/ui/input'
import { Label } from '@/modules/shared/client/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/modules/shared/client/components/ui/select'

import type { IngredientsParams } from '../hooks/use-ingredients-api'
import type { Category } from '../types'

interface IngredientsListControlsProps {
  categories: Category[]
  currentParams: IngredientsParams
  onParamsChange: (params: IngredientsParams) => void
  totalPages: number
  currentPage: number
  isLoading?: boolean
}

export function IngredientsListControls({
  categories,
  currentParams,
  onParamsChange,
  totalPages,
  currentPage,
  isLoading = false,
}: IngredientsListControlsProps) {
  // ローカル状態（即座にUIに反映）
  const [searchValue, setSearchValue] = useState(currentParams.search || '')
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 検索値が変更されたらパラメータを更新（デバウンス付き）
  useEffect(() => {
    // 既存のタイマーをクリア
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // 新しいタイマーを設定
    debounceTimeoutRef.current = setTimeout(() => {
      if (searchValue !== currentParams.search) {
        onParamsChange({
          ...currentParams,
          search: searchValue || undefined,
          page: 1, // 検索時は1ページ目に戻る
        })
      }
    }, 500)

    // クリーンアップ
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [searchValue, currentParams, onParamsChange])

  // カテゴリーフィルターの変更
  const handleCategoryChange = (value: string) => {
    onParamsChange({
      ...currentParams,
      categoryId: value === 'all' ? undefined : value,
      page: 1, // フィルター変更時は1ページ目に戻る
    })
  }

  // 期限状態フィルターの変更
  const handleExpiryStatusChange = (value: string) => {
    onParamsChange({
      ...currentParams,
      expiryStatus: value as IngredientsParams['expiryStatus'],
      page: 1, // フィルター変更時は1ページ目に戻る
    })
  }

  // ソート条件の変更
  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-') as [
      IngredientsParams['sortBy'],
      IngredientsParams['sortOrder'],
    ]
    onParamsChange({
      ...currentParams,
      sortBy,
      sortOrder,
    })
  }

  // ページの変更
  const handlePageChange = (page: number) => {
    onParamsChange({
      ...currentParams,
      page,
    })
  }

  // 検索のクリア
  const handleClearSearch = () => {
    setSearchValue('')
  }

  // 現在のソート値を取得
  const currentSortValue = `${currentParams.sortBy || 'createdAt'}-${currentParams.sortOrder || 'desc'}`

  return (
    <div className="space-y-4">
      {/* 検索バー */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="食材名で検索..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-10 pr-10"
          disabled={isLoading}
        />
        {searchValue && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* フィルターとソート */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* カテゴリーフィルター */}
        <div className="space-y-2">
          <Label htmlFor="category-filter">カテゴリー</Label>
          <Select
            value={currentParams.categoryId || 'all'}
            onValueChange={handleCategoryChange}
            disabled={isLoading}
          >
            <SelectTrigger id="category-filter">
              <SelectValue placeholder="すべてのカテゴリー" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべてのカテゴリー</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 期限状態フィルター */}
        <div className="space-y-2">
          <Label htmlFor="expiry-filter">期限状態</Label>
          <Select
            value={currentParams.expiryStatus || 'all'}
            onValueChange={handleExpiryStatusChange}
            disabled={isLoading}
          >
            <SelectTrigger id="expiry-filter">
              <SelectValue placeholder="すべて" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="expired">期限切れ</SelectItem>
              <SelectItem value="expiring">期限間近（3日以内）</SelectItem>
              <SelectItem value="fresh">新鮮</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ソート */}
        <div className="space-y-2">
          <Label htmlFor="sort">並び順</Label>
          <Select value={currentSortValue} onValueChange={handleSortChange} disabled={isLoading}>
            <SelectTrigger id="sort">
              <SelectValue placeholder="登録日（新しい順）" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">登録日（新しい順）</SelectItem>
              <SelectItem value="createdAt-asc">登録日（古い順）</SelectItem>
              <SelectItem value="name-asc">名前（昇順）</SelectItem>
              <SelectItem value="name-desc">名前（降順）</SelectItem>
              <SelectItem value="purchaseDate-desc">購入日（新しい順）</SelectItem>
              <SelectItem value="purchaseDate-asc">購入日（古い順）</SelectItem>
              <SelectItem value="expiryDate-asc">期限日（近い順）</SelectItem>
              <SelectItem value="expiryDate-desc">期限日（遠い順）</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {totalPages} ページ中 {currentPage} ページ目
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              size="sm"
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4" />
              前へ
            </Button>
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              size="sm"
              variant="outline"
            >
              次へ
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
