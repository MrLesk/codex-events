import { desc } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { assertPlatformAdminAccess } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { auditLogs } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'

const auditLogReadLimit = 200

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const database = getDatabase(h3Event)

  assertPlatformAdminAccess(actor)

  const auditRows = await database.query.auditLogs.findMany({
    orderBy: [desc(auditLogs.createdAt)],
    limit: auditLogReadLimit
  })

  return apiList(auditRows, {
    total: auditRows.length
  })
})
