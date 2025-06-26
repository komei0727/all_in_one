import { CreateIngredientCommand } from './create-ingredient.command'
import { Ingredient } from '../../domain/entities/ingredient.entity'
import {
  CategoryNotFoundException,
  UnitNotFoundException,
} from '../../domain/exceptions/not-found.exception'
import { CategoryRepository } from '../../domain/repositories/category-repository.interface'
import { IngredientRepository } from '../../domain/repositories/ingredient-repository.interface'
import { UnitRepository } from '../../domain/repositories/unit-repository.interface'
import {
  CategoryId,
  IngredientId,
  IngredientName,
  Memo,
  Price,
  StorageLocation,
  UnitId,
  ExpiryInfo,
  IngredientStock,
} from '../../domain/value-objects'

/**
 * 食材作成コマンドハンドラー
 * 食材の新規登録処理を実行する
 */
export class CreateIngredientHandler {
  constructor(
    private readonly ingredientRepository: IngredientRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly unitRepository: UnitRepository
  ) {}

  /**
   * コマンドを実行して食材を作成
   * @param command 食材作成コマンド
   * @returns 作成された食材
   * @throws {NotFoundException} カテゴリーまたは単位が見つからない場合
   */
  async execute(command: CreateIngredientCommand): Promise<Ingredient> {
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

    // 在庫情報の作成（値オブジェクト）
    const ingredientStock = new IngredientStock({
      quantity: command.quantity.amount,
      unitId,
      storageLocation: new StorageLocation(
        command.storageLocation.type,
        command.storageLocation.detail
      ),
      threshold: command.threshold,
    })

    // 期限情報の作成（値オブジェクト）
    const expiryInfo = command.expiryInfo
      ? new ExpiryInfo({
          bestBeforeDate: command.expiryInfo.bestBeforeDate
            ? new Date(command.expiryInfo.bestBeforeDate)
            : null,
          useByDate: command.expiryInfo.useByDate ? new Date(command.expiryInfo.useByDate) : null,
        })
      : null

    // 食材エンティティの作成
    const ingredient = new Ingredient({
      id: IngredientId.generate(),
      userId: command.userId,
      name: new IngredientName(command.name),
      categoryId,
      purchaseDate: new Date(command.purchaseDate),
      ingredientStock,
      memo: command.memo ? new Memo(command.memo) : null,
      price: command.price !== undefined ? new Price(command.price) : null,
      expiryInfo,
    })

    // 永続化
    const savedIngredient = await this.ingredientRepository.save(ingredient)

    return savedIngredient
  }
}
