import { describe, it, expect } from 'vitest'

import { CategoryMapper } from '@/modules/ingredients/server/application/mappers/category.mapper'
import { type Category } from '@/modules/ingredients/server/domain/entities/category.entity'

import { CategoryBuilder } from '../../../../../../__fixtures__/builders'

/**
 * CategoryMapper のテスト
 *
 * テスト対象:
 * - ドメインエンティティからDTOへの変換
 * - 複数のエンティティからリストDTOへの変換
 */
describe('CategoryMapper', () => {
  describe('toDTO', () => {
    it('エンティティからDTOに正しく変換できる', () => {
      // テストデータ
      const category = new CategoryBuilder().build()

      // 実行
      const dto = CategoryMapper.toDTO(category)

      // 検証
      expect(dto.id).toBe(category.getId())
      expect(dto.name).toBe(category.getName())
      expect(dto.displayOrder).toBe(category.getDisplayOrder())
    })

    it('日本語の名前を持つカテゴリーも正しく変換できる', () => {
      // テストデータ
      const category = new CategoryBuilder().withName('肉・魚介類').withDisplayOrder(2).build()

      // 実行
      const dto = CategoryMapper.toDTO(category)

      // 検証
      expect(dto.id).toBe(category.getId())
      expect(dto.name).toBe('肉・魚介類')
      expect(dto.displayOrder).toBe(2)
    })
  })

  describe('toListDTO', () => {
    it('複数のエンティティからリストDTOに変換できる', () => {
      // テストデータ
      const categories = [
        new CategoryBuilder().withName('野菜').withDisplayOrder(1).build(),
        new CategoryBuilder().withName('肉・魚介類').withDisplayOrder(2).build(),
        new CategoryBuilder().withName('調味料').withDisplayOrder(3).build(),
      ]

      // 実行
      const listDto = CategoryMapper.toListDTO(categories)

      // 検証
      expect(listDto.categories).toHaveLength(3)
      expect(listDto.categories[0].id).toBe(categories[0].getId())
      expect(listDto.categories[0].name).toBe('野菜')
      expect(listDto.categories[0].displayOrder).toBe(1)
      expect(listDto.categories[1].id).toBe(categories[1].getId())
      expect(listDto.categories[1].name).toBe('肉・魚介類')
      expect(listDto.categories[1].displayOrder).toBe(2)
      expect(listDto.categories[2].id).toBe(categories[2].getId())
      expect(listDto.categories[2].name).toBe('調味料')
      expect(listDto.categories[2].displayOrder).toBe(3)
    })

    it('空の配列からも正しくリストDTOに変換できる', () => {
      // テストデータ
      const categories: Category[] = []

      // 実行
      const listDto = CategoryMapper.toListDTO(categories)

      // 検証
      expect(listDto.categories).toHaveLength(0)
    })

    it('toJSONメソッドが正しいフォーマットを返す', () => {
      // テストデータ
      const categories = [
        new CategoryBuilder().withName('野菜').withDisplayOrder(1).build(),
        new CategoryBuilder().withName('肉・魚介類').withDisplayOrder(2).build(),
      ]

      // 実行
      const listDto = CategoryMapper.toListDTO(categories)
      const json = listDto.toJSON()

      // 検証
      expect(json).toEqual({
        categories: [
          { id: categories[0].getId(), name: '野菜', displayOrder: 1 },
          { id: categories[1].getId(), name: '肉・魚介類', displayOrder: 2 },
        ],
      })
    })
  })
})
