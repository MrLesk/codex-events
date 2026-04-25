import { and, desc, eq, or, sql } from 'drizzle-orm'

import { getDatabase } from '../../../../database/client'
import { auditLogs } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiList } from '../../../../utils/api-response'
import { requireHackathonAdmin, routeIdParamsSchema } from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

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
