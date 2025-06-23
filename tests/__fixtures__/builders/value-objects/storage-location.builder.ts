import { StorageLocation, StorageType } from '@/modules/ingredients/server/domain/value-objects'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers } from '../faker.config'

interface StorageLocationProps {
  type: StorageType
  detail?: string
}

/**
 * StorageLocation値オブジェクトのテストデータビルダー
 */
export class StorageLocationBuilder extends BaseBuilder<StorageLocationProps, StorageLocation> {
  constructor() {
    super()
    // デフォルト値を設定
    this.props = {
      type: StorageType.REFRIGERATED,
      detail: undefined,
    }
  }

  /**
   * 保存タイプを設定
   */
  withType(type: StorageType): this {
    return this.with('type', type)
  }

  /**
   * 保存詳細を設定
   */
  withDetail(detail?: string): this {
    return this.with('detail', detail)
  }

  /**
   * ランダムな保存場所を設定
   */
  withRandomLocation(): this {
    const location = testDataHelpers.storageLocation()
    // マッピングテーブルを使用してStorageTypeを決定
    const typeMap: Record<string, StorageType> = {
      冷蔵庫: StorageType.REFRIGERATED,
      冷凍庫: StorageType.FROZEN,
      野菜室: StorageType.REFRIGERATED,
      パントリー: StorageType.ROOM_TEMPERATURE,
      調味料棚: StorageType.ROOM_TEMPERATURE,
      その他: StorageType.ROOM_TEMPERATURE,
    }
    return this.with('type', typeMap[location] || StorageType.ROOM_TEMPERATURE).with(
      'detail',
      location
    )
  }

  /**
   * 冷蔵庫を設定
   */
  withRefrigerator(): this {
    return this.with('type', StorageType.REFRIGERATED).with('detail', '冷蔵庫')
  }

  /**
   * 冷凍庫を設定
   */
  withFreezer(): this {
    return this.with('type', StorageType.FROZEN).with('detail', '冷凍庫')
  }

  /**
   * 野菜室を設定
   */
  withVegetableCompartment(): this {
    return this.with('type', StorageType.REFRIGERATED).with('detail', '野菜室')
  }

  /**
   * パントリーを設定
   */
  withPantry(): this {
    return this.with('type', StorageType.ROOM_TEMPERATURE).with('detail', 'パントリー')
  }

  /**
   * 常温保管を設定
   */
  withRoomTemperature(): this {
    return this.with('type', StorageType.ROOM_TEMPERATURE)
  }

  /**
   * 詳細に空白を含む文字列を設定
   */
  withDetailWithSpaces(): this {
    const detail = testDataHelpers.storageLocation()
    return this.with('detail', `  ${detail}  `)
  }

  /**
   * 最大長の詳細を設定
   */
  withMaxLengthDetail(): this {
    return this.with('detail', 'あ'.repeat(50))
  }

  /**
   * 最大長を超える詳細を設定（エラーケース用）
   */
  withTooLongDetail(): this {
    return this.with('detail', 'あ'.repeat(51))
  }

  build(): StorageLocation {
    return new StorageLocation(this.props.type!, this.props.detail)
  }
}
