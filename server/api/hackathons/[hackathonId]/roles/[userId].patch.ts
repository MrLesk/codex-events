import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathonRoleAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  assertRoleCapabilityInvariant,
  getActiveUserOrThrow,
  requireHackathonAdmin,
  getRoleAssignmentOrThrow,
  roleAssignmentParamsSchema,
  roleAssignmentPatchBodySchema,
  serializeHackathonRoleAssignment
} from '#server/utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '#server/utils/validation'
import { eq } from 'drizzle-orm'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)

  const { hackathonId, userId } = parseValidatedParams(event, roleAssignmentParamsSchema)
  const body = await parseValidatedBody(event, roleAssignmentPatchBodySchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)
  const assignment = await getRoleAssignmentOrThrow(database, hackathonId, userId)
  const user = await getActiveUserOrThrow(database, userId)
  const nextIsInJudgePool = body.isInJudgePool ?? assignment.isInJudgePool
  const nextIsStaff = body.isStaff ?? assignment.isStaff

  assertRoleCapabilityInvariant(assignment.role, {
    isInJudgePool: nextIsInJudgePool,
    isStaff: nextIsStaff
  })

  await database
    .update(hackathonRoleAssignments)
    .set({
      isInJudgePool: nextIsInJudgePool,
      isStaff: nextIsStaff
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
      isInJudgePool: nextIsInJudgePool,
      isStaff: nextIsStaff
    }
  })

  return apiData(serializeHackathonRoleAssignment(updatedAssignment, user))
})
