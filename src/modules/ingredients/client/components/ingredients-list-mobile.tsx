'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

import { Badge } from '@/modules/shared/client/components/ui/badge'
import { Card, CardContent } from '@/modules/shared/client/components/ui/card'

import type { IngredientResponse } from '../types'

interface IngredientsListMobileProps {
  ingredients: IngredientResponse['ingredient'][]
}

export function IngredientsListMobile({ ingredients }: IngredientsListMobileProps) {
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
    return format(new Date(dateString), 'MM/dd', { locale: ja })
  }

  if (ingredients.length === 0) {
    return <div className="py-8 text-center text-gray-500">登録されている食材がありません</div>
  }

  return (
    <div className="space-y-3">
      {ingredients.map((ingredient) => {
        const bestBefore = ingredient.expiryInfo?.bestBeforeDate ?? null
        const useBy = ingredient.expiryInfo?.useByDate ?? null
        const expiryDate = bestBefore || useBy
        const isExpiredItem = isExpired(expiryDate)
        const isExpiringSoonItem = isExpiringSoon(expiryDate)

        return (
          <Card
            key={ingredient.id}
            className={`overflow-hidden ${isExpiredItem ? 'border-red-300' : ''}`}
          >
            <CardContent className="p-4">
              {/* ヘッダー部分 */}
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{ingredient.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    {ingredient.category && (
                      <span className="inline-flex items-center">
                        <span className="font-medium">{ingredient.category.name}</span>
                      </span>
                    )}
                    <Badge variant="secondary">
                      {getStorageLocationLabel(ingredient.stock.storageLocation.type)}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-medium">
                    {ingredient.stock.quantity} {ingredient.stock.unit.symbol}
                  </div>
                </div>
              </div>

              {/* 期限情報 */}
              {expiryDate && (
                <div className="mb-2">
                  <div
                    className={`inline-flex items-center gap-1 text-sm ${
                      isExpiredItem
                        ? 'font-semibold text-red-600'
                        : isExpiringSoonItem
                          ? 'text-orange-600'
                          : 'text-gray-600'
                    }`}
                  >
                    <span>{bestBefore ? '賞味期限' : '消費期限'}:</span>
                    <span>{formatDateString(expiryDate)}</span>
                    {isExpiredItem && <span>（期限切れ）</span>}
                    {!isExpiredItem && isExpiringSoonItem && <span>（期限間近）</span>}
                  </div>
                </div>
              )}

              {/* 補足情報 */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <div>購入日: {formatDateString(ingredient.purchaseDate)}</div>
                {ingredient.price && <div>¥{ingredient.price.toLocaleString()}</div>}
              </div>

              {/* 保管場所の詳細 */}
              {ingredient.stock.storageLocation.detail && (
                <div className="mt-2 text-sm text-gray-600">
                  保管場所: {ingredient.stock.storageLocation.detail}
                </div>
              )}

              {/* メモ */}
              {ingredient.memo && (
                <div className="mt-2 rounded bg-gray-50 p-2 text-sm text-gray-600">
                  {ingredient.memo}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
