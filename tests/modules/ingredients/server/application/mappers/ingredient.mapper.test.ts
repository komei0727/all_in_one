import { describe, it, expect } from 'vitest'

import { IngredientMapper } from '@/modules/ingredients/server/application/mappers/ingredient.mapper'
import { Category } from '@/modules/ingredients/server/domain/entities/category.entity'
import { IngredientStock } from '@/modules/ingredients/server/domain/entities/ingredient-stock.entity'
import { Ingredient } from '@/modules/ingredients/server/domain/entities/ingredient.entity'
import { Unit } from '@/modules/ingredients/server/domain/entities/unit.entity'
import {
  IngredientId,
  IngredientName,
  CategoryId,
  UnitId,
  Memo,
  Quantity,
  StorageLocation,
  StorageType,
  Price,
} from '@/modules/ingredients/server/domain/value-objects'

describe('IngredientMapper', () => {
  describe('toDto', () => {
    it('カテゴリーと在庫ありの食材をDTOに変換できる', () => {
      // カテゴリーを作成
      const category = new Category({
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: '野菜',
        displayOrder: 1,
      })

      // 単位を作成
      const unit = new Unit({
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: '個',
        symbol: '個',
      })

      // 食材を作成
      const ingredient = new Ingredient({
        id: new IngredientId('550e8400-e29b-41d4-a716-446655440000'),
        name: new IngredientName('トマト'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440001'),
        memo: new Memo('新鮮なトマト'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      })

      // 在庫を作成
      const stock = new IngredientStock({
        quantity: new Quantity(3),
        unitId: new UnitId('550e8400-e29b-41d4-a716-446655440002'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED, '野菜室'),
        bestBeforeDate: new Date('2024-01-10T00:00:00Z'),
        expiryDate: new Date('2024-01-15T00:00:00Z'),
        purchaseDate: new Date('2024-01-01T00:00:00Z'),
        price: new Price(150),
      })

      ingredient.setStock(stock)

      // DTOに変換
      const dto = IngredientMapper.toDto(ingredient, category, unit)

      // 検証
      expect(dto.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(dto.name).toBe('トマト')
      expect(dto.category).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: '野菜',
      })
      expect(dto.currentStock).toEqual({
        quantity: 3,
        unit: {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: '個',
          symbol: '個',
        },
        storageLocation: {
          type: 'REFRIGERATED',
          detail: '野菜室',
        },
        bestBeforeDate: '2024-01-10',
        expiryDate: '2024-01-15',
        purchaseDate: '2024-01-01',
        price: 150,
        isInStock: true,
      })
      expect(dto.memo).toBe('新鮮なトマト')
      expect(dto.createdAt).toBeDefined()
      expect(dto.updatedAt).toBeDefined()
    })

    it('カテゴリーなしの食材をDTOに変換できる', () => {
      // 食材を作成（カテゴリーなし）
      const ingredient = new Ingredient({
        id: new IngredientId('550e8400-e29b-41d4-a716-446655440000'),
        name: new IngredientName('トマト'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440001'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      })

      // DTOに変換（カテゴリーなし）
      const dto = IngredientMapper.toDto(ingredient)

      // 検証
      expect(dto.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(dto.name).toBe('トマト')
      expect(dto.category).toBeNull()
      expect(dto.currentStock).toBeNull()
      expect(dto.memo).toBeNull()
    })

    it('在庫なしの食材をDTOに変換できる', () => {
      // カテゴリーを作成
      const category = new Category({
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: '野菜',
        displayOrder: 1,
      })

      // 単位を作成
      const unit = new Unit({
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: '個',
        symbol: '個',
      })

      // 食材を作成（在庫なし）
      const ingredient = new Ingredient({
        id: new IngredientId('550e8400-e29b-41d4-a716-446655440000'),
        name: new IngredientName('トマト'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440001'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      })

      // DTOに変換（在庫なし）
      const dto = IngredientMapper.toDto(ingredient, category, unit)

      // 検証
      expect(dto.currentStock).toBeNull()
    })

    it('単位なしで在庫ありの食材をDTOに変換できる', () => {
      // カテゴリーを作成
      const category = new Category({
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: '野菜',
        displayOrder: 1,
      })

      // 食材を作成
      const ingredient = new Ingredient({
        id: new IngredientId('550e8400-e29b-41d4-a716-446655440000'),
        name: new IngredientName('トマト'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440001'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      })

      // 在庫を作成
      const stock = new IngredientStock({
        quantity: new Quantity(3),
        unitId: new UnitId('550e8400-e29b-41d4-a716-446655440002'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
        purchaseDate: new Date('2024-01-01T00:00:00Z'),
        bestBeforeDate: null,
        expiryDate: null,
        price: null,
      })

      ingredient.setStock(stock)

      // DTOに変換（単位なし）
      const dto = IngredientMapper.toDto(ingredient, category)

      // 検証
      expect(dto.currentStock).toBeNull()
    })

    it('日付や価格がnullの在庫をDTOに変換できる', () => {
      // 単位を作成
      const unit = new Unit({
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: '個',
        symbol: '個',
      })

      // 食材を作成
      const ingredient = new Ingredient({
        id: new IngredientId('550e8400-e29b-41d4-a716-446655440000'),
        name: new IngredientName('トマト'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440001'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      })

      // 在庫を作成（日付と価格がnull）
      const stock = new IngredientStock({
        quantity: new Quantity(3),
        unitId: new UnitId('550e8400-e29b-41d4-a716-446655440002'),
        storageLocation: new StorageLocation(StorageType.REFRIGERATED),
        purchaseDate: new Date('2024-01-01T00:00:00Z'),
        bestBeforeDate: null,
        expiryDate: null,
        price: null,
      })

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
      const ingredient = new Ingredient({
        id: new IngredientId('550e8400-e29b-41d4-a716-446655440000'),
        name: new IngredientName('トマト'),
        categoryId: new CategoryId('550e8400-e29b-41d4-a716-446655440001'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        // memoは設定しない
      })

      // DTOに変換
      const dto = IngredientMapper.toDto(ingredient)

      // 検証
      expect(dto.memo).toBeNull()
    })
  })
})
