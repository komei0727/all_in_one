import { NextRequest, NextResponse } from 'next/server'

import {
  getAllIngredientsUseCase,
  getIngredientByIdUseCase,
  createIngredientUseCase,
  updateIngredientUseCase,
  deleteIngredientUseCase,
  getExpiringIngredientsUseCase,
} from './container'
import { successResponse, errorResponse } from './utils/response'
import {
  getIngredientsParamsSchema,
  createIngredientSchema,
  updateIngredientSchema,
  getExpiringIngredientsParamsSchema,
} from '../../shared/validations/schemas'

// GET /api/ingredients
export async function getAllIngredientsHandler(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const params = {
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      sort: searchParams.get('sort') || undefined,
      order: searchParams.get('order') || undefined,
    }

    const validatedParams = getIngredientsParamsSchema.parse(params)
    const result = await getAllIngredientsUseCase.execute(validatedParams)
    return successResponse(result)
  } catch (error) {
    return errorResponse(error)
  }
}

// POST /api/ingredients
export async function createIngredientHandler(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return errorResponse(new Error('Invalid request body'), 400)
    }

    const validatedInput = createIngredientSchema.parse(body)
    const result = await createIngredientUseCase.execute(validatedInput)
    return successResponse(result, 201)
  } catch (error) {
    return errorResponse(error)
  }
}

// GET /api/ingredients/{id}
export async function getIngredientByIdHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await getIngredientByIdUseCase.execute(params.id)
    return successResponse(result)
  } catch (error) {
    return errorResponse(error)
  }
}

// PUT /api/ingredients/{id}
export async function updateIngredientHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return errorResponse(new Error('Invalid request body'), 400)
    }

    const validatedInput = updateIngredientSchema.parse(body)
    const result = await updateIngredientUseCase.execute(params.id, validatedInput)
    return successResponse(result)
  } catch (error) {
    return errorResponse(error)
  }
}

// DELETE /api/ingredients/{id}
export async function deleteIngredientHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteIngredientUseCase.execute(params.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return errorResponse(error)
  }
}

// GET /api/ingredients/expiring
export async function getExpiringIngredientsHandler(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const params = {
      days: searchParams.get('days') ? Number(searchParams.get('days')) : undefined,
    }

    const validatedParams = getExpiringIngredientsParamsSchema.parse(params)
    const result = await getExpiringIngredientsUseCase.execute(validatedParams)
    return successResponse(result)
  } catch (error) {
    return errorResponse(error)
  }
}
