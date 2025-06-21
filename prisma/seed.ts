import { PrismaClient, StorageLocation } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Delete existing data
  await prisma.ingredient.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.category.deleteMany()

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: '野菜', description: '野菜類' },
    }),
    prisma.category.create({
      data: { name: '肉・魚', description: '肉類・魚介類' },
    }),
    prisma.category.create({
      data: { name: '乳製品', description: '牛乳・チーズ・ヨーグルトなど' },
    }),
    prisma.category.create({
      data: { name: '調味料', description: '醤油・味噌・スパイスなど' },
    }),
    prisma.category.create({
      data: { name: '飲料', description: '水・ジュース・お茶など' },
    }),
    prisma.category.create({
      data: { name: 'その他', description: 'その他の食材' },
    }),
  ])

  console.log(`Created ${categories.length} categories`)

  // Create units
  const units = await Promise.all([
    prisma.unit.create({
      data: { name: '個', description: '個数' },
    }),
    prisma.unit.create({
      data: { name: 'g', description: 'グラム' },
    }),
    prisma.unit.create({
      data: { name: 'kg', description: 'キログラム' },
    }),
    prisma.unit.create({
      data: { name: 'ml', description: 'ミリリットル' },
    }),
    prisma.unit.create({
      data: { name: 'L', description: 'リットル' },
    }),
    prisma.unit.create({
      data: { name: '本', description: '本数' },
    }),
    prisma.unit.create({
      data: { name: 'パック', description: 'パック' },
    }),
    prisma.unit.create({
      data: { name: '袋', description: '袋' },
    }),
  ])

  console.log(`Created ${units.length} units`)

  // Create sample ingredients
  const vegetableCategory = categories.find((c) => c.name === '野菜')!
  const meatFishCategory = categories.find((c) => c.name === '肉・魚')!
  const dairyCategory = categories.find((c) => c.name === '乳製品')!
  const seasoningCategory = categories.find((c) => c.name === '調味料')!

  const pieceUnit = units.find((u) => u.name === '個')!
  const gramUnit = units.find((u) => u.name === 'g')!
  const packUnit = units.find((u) => u.name === 'パック')!
  const bottleUnit = units.find((u) => u.name === '本')!
  const literUnit = units.find((u) => u.name === 'L')!

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
        quantity: 3,
        unitId: pieceUnit.id,
        expiryDate: nextWeek,
        purchaseDate: now,
        price: 300,
        storageLocation: StorageLocation.REFRIGERATED,
        memo: '有機栽培',
      },
    }),
    prisma.ingredient.create({
      data: {
        name: '鶏もも肉',
        categoryId: meatFishCategory.id,
        quantity: 500,
        unitId: gramUnit.id,
        expiryDate: tomorrow,
        bestBeforeDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        purchaseDate: now,
        price: 450,
        storageLocation: StorageLocation.REFRIGERATED,
      },
    }),
    prisma.ingredient.create({
      data: {
        name: '牛乳',
        categoryId: dairyCategory.id,
        quantity: 1,
        unitId: literUnit.id,
        expiryDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        purchaseDate: now,
        price: 250,
        storageLocation: StorageLocation.REFRIGERATED,
      },
    }),
    prisma.ingredient.create({
      data: {
        name: '卵',
        categoryId: dairyCategory.id,
        quantity: 10,
        unitId: packUnit.id,
        expiryDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        purchaseDate: now,
        price: 280,
        storageLocation: StorageLocation.REFRIGERATED,
        memo: 'Lサイズ',
      },
    }),
    prisma.ingredient.create({
      data: {
        name: '醤油',
        categoryId: seasoningCategory.id,
        quantity: 1,
        unitId: bottleUnit.id,
        expiryDate: nextMonth,
        purchaseDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        price: 350,
        storageLocation: StorageLocation.ROOM_TEMPERATURE,
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
