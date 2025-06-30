import type { EventBus } from '@/modules/shared/server/application/services/event-bus.interface'
import type { TransactionManager } from '@/modules/shared/server/application/services/transaction-manager.interface'

import {
  CategoryNotFoundException,
  UnitNotFoundException,
} from '../../domain/exceptions/not-found.exception'
import { IngredientFactory } from '../../domain/factories/ingredient.factory'
import { CategoryId, UnitId } from '../../domain/value-objects'
import { IngredientMapper } from '../mappers/ingredient.mapper'

import type { CreateIngredientCommand } from './create-ingredient.command'
import type { Ingredient } from '../../domain/entities/ingredient.entity'
import type { CategoryRepository } from '../../domain/repositories/category-repository.interface'
import type { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import type { UnitRepository } from '../../domain/repositories/unit-repository.interface'
import type { IngredientDto } from '../dtos/ingredient.dto'

/**
 * 食材作成コマンドハンドラー
 * 食材の新規登録処理を実行する
 */
export class CreateIngredientHandler {
  private readonly ingredientFactory: IngredientFactory

  constructor(
    private readonly ingredientRepository: IngredientRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly unitRepository: UnitRepository,
    private readonly transactionManager: TransactionManager,
    private readonly eventBus: EventBus
  ) {
    // IngredientFactoryのインスタンスを作成
    this.ingredientFactory = new IngredientFactory(ingredientRepository)
  }

  /**
   * コマンドを実行して食材を作成
   * @param command 食材作成コマンド
   * @returns 作成された食材のDTO
   * @throws {NotFoundException} カテゴリーまたは単位が見つからない場合
   */
  async execute(command: CreateIngredientCommand): Promise<IngredientDto> {
    // カテゴリーの存在確認
    const categoryId = new CategoryId(command.categoryId)
    const category = await this.categoryRepository.findById(categoryId)
    if (!category) {
      throw new CategoryNotFoundException(categoryId.getValue())
    }

    // 単位の存在確認
    const unitId = new UnitId(command.quantity.unitId)
    const unit = await this.unitRepository.findById(unitId)
    if (!unit) {
      throw new UnitNotFoundException(unitId.getValue())
    }

    // トランザクション内で食材を作成・保存
    let ingredientToSave: Ingredient
    const savedIngredient = await this.transactionManager.run(async (tx) => {
      // トランザクション内でファクトリーに渡すリポジトリを更新
      const txIngredientFactory = new IngredientFactory(tx)

      // IngredientFactoryを使用して食材を作成
      ingredientToSave = await txIngredientFactory.create({
        userId: command.userId,
        name: command.name,
        categoryId: command.categoryId,
        unitId: command.quantity.unitId,
        quantity: command.quantity.amount,
        purchaseDate: new Date(command.purchaseDate),
        storageLocation: {
          type: command.storageLocation.type,
          detail: command.storageLocation.detail,
        },
        threshold: command.threshold,
        memo: command.memo,
        price: command.price,
        expiryInfo: command.expiryInfo?.bestBeforeDate
          ? {
              bestBeforeDate: new Date(command.expiryInfo.bestBeforeDate),
              useByDate: command.expiryInfo.useByDate
                ? new Date(command.expiryInfo.useByDate)
                : null,
            }
          : null,
      })

      // 永続化
      return tx.save(ingredientToSave)
    })

    // トランザクション成功後にイベントを発行
    const events = ingredientToSave!.getUncommittedEvents()
    if (events.length > 0) {
      await this.eventBus.publishAll(events)
      ingredientToSave!.markEventsAsCommitted()
    }

    // DTOに変換して返す
    return IngredientMapper.toDto(savedIngredient, category || undefined, unit || undefined)
  }
}
