import { BaseBuilder } from '../base.builder'
import { faker } from '../faker.config'

/**
 * Emailビルダー
 * Email値オブジェクトのテストデータを生成
 */
export class EmailBuilder extends BaseBuilder<{ value: string }> {
  constructor() {
    super()
    // デフォルト値を設定（日本語ロケールでメールアドレス生成）
    this.props.value = faker.internet.email()
  }

  /**
   * 指定したメールアドレスでビルド
   */
  withValue(value: string): this {
    return this.with('value', value)
  }

  /**
   * 固定のテスト用メールアドレスでビルド
   */
  withTestEmail(): this {
    return this.with('value', 'test@example.com')
  }

  /**
   * 指定したドメインでビルド
   */
  withDomain(domain: string): this {
    const localPart = faker.internet.username()
    return this.with('value', `${localPart}@${domain}`)
  }

  /**
   * 日本語名前を使ったメールアドレスでビルド
   */
  withJapaneseName(): this {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const email = `${firstName}.${lastName}@example.com`.toLowerCase()
    return this.with('value', email)
  }

  /**
   * Gmailアドレスでビルド
   */
  withGmail(): this {
    const localPart = faker.internet.username()
    return this.with('value', `${localPart}@gmail.com`)
  }

  build() {
    return {
      value: this.props.value!,
    }
  }
}
