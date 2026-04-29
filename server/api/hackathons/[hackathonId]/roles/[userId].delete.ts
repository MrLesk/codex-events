import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathonRoleAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { getRoleAssignmentOrThrow, requireHackathonAdmin, roleAssignmentParamsSchema } from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)

  const { hackathonId, userId } = parseValidatedParams(event, roleAssignmentParamsSchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)
  const assignment = await getRoleAssignmentOrThrow(database, hackathonId, userId)

  await database
    .delete(hackathonRoleAssignments)
    .where(eq(hackathonRoleAssignments.id, assignment.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon_role_assignment',
    entityId: assignment.id,
    action: 'hackathon_role_assignment.deleted',
    metadata: {
      hackathonId,
      userId,
      role: assignment.role
    }
  })

  return apiData({
    id: assignment.id,
    hackathonId,
    userId,
    deleted: true
  })
})
