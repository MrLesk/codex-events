import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { eventRoleAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertCompetitionEvent,
  assertRoleCapabilityInvariant,
  getActiveUserOrThrow,
  requireEventAdmin,
  getRoleAssignmentOrThrow,
  roleAssignmentParamsSchema,
  roleAssignmentPatchBodySchema,
  serializeEventRoleAssignment
} from '#server/domains/events'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
import { eq } from 'drizzle-orm'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)

  const { eventId, userId } = parseValidatedParams(h3Event, roleAssignmentParamsSchema)
  const body = await parseValidatedBody(h3Event, roleAssignmentPatchBodySchema)
  const database = getDatabase(h3Event)

  const { event } = await requireEventAdmin(h3Event, eventId)
  const assignment = await getRoleAssignmentOrThrow(database, eventId, userId)
  const user = await getActiveUserOrThrow(database, userId)
  const nextIsInJudgePool = body.isInJudgePool ?? assignment.isInJudgePool
  const nextIsStaff = body.isStaff ?? assignment.isStaff

  assertRoleCapabilityInvariant(assignment.role, {
    isInJudgePool: nextIsInJudgePool,
    isStaff: nextIsStaff
  })

  if (assignment.role === 'judge' || nextIsInJudgePool) {
    assertCompetitionEvent(event)
  }

  await database
    .update(eventRoleAssignments)
    .set({
      isInJudgePool: nextIsInJudgePool,
      isStaff: nextIsStaff
    })
    .where(eq(eventRoleAssignments.id, assignment.id))

  const updatedAssignment = await getRoleAssignmentOrThrow(database, eventId, userId)

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event_role_assignment',
    entityId: assignment.id,
    action: 'event_role_assignment.updated',
    metadata: {
      eventId,
      userId,
      role: assignment.role,
      isInJudgePool: nextIsInJudgePool,
      isStaff: nextIsStaff
    }
  })

  return apiData(serializeEventRoleAssignment(updatedAssignment, user))
})
