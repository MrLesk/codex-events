import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { eventRoleAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { getRoleAssignmentOrThrow, requireEventAdmin, roleAssignmentParamsSchema } from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)

  const { eventId, userId } = parseValidatedParams(h3Event, roleAssignmentParamsSchema)
  const database = getDatabase(h3Event)

  await requireEventAdmin(h3Event, eventId)
  const assignment = await getRoleAssignmentOrThrow(database, eventId, userId)

  await database
    .delete(eventRoleAssignments)
    .where(eq(eventRoleAssignments.id, assignment.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event_role_assignment',
    entityId: assignment.id,
    action: 'event_role_assignment.deleted',
    metadata: {
      eventId,
      userId,
      role: assignment.role
    }
  })

  return apiData({
    id: assignment.id,
    eventId,
    userId,
    deleted: true
  })
})
