import { DomainEvent } from '@/modules/shared/server/domain/events/domain-event.base'

/**
 * カテゴリー更新イベント
 * カテゴリー情報が更新された際に発生するドメインイベント
 */
export class CategoryUpdated extends DomainEvent {
  constructor(
    public readonly categoryId: string,
    public readonly userId: string,
    public readonly changes: Record<string, { from: unknown; to: unknown }>,
    metadata: Record<string, unknown> = {}
  ) {
    CategoryUpdated.validateRequiredFields(categoryId, userId, changes)
    super(categoryId, metadata)
  }

  get eventName(): string {
    return 'CategoryUpdated'
  }

  protected getPayload(): Record<string, unknown> {
    return {
      categoryId: this.categoryId,
      userId: this.userId,
      changes: this.changes,
    }
  }

  private static validateRequiredFields(
    categoryId: string,
    userId: string,
    changes: Record<string, { from: unknown; to: unknown }> | null
  ): void {
    if (!categoryId?.trim()) throw new Error('カテゴリーIDは必須です')
    if (!userId?.trim()) throw new Error('ユーザーIDは必須です')
    if (!changes || Object.keys(changes).length === 0) throw new Error('変更内容は必須です')
  }
}
