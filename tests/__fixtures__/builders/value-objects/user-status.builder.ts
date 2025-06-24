import { BaseBuilder } from '../base.builder'
import { faker } from '../faker.config'

/**
 * UserStatusビルダー
 * ユーザーステータス値オブジェクトのテストデータを生成
 */
export class UserStatusBuilder extends BaseBuilder<{ status: string }> {
  constructor() {
    super()
    // デフォルトはアクティブ状態
    this.props.status = 'ACTIVE'
  }

  /**
   * 指定したステータスでビルド
   */
  withStatus(status: 'ACTIVE' | 'DEACTIVATED'): this {
    return this.with('status', status)
  }

  /**
   * アクティブ状態でビルド
   */
  withActive(): this {
    return this.with('status', 'ACTIVE')
  }

  /**
   * 無効化状態でビルド
   */
  withDeactivated(): this {
    return this.with('status', 'DEACTIVATED')
  }

  /**
   * ランダムなステータスでビルド
   */
  withRandomStatus(): this {
    const status = faker.helpers.arrayElement(['ACTIVE', 'DEACTIVATED'])
    return this.with('status', status)
  }

  build() {
    return {
      status: this.props.status!
    }
  }
}