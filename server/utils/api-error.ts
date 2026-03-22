import type { H3Event } from 'h3'

import { setResponseStatus } from 'h3'

export interface ApiErrorOptions {
  statusCode: number
  code: string
  message: string
  details?: Record<string, unknown>
  cause?: unknown
}

export class ApiError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(options: ApiErrorOptions) {
    super(options.message, { cause: options.cause })
    this.name = 'ApiError'
    this.statusCode = options.statusCode
    this.code = options.code
    this.details = options.details
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function toApiError(error: unknown) {
  if (isApiError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new ApiError({
      statusCode: 500,
      code: 'internal_error',
      message: error.message || 'An unexpected error occurred.',
      cause: error
    })
  }

  return new ApiError({
    statusCode: 500,
    code: 'internal_error',
    message: 'An unexpected error occurred.',
    details: { error }
  })
}

export function sendApiError(event: H3Event, error: unknown) {
  const apiError = toApiError(error)
  setResponseStatus(event, apiError.statusCode)

  return {
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details ? { details: apiError.details } : {})
    }
  }
}
