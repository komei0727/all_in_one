import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import type { SuccessResponse, ErrorResponse } from '../../../shared/types/api'
import { IngredientNotFoundError } from '../../application/errors'

export function successResponse<T>(data: T, status: number = 200): NextResponse {
  // If data already has the success response structure, return as is
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return NextResponse.json(data, { status })
  }

  const body: SuccessResponse<T> = {
    data,
    success: true,
  }
  return NextResponse.json(body, { status })
}

export function errorResponse(error: unknown, status?: number): NextResponse {
  let message: string
  let code: string | undefined
  let statusCode: number

  if (error instanceof ZodError) {
    message = 'Validation failed'
    code = 'VALIDATION_ERROR'
    statusCode = 400

    // Include validation details
    const body: ErrorResponse = {
      error: message,
      success: false,
      code,
      details: error.flatten().fieldErrors as Record<string, string[]>,
    }
    return NextResponse.json(body, { status: statusCode })
  }

  if (error instanceof IngredientNotFoundError) {
    message = error.message
    code = 'NOT_FOUND'
    statusCode = 404
  } else if (error instanceof Error) {
    message = error.message
    statusCode = status || 500
  } else {
    message = 'Internal server error'
    statusCode = 500
  }

  const body: ErrorResponse = {
    error: statusCode === 500 ? 'Internal server error' : message,
    success: false,
    code,
  }

  return NextResponse.json(body, { status: statusCode })
}
