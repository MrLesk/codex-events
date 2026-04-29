import type { H3Event } from 'h3'

import { getQuery, readBody } from 'h3'
import type { z } from 'zod'

import { ApiError } from './api-error'

export function validateWithSchema<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  payload: unknown,
  input: 'body' | 'query' | 'params'
): z.infer<TSchema> {
  const result = schema.safeParse(payload)

  if (result.success) {
    return result.data
  }

  throw new ApiError({
    statusCode: 400,
    code: 'invalid_request',
    message: `The request ${input} did not match the expected schema.`,
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
  return validateWithSchema(schema, await readBody(event), 'body')
}

export function parseValidatedQuery<TSchema extends z.ZodTypeAny>(event: H3Event, schema: TSchema) {
  return validateWithSchema(schema, getQuery(event), 'query')
}

export function parseValidatedParams<TSchema extends z.ZodTypeAny>(event: H3Event, schema: TSchema) {
  return validateWithSchema(schema, event.context.params ?? {}, 'params')
}
