import { BusinessRuleException } from '@/modules/shared/server/domain/exceptions'

/**
 * 食材重複例外
 * 同じ名前・期限・保存場所の食材が既に存在する場合にスローされる
 */
export class DuplicateIngredientException extends BusinessRuleException {
  constructor(
    name: string,
    expiryInfo?: { bestBeforeDate: Date; useByDate?: Date | null } | null,
    storageLocation?: { type: string; detail?: string | null }
  ) {
    const details = {
      name,
      expiryInfo: expiryInfo
        ? {
            bestBeforeDate: expiryInfo.bestBeforeDate.toISOString(),
            useByDate: expiryInfo.useByDate?.toISOString() || null,
          }
        : null,
      storageLocation: storageLocation || null,
    }

    super('同じ名前・期限・保存場所の食材が既に存在します', details)
  }
}
