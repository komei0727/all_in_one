import { ValidationException } from '../exceptions/validation.exception'

/**
 * 保管場所タイプ
 */
export enum StorageType {
  REFRIGERATED = 'REFRIGERATED', // 冷蔵
  FROZEN = 'FROZEN', // 冷凍
  ROOM_TEMPERATURE = 'ROOM_TEMPERATURE', // 常温
}

/**
 * 保管場所値オブジェクト
 * 食材の保管場所を表現する
 */
export class StorageLocation {
  private readonly type: StorageType
  private readonly detail: string

  constructor(type: StorageType, detail: string = '') {
    this.type = type
    this.detail = detail.trim()
    this.validate()
  }

  /**
   * バリデーション
   * @throws {ValidationException} 無効な値の場合
   */
  private validate(): void {
    if (this.detail.length > 50) {
      throw new ValidationException('保管場所の詳細は50文字以内で入力してください')
    }
  }

  /**
   * 保管場所タイプを取得
   */
  getType(): StorageType {
    return this.type
  }

  /**
   * 保管場所の詳細を取得
   */
  getDetail(): string {
    return this.detail
  }

  /**
   * 値の比較
   */
  equals(other: StorageLocation): boolean {
    return this.type === other.type && this.detail === other.detail
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    const typeLabel = this.getTypeLabel()
    return this.detail ? `${typeLabel}（${this.detail}）` : typeLabel
  }

  /**
   * タイプの表示名を取得
   */
  private getTypeLabel(): string {
    switch (this.type) {
      case StorageType.REFRIGERATED:
        return '冷蔵'
      case StorageType.FROZEN:
        return '冷凍'
      case StorageType.ROOM_TEMPERATURE:
        return '常温'
    }
  }
}
