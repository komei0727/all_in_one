import { prisma } from '@/lib/prisma/client'

import { CreateIngredientUseCase } from '../application/use-cases/create-ingredient'
import { DeleteIngredientUseCase } from '../application/use-cases/delete-ingredient'
import { GetAllIngredientsUseCase } from '../application/use-cases/get-all-ingredients'
import { GetExpiringIngredientsUseCase } from '../application/use-cases/get-expiring-ingredients'
import { GetIngredientByIdUseCase } from '../application/use-cases/get-ingredient-by-id'
import { UpdateIngredientUseCase } from '../application/use-cases/update-ingredient'
import { PrismaIngredientRepository } from '../infrastructure/repositories/prisma-ingredient-repository'

// Repository
const ingredientRepository = new PrismaIngredientRepository(prisma)

// Use Cases
export const getAllIngredientsUseCase = new GetAllIngredientsUseCase(ingredientRepository)
export const getIngredientByIdUseCase = new GetIngredientByIdUseCase(ingredientRepository)
export const createIngredientUseCase = new CreateIngredientUseCase(ingredientRepository)
export const updateIngredientUseCase = new UpdateIngredientUseCase(ingredientRepository)
export const deleteIngredientUseCase = new DeleteIngredientUseCase(ingredientRepository)
export const getExpiringIngredientsUseCase = new GetExpiringIngredientsUseCase(ingredientRepository)
