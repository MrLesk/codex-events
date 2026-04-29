import { and, eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathonRoleAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertRoleCapabilityInvariant,
  getActiveUserOrThrow,
  requireHackathonAdmin,
  roleAssignmentParamsSchema,
  roleAssignmentUpsertBodySchema,
  serializeHackathonRoleAssignment
} from '#server/domains/hackathons'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)

  const { hackathonId, userId } = parseValidatedParams(event, roleAssignmentParamsSchema)
  const body = await parseValidatedBody(event, roleAssignmentUpsertBodySchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)
  const user = await getActiveUserOrThrow(database, userId)
  assertRoleCapabilityInvariant(body.role, {
    isInJudgePool: body.isInJudgePool,
    isStaff: body.isStaff
  })

  const existingAssignment = await database.query.hackathonRoleAssignments.findFirst({
    where: and(
      eq(hackathonRoleAssignments.hackathonId, hackathonId),
      eq(hackathonRoleAssignments.userId, userId)
    )
  })

  const createdAt = existingAssignment?.createdAt ?? new Date().toISOString()

  if (existingAssignment) {
    await database
      .update(hackathonRoleAssignments)
      .set({
        role: body.role,
        isInJudgePool: body.isInJudgePool,
        isStaff: body.isStaff
      })
      .where(eq(hackathonRoleAssignments.id, existingAssignment.id))
  } else {
    await database.insert(hackathonRoleAssignments).values({
      id: crypto.randomUUID(),
      hackathonId,
      userId,
      role: body.role,
      isInJudgePool: body.isInJudgePool,
      isStaff: body.isStaff,
      createdAt
    })
  }

  const assignment = await database.query.hackathonRoleAssignments.findFirst({
    where: and(
      eq(hackathonRoleAssignments.hackathonId, hackathonId),
      eq(hackathonRoleAssignments.userId, userId)
    )
  })

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon_role_assignment',
    entityId: assignment!.id,
    action: existingAssignment ? 'hackathon_role_assignment.replaced' : 'hackathon_role_assignment.created',
    metadata: {
      hackathonId,
      userId,
      role: body.role,
      isInJudgePool: body.isInJudgePool,
      isStaff: body.isStaff
    }
  })

  return apiData(serializeHackathonRoleAssignment(assignment!, user))
})
