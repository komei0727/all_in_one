import { describe, it, expect } from 'vitest'

import { PaginatedResponse, PaginationParser } from '@/modules/shared/server/api/paginated-response'

describe('PaginatedResponse', () => {
  describe('create', () => {
    it('ページネーション付きレスポンスを正しく作成する', () => {
      // Given: テストデータ
      const data = [
        { id: '1', name: 'アイテム1' },
        { id: '2', name: 'アイテム2' },
      ]
      const page = 1
      const limit = 10
      const total = 2

      // When: ページネーション付きレスポンスを作成
      const result = PaginatedResponse.create(data, page, limit, total)

      // Then: 正しい形式であること
      expect(result).toHaveProperty('data', data)
      expect(result).toHaveProperty('pagination')
      expect(result).toHaveProperty('meta')
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
        nextPage: null,
        prevPage: null,
      })
    })
  })
})

describe('PaginationParser', () => {
  describe('parse', () => {
    it('デフォルト値で正しくパースする', () => {
      // Given: 空のクエリ
      const query = {}

      // When: パースを実行
      const result = PaginationParser.parse(query)

      // Then: デフォルト値が使用されること
      expect(result).toEqual({
        page: 1,
        limit: 20,
      })
    })

    it('文字列の数値を正しくパースする', () => {
      // Given: 文字列形式のクエリ
      const query = {
        page: '3',
        limit: '50',
      }

      // When: パースを実行
      const result = PaginationParser.parse(query)

      // Then: 数値に変換されること
      expect(result).toEqual({
        page: 3,
        limit: 50,
      })
    })

    it('数値を正しくパースする', () => {
      // Given: 数値形式のクエリ
      const query = {
        page: 2,
        limit: 25,
      }

      // When: パースを実行
      const result = PaginationParser.parse(query)

      // Then: そのまま使用されること
      expect(result).toEqual({
        page: 2,
        limit: 25,
      })
    })

    it('不正な値はデフォルト値に置き換える', () => {
      // Given: 不正な値のクエリ
      const query = {
        page: 'invalid',
        limit: 'abc',
      }

      // When: パースを実行
      const result = PaginationParser.parse(query)

      // Then: デフォルト値が使用されること
      expect(result).toEqual({
        page: 1,
        limit: 20,
      })
    })

    it('負の値や0は最小値に置き換える', () => {
      // Given: 負の値や0のクエリ
      const query = {
        page: -1,
        limit: 0,
      }

      // When: パースを実行
      const result = PaginationParser.parse(query, 20, 100)

      // Then: 最小値が使用されること
      // - page: -1 → 1に修正
      // - limit: 0 → parseInt(String(0), 10) = 0, そのためdefaultLimit(20)が使用される
      expect(result).toEqual({
        page: 1,
        limit: 20, // 0の場合はdefaultLimitが使用される
      })
    })

    it('負のlimitは最小値1に置き換える', () => {
      // Given: 負のlimitのクエリ
      const query = {
        page: 1,
        limit: -5,
      }

      // When: パースを実行
      const result = PaginationParser.parse(query, 20, 100)

      // Then: limitが1に修正されること
      expect(result).toEqual({
        page: 1,
        limit: 1, // 負の値は1に修正される
      })
    })

    it('最大値を超える場合は制限値に置き換える', () => {
      // Given: 最大値を超えるクエリ
      const query = {
        page: 1,
        limit: 200,
      }
      const defaultLimit = 20
      const maxLimit = 100

      // When: パースを実行
      const result = PaginationParser.parse(query, defaultLimit, maxLimit)

      // Then: 最大値に制限されること
      expect(result).toEqual({
        page: 1,
        limit: 100,
      })
    })

    it('カスタムデフォルト値が正しく適用される', () => {
      // Given: 空のクエリとカスタムデフォルト値
      const query = {}
      const defaultLimit = 15

      // When: パースを実行
      const result = PaginationParser.parse(query, defaultLimit)

      // Then: カスタムデフォルト値が使用されること
      expect(result).toEqual({
        page: 1,
        limit: 15,
      })
    })
  })

  describe('calculateOffset', () => {
    it('正しいオフセットを計算する', () => {
      // Given: ページとリミット
      const testCases = [
        { page: 1, limit: 10, expected: 0 },
        { page: 2, limit: 10, expected: 10 },
        { page: 3, limit: 25, expected: 50 },
        { page: 1, limit: 1, expected: 0 },
      ]

      testCases.forEach(({ page, limit, expected }) => {
        // When: オフセットを計算
        const result = PaginationParser.calculateOffset(page, limit)

        // Then: 正しい計算結果であること
        expect(result).toBe(expected)
      })
    })
  })
})
