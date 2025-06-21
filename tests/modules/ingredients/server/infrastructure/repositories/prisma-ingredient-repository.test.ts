import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaIngredientRepository } from '@/modules/ingredients/server/infrastructure/repositories/prisma-ingredient-repository'
import { IngredientEntity } from '@/modules/ingredients/server/domain/entities/ingredient'
import { INGREDIENT_STATUS } from '@/modules/ingredients/shared/constants'
import type { PrismaClient } from '@/generated/prisma'

// Mock PrismaClient
const mockPrismaClient = {
  ingredient: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  category: {
    findUnique: vi.fn(),
  },
  unit: {
    findUnique: vi.fn(),
  },
} as unknown as PrismaClient

describe('PrismaIngredientRepository', () => {
  let repository: PrismaIngredientRepository

  beforeEach(() => {
    repository = new PrismaIngredientRepository(mockPrismaClient)
    vi.clearAllMocks()
  })

  describe('findAll', () => {
    it('should return paginated ingredients with default params', async () => {
      const mockIngredients = [
        {
          id: '1',
          name: 'Tomato',
          quantity: 5,
          unitId: 'unit-1',
          unit: { id: 'unit-1', name: 'kg' },
          categoryId: 'cat-1',
          category: { id: 'cat-1', name: 'VEGETABLE' },
          expiryDate: new Date('2024-12-31'),
          bestBeforeDate: null,
          purchaseDate: new Date('2024-01-01'),
          price: 100,
          storageLocation: 'REFRIGERATED',
          memo: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ]

      mockPrismaClient.ingredient.findMany.mockResolvedValue(mockIngredients)
      mockPrismaClient.ingredient.count.mockResolvedValue(1)

      const result = await repository.findAll({})

      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.items[0]).toBeInstanceOf(IngredientEntity)
      expect(result.items[0].name).toBe('Tomato')

      expect(mockPrismaClient.ingredient.findMany).toHaveBeenCalledWith({
        include: {
          category: true,
          unit: true,
        },
        skip: 0,
        take: 20,
        orderBy: undefined,
        where: {},
      })
    })

    it('should apply filters correctly', async () => {
      mockPrismaClient.ingredient.findMany.mockResolvedValue([])
      mockPrismaClient.ingredient.count.mockResolvedValue(0)

      await repository.findAll({
        page: 2,
        limit: 10,
        category: 'VEGETABLE',
        sort: 'expirationDate',
        order: 'desc',
      })

      expect(mockPrismaClient.ingredient.findMany).toHaveBeenCalledWith({
        include: {
          category: true,
          unit: true,
        },
        skip: 10,
        take: 10,
        orderBy: { expiryDate: 'desc' },
        where: {
          category: {
            name: 'VEGETABLE',
          },
        },
      })
    })
  })

  describe('findById', () => {
    it('should return ingredient entity when found', async () => {
      const mockIngredient = {
        id: '1',
        name: 'Tomato',
        quantity: 5,
        unitId: 'unit-1',
        unit: { id: 'unit-1', name: 'kg' },
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'VEGETABLE' },
        expiryDate: new Date('2024-12-31'),
        bestBeforeDate: null,
        purchaseDate: new Date('2024-01-01'),
        price: 100,
        storageLocation: 'REFRIGERATED',
        memo: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      mockPrismaClient.ingredient.findUnique.mockResolvedValue(mockIngredient)

      const result = await repository.findById('1')

      expect(result).toBeInstanceOf(IngredientEntity)
      expect(result?.id).toBe('1')
      expect(result?.name).toBe('Tomato')
    })

    it('should return null when not found', async () => {
      mockPrismaClient.ingredient.findUnique.mockResolvedValue(null)

      const result = await repository.findById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create and return new ingredient', async () => {
      const newIngredient = new IngredientEntity({
        id: 'new-id',
        name: 'Carrot',
        quantity: 3,
        unit: 'kg',
        category: 'VEGETABLE',
        status: INGREDIENT_STATUS.AVAILABLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const mockCreated = {
        id: 'new-id',
        name: 'Carrot',
        quantity: 3,
        unitId: 'unit-1',
        unit: { id: 'unit-1', name: 'kg' },
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'VEGETABLE' },
        expiryDate: null,
        bestBeforeDate: null,
        purchaseDate: new Date(),
        price: null,
        storageLocation: 'ROOM_TEMPERATURE',
        memo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrismaClient.unit.findUnique.mockResolvedValue({ id: 'unit-1', name: 'kg' })
      mockPrismaClient.category.findUnique.mockResolvedValue({ id: 'cat-1', name: 'VEGETABLE' })
      mockPrismaClient.ingredient.create.mockResolvedValue(mockCreated)

      const result = await repository.create(newIngredient)

      expect(result).toBeInstanceOf(IngredientEntity)
      expect(result.name).toBe('Carrot')
      expect(mockPrismaClient.ingredient.create).toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update and return ingredient', async () => {
      const ingredient = new IngredientEntity({
        id: '1',
        name: 'Updated Tomato',
        quantity: 10,
        status: INGREDIENT_STATUS.LOW,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      })

      const mockUpdated = {
        id: '1',
        name: 'Updated Tomato',
        quantity: 10,
        unitId: null,
        unit: null,
        categoryId: null,
        category: null,
        expiryDate: null,
        bestBeforeDate: null,
        purchaseDate: new Date(),
        price: null,
        storageLocation: 'ROOM_TEMPERATURE',
        memo: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      }

      mockPrismaClient.ingredient.update.mockResolvedValue(mockUpdated)

      const result = await repository.update(ingredient)

      expect(result).toBeInstanceOf(IngredientEntity)
      expect(result.name).toBe('Updated Tomato')
      expect(result.quantity).toBe(10)
    })
  })

  describe('delete', () => {
    it('should delete ingredient', async () => {
      mockPrismaClient.ingredient.delete.mockResolvedValue({} as any)

      await repository.delete('1')

      expect(mockPrismaClient.ingredient.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })
  })

  describe('findExpiringWithinDays', () => {
    it('should find ingredients expiring within specified days', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const mockIngredients = [
        {
          id: '1',
          name: 'Expiring Tomato',
          quantity: 5,
          unitId: 'unit-1',
          unit: { id: 'unit-1', name: 'kg' },
          categoryId: 'cat-1',
          category: { id: 'cat-1', name: 'VEGETABLE' },
          expiryDate: tomorrow,
          bestBeforeDate: null,
          purchaseDate: new Date('2024-01-01'),
          price: 100,
          storageLocation: 'REFRIGERATED',
          memo: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ]

      mockPrismaClient.ingredient.findMany.mockResolvedValue(mockIngredients)

      const result = await repository.findExpiringWithinDays(7)

      expect(result).toHaveLength(1)
      expect(result[0]).toBeInstanceOf(IngredientEntity)
      expect(result[0].name).toBe('Expiring Tomato')

      // Check the date range in the query
      const findManyCall = mockPrismaClient.ingredient.findMany.mock.calls[0][0]
      expect(findManyCall.where.expiryDate).toBeDefined()
      expect(findManyCall.where.expiryDate.lte).toBeInstanceOf(Date)
    })
  })
})