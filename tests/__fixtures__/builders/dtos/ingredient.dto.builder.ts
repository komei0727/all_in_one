import { IngredientDto } from '@/modules/ingredients/server/application/dtos/ingredient.dto'

import { BaseBuilder } from '../base.builder'
import { testDataHelpers, faker } from '../faker.config'

interface IngredientDtoProps {
  id: string
  userId: string
  name: string
  category: {
    id: string
    name: string
  } | null
  price: number | null
  purchaseDate: string
  expiryInfo: {
    bestBeforeDate: string | null
    useByDate: string | null
  } | null
  stock: {
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
  }
  memo: string | null
  createdAt: string
  updatedAt: string
}

/**
 * IngredientDto のテストデータビルダー
 */
export class IngredientDtoBuilder extends BaseBuilder<IngredientDtoProps, IngredientDto> {
  protected declare props: IngredientDtoProps // 型アサーションを使用

  constructor() {
    super()
    const now = new Date()
    const purchaseDate = faker.date.recent({ days: 7 })
    const expiryDate = faker.date.future({ years: 0.1, refDate: purchaseDate })

    // デフォルト値を設定
    this.props = {
      id: faker.string.uuid(),
      userId: testDataHelpers.userId(),
      name: testDataHelpers.ingredientName(),
      category: {
        id: testDataHelpers.categoryId(),
        name: testDataHelpers.categoryName(),
      },
      price: faker.number.int({ min: 50, max: 1000 }),
      purchaseDate: purchaseDate.toISOString(),
      expiryInfo: {
        bestBeforeDate: expiryDate.toISOString(),
        useByDate: null,
      },
      stock: {
        quantity: faker.number.float({ min: 1, max: 10, fractionDigits: 2 }),
        unit: {
          id: testDataHelpers.unitId(),
          name: testDataHelpers.unitName(),
          symbol: testDataHelpers.unitSymbol(),
        },
        storageLocation: {
          type: faker.helpers.arrayElement(['ROOM_TEMPERATURE', 'REFRIGERATED', 'FROZEN']),
          detail: null,
        },
        threshold: faker.number.float({ min: 0.5, max: 5, fractionDigits: 1 }),
      },
      memo: faker.datatype.boolean() ? faker.lorem.sentence() : null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
  }

  /**
   * IDを設定
   */
  withId(id: string): this {
    this.props.id = id
    return this
  }

  /**
   * ユーザーIDを設定
   */
  withUserId(userId: string): this {
    this.props.userId = userId
    return this
  }

  /**
   * 名前を設定
   */
  withName(name: string): this {
    this.props.name = name
    return this
  }

  /**
   * カテゴリーを設定
   */
  withCategory(category: { id: string; name: string } | null): this {
    this.props.category = category
    return this
  }

  /**
   * 価格を設定
   */
  withPrice(price: number | null): this {
    this.props.price = price
    return this
  }

  /**
   * 購入日を設定
   */
  withPurchaseDate(purchaseDate: Date | string): this {
    this.props.purchaseDate =
      typeof purchaseDate === 'string' ? purchaseDate : purchaseDate.toISOString()
    return this
  }

  /**
   * 期限情報を設定
   */
  withExpiryInfo(
    expiryInfo: { bestBeforeDate: string | null; useByDate: string | null } | null
  ): this {
    this.props.expiryInfo = expiryInfo
    return this
  }

  /**
   * 在庫情報を設定
   */
  withStock(stock: IngredientDtoProps['stock']): this {
    this.props.stock = stock
    return this
  }

  /**
   * メモを設定
   */
  withMemo(memo: string | null): this {
    this.props.memo = memo
    return this
  }

  /**
   * 作成日時を設定
   */
  withCreatedAt(createdAt: Date | string): this {
    this.props.createdAt = typeof createdAt === 'string' ? createdAt : createdAt.toISOString()
    return this
  }

  /**
   * 更新日時を設定
   */
  withUpdatedAt(updatedAt: Date | string): this {
    this.props.updatedAt = typeof updatedAt === 'string' ? updatedAt : updatedAt.toISOString()
    return this
  }

  /**
   * IngredientDto を生成
   */
  build(): IngredientDto {
    return new IngredientDto(
      this.props.id,
      this.props.userId,
      this.props.name,
      this.props.category,
      this.props.price,
      this.props.purchaseDate,
      this.props.expiryInfo,
      this.props.stock,
      this.props.memo,
      this.props.createdAt,
      this.props.updatedAt
    )
  }
}

export const anIngredientDto = () => new IngredientDtoBuilder()
