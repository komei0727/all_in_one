import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { PrismaClient } from '@/generated/prisma'
import { PrismaTransactionManagerBase } from '@/modules/shared/server/infrastructure/services/prisma-transaction-manager.base'

// テスト用の具象クラス
class TestPrismaTransactionManager extends PrismaTransactionManagerBase {}

// モックPrismaClient
const mockPrisma = {
  $transaction: vi.fn(),
} as unknown as PrismaClient

describe('PrismaTransactionManagerBase', () => {
  let transactionManager: TestPrismaTransactionManager

  beforeEach(() => {
    vi.clearAllMocks()
    transactionManager = new TestPrismaTransactionManager(mockPrisma)
  })

  describe('run', () => {
    it('トランザクション内で複数の操作を実行する', async () => {
      // Given: トランザクション内で実行される関数
      const expectedResult = { id: 'test-id', name: 'test' }
      const transactionFn = vi.fn().mockResolvedValue(expectedResult)

      // Prismaのトランザクションをモック
      mockPrisma.$transaction = vi.fn().mockImplementation(async (fn) => {
        // トランザクションコンテキストを渡して関数を実行
        return fn(mockPrisma)
      })

      // When: トランザクションを実行
      const result = await transactionManager.run(transactionFn)

      // Then: 正しく実行される
      expect(result).toEqual(expectedResult)
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
      expect(transactionFn).toHaveBeenCalledWith(mockPrisma)
    })

    it('エラー時にロールバックする', async () => {
      // Given: エラーを投げる関数
      const error = new Error('Transaction failed')
      const transactionFn = vi.fn().mockRejectedValue(error)

      // Prismaのトランザクションをモック（エラーを伝播）
      mockPrisma.$transaction = vi.fn().mockImplementation(async (fn) => {
        return fn(mockPrisma)
      })

      // When/Then: エラーが伝播される
      await expect(transactionManager.run(transactionFn)).rejects.toThrow('Transaction failed')

      // トランザクションが呼ばれたことを確認
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    })

    it('トランザクションコンテキストを関数に渡す', async () => {
      // Given: トランザクションコンテキストを使用する関数
      const transactionFn = vi.fn().mockImplementation(async (tx) => {
        // トランザクションコンテキストが渡されていることを確認
        expect(tx).toBeDefined()
        expect(tx).toBe(mockPrisma)
        return { success: true }
      })

      // Prismaのトランザクションをモック
      mockPrisma.$transaction = vi.fn().mockImplementation(async (fn) => {
        return fn(mockPrisma)
      })

      // When: トランザクションを実行
      const result = await transactionManager.run(transactionFn)

      // Then: 成功する
      expect(result).toEqual({ success: true })
      expect(transactionFn).toHaveBeenCalledWith(mockPrisma)
    })

    it('ネストしたトランザクションを処理する', async () => {
      // Given: ネストしたトランザクション呼び出し
      let callCount = 0
      const nestedFn = vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          // 内部でもう一度トランザクションを呼ぶ
          return transactionManager.run(async () => ({ nested: true }))
        }
        return { nested: true }
      })

      // Prismaのトランザクションをモック（ネストをサポート）
      mockPrisma.$transaction = vi.fn().mockImplementation(async (fn) => {
        return fn(mockPrisma)
      })

      // When: ネストしたトランザクションを実行
      const result = await transactionManager.run(nestedFn)

      // Then: 正しく処理される
      expect(result).toEqual({ nested: true })
      // Prismaは自動的にネストを処理するため、$transactionは2回呼ばれる
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2)
    })
  })
})
