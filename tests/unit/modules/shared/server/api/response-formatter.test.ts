import { describe, it, expect, beforeEach, vi } from 'vitest'

import { ResponseFormatter } from '@/modules/shared/server/api/response-formatter'

// モック: fs.readFileSync
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    readFileSync: vi.fn(() => JSON.stringify({ version: '1.0.0-test' })),
  }
})

// モック: process.cwd
vi.mock('process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('process')>()
  return {
    ...actual,
    cwd: vi.fn(() => '/test/project'),
  }
})

describe('ResponseFormatter', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks()
  })

  describe('success', () => {
    it('データのみの場合、正しいレスポンス形式を生成する', () => {
      // Given: テストデータ
      const testData = { id: '1', name: 'テスト' }

      // When: 成功レスポンスを生成
      const result = ResponseFormatter.success(testData)

      // Then: 正しい形式であること
      expect(result).toHaveProperty('data', testData)
      expect(result).toHaveProperty('meta')
      expect(result.meta).toHaveProperty('timestamp')
      expect(result.meta).toHaveProperty('version')
      expect(typeof result.meta.timestamp).toBe('string')
      expect(typeof result.meta.version).toBe('string')
    })

    it('ページネーション情報が含まれる場合、正しいレスポンス形式を生成する', () => {
      // Given: テストデータとページネーション情報
      const testData = [
        { id: '1', name: 'テスト1' },
        { id: '2', name: 'テスト2' },
      ]
      const pagination = {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
        nextPage: null,
        prevPage: null,
      }

      // When: ページネーション付きレスポンスを生成
      const result = ResponseFormatter.success(testData, pagination)

      // Then: 正しい形式であること
      expect(result).toHaveProperty('data', testData)
      expect(result).toHaveProperty('pagination', pagination)
      expect(result).toHaveProperty('meta')
    })

    it('データがundefinedの場合、dataプロパティを含まない', () => {
      // When: データなしでレスポンスを生成
      const result = ResponseFormatter.success(undefined)

      // Then: dataプロパティがないこと
      expect(result).not.toHaveProperty('data')
      expect(result).toHaveProperty('meta')
    })
  })

  describe('createPagination', () => {
    it('正しいページネーション情報を生成する', () => {
      // Given: ページネーション設定
      const page = 2
      const limit = 10
      const total = 25

      // When: ページネーション情報を生成
      const result = ResponseFormatter.createPagination(page, limit, total)

      // Then: 正しい計算結果であること
      expect(result).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
        nextPage: 3,
        prevPage: 1,
      })
    })

    it('最初のページの場合、hasPrevとprevPageが正しく設定される', () => {
      // Given: 最初のページの設定
      const page = 1
      const limit = 10
      const total = 25

      // When: ページネーション情報を生成
      const result = ResponseFormatter.createPagination(page, limit, total)

      // Then: 前のページがないこと
      expect(result.hasPrev).toBe(false)
      expect(result.prevPage).toBe(null)
      expect(result.hasNext).toBe(true)
    })

    it('最後のページの場合、hasNextとnextPageが正しく設定される', () => {
      // Given: 最後のページの設定
      const page = 3
      const limit = 10
      const total = 25

      // When: ページネーション情報を生成
      const result = ResponseFormatter.createPagination(page, limit, total)

      // Then: 次のページがないこと
      expect(result.hasNext).toBe(false)
      expect(result.nextPage).toBe(null)
      expect(result.hasPrev).toBe(true)
    })
  })

  describe('meta', () => {
    it('メタデータのみのレスポンスを生成する', () => {
      // When: メタデータのみのレスポンスを生成
      const result = ResponseFormatter.meta()

      // Then: metaプロパティのみ存在すること
      expect(result).toHaveProperty('meta')
      expect(result).not.toHaveProperty('data')
      expect(result).not.toHaveProperty('pagination')
      expect(result.meta).toHaveProperty('timestamp')
      expect(result.meta).toHaveProperty('version')
    })
  })
})
