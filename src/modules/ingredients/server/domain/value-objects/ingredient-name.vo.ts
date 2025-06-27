import { Name } from '@/modules/shared/server/domain/value-objects'

/**
 * 食材名値オブジェクト
 * 食材の名前を表現する
 */
export class IngredientName extends Name {
  /**
   * フィールド名を取得
   * @returns フィールド名
   */
  protected getFieldName(): string {
    return '食材名'
  }

  /**
   * 最大文字数を取得
   * @returns 最大文字数
   */
  protected getMaxLength(): number {
    return 50
  }
}
