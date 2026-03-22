import { desc } from 'drizzle-orm'

import { requirePlatformActor } from '../../auth/actor'
import { assertPlatformAdminAccess } from '../../auth/authorization'
import { getDatabase } from '../../database/client'
import { auditLogs } from '../../database/schema'
import { defineApiHandler } from '../../utils/api-handler'
import { apiList } from '../../utils/api-response'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)

  assertPlatformAdminAccess(actor)

  const auditRows = await database.query.auditLogs.findMany({
    orderBy: [desc(auditLogs.createdAt)]
  })

  return apiList(auditRows, {
    total: auditRows.length
  })
})
