import { parseValidatedParams } from '#server/http/validation'
import { defineApiHandler } from '#server/http/api-handler'
import { routeSlugParamsSchema } from '#server/domains/events'
import { executeAccountEventPageRoute } from '#server/domains/events/account-event-page-contract'
import { accountEventPrizesPageRoute } from '#server/domains/events/account-event-prizes-page'

export default defineApiHandler(async (h3Event) => {
  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)

  return await executeAccountEventPageRoute(
    h3Event,
    slug,
    accountEventPrizesPageRoute
  )
})
