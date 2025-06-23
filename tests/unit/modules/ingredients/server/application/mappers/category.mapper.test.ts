import { describe, it, expect } from 'vitest'

import { CategoryMapper } from '@/modules/ingredients/server/application/mappers/category.mapper'
import { Category } from '@/modules/ingredients/server/domain/entities/category.entity'

/**
 * CategoryMapper のテスト
 *
 * テスト対象:
 * - ドメインエンティティからDTOへの変換
 * - 複数のエンティティからリストDTOへの変換
 */
describe('CategoryMapper', () => {
  // テスト用のカテゴリーエンティティを作成
  const createTestCategory = (id: string, name: string, order: number): Category => {
    return new Category({
      id,
      name,
      displayOrder: order,
    })
  }

  describe('toDTO', () => {
    it('エンティティからDTOに正しく変換できる', () => {
      // テストデータ
      const category = createTestCategory('cat-001', '野菜', 1)

      // 実行
      const dto = CategoryMapper.toDTO(category)

      // 検証
      expect(dto.id).toBe('cat-001')
      expect(dto.name).toBe('野菜')
      expect(dto.displayOrder).toBe(1)
    })

    it('日本語の名前を持つカテゴリーも正しく変換できる', () => {
      // テストデータ
      const category = createTestCategory('cat-002', '肉・魚介類', 2)

      // 実行
      const dto = CategoryMapper.toDTO(category)

      // 検証
      expect(dto.id).toBe('cat-002')
      expect(dto.name).toBe('肉・魚介類')
      expect(dto.displayOrder).toBe(2)
    })
  })

  describe('toListDTO', () => {
    it('複数のエンティティからリストDTOに変換できる', () => {
      // テストデータ
      const categories = [
        createTestCategory('cat-001', '野菜', 1),
        createTestCategory('cat-002', '肉・魚介類', 2),
        createTestCategory('cat-003', '調味料', 3),
      ]

      // 実行
      const listDto = CategoryMapper.toListDTO(categories)

      // 検証
      expect(listDto.categories).toHaveLength(3)
      expect(listDto.categories[0].id).toBe('cat-001')
      expect(listDto.categories[0].name).toBe('野菜')
      expect(listDto.categories[0].displayOrder).toBe(1)
      expect(listDto.categories[1].id).toBe('cat-002')
      expect(listDto.categories[1].name).toBe('肉・魚介類')
      expect(listDto.categories[1].displayOrder).toBe(2)
      expect(listDto.categories[2].id).toBe('cat-003')
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
        createTestCategory('cat-001', '野菜', 1),
        createTestCategory('cat-002', '肉・魚介類', 2),
      ]

      // 実行
      const listDto = CategoryMapper.toListDTO(categories)
      const json = listDto.toJSON()

      // 検証
      expect(json).toEqual({
        categories: [
          { id: 'cat-001', name: '野菜', displayOrder: 1 },
          { id: 'cat-002', name: '肉・魚介類', displayOrder: 2 },
        ],
      })
    })
  })
})
