import { describe, it, expect } from 'vitest'

import { IngredientMapper } from '@/modules/ingredients/server/application/mappers/ingredient.mapper'

import {
  CategoryBuilder,
  UnitBuilder,
  IngredientBuilder,
} from '../../../../../../__fixtures__/builders'

describe('IngredientMapper', () => {
  describe('toDto', () => {
    it('カテゴリーと単位ありの食材をDTOに変換できる', () => {
      // カテゴリーを作成
      const category = new CategoryBuilder().withName('野菜').build()

      // 単位を作成
      const unit = new UnitBuilder().asPiece().build()

      // 食材を作成
      const ingredient = new IngredientBuilder()
        .withUserId('user-123')
        .withName('トマト')
        .withCategoryId(category.id.getValue())
        .withMemo('新鮮なトマト')
        .withPrice(150)
        .withPurchasedToday()
        .withRefrigeratedStock(3, unit.id.getValue(), '野菜室')
        .withFutureBestBeforeDate(10)
        .build()

      // DTOに変換
      const dto = IngredientMapper.toDto(ingredient, category, unit)

      // 検証
      expect(dto.id).toBe(ingredient.getId().getValue())
      expect(dto.userId).toBe('user-123')
      expect(dto.name).toBe('トマト')
      expect(dto.category).toEqual({
        id: category.id.getValue(),
        name: '野菜',
      })
      expect(dto.price).toBe(150)
      expect(dto.purchaseDate).toBeDefined()
      expect(dto.expiryInfo).toBeDefined()
      expect(dto.expiryInfo?.bestBeforeDate).toBeDefined()
      expect(dto.stock).toBeDefined()
      expect(dto.stock.quantity).toBe(3)
      expect(dto.stock.unit).toEqual({
        id: unit.id.getValue(),
        name: unit.name.getValue(),
        symbol: unit.symbol.getValue(),
      })
      expect(dto.stock.storageLocation).toEqual({
        type: 'REFRIGERATED',
        detail: '野菜室',
      })
      expect(dto.memo).toBe('新鮮なトマト')
      expect(dto.createdAt).toBeDefined()
      expect(dto.updatedAt).toBeDefined()
    })

    it('カテゴリーなしの食材をDTOに変換できる', () => {
      // 食材を作成（カテゴリーなし）
      const ingredient = new IngredientBuilder()
        .withUserId('user-123')
        .withName('トマト')
        .withoutMemo()
        .build()

      // DTOに変換（カテゴリーなし）
      const dto = IngredientMapper.toDto(ingredient)

      // 検証
      expect(dto.id).toBe(ingredient.getId().getValue())
      expect(dto.userId).toBe('user-123')
      expect(dto.name).toBe('トマト')
      expect(dto.category).toBeNull()
      expect(dto.stock).toBeDefined() // 在庫情報は必須
      expect(dto.memo).toBeNull()
    })

    it('単位情報なしでDTOに変換できる', () => {
      // カテゴリーを作成
      const category = new CategoryBuilder().withName('野菜').build()

      // 食材を作成
      const ingredient = new IngredientBuilder()
        .withUserId('user-123')
        .withName('トマト')
        .withCategoryId(category.id.getValue())
        .build()

      // DTOに変換（単位情報なし）
      const dto = IngredientMapper.toDto(ingredient, category)

      // 検証
      expect(dto.stock).toBeDefined()
      expect(dto.stock.unit.name).toBe('') // 単位情報がない場合は空文字
      expect(dto.stock.unit.symbol).toBe('')
    })

    it('価格や期限情報がnullの食材をDTOに変換できる', () => {
      // 単位を作成
      const unit = new UnitBuilder().asPiece().build()

      // 食材を作成（価格や期限情報なし）
      const ingredient = new IngredientBuilder()
        .withUserId('user-123')
        .withName('トマト')
        .withoutPrice()
        .withoutExpiryInfo()
        .build()

      // DTOに変換
      const dto = IngredientMapper.toDto(ingredient, undefined, unit)

      // 検証
      expect(dto.category).toBeNull()
      expect(dto.price).toBeNull()
      expect(dto.expiryInfo).toBeNull()
      expect(dto.stock).toBeDefined()
      expect(dto.stock.storageLocation.detail).toBeNull()
    })

    it('メモなしの食材をDTOに変換できる', () => {
      // 食材を作成（メモなし）
      const ingredient = new IngredientBuilder()
        .withUserId('user-123')
        .withName('トマト')
        .withoutMemo()
        .build()

      // DTOに変換
      const dto = IngredientMapper.toDto(ingredient)

      // 検証
      expect(dto.memo).toBeNull()
    })
  })
})
