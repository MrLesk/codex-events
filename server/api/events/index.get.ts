import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { eventListQuerySchema, listVisibleEvents, serializeEvent } from '#server/domains/events'
import { getDatabase } from '#server/database/client'
import { getEventDisplayImageOptions } from '#server/domains/platform/settings'
import { parseValidatedQuery } from '#server/http/validation'

type EventRecord = Awaited<ReturnType<typeof listVisibleEvents>>['items'][number]

export default defineApiHandler(async (h3Event) => {
  const query = parseValidatedQuery(h3Event, eventListQuerySchema)
  const database = getDatabase(h3Event)
  const [result, imageOptions] = await Promise.all([
    listVisibleEvents(h3Event, query),
    getEventDisplayImageOptions(database)
  ])

  return apiList(
    result.items.map((event: EventRecord) => serializeEvent(event, undefined, undefined, imageOptions)),
    {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total
    }
  )
})
