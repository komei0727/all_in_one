import { describe, it, expect } from 'vitest'

import { IngredientMapper } from '@/modules/ingredients/server/application/mappers/ingredient.mapper'

import {
  CategoryBuilder,
  UnitBuilder,
  IngredientBuilder,
  IngredientStockBuilder,
} from '../../../../../../__fixtures__/builders'

describe('IngredientMapper', () => {
  describe('toDto', () => {
    it('カテゴリーと在庫ありの食材をDTOに変換できる', () => {
      // カテゴリーを作成
      const category = new CategoryBuilder().withName('野菜').build()

      // 単位を作成
      const unit = new UnitBuilder().asPiece().build()

      // 食材を作成
      const ingredient = new IngredientBuilder()
        .withName('トマト')
        .withCategoryId(category.getId())
        .withMemo('新鮮なトマト')
        .build()

      // 在庫を作成
      const stock = new IngredientStockBuilder()
        .withQuantity(3)
        .withUnitId(unit.getId())
        .withRefrigeratedStorage('野菜室')
        .withFutureBestBeforeDate(10)
        .withFutureExpiryDate(15)
        .withPurchasedToday()
        .withPrice(150)
        .build()

      ingredient.setStock(stock)

      // DTOに変換
      const dto = IngredientMapper.toDto(ingredient, category, unit)

      // 検証
      expect(dto.id).toBe(ingredient.getId().getValue())
      expect(dto.name).toBe('トマト')
      expect(dto.category).toEqual({
        id: category.getId(),
        name: '野菜',
      })
      expect(dto.currentStock).toBeDefined()
      expect(dto.currentStock?.quantity).toBe(3)
      expect(dto.currentStock?.unit).toEqual({
        id: unit.getId(),
        name: unit.getName(),
        symbol: unit.getSymbol(),
      })
      expect(dto.currentStock?.storageLocation).toEqual({
        type: 'REFRIGERATED',
        detail: '野菜室',
      })
      expect(dto.currentStock?.bestBeforeDate).toBeDefined()
      expect(dto.currentStock?.expiryDate).toBeDefined()
      expect(dto.currentStock?.purchaseDate).toBeDefined()
      expect(dto.currentStock?.price).toBe(150)
      expect(dto.currentStock?.isInStock).toBe(true)
      expect(dto.memo).toBe('新鮮なトマト')
      expect(dto.createdAt).toBeDefined()
      expect(dto.updatedAt).toBeDefined()
    })

    it('カテゴリーなしの食材をDTOに変換できる', () => {
      // 食材を作成（カテゴリーなし）
      const ingredient = new IngredientBuilder().withName('トマト').withoutMemo().build()

      // DTOに変換（カテゴリーなし）
      const dto = IngredientMapper.toDto(ingredient)

      // 検証
      expect(dto.id).toBe(ingredient.getId().getValue())
      expect(dto.name).toBe('トマト')
      expect(dto.category).toBeNull()
      expect(dto.currentStock).toBeNull()
      expect(dto.memo).toBeNull()
    })

    it('在庫なしの食材をDTOに変換できる', () => {
      // カテゴリーを作成
      const category = new CategoryBuilder().withName('野菜').build()

      // 単位を作成
      const unit = new UnitBuilder().asPiece().build()

      // 食材を作成（在庫なし）
      const ingredient = new IngredientBuilder()
        .withName('トマト')
        .withCategoryId(category.getId())
        .build()

      // DTOに変換（在庫なし）
      const dto = IngredientMapper.toDto(ingredient, category, unit)

      // 検証
      expect(dto.currentStock).toBeNull()
    })

    it('単位なしで在庫ありの食材をDTOに変換できる', () => {
      // カテゴリーを作成
      const category = new CategoryBuilder().withName('野菜').build()

      // 食材を作成
      const ingredient = new IngredientBuilder()
        .withName('トマト')
        .withCategoryId(category.getId())
        .build()

      // 在庫を作成
      const stock = new IngredientStockBuilder()
        .withQuantity(3)
        .withRefrigeratedStorage()
        .withPurchasedToday()
        .withoutPrice()
        .withBestBeforeDate(null)
        .withExpiryDate(null)
        .build()

      ingredient.setStock(stock)

      // DTOに変換（単位なし）
      const dto = IngredientMapper.toDto(ingredient, category)

      // 検証
      expect(dto.currentStock).toBeNull()
    })

    it('日付や価格がnullの在庫をDTOに変換できる', () => {
      // 単位を作成
      const unit = new UnitBuilder().asPiece().build()

      // 食材を作成
      const ingredient = new IngredientBuilder().withName('トマト').build()

      // 在庫を作成（日付と価格がnull）
      const stock = new IngredientStockBuilder()
        .withQuantity(3)
        .withUnitId(unit.getId())
        .withRefrigeratedStorage()
        .withPurchasedToday()
        .withBestBeforeDate(null)
        .withExpiryDate(null)
        .withoutPrice()
        .build()

      ingredient.setStock(stock)

      // DTOに変換
      const dto = IngredientMapper.toDto(ingredient, undefined, unit)

      // 検証
      expect(dto.category).toBeNull()
      expect(dto.currentStock).not.toBeNull()
      expect(dto.currentStock?.bestBeforeDate).toBeNull()
      expect(dto.currentStock?.expiryDate).toBeNull()
      expect(dto.currentStock?.price).toBeNull()
      expect(dto.currentStock?.storageLocation.detail).toBeNull()
    })

    it('メモなしの食材をDTOに変換できる', () => {
      // 食材を作成（メモなし）
      const ingredient = new IngredientBuilder().withName('トマト').withoutMemo().build()

      // DTOに変換
      const dto = IngredientMapper.toDto(ingredient)

      // 検証
      expect(dto.memo).toBeNull()
    })
  })
})
