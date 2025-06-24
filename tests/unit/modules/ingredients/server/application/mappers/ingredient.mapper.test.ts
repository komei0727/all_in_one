import { describe, it, expect } from 'vitest'

import { IngredientMapper } from '@/modules/ingredients/server/application/mappers/ingredient.mapper'
import { StorageType, ExpiryInfo } from '@/modules/ingredients/server/domain/value-objects'

import {
  CategoryBuilder,
  UnitBuilder,
  IngredientBuilder,
} from '../../../../../../__fixtures__/builders'

describe('IngredientMapper', () => {
  describe('toDto', () => {
    it('カテゴリーと在庫ありの食材をDTOに変換できる', () => {
      // カテゴリーを作成
      const category = new CategoryBuilder().withName('野菜').build()

      // 単位を作成
      const unit = new UnitBuilder().asPiece().build()

      // 食材を作成（統合後のエンティティに対応）
      // 期限情報を作成
      const futureDate1 = new Date()
      futureDate1.setDate(futureDate1.getDate() + 10)
      const futureDate2 = new Date()
      futureDate2.setDate(futureDate2.getDate() + 5)

      const ingredient = new IngredientBuilder()
        .withName('トマト')
        .withCategoryId(category.getId())
        .withQuantity(3)
        .withUnitId(unit.getId())
        .withStorageLocationDetails(StorageType.REFRIGERATED, '野菜室')
        .withExpiryInfo(
          new ExpiryInfo({
            bestBeforeDate: futureDate1,
            useByDate: futureDate2,
          })
        )
        .withPurchasedToday()
        .withPrice(150)
        .withMemo('新鮮なトマト')
        .build()

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
      expect(dto.currentStock?.useByDate).toBeDefined()
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

    it('削除済みの食材をDTOに変換できる', () => {
      // カテゴリーを作成
      const category = new CategoryBuilder().withName('野菜').build()

      // 単位を作成
      const unit = new UnitBuilder().asPiece().build()

      // 食材を作成して削除
      const ingredient = new IngredientBuilder()
        .withName('トマト')
        .withCategoryId(category.getId())
        .withQuantity(5)
        .withUnitId(unit.getId())
        .build()
      ingredient.delete()

      // DTOに変換
      const dto = IngredientMapper.toDto(ingredient, category, unit)

      // 検証 - 削除済みでも在庫情報は表示される
      expect(dto.currentStock).toBeDefined()
      expect(dto.currentStock?.quantity).toBe(5)
    })

    it('単位情報なしで食材をDTOに変換できる', () => {
      // カテゴリーを作成
      const category = new CategoryBuilder().withName('野菜').build()

      // 単位を作成（単位情報は渡さない）
      const unit = new UnitBuilder().asPiece().build()

      // 食材を作成
      const ingredient = new IngredientBuilder()
        .withName('トマト')
        .withCategoryId(category.getId())
        .withQuantity(3)
        .withUnitId(unit.getId())
        .withStorageLocationDetails(StorageType.REFRIGERATED)
        .withPurchasedToday()
        .withoutPrice()
        .build()

      // DTOに変換（単位情報なし）
      const dto = IngredientMapper.toDto(ingredient, category)

      // 検証 - 単位情報が渡されない場合はundefined
      expect(dto.currentStock?.unit).toBeUndefined()
    })

    it('期限情報や価格がnullの食材をDTOに変換できる', () => {
      // 単位を作成
      const unit = new UnitBuilder().asPiece().build()

      // 食材を作成（期限情報と価格がnull）
      const ingredient = new IngredientBuilder()
        .withName('トマト')
        .withQuantity(3)
        .withUnitId(unit.getId())
        .withStorageLocationDetails(StorageType.REFRIGERATED)
        .withPurchasedToday()
        .withoutPrice()
        .withoutExpiry() // 期限情報をnullに設定
        .build()

      // DTOに変換
      const dto = IngredientMapper.toDto(ingredient, undefined, unit)

      // 検証
      expect(dto.category).toBeNull()
      expect(dto.currentStock).not.toBeNull()
      expect(dto.currentStock?.bestBeforeDate).toBeNull()
      expect(dto.currentStock?.useByDate).toBeNull()
      expect(dto.currentStock?.price).toBeNull()
      expect(dto.currentStock?.storageLocation.detail).toBeNull()
    })

    it('メモなしの食材をDTOに変換できる', () => {
      // 単位を作成
      const unit = new UnitBuilder().asPiece().build()

      // 食材を作成（メモなし）
      const ingredient = new IngredientBuilder()
        .withName('トマト')
        .withQuantity(5)
        .withUnitId(unit.getId())
        .withoutMemo()
        .build()

      // DTOに変換
      const dto = IngredientMapper.toDto(ingredient, undefined, unit)

      // 検証
      expect(dto.memo).toBeNull()
    })
  })
})
