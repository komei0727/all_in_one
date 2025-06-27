'use client'

import { useEffect, useState } from 'react'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

import { Badge } from '@/modules/shared/client/components/ui/badge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shared/client/components/ui/table'

import { IngredientsListMobile } from './ingredients-list-mobile'

import type { IngredientResponse } from '../types'

interface IngredientsListProps {
  ingredients: IngredientResponse['ingredient'][]
}

export function IngredientsList({ ingredients }: IngredientsListProps) {
  // レスポンシブ対応のための画面サイズ検出
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])
  // 保管場所の表示名を取得
  const getStorageLocationLabel = (type: string) => {
    const labels: Record<string, string> = {
      REFRIGERATED: '冷蔵',
      FROZEN: '冷凍',
      ROOM_TEMPERATURE: '常温',
    }
    return labels[type] || type
  }

  // 期限切れチェック
  const isExpired = (dateString: string | null) => {
    if (!dateString) return false
    return new Date(dateString) < new Date()
  }

  // 期限切れ間近チェック（3日以内）
  const isExpiringSoon = (dateString: string | null) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    return date <= threeDaysFromNow && date >= new Date()
  }

  // 日付フォーマット
  const formatDateString = (dateString: string | null) => {
    if (!dateString) return '-'
    return format(new Date(dateString), 'yyyy/MM/dd', { locale: ja })
  }

  if (ingredients.length === 0) {
    return <div className="py-8 text-center text-gray-500">登録されている食材がありません</div>
  }

  // モバイル表示の場合
  if (isMobile) {
    return <IngredientsListMobile ingredients={ingredients} />
  }

  // デスクトップ表示の場合
  return (
    <Table>
      <TableCaption>登録済みの食材一覧</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>食材名</TableHead>
          <TableHead>カテゴリー</TableHead>
          <TableHead>数量</TableHead>
          <TableHead>保管場所</TableHead>
          <TableHead>購入日</TableHead>
          <TableHead>賞味期限</TableHead>
          <TableHead>消費期限</TableHead>
          <TableHead>価格</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ingredients.map((ingredient) => {
          const bestBefore = ingredient.expiryInfo?.bestBeforeDate ?? null
          const useBy = ingredient.expiryInfo?.useByDate ?? null

          return (
            <TableRow key={ingredient.id}>
              <TableCell className="font-medium">{ingredient.name}</TableCell>
              <TableCell>{ingredient.category?.name || '-'}</TableCell>
              <TableCell>
                {ingredient.stock.quantity} {ingredient.stock.unit.symbol}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {getStorageLocationLabel(ingredient.stock.storageLocation.type)}
                </Badge>
                {ingredient.stock.storageLocation.detail && (
                  <span className="ml-2 text-sm text-gray-600">
                    ({ingredient.stock.storageLocation.detail})
                  </span>
                )}
              </TableCell>
              <TableCell>{formatDateString(ingredient.purchaseDate)}</TableCell>
              <TableCell>
                <span
                  className={
                    isExpired(bestBefore)
                      ? 'font-semibold text-red-600'
                      : isExpiringSoon(bestBefore)
                        ? 'text-orange-600'
                        : ''
                  }
                >
                  {formatDateString(ingredient.expiryInfo?.bestBeforeDate ?? null)}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={
                    isExpired(useBy)
                      ? 'font-semibold text-red-600'
                      : isExpiringSoon(useBy)
                        ? 'text-orange-600'
                        : ''
                  }
                >
                  {formatDateString(ingredient.expiryInfo?.useByDate ?? null)}
                </span>
              </TableCell>
              <TableCell>
                {ingredient.price ? `¥${ingredient.price.toLocaleString()}` : '-'}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
