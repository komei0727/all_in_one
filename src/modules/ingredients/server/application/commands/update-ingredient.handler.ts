import type { TransactionManager } from '@/modules/shared/server/application/services/transaction-manager.interface'

import {
  IngredientNotFoundException,
  BusinessRuleException,
  CategoryNotFoundException,
  UnitNotFoundException,
} from '../../domain/exceptions'
import { IngredientFactory } from '../../domain/factories/ingredient.factory'
import {
  IngredientId,
  IngredientName,
  CategoryId,
  Memo,
  Price,
  ExpiryInfo,
  IngredientStock,
  UnitId,
  StorageLocation,
  type StorageType,
} from '../../domain/value-objects'
import { type IngredientDto } from '../dtos/ingredient.dto'
import { IngredientMapper } from '../mappers/ingredient.mapper'

import type { UpdateIngredientCommand } from './update-ingredient.command'
import type { CategoryRepository } from '../../domain/repositories/category-repository.interface'
import type { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import type { RepositoryFactory } from '../../domain/repositories/repository-factory.interface'
import type { UnitRepository } from '../../domain/repositories/unit-repository.interface'

/**
 * 食材更新ハンドラー
 */
export class UpdateIngredientHandler {
  private readonly ingredientFactory: IngredientFactory

  constructor(
    private readonly ingredientRepository: IngredientRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly unitRepository: UnitRepository,
    private readonly repositoryFactory: RepositoryFactory,
    private readonly transactionManager: TransactionManager
  ) {
    this.ingredientFactory = new IngredientFactory(ingredientRepository)
  }

  async execute(command: UpdateIngredientCommand): Promise<IngredientDto> {
    // 食材IDの値オブジェクトを作成
    const ingredientId = new IngredientId(command.id)

    // 食材を取得
    const ingredient = await this.ingredientRepository.findById(command.userId, ingredientId)

    if (!ingredient) {
      throw new IngredientNotFoundException(command.id)
    }

    // 削除済みチェック
    if (ingredient.isDeleted()) {
      throw new BusinessRuleException('削除済みの食材は更新できません')
    }

    // 重複チェック（名前、期限情報、保存場所が変更される場合）
    const changedFields: {
      name?: string
      expiryInfo?: { bestBeforeDate: Date; useByDate?: Date | null } | null
      storageLocation?: { type: StorageType; detail?: string }
    } = {}

    if (command.name !== undefined && command.name !== ingredient.getName().getValue()) {
      changedFields.name = command.name
    }

    if (command.expiryInfo !== undefined) {
      const currentExpiryInfo = ingredient.getExpiryInfo()
      const isExpiryInfoChanged =
        (!currentExpiryInfo && command.expiryInfo) ||
        (currentExpiryInfo && !command.expiryInfo) ||
        (currentExpiryInfo &&
          command.expiryInfo &&
          command.expiryInfo.bestBeforeDate &&
          currentExpiryInfo.getBestBeforeDate() &&
          (currentExpiryInfo.getBestBeforeDate()!.getTime() !==
            command.expiryInfo.bestBeforeDate!.getTime() ||
            (currentExpiryInfo.getUseByDate()?.getTime() ?? null) !==
              (command.expiryInfo.useByDate?.getTime() ?? null)))

      if (isExpiryInfoChanged && command.expiryInfo && command.expiryInfo.bestBeforeDate) {
        changedFields.expiryInfo = {
          bestBeforeDate: command.expiryInfo.bestBeforeDate,
          useByDate: command.expiryInfo.useByDate ?? null,
        }
      } else if (isExpiryInfoChanged && !command.expiryInfo) {
        changedFields.expiryInfo = null
      }
    }

    if (command.stock !== undefined) {
      const currentStock = ingredient.getIngredientStock()
      const currentLocation = currentStock.getStorageLocation()
      const isLocationChanged =
        currentLocation.getType() !== command.stock.storageLocation.type ||
        currentLocation.getDetail() !== command.stock.storageLocation.detail

      if (isLocationChanged) {
        changedFields.storageLocation = {
          type: command.stock.storageLocation.type as StorageType,
          detail: command.stock.storageLocation.detail || undefined,
        }
      }
    }

    // 重複チェックを実行
    if (Object.keys(changedFields).length > 0) {
      await this.ingredientFactory.updateWithCheck({
        userId: command.userId,
        ingredientId: command.id,
        ...changedFields,
      })
    }

    // 名前の更新
    if (command.name !== undefined) {
      const newName = new IngredientName(command.name)
      ingredient.updateName(newName, command.userId)
    }

    // カテゴリーの更新
    if (command.categoryId !== undefined) {
      // カテゴリーの存在確認
      const category = await this.categoryRepository.findById(new CategoryId(command.categoryId))
      if (!category) {
        throw new CategoryNotFoundException(command.categoryId)
      }
      const newCategoryId = new CategoryId(command.categoryId)
      ingredient.updateCategory(newCategoryId, command.userId)
    }

    // メモの更新
    if (command.memo !== undefined) {
      const newMemo = command.memo ? new Memo(command.memo) : null
      ingredient.updateMemo(newMemo, command.userId)
    }

    // 価格の更新
    if (command.price !== undefined) {
      const newPrice = command.price ? new Price(command.price) : null
      ingredient.updatePrice(newPrice, command.userId)
    }

    // 期限情報の更新
    if (command.expiryInfo !== undefined) {
      const newExpiryInfo = command.expiryInfo
        ? new ExpiryInfo({
            bestBeforeDate: command.expiryInfo.bestBeforeDate,
            useByDate: command.expiryInfo.useByDate,
          })
        : null
      ingredient.updateExpiryInfo(newExpiryInfo, command.userId)
    }

    // 在庫情報の更新
    if (command.stock !== undefined) {
      // 単位の存在確認
      const unit = await this.unitRepository.findById(new UnitId(command.stock.unitId))
      if (!unit) {
        throw new UnitNotFoundException(command.stock.unitId)
      }

      const newStock = new IngredientStock({
        quantity: command.stock.quantity,
        unitId: new UnitId(command.stock.unitId),
        storageLocation: new StorageLocation(
          command.stock.storageLocation.type as StorageType,
          command.stock.storageLocation.detail || undefined
        ),
        threshold: command.stock.threshold,
      })
      ingredient.setStock(newStock)
    }

    // 更新された食材を保存
    const updatedIngredient = await this.transactionManager.run(async (tx) => {
      const txIngredientRepository = this.repositoryFactory.createIngredientRepository(tx)
      return txIngredientRepository.update(ingredient)
    })

    // カテゴリーと単位の情報を取得
    const [category, currentUnit] = await Promise.all([
      this.categoryRepository.findById(updatedIngredient.getCategoryId()),
      this.unitRepository.findById(updatedIngredient.getIngredientStock().getUnitId()),
    ])

    // DTOに変換して返す
    return IngredientMapper.toDto(
      updatedIngredient,
      category || undefined,
      currentUnit || undefined
    )
  }
}
