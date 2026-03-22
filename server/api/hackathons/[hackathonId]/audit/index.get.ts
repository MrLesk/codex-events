import { desc } from 'drizzle-orm'

import { getDatabase } from '../../../../database/client'
import { auditLogs } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiList } from '../../../../utils/api-response'
import { requireHackathonAdmin, routeIdParamsSchema } from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)

  const auditRows = await database.query.auditLogs.findMany({
    orderBy: [desc(auditLogs.createdAt)]
  })

  const scopedRows = auditRows.filter((row: typeof auditLogs.$inferSelect) => {
    const metadataHackathonId = (row.metadata as { hackathonId?: unknown } | null)?.hackathonId
    return (
      (row.entityType === 'hackathon' && row.entityId === hackathonId)
      || metadataHackathonId === hackathonId
    )
  })

  return apiList(scopedRows, {
    total: scopedRows.length
  })
})
