import { defineApiHandler } from '#server/http/api-handler'
import { parseValidatedParams } from '#server/http/validation'
import { routeSlugParamsSchema } from '#server/domains/events'
import { executeAccountEventPageRoute } from '#server/domains/events/account-event-page-contract'
import { accountEventFeedbackPageRoute } from '#server/domains/events/account-event-feedback-page'

export default defineApiHandler(async (h3Event) => {
  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)
  return await executeAccountEventPageRoute(h3Event, slug, accountEventFeedbackPageRoute)
})
