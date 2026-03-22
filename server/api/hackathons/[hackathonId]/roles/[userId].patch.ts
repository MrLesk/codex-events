import { requirePlatformActor } from '../../../../auth/actor'
import { assertPlatformAdminAccess } from '../../../../auth/authorization'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { hackathonRoleAssignments } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  assertRoleJudgePoolInvariant,
  getActiveUserOrThrow,
  getRoleAssignmentOrThrow,
  roleAssignmentParamsSchema,
  roleAssignmentPatchBodySchema,
  serializeHackathonRoleAssignment
} from '../../../../utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '../../../../utils/validation'
import { eq } from 'drizzle-orm'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  assertPlatformAdminAccess(actor)

  const { hackathonId, userId } = parseValidatedParams(event, roleAssignmentParamsSchema)
  const body = await parseValidatedBody(event, roleAssignmentPatchBodySchema)
  const database = getDatabase(event)

  const assignment = await getRoleAssignmentOrThrow(database, hackathonId, userId)
  const user = await getActiveUserOrThrow(database, userId)

  assertRoleJudgePoolInvariant(assignment.role, body.isInJudgePool)

  await database
    .update(hackathonRoleAssignments)
    .set({
      isInJudgePool: body.isInJudgePool
    })
    .where(eq(hackathonRoleAssignments.id, assignment.id))

  const updatedAssignment = await getRoleAssignmentOrThrow(database, hackathonId, userId)

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon_role_assignment',
    entityId: assignment.id,
    action: 'hackathon_role_assignment.updated',
    metadata: {
      hackathonId,
      userId,
      role: assignment.role,
      isInJudgePool: body.isInJudgePool
    }
  })

  return apiData(serializeHackathonRoleAssignment(updatedAssignment, user))
})
