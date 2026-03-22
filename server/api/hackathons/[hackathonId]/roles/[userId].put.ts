import { and, eq } from 'drizzle-orm'

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
  getHackathonOrThrow,
  roleAssignmentParamsSchema,
  roleAssignmentUpsertBodySchema,
  serializeHackathonRoleAssignment
} from '../../../../utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  assertPlatformAdminAccess(actor)

  const { hackathonId, userId } = parseValidatedParams(event, roleAssignmentParamsSchema)
  const body = await parseValidatedBody(event, roleAssignmentUpsertBodySchema)
  const database = getDatabase(event)

  await getHackathonOrThrow(database, hackathonId)
  const user = await getActiveUserOrThrow(database, userId)
  assertRoleJudgePoolInvariant(body.role, body.isInJudgePool)

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
        isInJudgePool: body.isInJudgePool
      })
      .where(eq(hackathonRoleAssignments.id, existingAssignment.id))
  } else {
    await database.insert(hackathonRoleAssignments).values({
      id: crypto.randomUUID(),
      hackathonId,
      userId,
      role: body.role,
      isInJudgePool: body.isInJudgePool,
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
      isInJudgePool: body.isInJudgePool
    }
  })

  return apiData(serializeHackathonRoleAssignment(assignment!, user))
})
