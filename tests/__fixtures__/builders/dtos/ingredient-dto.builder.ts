import { faker } from '@faker-js/faker'

import { IngredientDto } from '@/modules/ingredients/server/application/dtos/ingredient.dto'

/**
 * IngredientDtoのテストデータビルダー
 */
export class IngredientDtoBuilder {
  private id: string = faker.string.uuid()
  private userId: string = faker.string.uuid()
  private name: string = faker.commerce.productName()
  private categoryId: string = `cat${faker.number.int({ min: 1, max: 10 })}`
  private categoryName: string = faker.commerce.department()
  private memo: string | null = faker.helpers.maybe(() => faker.lorem.sentence()) ?? null
  private price: number | null =
    faker.helpers.maybe(() => faker.number.int({ min: 100, max: 10000 })) ?? null
  private purchaseDate: string | null =
    faker.helpers.maybe(() => faker.date.recent().toISOString()) ?? null
  private expiryInfo: {
    bestBeforeDate: string | null
    useByDate: string | null
    status: 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED'
  } | null =
    faker.helpers.maybe(() => ({
      bestBeforeDate: faker.helpers.maybe(() => faker.date.future().toISOString()) ?? null,
      useByDate: faker.helpers.maybe(() => faker.date.future().toISOString()) ?? null,
      status: faker.helpers.arrayElement(['FRESH', 'EXPIRING_SOON', 'EXPIRED']),
    })) ?? null
  private stock: {
    quantity: number
    unit: {
      id: string
      name: string
      symbol: string
    }
    storageLocation: {
      type: string
      detail: string | null
    }
    threshold: number | null
  } = {
    quantity: faker.number.float({ min: 0, max: 100 }),
    unit: {
      id: `unit${faker.number.int({ min: 1, max: 5 })}`,
      name: faker.helpers.arrayElement(['個', 'グラム', 'ミリリットル', '本', '袋']),
      symbol: faker.helpers.arrayElement(['個', 'g', 'ml', '本', '袋']),
    },
    storageLocation: {
      type: faker.helpers.arrayElement(['REFRIGERATOR', 'FREEZER', 'PANTRY', 'COUNTER']),
      detail: faker.helpers.maybe(() => faker.lorem.word()) ?? null,
    },
    threshold: faker.helpers.maybe(() => faker.number.float({ min: 0.1, max: 10 })) ?? null,
  }
  private createdAt: string = faker.date.past().toISOString()
  private updatedAt: string = faker.date.recent().toISOString()

  withId(id: string): this {
    this.id = id
    return this
  }

  withUserId(userId: string): this {
    this.userId = userId
    return this
  }

  withName(name: string): this {
    this.name = name
    return this
  }

  withCategoryId(categoryId: string): this {
    this.categoryId = categoryId
    return this
  }

  withCategoryName(categoryName: string): this {
    this.categoryName = categoryName
    return this
  }

  withMemo(memo: string | null): this {
    this.memo = memo
    return this
  }

  withPrice(price: number | null): this {
    this.price = price
    return this
  }

  withPurchaseDate(purchaseDate: string | null): this {
    this.purchaseDate = purchaseDate
    return this
  }

  withExpiryInfo(
    expiryInfo: {
      bestBeforeDate: string | null
      useByDate: string | null
      status: 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED'
    } | null
  ): this {
    this.expiryInfo = expiryInfo
    return this
  }

  withStock(stock: {
    quantity: number
    unit: {
      id: string
      name: string
      symbol: string
    }
    storageLocation: {
      type: string
      detail: string | null
    }
    threshold: number | null
  }): this {
    this.stock = stock
    return this
  }

  withCreatedAt(createdAt: string): this {
    this.createdAt = createdAt
    return this
  }

  withUpdatedAt(updatedAt: string): this {
    this.updatedAt = updatedAt
    return this
  }

  build(): IngredientDto {
    return new IngredientDto(
      this.id,
      this.userId,
      this.name,
      {
        id: this.categoryId,
        name: this.categoryName,
      },
      this.price,
      this.purchaseDate ?? '',
      this.expiryInfo,
      this.stock,
      this.memo,
      this.createdAt,
      this.updatedAt
    )
  }
}

/**
 * IngredientDtoビルダーのファクトリー関数
 */
export const ingredientDtoBuilder = () => new IngredientDtoBuilder()
