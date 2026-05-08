import { and, desc, eq, or, sql } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { auditLogs } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { requireEventAdmin, routeIdParamsSchema } from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

const auditLogReadLimit = 200

export default defineApiHandler(async (h3Event) => {
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const database = getDatabase(h3Event)

  await requireEventAdmin(h3Event, eventId)

  const auditRows = await database.query.auditLogs.findMany({
    where: or(
      and(
        eq(auditLogs.entityType, 'event'),
        eq(auditLogs.entityId, eventId)
      ),
      sql`json_extract(${auditLogs.metadata}, '$.eventId') = ${eventId}`
    ),
    orderBy: [desc(auditLogs.createdAt)],
    limit: auditLogReadLimit
  })

  return apiList(auditRows, {
    total: auditRows.length
  })
})
