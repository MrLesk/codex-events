import { z } from 'zod'

export type StructuredOperationInputComponents = {
  params?: z.ZodTypeAny
  query?: z.ZodTypeAny
  body?: z.ZodTypeAny
}

export function structuredOperationInputSchema(components: StructuredOperationInputComponents) {
  return z.object({
    ...(components.params ? { params: components.params } : {}),
    ...(components.query ? { query: components.query } : {}),
    ...(components.body ? { body: components.body } : {})
  })
}
