import { faker } from '@faker-js/faker'
import { createId } from '@paralleldrive/cuid2'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DeleteIngredientCommand } from '@/modules/ingredients/server/application/commands/delete-ingredient.command'
import { DeleteIngredientHandler } from '@/modules/ingredients/server/application/commands/delete-ingredient.handler'
import { IngredientNotFoundException } from '@/modules/ingredients/server/domain/exceptions'
import type { IngredientRepository } from '@/modules/ingredients/server/domain/repositories/ingredient-repository.interface'
import type { RepositoryFactory } from '@/modules/ingredients/server/domain/repositories/repository-factory.interface'
import { IngredientId } from '@/modules/ingredients/server/domain/value-objects'
import type { TransactionManager } from '@/modules/shared/server/application/services/transaction-manager.interface'
import { anIngredient } from '@tests/__fixtures__/builders/entities/ingredient.builder'

describe('DeleteIngredientHandler', () => {
  let mockIngredientRepository: IngredientRepository
  let mockRepositoryFactory: RepositoryFactory
  let mockTransactionManager: TransactionManager
  let mockTxIngredientRepository: IngredientRepository
  let handler: DeleteIngredientHandler

  beforeEach(() => {
    vi.clearAllMocks()

    // モックリポジトリの設定
    mockIngredientRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      findByUserId: vi.fn(),
      findAll: vi.fn(),
      exists: vi.fn(),
      findDuplicates: vi.fn(),
    } as unknown as IngredientRepository

    mockTxIngredientRepository = {
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      findByUserId: vi.fn(),
      findAll: vi.fn(),
      exists: vi.fn(),
      findDuplicates: vi.fn(),
    } as unknown as IngredientRepository

    mockRepositoryFactory = {
      createIngredientRepository: vi.fn().mockReturnValue(mockTxIngredientRepository),
      createShoppingSessionRepository: vi.fn(),
      createCategoryRepository: vi.fn(),
      createUnitRepository: vi.fn(),
    } as unknown as RepositoryFactory

    mockTransactionManager = {
      run: vi.fn(),
    } as unknown as TransactionManager

    handler = new DeleteIngredientHandler(
      mockIngredientRepository,
      mockRepositoryFactory,
      mockTransactionManager
    )
  })

  // テストデータビルダー
  const createDeleteCommand = () =>
    new DeleteIngredientCommand(`ing_${createId()}`, faker.string.uuid())

  describe('正常系', () => {
    it('存在する食材を正常に削除できる', async () => {
      // テストデータの準備
      const command = createDeleteCommand()
      const mockIngredient = anIngredient()
        .withId(new IngredientId(command.id))
        .withUserId(command.userId) // ユーザーIDを一致させる
        .build()

      // deleteメソッドのモック
      vi.spyOn(mockIngredient, 'delete')

      // モックの設定
      vi.mocked(mockIngredientRepository.findById).mockResolvedValueOnce(mockIngredient)
      vi.mocked(mockTransactionManager.run).mockImplementation(async (callback) => {
        const mockTx = {} as any as any // トランザクションのモック
        return await callback(mockTx)
      })
      vi.mocked(mockTxIngredientRepository.update).mockResolvedValueOnce(undefined as any)

      // ハンドラーを実行
      await handler.execute(command)

      // 検証
      expect(mockIngredientRepository.findById).toHaveBeenCalledWith(
        command.userId,
        expect.any(IngredientId)
      )
      expect(mockIngredient.delete).toHaveBeenCalledWith(command.userId)
      expect(mockTransactionManager.run).toHaveBeenCalledWith(expect.any(Function))
      expect(mockRepositoryFactory.createIngredientRepository).toHaveBeenCalledWith(
        expect.anything()
      )
      expect(mockTxIngredientRepository.update).toHaveBeenCalledWith(mockIngredient)
    })

    it('IngredientIdが正しく作成される', async () => {
      // テストデータの準備
      const ingredientId = `ing_${createId()}`
      const command = new DeleteIngredientCommand(ingredientId, faker.string.uuid())
      const mockIngredient = anIngredient()
        .withUserId(command.userId) // ユーザーIDを一致させる
        .build()

      // モックの設定
      vi.mocked(mockIngredientRepository.findById).mockResolvedValueOnce(mockIngredient)
      vi.mocked(mockTransactionManager.run).mockImplementation(async (callback) => {
        const mockTx = {} as any
        return await callback(mockTx)
      })

      // ハンドラーを実行
      await handler.execute(command)

      // IngredientIdが正しく作成されて呼び出されたことを確認
      expect(mockIngredientRepository.findById).toHaveBeenCalledWith(
        command.userId,
        expect.objectContaining({
          value: expect.stringMatching(/^ing_[a-z0-9]{20,30}$/),
        })
      )
    })

    it('トランザクション内で削除処理が実行される', async () => {
      // テストデータの準備
      const command = createDeleteCommand()
      const mockIngredient = anIngredient()
        .withUserId(command.userId) // ユーザーIDを一致させる
        .build()
      const mockTransaction = { id: 'tx-123' }

      // モックの設定
      vi.mocked(mockIngredientRepository.findById).mockResolvedValueOnce(mockIngredient)

      let transactionCallback: ((tx: any) => Promise<any>) | undefined
      vi.mocked(mockTransactionManager.run).mockImplementation(async (callback) => {
        transactionCallback = callback
        return await callback(mockTransaction as any)
      })

      // ハンドラーを実行
      await handler.execute(command)

      // トランザクションコールバックが実行されたことを確認
      expect(transactionCallback).toBeDefined()
      expect(mockRepositoryFactory.createIngredientRepository).toHaveBeenCalledWith(
        mockTransaction as any
      )
      expect(mockTxIngredientRepository.update).toHaveBeenCalledWith(mockIngredient)
    })
  })

  describe('異常系', () => {
    it('食材が見つからない場合はIngredientNotFoundExceptionを投げる', async () => {
      // テストデータの準備
      const command = createDeleteCommand()

      // モックの設定（findByIdがnullを返す）
      vi.mocked(mockIngredientRepository.findById).mockResolvedValueOnce(null)

      // 例外が投げられることを確認
      await expect(handler.execute(command)).rejects.toThrow(IngredientNotFoundException)

      // findByIdは呼び出されるが、その後の処理は実行されない
      expect(mockIngredientRepository.findById).toHaveBeenCalledWith(
        command.userId,
        expect.any(IngredientId)
      )
      expect(mockTransactionManager.run).not.toHaveBeenCalled()
    })

    it('findByIdでエラーが発生した場合は例外を再スローする', async () => {
      // テストデータの準備
      const command = createDeleteCommand()
      const databaseError = new Error('Database connection failed')

      // モックの設定（findByIdがエラーを投げる）
      vi.mocked(mockIngredientRepository.findById).mockRejectedValueOnce(databaseError)

      // 例外が再スローされることを確認
      await expect(handler.execute(command)).rejects.toThrow(databaseError)

      // トランザクションは実行されない
      expect(mockTransactionManager.run).not.toHaveBeenCalled()
    })

    it('トランザクション実行中にエラーが発生した場合は例外を再スローする', async () => {
      // テストデータの準備
      const command = createDeleteCommand()
      const mockIngredient = anIngredient()
        .withUserId(command.userId) // ユーザーIDを一致させる
        .build()
      const transactionError = new Error('Transaction failed')

      // モックの設定
      vi.mocked(mockIngredientRepository.findById).mockResolvedValueOnce(mockIngredient)
      vi.mocked(mockTransactionManager.run).mockRejectedValueOnce(transactionError)

      // 例外が再スローされることを確認
      await expect(handler.execute(command)).rejects.toThrow(transactionError)

      // findByIdとdeleteは呼び出されるが、updateは実行されない
      expect(mockIngredientRepository.findById).toHaveBeenCalled()
      expect(mockTransactionManager.run).toHaveBeenCalled()
    })

    it('update処理でエラーが発生した場合は例外を再スローする', async () => {
      // テストデータの準備
      const command = createDeleteCommand()
      const mockIngredient = anIngredient()
        .withUserId(command.userId) // ユーザーIDを一致させる
        .build()
      const updateError = new Error('Update failed')

      // モックの設定
      vi.mocked(mockIngredientRepository.findById).mockResolvedValueOnce(mockIngredient)
      vi.mocked(mockTransactionManager.run).mockImplementation(async (callback) => {
        const mockTx = {} as any
        return await callback(mockTx)
      })
      vi.mocked(mockTxIngredientRepository.update).mockRejectedValueOnce(updateError)

      // 例外が再スローされることを確認
      await expect(handler.execute(command)).rejects.toThrow(updateError)

      // すべての前段階の処理は実行される
      expect(mockIngredientRepository.findById).toHaveBeenCalled()
      expect(mockTransactionManager.run).toHaveBeenCalled()
      expect(mockTxIngredientRepository.update).toHaveBeenCalled()
    })

    it('無効なingredientIdの場合の例外処理', async () => {
      // テストデータの準備（無効なID）
      const command = new DeleteIngredientCommand('', faker.string.uuid())

      // IngredientIdの作成時にエラーが発生することを想定
      await expect(handler.execute(command)).rejects.toThrow()

      // findByIdは呼び出されない
      expect(mockIngredientRepository.findById).not.toHaveBeenCalled()
    })

    it('空のuserIdの場合はバリデーションエラーが発生する', async () => {
      // テストデータの準備
      const command = new DeleteIngredientCommand(`ing_${createId()}`, '')
      const mockIngredient = anIngredient()
        .withUserId('') // 空のuserIdでビルド
        .build()

      // モックの設定
      vi.mocked(mockIngredientRepository.findById).mockResolvedValueOnce(mockIngredient)

      // IngredientDeletedイベントでuserIdバリデーションエラーが発生することを確認
      await expect(handler.execute(command)).rejects.toThrow('ユーザーIDは必須です')

      // findByIdは実行されるが、削除処理では例外が発生する
      expect(mockIngredientRepository.findById).toHaveBeenCalledWith('', expect.any(IngredientId))
      // トランザクションは実行されない（deleteメソッド内でエラーが発生するため）
      expect(mockTransactionManager.run).not.toHaveBeenCalled()
    })
  })

  describe('エッジケース', () => {
    it('deleteメソッドが呼び出された後にトランザクションが実行される', async () => {
      // テストデータの準備
      const command = createDeleteCommand()
      const mockIngredient = anIngredient()
        .withUserId(command.userId) // ユーザーIDを一致させる
        .build()

      // deleteメソッドのスパイ
      const deleteSpy = vi.spyOn(mockIngredient, 'delete')

      // モックの設定
      vi.mocked(mockIngredientRepository.findById).mockResolvedValueOnce(mockIngredient)

      let deleteCallOrder = 0
      let transactionCallOrder = 0

      deleteSpy.mockImplementation(() => {
        deleteCallOrder = performance.now()
      })

      vi.mocked(mockTransactionManager.run).mockImplementation(async (callback) => {
        transactionCallOrder = performance.now()
        const mockTx = {} as any
        return await callback(mockTx)
      })

      // ハンドラーを実行
      await handler.execute(command)

      // deleteが先に呼び出されることを確認
      expect(deleteCallOrder).toBeLessThan(transactionCallOrder)
      expect(deleteSpy).toHaveBeenCalledWith(command.userId)
    })
  })
})
