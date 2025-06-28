/* eslint-disable no-console */
import { createId } from '@paralleldrive/cuid2'
import cuid from 'cuid'

import {
  PrismaClient,
  StorageLocation,
  UnitType,
  SessionStatus,
  StockStatus,
  ExpiryStatus,
  Prisma,
} from '@/generated/prisma'

const prisma = new PrismaClient()

// ID生成ヘルパー
const generateId = {
  category: () => `cat_${createId()}`,
  unit: () => `unt_${createId()}`,
  ingredient: () => `ing_${createId()}`,
  user: () => `usr_${createId()}`,
  session: () => `ses_${createId()}`,
  sessionItem: () => `sit_${createId()}`,
}

async function main() {
  console.log('Starting seed...')

  // Delete existing data (順序に注意 - 外部キー制約を考慮)
  await prisma.shoppingSessionItem.deleteMany()
  await prisma.shoppingSession.deleteMany()
  await prisma.ingredientStockHistory.deleteMany()
  await prisma.ingredient.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.category.deleteMany()
  await prisma.domainEvent.deleteMany()
  await prisma.domainUser.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.verificationToken.deleteMany()
  await prisma.user.deleteMany()

  // Create NextAuth test user first
  const nextAuthUserId = cuid() // CUID v1形式のID（NextAuthの標準）
  const nextAuthUser = await prisma.user.create({
    data: {
      id: nextAuthUserId,
      email: 'test@example.com',
      emailVerified: new Date(),
      name: 'テストユーザー',
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  console.log(`Created NextAuth user: ${nextAuthUser.email}`)

  // Create domain user
  const userId = `usr_${createId()}` // プレフィックス付きCUID v2形式
  const domainUser = await prisma.domainUser.create({
    data: {
      id: userId,
      nextAuthId: nextAuthUserId,
      email: 'test@example.com',
      displayName: 'テストユーザー',
      timezone: 'Asia/Tokyo',
      preferredLanguage: 'ja',
      theme: 'light',
      notifications: true,
      emailFrequency: 'weekly',
      status: 'ACTIVE',
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  console.log(`Created domain user: ${domainUser.email}`)

  // Generate category IDs
  const categoryIds = {
    vegetable: generateId.category(),
    meatFish: generateId.category(),
    dairy: generateId.category(),
    seasoning: generateId.category(),
    beverage: generateId.category(),
    other: generateId.category(),
  }

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: { id: categoryIds.vegetable, name: '野菜', description: '野菜類', displayOrder: 1 },
    }),
    prisma.category.create({
      data: {
        id: categoryIds.meatFish,
        name: '肉・魚',
        description: '肉類・魚介類',
        displayOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        id: categoryIds.dairy,
        name: '乳製品',
        description: '牛乳・チーズ・ヨーグルトなど',
        displayOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        id: categoryIds.seasoning,
        name: '調味料',
        description: '醤油・味噌・スパイスなど',
        displayOrder: 4,
      },
    }),
    prisma.category.create({
      data: {
        id: categoryIds.beverage,
        name: '飲料',
        description: '水・ジュース・お茶など',
        displayOrder: 5,
      },
    }),
    prisma.category.create({
      data: { id: categoryIds.other, name: 'その他', description: 'その他の食材', displayOrder: 6 },
    }),
  ])

  console.log(`Created ${categories.length} categories`)

  // Generate unit IDs
  const unitIds = {
    piece: generateId.unit(),
    gram: generateId.unit(),
    kilogram: generateId.unit(),
    milliliter: generateId.unit(),
    liter: generateId.unit(),
    bottle: generateId.unit(),
    pack: generateId.unit(),
    bag: generateId.unit(),
  }

  // Create units
  const units = await Promise.all([
    prisma.unit.create({
      data: {
        id: unitIds.piece,
        name: '個',
        symbol: '個',
        type: UnitType.COUNT,
        description: '個数',
        displayOrder: 1,
      },
    }),
    prisma.unit.create({
      data: {
        id: unitIds.gram,
        name: 'グラム',
        symbol: 'g',
        type: UnitType.WEIGHT,
        description: 'グラム',
        displayOrder: 2,
      },
    }),
    prisma.unit.create({
      data: {
        id: unitIds.kilogram,
        name: 'キログラム',
        symbol: 'kg',
        type: UnitType.WEIGHT,
        description: 'キログラム',
        displayOrder: 3,
      },
    }),
    prisma.unit.create({
      data: {
        id: unitIds.milliliter,
        name: 'ミリリットル',
        symbol: 'ml',
        type: UnitType.VOLUME,
        description: 'ミリリットル',
        displayOrder: 4,
      },
    }),
    prisma.unit.create({
      data: {
        id: unitIds.liter,
        name: 'リットル',
        symbol: 'L',
        type: UnitType.VOLUME,
        description: 'リットル',
        displayOrder: 5,
      },
    }),
    prisma.unit.create({
      data: {
        id: unitIds.bottle,
        name: '本',
        symbol: '本',
        type: UnitType.COUNT,
        description: '本数',
        displayOrder: 6,
      },
    }),
    prisma.unit.create({
      data: {
        id: unitIds.pack,
        name: 'パック',
        symbol: 'パック',
        type: UnitType.COUNT,
        description: 'パック',
        displayOrder: 7,
      },
    }),
    prisma.unit.create({
      data: {
        id: unitIds.bag,
        name: '袋',
        symbol: '袋',
        type: UnitType.COUNT,
        description: '袋',
        displayOrder: 8,
      },
    }),
  ])

  console.log(`Created ${units.length} units`)

  // Use the created test user ID
  // const userId = 'usr_test_001' // already defined above

  // Prepare date constants
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextMonth = new Date(now)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  const ingredients = await Promise.all([
    prisma.ingredient.create({
      data: {
        id: generateId.ingredient(),
        name: 'トマト',
        userId,
        categoryId: categoryIds.vegetable,
        memo: '有機栽培',
        purchaseDate: now,
        price: new Prisma.Decimal(300),
        quantity: 3,
        unitId: unitIds.piece,
        threshold: 2,
        storageLocationType: StorageLocation.REFRIGERATED,
        storageLocationDetail: '野菜室',
        useByDate: nextWeek,
      },
    }),
    prisma.ingredient.create({
      data: {
        id: generateId.ingredient(),
        name: '鶏もも肉',
        userId,
        categoryId: categoryIds.meatFish,
        purchaseDate: now,
        price: new Prisma.Decimal(450),
        quantity: 500,
        unitId: unitIds.gram,
        threshold: 200,
        storageLocationType: StorageLocation.REFRIGERATED,
        storageLocationDetail: 'チルド室',
        useByDate: tomorrow,
        bestBeforeDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.ingredient.create({
      data: {
        id: generateId.ingredient(),
        name: '牛乳',
        userId,
        categoryId: categoryIds.dairy,
        purchaseDate: now,
        price: new Prisma.Decimal(250),
        quantity: 1,
        unitId: unitIds.liter,
        threshold: 0.5,
        storageLocationType: StorageLocation.REFRIGERATED,
        storageLocationDetail: 'ドアポケット',
        useByDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.ingredient.create({
      data: {
        id: generateId.ingredient(),
        name: '卵',
        userId,
        categoryId: categoryIds.dairy,
        memo: 'Lサイズ',
        purchaseDate: now,
        price: new Prisma.Decimal(280),
        quantity: 10,
        unitId: unitIds.pack,
        threshold: 5,
        storageLocationType: StorageLocation.REFRIGERATED,
        storageLocationDetail: '上段',
        useByDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.ingredient.create({
      data: {
        id: generateId.ingredient(),
        name: '醤油',
        userId,
        categoryId: categoryIds.seasoning,
        purchaseDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        price: new Prisma.Decimal(350),
        quantity: 1,
        unitId: unitIds.bottle,
        threshold: 0.2,
        storageLocationType: StorageLocation.ROOM_TEMPERATURE,
        storageLocationDetail: '食器棚',
        useByDate: nextMonth,
      },
    }),
  ])

  console.log(`Created ${ingredients.length} sample ingredients`)

  // Create sample shopping sessions and items
  const sessionId = generateId.session()
  const shoppingSession = await prisma.shoppingSession.create({
    data: {
      id: sessionId,
      userId,
      status: SessionStatus.COMPLETED,
      startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2時間前に開始
      completedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1時間前に完了
      deviceType: 'mobile',
      location: JSON.stringify({ placeName: 'スーパーマーケット ABC' }),
      metadata: JSON.stringify({ totalDuration: 3600 }),
    },
  })
  console.log(`Created shopping session: ${shoppingSession.id}`)

  // Create sample session items (確認履歴)
  const sessionItems = await Promise.all([
    prisma.shoppingSessionItem.create({
      data: {
        id: generateId.sessionItem(),
        sessionId,
        ingredientId: ingredients[0].id, // トマト
        ingredientName: 'トマト',
        stockStatus: StockStatus.LOW_STOCK,
        expiryStatus: ExpiryStatus.FRESH,
        checkedAt: new Date(now.getTime() - 90 * 60 * 1000), // 90分前
        metadata: JSON.stringify({ note: '品質良好' }),
      },
    }),
    prisma.shoppingSessionItem.create({
      data: {
        id: generateId.sessionItem(),
        sessionId,
        ingredientId: ingredients[1].id, // 鶏もも肉
        ingredientName: '鶏もも肉',
        stockStatus: StockStatus.OUT_OF_STOCK,
        expiryStatus: null,
        checkedAt: new Date(now.getTime() - 85 * 60 * 1000), // 85分前
      },
    }),
    prisma.shoppingSessionItem.create({
      data: {
        id: generateId.sessionItem(),
        sessionId,
        ingredientId: ingredients[2].id, // 牛乳
        ingredientName: '牛乳',
        stockStatus: StockStatus.IN_STOCK,
        expiryStatus: ExpiryStatus.EXPIRING_SOON,
        checkedAt: new Date(now.getTime() - 80 * 60 * 1000), // 80分前
      },
    }),
  ])

  console.log(`Created shopping session with ${sessionItems.length} checked items`)

  // Create sample stock histories
  const stockHistories = await Promise.all([
    prisma.ingredientStockHistory.create({
      data: {
        id: cuid(),
        ingredientId: ingredients[0].id, // トマト
        operationType: 'CONSUME',
        quantityChange: -1,
        quantityBefore: 4,
        quantityAfter: 3,
        reason: '夕食で使用',
        operatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1日前
        operatedBy: userId,
      },
    }),
    prisma.ingredientStockHistory.create({
      data: {
        id: cuid(),
        ingredientId: ingredients[1].id, // 鶏もも肉
        operationType: 'REPLENISH',
        quantityChange: 500,
        quantityBefore: 0,
        quantityAfter: 500,
        reason: '購入',
        operatedAt: now,
        operatedBy: userId,
      },
    }),
  ])

  console.log(`Created ${stockHistories.length} stock history records`)

  // Create sample domain events
  const domainEvents = await Promise.all([
    prisma.domainEvent.create({
      data: {
        id: cuid(),
        aggregateId: ingredients[0].id,
        aggregateType: 'Ingredient',
        eventType: 'IngredientCreated',
        eventData: JSON.stringify({
          ingredientId: ingredients[0].id,
          name: ingredients[0].name,
          categoryId: ingredients[0].categoryId,
          userId,
        }),
        eventVersion: 1,
        occurredAt: now,
        userId,
        published: true,
        publishedAt: now,
      },
    }),
    prisma.domainEvent.create({
      data: {
        id: cuid(),
        aggregateId: sessionId,
        aggregateType: 'ShoppingSession',
        eventType: 'ShoppingSessionStarted',
        eventData: JSON.stringify({
          sessionId,
          userId,
          deviceType: 'mobile',
        }),
        eventVersion: 1,
        occurredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        userId,
        published: false, // 未発行イベントのサンプル
      },
    }),
  ])

  console.log(`Created ${domainEvents.length} domain events`)
  console.log('Seed completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
