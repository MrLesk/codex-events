import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { eventListQuerySchema, listVisibleEvents, serializeEvent } from '#server/domains/events'
import { parseValidatedQuery } from '#server/http/validation'

type EventRecord = Awaited<ReturnType<typeof listVisibleEvents>>['items'][number]

export default defineApiHandler(async (h3Event) => {
  const query = parseValidatedQuery(h3Event, eventListQuerySchema)
  const result = await listVisibleEvents(h3Event, query)

  return apiList(
    result.items.map((event: EventRecord) => serializeEvent(event)),
    {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total
    }
  )
})
