import type { H3Event } from 'h3'

import { getQuery, readBody } from 'h3'
import type { z } from 'zod'

import { ApiError } from './api-error'

export function validateWithSchema<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  payload: unknown,
  input: 'body' | 'query' | 'params' | 'output'
): z.infer<TSchema> {
  const result = schema.safeParse(payload)

  if (result.success) {
    return result.data
  }

  throw new ApiError({
    statusCode: 400,
    code: 'invalid_request',
    message: input === 'output'
      ? 'The response output did not match the expected schema.'
      : `The request ${input} did not match the expected schema.`,
    details: {
      input,
      issues: result.error.issues.map(issue => ({
        code: issue.code,
        path: issue.path,
        message: issue.message
      }))
    }
  })
}

export async function parseValidatedBody<TSchema extends z.ZodTypeAny>(event: H3Event, schema: TSchema) {
  const operationInput = event.context.applicationOperationInput as { body?: unknown } | undefined
  return validateWithSchema(schema, operationInput ? operationInput.body : await readBody(event), 'body')
}

export function parseValidatedQuery<TSchema extends z.ZodTypeAny>(event: H3Event, schema: TSchema) {
  const operationInput = event.context.applicationOperationInput as { query?: unknown } | undefined
  return validateWithSchema(schema, operationInput?.query ?? getQuery(event), 'query')
}

export function parseValidatedParams<TSchema extends z.ZodTypeAny>(event: H3Event, schema: TSchema) {
  const operationInput = event.context.applicationOperationInput as { params?: unknown } | undefined
  return validateWithSchema(schema, operationInput?.params ?? event.context.params ?? {}, 'params')
}
