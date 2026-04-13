import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { hackathons } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  assertStartJudgeReviewAllowed,
  listActiveAssignmentsForSubmissions,
  listLockedSubmissionsForHackathon
} from '../../../../utils/judging'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  const lockedSubmissions = await listLockedSubmissionsForHackathon(database, hackathonId)
  const activeAssignments = await listActiveAssignmentsForSubmissions(
    database,
    lockedSubmissions.map(submission => submission.id),
    'blind_review'
  )

  assertStartJudgeReviewAllowed(hackathon, {
    lockedSubmissionCount: lockedSubmissions.length,
    activeAssignmentCount: activeAssignments.length
  })

  const transitionedAt = new Date().toISOString()

  await database
    .update(hackathons)
    .set({
      state: 'blind_review',
      updatedAt: transitionedAt
    })
    .where(eq(hackathons.id, hackathonId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.start_blind_review',
    metadata: {
      previousState: hackathon.state,
      nextState: 'blind_review',
      lockedSubmissionCount: lockedSubmissions.length,
      activeAssignmentCount: activeAssignments.length
    }
  })

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
