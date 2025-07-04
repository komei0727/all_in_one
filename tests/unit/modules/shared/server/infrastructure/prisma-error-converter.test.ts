import { describe, it, expect } from 'vitest'

import { BusinessRuleException, NotFoundException } from '@/modules/shared/server/domain/exceptions'
import { PrismaErrorConverter } from '@/modules/shared/server/infrastructure/prisma-error-converter'

describe('PrismaErrorConverter', () => {
  describe('Prismaエラーの変換', () => {
    it('P2002 (一意制約違反) をBusinessRuleExceptionに変換する', () => {
      // Given: Prisma一意制約違反エラー
      const prismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
        message: 'Unique constraint failed',
      }
      const operation = 'createUser'
      const context = { userId: 'user123' }

      // When: 変換を実行
      const result = PrismaErrorConverter.convertToDomainException(prismaError, operation, context)

      // Then: BusinessRuleExceptionに変換される
      expect(result).toBeInstanceOf(BusinessRuleException)
      expect(result.message).toBe('Duplicate value for email during createUser')
      expect(result.details).toEqual({
        operation: 'createUser',
        prismaCode: 'P2002',
        prismaMessage: 'Unique constraint failed',
        userId: 'user123',
      })
    })

    it('P2002 (複数フィールドの一意制約違反) をBusinessRuleExceptionに変換する', () => {
      // Given: 複数フィールドの一意制約違反
      const prismaError = {
        code: 'P2002',
        meta: { target: ['userId', 'categoryId'] },
        message: 'Unique constraint failed',
      }

      // When: 変換を実行
      const result = PrismaErrorConverter.convertToDomainException(prismaError, 'createIngredient')

      // Then: 複数フィールドを含むメッセージになる
      expect(result.message).toBe('Duplicate value for userId, categoryId during createIngredient')
    })

    it('P2025 (レコードが見つからない) をNotFoundExceptionに変換する', () => {
      // Given: Prismaレコードが見つからないエラー
      const prismaError = {
        code: 'P2025',
        message: 'Record to update not found',
      }

      // When: 変換を実行
      const result = PrismaErrorConverter.convertToDomainException(prismaError, 'updateIngredient')

      // Then: NotFoundExceptionに変換される
      expect(result).toBeInstanceOf(NotFoundException)
      expect(result.message).toContain('Resource not found:')
    })

    it('P2003 (外部キー制約違反) をBusinessRuleExceptionに変換する', () => {
      // Given: 外部キー制約違反エラー
      const prismaError = {
        code: 'P2003',
        meta: { field_name: 'categoryId' },
        message: 'Foreign key constraint failed',
      }

      // When: 変換を実行
      const result = PrismaErrorConverter.convertToDomainException(prismaError, 'createIngredient')

      // Then: BusinessRuleExceptionに変換される
      expect(result).toBeInstanceOf(BusinessRuleException)
      expect(result.message).toBe(
        'Referenced resource not found for categoryId during createIngredient'
      )
    })

    it('P2014 (必須関係違反) をBusinessRuleExceptionに変換する', () => {
      // Given: 必須関係違反エラー
      const prismaError = {
        code: 'P2014',
        meta: { relation_name: 'ingredients' },
        message: 'Required relation missing',
      }

      // When: 変換を実行
      const result = PrismaErrorConverter.convertToDomainException(prismaError, 'deleteCategory')

      // Then: BusinessRuleExceptionに変換される
      expect(result).toBeInstanceOf(BusinessRuleException)
      expect(result.message).toBe("Required relation 'ingredients' missing during deleteCategory")
    })

    it('P1xxx (接続エラー) をBusinessRuleExceptionに変換する', () => {
      // Given: Prisma接続エラー
      const prismaError = {
        code: 'P1001',
        message: 'Cannot reach database server',
      }

      // When: 変換を実行
      const result = PrismaErrorConverter.convertToDomainException(prismaError, 'findIngredients')

      // Then: BusinessRuleExceptionに変換される
      expect(result).toBeInstanceOf(BusinessRuleException)
      expect(result.message).toBe('Database connection error during findIngredients')
    })

    it('未知のPrismaエラーをBusinessRuleExceptionに変換する', () => {
      // Given: 未知のPrismaエラー
      const prismaError = {
        code: 'P9999',
        message: 'Unknown prisma error',
      }

      // When: 変換を実行
      const result = PrismaErrorConverter.convertToDomainException(prismaError, 'unknownOperation')

      // Then: BusinessRuleExceptionに変換される
      expect(result).toBeInstanceOf(BusinessRuleException)
      expect(result.message).toBe('Database operation failed during unknownOperation')
    })
  })

  describe('非Prismaエラーの処理', () => {
    it('Prismaエラーでない場合はそのまま再投げする', () => {
      // Given: 通常のエラー
      const normalError = new Error('通常のエラー')

      // When & Then: そのまま再投げされる
      expect(() => {
        PrismaErrorConverter.convertToDomainException(normalError, 'operation')
      }).toThrow('通常のエラー')
    })

    it('Prismaエラーではないオブジェクトはそのまま再投げする', () => {
      // Given: Prismaエラーではないオブジェクト
      const notPrismaError = { message: 'Not a Prisma error' }

      // When & Then: そのまま再投げされる
      expect(() => {
        PrismaErrorConverter.convertToDomainException(notPrismaError, 'operation')
      }).toThrow()
    })
  })

  describe('wrapOperation', () => {
    it('成功時は操作結果をそのまま返す', async () => {
      // Given: 成功する操作
      const successOperation = async () => ({ success: true, data: 'test' })

      // When: wrapOperationで実行
      const result = await PrismaErrorConverter.wrapOperation(successOperation, 'testOperation')

      // Then: 結果がそのまま返される
      expect(result).toEqual({ success: true, data: 'test' })
    })

    it('Prismaエラー発生時はドメイン例外に変換して投げる', async () => {
      // Given: Prismaエラーを投げる操作
      const errorOperation = async () => {
        throw {
          code: 'P2002',
          meta: { target: ['email'] },
          message: 'Unique constraint failed',
        }
      }

      // When & Then: ドメイン例外が投げられる
      await expect(
        PrismaErrorConverter.wrapOperation(errorOperation, 'createUser', { userId: 'user123' })
      ).rejects.toThrow(BusinessRuleException)

      try {
        await PrismaErrorConverter.wrapOperation(errorOperation, 'createUser', {
          userId: 'user123',
        })
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessRuleException)
        expect((error as BusinessRuleException).message).toBe(
          'Duplicate value for email during createUser'
        )
        expect((error as BusinessRuleException).details?.userId).toBe('user123')
      }
    })

    it('非Prismaエラー発生時はそのまま投げる', async () => {
      // Given: 通常のエラーを投げる操作
      const errorOperation = async () => {
        throw new Error('通常のエラー')
      }

      // When & Then: そのまま投げられる
      await expect(PrismaErrorConverter.wrapOperation(errorOperation, 'operation')).rejects.toThrow(
        '通常のエラー'
      )
    })
  })

  describe('エラー判定', () => {
    it('正しいPrismaエラーを判定する', () => {
      // Given: 様々な形式のPrismaエラー
      const validPrismaErrors = [
        { code: 'P2002', message: 'test' },
        { code: 'P1001', message: 'test' },
        { code: 'P9999', message: 'test' },
      ]

      validPrismaErrors.forEach((error) => {
        // When & Then: Prismaエラーとして認識される
        expect(() => {
          PrismaErrorConverter.convertToDomainException(error, 'test')
        }).not.toThrow('test') // Prismaエラーとして処理され、元のエラーはそのまま投げられない
      })
    })

    it('Prismaエラーでないものを正しく判定する', () => {
      // Given: Prismaエラーでない様々な形式
      const nonPrismaErrors = [
        new Error('normal error'),
        { message: 'no code property' },
        { code: 123 }, // 数値のcode
        { code: 'NOTPRISMA' }, // Pで始まらないcode
        null,
        undefined,
        'string error',
      ]

      nonPrismaErrors.forEach((error) => {
        // When & Then: Prismaエラーとして認識されない
        expect(() => {
          PrismaErrorConverter.convertToDomainException(error, 'test')
        }).toThrow() // そのまま投げられる
      })
    })
  })
})
