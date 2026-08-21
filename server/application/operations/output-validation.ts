import type { z } from 'zod'

import { createInternalApiError } from '#server/http/api-error'

export function validateApplicationOperationOutput<TSchema extends z.ZodTypeAny>(
  operationId: string,
  schema: TSchema,
  payload: unknown
): z.output<TSchema> {
  const result = schema.safeParse(payload)

  if (result.success) {
    return result.data
  }

  console.error('Application operation output validation failed', {
    operationId,
    issues: result.error.issues.map(issue => ({
      code: issue.code,
      path: [...issue.path],
      message: issue.message
    }))
  })

  throw createInternalApiError()
}
