/* eslint-disable no-console */
import { PrismaClient, StorageLocation, UnitType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Delete existing data
  await prisma.ingredientStock.deleteMany()
  await prisma.ingredient.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.category.deleteMany()

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: '野菜', description: '野菜類', displayOrder: 1 },
    }),
    prisma.category.create({
      data: { name: '肉・魚', description: '肉類・魚介類', displayOrder: 2 },
    }),
    prisma.category.create({
      data: { name: '乳製品', description: '牛乳・チーズ・ヨーグルトなど', displayOrder: 3 },
    }),
    prisma.category.create({
      data: { name: '調味料', description: '醤油・味噌・スパイスなど', displayOrder: 4 },
    }),
    prisma.category.create({
      data: { name: '飲料', description: '水・ジュース・お茶など', displayOrder: 5 },
    }),
    prisma.category.create({
      data: { name: 'その他', description: 'その他の食材', displayOrder: 6 },
    }),
  ])

  console.log(`Created ${categories.length} categories`)

  // Create units
  const units = await Promise.all([
    prisma.unit.create({
      data: {
        name: '個',
        symbol: '個',
        type: UnitType.COUNT,
        description: '個数',
        displayOrder: 1,
      },
    }),
    prisma.unit.create({
      data: {
        name: 'グラム',
        symbol: 'g',
        type: UnitType.WEIGHT,
        description: 'グラム',
        displayOrder: 2,
      },
    }),
    prisma.unit.create({
      data: {
        name: 'キログラム',
        symbol: 'kg',
        type: UnitType.WEIGHT,
        description: 'キログラム',
        displayOrder: 3,
      },
    }),
    prisma.unit.create({
      data: {
        name: 'ミリリットル',
        symbol: 'ml',
        type: UnitType.VOLUME,
        description: 'ミリリットル',
        displayOrder: 4,
      },
    }),
    prisma.unit.create({
      data: {
        name: 'リットル',
        symbol: 'L',
        type: UnitType.VOLUME,
        description: 'リットル',
        displayOrder: 5,
      },
    }),
    prisma.unit.create({
      data: {
        name: '本',
        symbol: '本',
        type: UnitType.COUNT,
        description: '本数',
        displayOrder: 6,
      },
    }),
    prisma.unit.create({
      data: {
        name: 'パック',
        symbol: 'パック',
        type: UnitType.COUNT,
        description: 'パック',
        displayOrder: 7,
      },
    }),
    prisma.unit.create({
      data: { name: '袋', symbol: '袋', type: UnitType.COUNT, description: '袋', displayOrder: 8 },
    }),
  ])

  console.log(`Created ${units.length} units`)

  // Create sample ingredients
  const vegetableCategory = categories.find((c) => c.name === '野菜')!
  const meatFishCategory = categories.find((c) => c.name === '肉・魚')!
  const dairyCategory = categories.find((c) => c.name === '乳製品')!
  const seasoningCategory = categories.find((c) => c.name === '調味料')!

  const pieceUnit = units.find((u) => u.symbol === '個')!
  const gramUnit = units.find((u) => u.symbol === 'g')!
  const packUnit = units.find((u) => u.symbol === 'パック')!
  const bottleUnit = units.find((u) => u.symbol === '本')!
  const literUnit = units.find((u) => u.symbol === 'L')!

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
        name: 'トマト',
        categoryId: vegetableCategory.id,
        unitId: pieceUnit.id,
        expiryDate: nextWeek,
        storageLocation: StorageLocation.REFRIGERATED,
        notes: '有機栽培',
        stocks: {
          create: {
            quantity: 3,
            purchaseDate: now,
            purchasePrice: 300,
            unitId: pieceUnit.id,
          },
        },
      },
    }),
    prisma.ingredient.create({
      data: {
        name: '鶏もも肉',
        categoryId: meatFishCategory.id,
        unitId: gramUnit.id,
        expiryDate: tomorrow,
        bestBeforeDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        storageLocation: StorageLocation.REFRIGERATED,
        stocks: {
          create: {
            quantity: 500,
            purchaseDate: now,
            purchasePrice: 450,
            unitId: gramUnit.id,
          },
        },
      },
    }),
    prisma.ingredient.create({
      data: {
        name: '牛乳',
        categoryId: dairyCategory.id,
        unitId: literUnit.id,
        expiryDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        storageLocation: StorageLocation.REFRIGERATED,
        stocks: {
          create: {
            quantity: 1,
            purchaseDate: now,
            purchasePrice: 250,
            unitId: literUnit.id,
          },
        },
      },
    }),
    prisma.ingredient.create({
      data: {
        name: '卵',
        categoryId: dairyCategory.id,
        unitId: packUnit.id,
        expiryDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        storageLocation: StorageLocation.REFRIGERATED,
        notes: 'Lサイズ',
        stocks: {
          create: {
            quantity: 10,
            purchaseDate: now,
            purchasePrice: 280,
            unitId: packUnit.id,
          },
        },
      },
    }),
    prisma.ingredient.create({
      data: {
        name: '醤油',
        categoryId: seasoningCategory.id,
        unitId: bottleUnit.id,
        expiryDate: nextMonth,
        storageLocation: StorageLocation.ROOM_TEMPERATURE,
        stocks: {
          create: {
            quantity: 1,
            purchaseDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            purchasePrice: 350,
            unitId: bottleUnit.id,
          },
        },
      },
    }),
  ])

  console.log(`Created ${ingredients.length} sample ingredients`)
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
