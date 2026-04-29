import { ApiError } from '#server/http/api-error'

export function assertAllowedState<T extends string>(
  currentState: T,
  allowedStates: readonly T[],
  options: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
) {
  if (allowedStates.includes(currentState)) {
    return
  }

  throw new ApiError({
    statusCode: 409,
    code: options.code,
    message: options.message,
    details: {
      currentState,
      allowedStates,
      ...options.details
    }
  })
}

export function assertGuard(condition: unknown, options: {
  code: string
  message: string
  details?: Record<string, unknown>
  statusCode?: number
}) {
  if (condition) {
    return
  }

  throw new ApiError({
    statusCode: options.statusCode ?? 409,
    code: options.code,
    message: options.message,
    details: options.details
  })
}
