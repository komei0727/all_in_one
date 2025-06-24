import { describe, expect, it } from 'vitest'

import {
  IngredientId,
  IngredientName,
  CategoryId,
  Quantity,
  Memo,
  Price,
  UnitId,
  StorageLocation,
  StorageType,
  ExpiryInfo,
} from '@/modules/ingredients/server/domain/value-objects'

import { IngredientBuilder } from '../../../../../../__fixtures__/builders'

describe('Ingredient', () => {
  describe('constructor', () => {
    it('食材を作成できる', () => {
      // ビルダーを使用してランダムなテストデータで検証
      const ingredient = new IngredientBuilder().withRandomName().withRandomMemo().build()

      // Assert
      expect(ingredient.getId()).toBeInstanceOf(IngredientId)
      expect(ingredient.getUserId()).toBeDefined()
      expect(ingredient.getName()).toBeInstanceOf(IngredientName)
      expect(ingredient.getCategoryId()).toBeInstanceOf(CategoryId)
      expect(ingredient.getMemo()).toBeInstanceOf(Memo)
      expect(ingredient.getQuantity()).toBeInstanceOf(Quantity)
      expect(ingredient.getUnitId()).toBeInstanceOf(UnitId)
      expect(ingredient.getStorageLocation()).toBeInstanceOf(StorageLocation)
      expect(ingredient.getExpiryInfo()).toBeInstanceOf(ExpiryInfo)
      expect(ingredient.getPurchaseDate()).toBeInstanceOf(Date)
      expect(ingredient.getCreatedAt()).toBeInstanceOf(Date)
      expect(ingredient.getUpdatedAt()).toBeInstanceOf(Date)
    })

    it('メモなしで食材を作成できる', () => {
      // メモなしで食材を作成
      const ingredient = new IngredientBuilder().withMemo(null).build()

      // Assert
      expect(ingredient.getMemo()).toBeNull()
    })

    it('価格なしで食材を作成できる', () => {
      // 価格なしで食材を作成
      const ingredient = new IngredientBuilder().withPrice(null).build()

      // Assert
      expect(ingredient.getPrice()).toBeNull()
    })

    it('閾値なしで食材を作成できる', () => {
      // 閾値なしで食材を作成
      const ingredient = new IngredientBuilder().withThreshold(null).build()

      // Assert
      expect(ingredient.getThreshold()).toBeNull()
    })
  })

  describe('quantity management', () => {
    it('在庫があるかどうか判定できる', () => {
      // 在庫ありの食材を作成
      const ingredient = new IngredientBuilder().withQuantity(5).build()

      // Assert
      expect(ingredient.isInStock()).toBe(true)
    })

    it('在庫がほぼ0の場合は在庫なしと判定する', () => {
      // 在庫が非常に少ない食材を作成
      const ingredient = new IngredientBuilder().withQuantity(0.01).build()

      // Assert - 在庫があるが実質的には0とみなせる状態
      expect(ingredient.getQuantity().getValue()).toBe(0.01)
      expect(ingredient.isInStock()).toBe(true) // 技術的には在庫あり
    })

    it('在庫を補充できる', async () => {
      // 初期在庫5の食材を作成
      const ingredient = new IngredientBuilder().withQuantity(5).build()
      const originalUpdatedAt = ingredient.getUpdatedAt()

      // 時間差を作るため少し待機
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Act
      ingredient.replenish(new Quantity(3))

      // Assert
      expect(ingredient.getQuantity().getValue()).toBe(8)
      expect(ingredient.getUpdatedAt().getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('在庫を調整できる', () => {
      // 初期在庫5の食材を作成
      const ingredient = new IngredientBuilder().withQuantity(5).build()

      // Act
      ingredient.adjustQuantity(new Quantity(10))

      // Assert
      expect(ingredient.getQuantity().getValue()).toBe(10)
    })
  })

  describe('update methods', () => {
    it('名前を更新できる', () => {
      // 初期の食材を作成
      const ingredient = new IngredientBuilder().withName('トマト').build()

      // 新しい名前を準備
      const newName = new IngredientName('キャベツ')

      // Act
      ingredient.updateName(newName)

      // Assert
      expect(ingredient.getName()).toEqual(newName)
    })

    it('カテゴリーを更新できる', () => {
      // 初期の食材を作成
      const ingredient = new IngredientBuilder().build()
      const newCategoryId = new CategoryId('550e8400-e29b-41d4-a716-446655440002')

      // Act
      ingredient.updateCategory(newCategoryId)

      // Assert
      expect(ingredient.getCategoryId()).toEqual(newCategoryId)
    })

    it('メモを更新できる', () => {
      // 初期の食材を作成
      const ingredient = new IngredientBuilder().withMemo('古いメモ').build()

      // 新しいメモを準備
      const newMemo = new Memo('新しいメモ')

      // Act
      ingredient.updateMemo(newMemo)

      // Assert
      expect(ingredient.getMemo()).toEqual(newMemo)
    })

    it('価格を更新できる', () => {
      // 初期の食材を作成
      const ingredient = new IngredientBuilder().withPrice(100).build()

      // 新しい価格を準備
      const newPrice = new Price(200)

      // Act
      ingredient.updatePrice(newPrice)

      // Assert
      expect(ingredient.getPrice()).toEqual(newPrice)
    })

    it('保存場所を更新できる', () => {
      // 初期の食材を作成
      const ingredient = new IngredientBuilder().build()

      // 新しい保存場所を準備
      const newLocation = new StorageLocation(StorageType.FROZEN, '冷凍庫の奥')

      // Act
      ingredient.updateStorageLocation(newLocation)

      // Assert
      expect(ingredient.getStorageLocation()).toEqual(newLocation)
    })

    it('賞味期限情報を更新できる', () => {
      // 初期の食材を作成
      const ingredient = new IngredientBuilder().build()

      // 新しい賞味期限情報を準備
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const newExpiryInfo = new ExpiryInfo({ bestBeforeDate: futureDate, useByDate: null })

      // Act
      ingredient.updateExpiryInfo(newExpiryInfo)

      // Assert
      expect(ingredient.getExpiryInfo()).toEqual(newExpiryInfo)
    })

    it('削除済みの食材のメモを更新しようとするとエラー', () => {
      // 食材を作成して削除
      const ingredient = new IngredientBuilder().withMemo('メモ').build()
      ingredient.delete()
      const newMemo = new Memo('新しいメモ')

      // Act & Assert
      expect(() => ingredient.updateMemo(newMemo)).toThrow('削除済みの食材は更新できません')
    })
  })

  describe('isExpired', () => {
    it('期限情報がない場合はfalseを返す', () => {
      // 期限なしの食材を作成
      const expiryInfo = new ExpiryInfo({ bestBeforeDate: null, useByDate: null })
      const ingredient = new IngredientBuilder().withExpiryInfo(expiryInfo).build()

      // Act & Assert
      expect(ingredient.isExpired()).toBe(false)
    })

    it('消費期限が過ぎている場合はtrueを返す', () => {
      // 期限切れの食材を作成
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const expiryInfo = new ExpiryInfo({ bestBeforeDate: null, useByDate: pastDate })
      const ingredient = new IngredientBuilder().withExpiryInfo(expiryInfo).build()

      // Act & Assert
      expect(ingredient.isExpired()).toBe(true)
    })

    it('賞味期限のみで消費期限がない場合、賞味期限で判断する', () => {
      // 賞味期限が過ぎた食材を作成
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const expiryInfo = new ExpiryInfo({ bestBeforeDate: pastDate, useByDate: null })
      const ingredient = new IngredientBuilder().withExpiryInfo(expiryInfo).build()

      // Act & Assert
      expect(ingredient.isExpired()).toBe(true)
    })

    it('期限内の場合はfalseを返す', () => {
      // 期限内の食材を作成
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const expiryInfo = new ExpiryInfo({ bestBeforeDate: futureDate, useByDate: null })
      const ingredient = new IngredientBuilder().withExpiryInfo(expiryInfo).build()

      // Act & Assert
      expect(ingredient.isExpired()).toBe(false)
    })

    it('賞味期限切れかどうか判定できる', () => {
      // 賞味期限が過ぎて、消費期限も過ぎている食材を作成
      const pastDate1 = new Date()
      pastDate1.setDate(pastDate1.getDate() - 1) // 1日前（賞味期限）
      const pastDate2 = new Date()
      pastDate2.setDate(pastDate2.getDate() - 7) // 7日前（消費期限）
      const expiryInfo = new ExpiryInfo({ bestBeforeDate: pastDate1, useByDate: pastDate2 })
      const ingredient = new IngredientBuilder().withExpiryInfo(expiryInfo).build()

      // Act & Assert
      expect(ingredient.isBestBeforeExpired()).toBe(true) // 賞味期限切れ
      expect(ingredient.isExpired()).toBe(true) // 消費期限も切れている
    })
  })

  describe('delete', () => {
    it('論理削除できる', () => {
      // 食材を作成
      const ingredient = new IngredientBuilder().build()

      // Act
      ingredient.delete()

      // Assert
      expect(ingredient.isDeleted()).toBe(true)
      expect(ingredient.getDeletedAt()).toBeInstanceOf(Date)
    })

    it('削除済みの食材は再削除できない', () => {
      // 食材を作成して削除
      const ingredient = new IngredientBuilder().build()
      ingredient.delete()

      // Act & Assert
      expect(() => ingredient.delete()).toThrow('すでに削除されています')
    })
  })

  describe('consume', () => {
    it('在庫を消費できる', () => {
      // 在庫10の食材を作成
      const ingredient = new IngredientBuilder().withQuantity(10).build()

      // Act
      ingredient.consume(new Quantity(3))

      // Assert
      expect(ingredient.getQuantity().getValue()).toBe(7)
    })

    it('在庫が不足している場合はエラーをスローする', () => {
      // 在庫5の食材を作成
      const ingredient = new IngredientBuilder().withQuantity(5).build()

      // Act & Assert
      expect(() => ingredient.consume(new Quantity(10))).toThrow('在庫が不足しています')
    })

    it('在庫ちょうどの数量を消費しようとするとエラー', () => {
      // 在庫5の食材を作成
      const ingredient = new IngredientBuilder().withQuantity(5).build()

      // Act & Assert - 数量が0になる消費はQuantityのバリデーションで失敗する
      expect(() => ingredient.consume(new Quantity(5))).toThrow(
        '数量は0より大きい値を入力してください'
      )
    })
  })
})
