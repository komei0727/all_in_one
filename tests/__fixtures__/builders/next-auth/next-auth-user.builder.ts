import { BaseBuilder } from '../base.builder'
import { faker, testDataHelpers } from '../faker.config'

interface NextAuthUserProps {
  id: string
  email: string
  emailVerified: Date | null
  name: string | null
  image: string | null
  createdAt: Date
  updatedAt: Date
}

interface NextAuthUser extends NextAuthUserProps {
  domainUserId?: string
}

/**
 * NextAuthUserビルダー
 * NextAuth標準のUserテーブルのテストデータを生成
 */
export class NextAuthUserBuilder extends BaseBuilder<NextAuthUserProps, NextAuthUser> {
  constructor() {
    super()

    const now = new Date()

    // NextAuth標準フォーマットでデフォルト値を設定
    this.props = {
      id: testDataHelpers.cuid(), // NextAuthはCUID使用
      email: faker.internet.email(),
      emailVerified: faker.date.recent({ days: 30 }),
      name: faker.person.fullName(),
      image: null, // マジックリンク認証では基本的にnull
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: now,
    }
  }

  /**
   * NextAuth IDを指定
   */
  withId(id: string): this {
    return this.with('id', id)
  }

  /**
   * メールアドレスを指定
   */
  withEmail(email: string): this {
    return this.with('email', email)
  }

  /**
   * メール認証済み状態でビルド
   */
  withEmailVerified(verifiedAt?: Date): this {
    return this.with('emailVerified', verifiedAt || new Date())
  }

  /**
   * メール未認証状態でビルド
   */
  withEmailUnverified(): this {
    return this.with('emailVerified', null)
  }

  /**
   * 表示名を指定
   */
  withName(name: string | null): this {
    return this.with('name', name)
  }

  /**
   * 日本語名でビルド
   */
  withJapaneseName(): this {
    const lastName = faker.person.lastName()
    const firstName = faker.person.firstName()
    return this.with('name', `${lastName} ${firstName}`)
  }

  /**
   * プロフィール画像URLを指定
   */
  withImage(imageUrl: string | null): this {
    return this.with('image', imageUrl)
  }

  /**
   * ランダムなアバター画像でビルド
   */
  withRandomAvatar(): this {
    return this.with('image', faker.image.avatar())
  }

  /**
   * 作成日時を指定
   */
  withCreatedAt(createdAt: Date): this {
    return this.with('createdAt', createdAt)
  }

  /**
   * 更新日時を指定
   */
  withUpdatedAt(updatedAt: Date): this {
    return this.with('updatedAt', updatedAt)
  }

  /**
   * 新規作成ユーザーでビルド（初回認証）
   */
  withNewUser(): this {
    const now = new Date()
    return this.withCreatedAt(now)
      .withUpdatedAt(now)
      .withEmailVerified(now)
      .withName(null) // 初回作成時は名前なし
      .withImage(null)
  }

  /**
   * テスト用固定ユーザーでビルド
   */
  withTestUser(): this {
    return this.withId('clxxxx1234test')
      .withEmail('test@example.com')
      .withJapaneseName()
      .withEmailVerified()
  }

  /**
   * 特定のメールドメインでビルド
   */
  withEmailDomain(domain: string): this {
    const localPart = faker.internet.username()
    return this.with('email', `${localPart}@${domain}`)
  }

  /**
   * Gmail アカウントでビルド
   */
  withGmail(): this {
    return this.withEmailDomain('gmail.com')
  }

  build(): NextAuthUser {
    return {
      id: this.props.id!,
      email: this.props.email!,
      emailVerified: this.props.emailVerified ?? null,
      name: this.props.name ?? null,
      image: this.props.image ?? null,
      createdAt: this.props.createdAt!,
      updatedAt: this.props.updatedAt!,
      domainUserId: testDataHelpers.userId(), // ドメインユーザーIDを自動生成
    }
  }
}
