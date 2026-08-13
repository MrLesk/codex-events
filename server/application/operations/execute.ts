import type { H3Event } from 'h3'
import type { z } from 'zod'

import type { ApplicationOperation } from './types'
import { validateWithSchema } from '#server/http/validation'

export async function executeApplicationOperation<TInputSchema extends z.ZodTypeAny, TOutputSchema extends z.ZodTypeAny>(
  event: H3Event,
  operation: ApplicationOperation<TInputSchema, TOutputSchema>,
  input: unknown
): Promise<z.output<TOutputSchema>> {
  // MCP validates the composite schema before this call. The shared executor
  // validates each component at its original position relative to guards so
  // REST error ordering remains unchanged.
  const output = await operation.execute(event, input as z.output<TInputSchema>)
  return validateWithSchema(operation.outputSchema, output, 'params') as z.output<TOutputSchema>
}
