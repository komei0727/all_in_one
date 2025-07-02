import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import { UniversalExceptionConverter } from '@/modules/shared/server/api/exception-converter'
import {
  ApiValidationException,
  ApiNotFoundException,
  ApiBusinessRuleException,
  ApiUnauthorizedException,
  ApiForbiddenException,
  ApiInfrastructureException,
  ApiInternalException,
} from '@/modules/shared/server/api/exceptions'
import {
  ValidationException,
  NotFoundException,
  BusinessRuleException,
} from '@/modules/shared/server/domain/exceptions'

describe('UniversalExceptionConverter', () => {
  describe('API例外の変換', () => {
    it('既存のAPI例外はそのまま返される', () => {
      // Given: 既存のAPI例外
      const originalException = new ApiValidationException('テストエラー', { field: 'test' })

      // When: 変換を実行
      const result = UniversalExceptionConverter.convert(originalException)

      // Then: 同じインスタンスが返される
      expect(result).toBe(originalException)
      expect(result).toBeInstanceOf(ApiValidationException)
    })
  })

  describe('ドメイン例外の変換', () => {
    it('ValidationException をApiValidationException に変換する', () => {
      // Given: ドメインのバリデーション例外
      const domainError = new ValidationException('バリデーションエラー', 'name', 'invalid')
      const context = { userId: 'user123' }

      // When: 変換を実行
      const result = UniversalExceptionConverter.convert(domainError, context)

      // Then: API例外に変換される
      expect(result).toBeInstanceOf(ApiValidationException)
      expect(result.message).toBe('バリデーションエラー')
      expect(result.statusCode).toBe(400)
      expect(result.errorCode).toBe('VALIDATION_ERROR')
      expect(result.context).toEqual({
        field: 'name',
        value: 'invalid',
        userId: 'user123',
      })
    })

    it('NotFoundException をApiNotFoundException に変換する', () => {
      // Given: ドメインのNotFound例外
      const domainError = new NotFoundException('Ingredient', 'ingredient123')
      const context = { resourceId: 'ingredient123' }

      // When: 変換を実行
      const result = UniversalExceptionConverter.convert(domainError, context)

      // Then: API例外に変換される
      expect(result).toBeInstanceOf(ApiNotFoundException)
      expect(result.message).toBe('Ingredient not found: ingredient123')
      expect(result.statusCode).toBe(404)
      expect(result.errorCode).toBe('RESOURCE_NOT_FOUND')
      expect(result.context).toEqual({
        resourceType: 'Ingredient',
        identifier: 'ingredient123',
        resourceId: 'ingredient123',
      })
    })

    it('BusinessRuleException をApiBusinessRuleException に変換する', () => {
      // Given: ドメインのビジネスルール例外
      const domainError = new BusinessRuleException('ビジネスルール違反', { rule: 'unique_name' })

      // When: 変換を実行
      const result = UniversalExceptionConverter.convert(domainError)

      // Then: API例外に変換される
      expect(result).toBeInstanceOf(ApiBusinessRuleException)
      expect(result.message).toBe('ビジネスルール違反')
      expect(result.statusCode).toBe(422)
      expect(result.errorCode).toBe('BUSINESS_RULE_VIOLATION')
      expect(result.context).toEqual({ rule: 'unique_name' })
    })
  })

  describe('Prisma例外の変換', () => {
    it('P2002 (一意制約違反) をApiBusinessRuleException に変換する', () => {
      // Given: Prisma一意制約違反エラー
      const prismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
        message: 'Unique constraint failed',
      }
      const context = { operation: 'createUser' }

      // When: 変換を実行
      const result = UniversalExceptionConverter.convert(prismaError, context)

      // Then: API例外に変換される
      expect(result).toBeInstanceOf(ApiBusinessRuleException)
      expect(result.message).toBe('Resource already exists')
      expect(result.statusCode).toBe(422)
      expect(result.errorCode).toBe('BUSINESS_RULE_VIOLATION')
      expect(result.context).toEqual({
        constraint: ['email'],
        prismaCode: 'P2002',
        operation: 'createUser',
      })
    })

    it('P2025 (レコードが見つからない) をApiNotFoundException に変換する', () => {
      // Given: Prismaレコードが見つからないエラー
      const prismaError = {
        code: 'P2025',
        message: 'Record to update not found',
      }

      // When: 変換を実行
      const result = UniversalExceptionConverter.convert(prismaError)

      // Then: API例外に変換される
      expect(result).toBeInstanceOf(ApiNotFoundException)
      expect(result.message).toBe('Resource not found')
      expect(result.statusCode).toBe(404)
      expect(result.context).toEqual({ prismaCode: 'P2025' })
    })

    it('P1xxx (接続エラー) をApiInfrastructureException に変換する', () => {
      // Given: Prisma接続エラー
      const prismaError = {
        code: 'P1001',
        message: 'Cannot reach database server',
      }

      // When: 変換を実行
      const result = UniversalExceptionConverter.convert(prismaError)

      // Then: API例外に変換される
      expect(result).toBeInstanceOf(ApiInfrastructureException)
      expect(result.message).toBe('Database connection error')
      expect(result.statusCode).toBe(503)
      expect(result.context).toEqual({ prismaCode: 'P1001' })
    })
  })

  describe('Zod例外の変換', () => {
    it('ZodError をApiValidationException に変換する', () => {
      // Given: Zodバリデーションエラー
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0),
      })

      try {
        schema.parse({ name: '', age: -1 })
      } catch (error) {
        // When: 変換を実行
        const result = UniversalExceptionConverter.convert(error)

        // Then: API例外に変換される
        expect(result).toBeInstanceOf(ApiValidationException)
        expect(result.message).toBe('Validation failed')
        expect(result.statusCode).toBe(400)
        expect(result.context?.validationErrors).toHaveLength(2)

        const validationErrors = result.context?.validationErrors as any[]
        expect(validationErrors[0].field).toBe('name')
        expect(validationErrors[1].field).toBe('age')
      }
    })
  })

  describe('NextAuth例外の変換', () => {
    it('AccessDenied をApiForbiddenException に変換する', () => {
      // Given: NextAuth AccessDeniedエラー
      const nextAuthError = {
        type: 'AccessDenied',
        message: 'Access denied by configuration',
      }

      // When: 変換を実行
      const result = UniversalExceptionConverter.convert(nextAuthError)

      // Then: API例外に変換される
      expect(result).toBeInstanceOf(ApiForbiddenException)
      expect(result.message).toBe('Access denied')
      expect(result.statusCode).toBe(403)
      expect(result.context).toEqual({ authErrorType: 'AccessDenied' })
    })

    it('Configuration をApiInternalException に変換する', () => {
      // Given: NextAuth Configurationエラー
      const nextAuthError = {
        type: 'Configuration',
        message: 'Invalid configuration',
      }

      // When: 変換を実行
      const result = UniversalExceptionConverter.convert(nextAuthError)

      // Then: API例外に変換される
      expect(result).toBeInstanceOf(ApiInternalException)
      expect(result.message).toBe('Authentication configuration error')
      expect(result.statusCode).toBe(500)
    })

    it('その他のNextAuthエラー をApiUnauthorizedException に変換する', () => {
      // Given: その他のNextAuthエラー
      const nextAuthError = {
        type: 'CredentialsSignin',
        message: 'Invalid credentials',
      }

      // When: 変換を実行
      const result = UniversalExceptionConverter.convert(nextAuthError)

      // Then: API例外に変換される
      expect(result).toBeInstanceOf(ApiUnauthorizedException)
      expect(result.message).toBe('Authentication failed')
      expect(result.statusCode).toBe(401)
    })
  })

  describe('未知のエラーの変換', () => {
    it('開発環境では詳細なエラー情報を含む', () => {
      // Given: 未知のエラーと開発環境
      const originalEnv = process.env.NODE_ENV
      // @ts-expect-error - テストのためにNODE_ENVを書き換え
      process.env.NODE_ENV = 'development'

      try {
        const unknownError = new Error('予期しないエラー')

        // When: 変換を実行
        const result = UniversalExceptionConverter.convert(unknownError)

        // Then: 詳細な情報を含むAPI例外に変換される
        expect(result).toBeInstanceOf(ApiInternalException)
        expect(result.message).toContain('予期しないエラー')
        expect(result.statusCode).toBe(500)
        expect(result.context?.errorType).toBe('object')
        expect(result.context?.errorConstructor).toBe('Error')
      } finally {
        // @ts-expect-error - テストのためにNODE_ENVを書き換え
        process.env.NODE_ENV = originalEnv
      }
    })

    it('本番環境では安全なエラーメッセージを返す', () => {
      // Given: 未知のエラーと本番環境
      const originalEnv = process.env.NODE_ENV
      // @ts-expect-error - テストのためにNODE_ENVを書き換え
      process.env.NODE_ENV = 'production'

      try {
        const unknownError = new Error('内部エラー詳細')

        // When: 変換を実行
        const result = UniversalExceptionConverter.convert(unknownError)

        // Then: 安全なメッセージのAPI例外に変換される
        expect(result).toBeInstanceOf(ApiInternalException)
        expect(result.message).toBe('An unexpected error occurred')
        expect(result.statusCode).toBe(500)
        // 本番環境ではcontextがundefinedになる可能性があるので、存在する場合のみチェック
        if (result.context) {
          expect(result.context).not.toHaveProperty('errorMessage')
        }
      } finally {
        // @ts-expect-error - テストのためにNODE_ENVを書き換え
        process.env.NODE_ENV = originalEnv
      }
    })
  })
})
