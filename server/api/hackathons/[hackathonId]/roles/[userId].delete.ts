import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { hackathonRoleAssignments } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import { getRoleAssignmentOrThrow, requireHackathonAdmin, roleAssignmentParamsSchema } from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

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
