import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertEventFeedbackAvailable,
  createEventFeedback,
  createEventFeedbackBodySchema
} from '#server/domains/events/feedback'
import {
  getPublicEventBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/domains/events'
import { assertPublicEventFeedbackRateLimit } from '#server/utils/rate-limit'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)
  const body = await parseValidatedBody(h3Event, createEventFeedbackBodySchema)
  const database = getDatabase(h3Event)
  const event = await getPublicEventBySlugOrThrow(database, slug)

  assertEventFeedbackAvailable(event)
  await assertPublicEventFeedbackRateLimit(h3Event, `public-event-feedback:${event.id}`)
  await createEventFeedback(database, event.id, body)

  return apiData({
    status: 'submitted'
  })
})
