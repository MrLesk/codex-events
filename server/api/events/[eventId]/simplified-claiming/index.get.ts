import { getDatabase } from '#server/database/client'
import { getSimplifiedClaimingSummary } from '#server/domains/credits/simplified-claiming'
import { requireEventAdmin, routeIdParamsSchema } from '#server/domains/events'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const { event } = await requireEventAdmin(h3Event, eventId)
  const summary = await getSimplifiedClaimingSummary(getDatabase(h3Event), event)
  const redemptionUrl = new URL(
    `/events/${event.slug}/redeem`,
    useRuntimeConfig(h3Event).auth0.appBaseUrl
  ).toString()

  return apiData({
    enabled: event.simplifiedClaimingEnabled,
    redemptionUrl,
    ...summary,
    offer: summary.offer
      ? {
          id: summary.offer.id,
          name: summary.offer.name
        }
      : null
  })
})
