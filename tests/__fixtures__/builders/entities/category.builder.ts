import { Category } from '@/modules/ingredients/server/domain/entities/category.entity'

import { BaseBuilder } from '../base.builder'
import { faker, testDataHelpers } from '../faker.config'

interface CategoryProps {
  id: string
  name: string
  description?: string | null
  displayOrder: number
}

/**
 * Category エンティティのテストデータビルダー
 */
export class CategoryBuilder extends BaseBuilder<CategoryProps, Category> {
  constructor() {
    super()
    // デフォルト値を設定
    this.props = {
      id: testDataHelpers.cuid(),
      name: testDataHelpers.categoryName(),
      description: null, // デフォルトはnull
      displayOrder: faker.number.int({ min: 1, max: 999 }),
    }
  }

  /**
   * IDを設定
   */
  withId(id: string): this {
    return this.with('id', id)
  }

  /**
   * 新規生成されたIDを設定
   */
  withGeneratedId(): this {
    return this.with('id', testDataHelpers.cuid())
  }

  /**
   * カテゴリー名を設定
   */
  withName(name: string): this {
    return this.with('name', name)
  }

  /**
   * ランダムなカテゴリー名を設定
   */
  withRandomName(): this {
    return this.with('name', testDataHelpers.categoryName())
  }

  /**
   * 説明を設定
   */
  withDescription(description: string | null): this {
    return this.with('description', description)
  }

  /**
   * ランダムな説明を設定
   */
  withRandomDescription(): this {
    const description = faker.lorem.sentence({ min: 5, max: 15 })
    return this.with(
      'description',
      description.length <= 100 ? description : description.substring(0, 100)
    )
  }

  /**
   * 表示順を設定
   */
  withDisplayOrder(order: number): this {
    return this.with('displayOrder', order)
  }

  /**
   * ランダムな表示順を設定
   */
  withRandomDisplayOrder(): this {
    return this.with('displayOrder', faker.number.int({ min: 1, max: 999 }))
  }

  /**
   * 野菜カテゴリーとして設定
   */
  asVegetable(): this {
    return this.withName('野菜').withDisplayOrder(1)
  }

  /**
   * 肉・魚カテゴリーとして設定
   */
  asMeatAndFish(): this {
    return this.withName('肉・魚').withDisplayOrder(2)
  }

  /**
   * 乳製品カテゴリーとして設定
   */
  asDairy(): this {
    return this.withName('乳製品').withDisplayOrder(3)
  }

  build(): Category {
    return new Category(this.props as CategoryProps)
  }
}

/**
 * 既存のファクトリー関数との互換性を保つためのヘルパー関数
 */
export const createTestCategory = (
  overrides?: Partial<{
    id: string
    name: string
    description: string | null
    displayOrder: number
  }>
): Category => {
  const builder = new CategoryBuilder()

  if (overrides?.id) {
    builder.withId(overrides.id)
  }
  if (overrides?.name) {
    builder.withName(overrides.name)
  }
  if (overrides?.description !== undefined) {
    builder.withDescription(overrides.description)
  }
  if (overrides?.displayOrder !== undefined) {
    builder.withDisplayOrder(overrides.displayOrder)
  }

  return builder.build()
}
