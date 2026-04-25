import { and, desc, eq, or, sql } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { auditLogs } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import { requireHackathonAdmin, routeIdParamsSchema } from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/utils/validation'

const auditLogReadLimit = 200

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)

  const auditRows = await database.query.auditLogs.findMany({
    where: or(
      and(
        eq(auditLogs.entityType, 'hackathon'),
        eq(auditLogs.entityId, hackathonId)
      ),
      sql`json_extract(${auditLogs.metadata}, '$.hackathonId') = ${hackathonId}`
    ),
    orderBy: [desc(auditLogs.createdAt)],
    limit: auditLogReadLimit
  })

  return apiList(auditRows, {
    total: auditRows.length
  })
})
