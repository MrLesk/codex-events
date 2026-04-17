import { and, eq, inArray } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { hackathons, judgeAssignments } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '../../../../utils/hackathon-management'
import {
  assertStartFinalDeliberationAllowed,
  listLeaderboardEntries
} from '../../../../utils/shortlist'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  const leaderboardEntries = await listLeaderboardEntries(database, hackathonId)
  const lockedSubmissionIds = leaderboardEntries
    .filter(entry => entry.submission.status === 'locked')
    .map(entry => entry.submission.id)
  const completedPitchReviewCount = hackathon.state !== 'pitch_review' || lockedSubmissionIds.length === 0
    ? 0
    : (await database.query.judgeAssignments.findMany({
        columns: {
          id: true
        },
        where: and(
          inArray(judgeAssignments.submissionId, lockedSubmissionIds),
          eq(judgeAssignments.reviewStage, 'pitch_review'),
          eq(judgeAssignments.status, 'judge_completed')
        )
      })).length

  assertStartFinalDeliberationAllowed(hackathon, leaderboardEntries, {
    completedPitchReviewCount
  })

  const transitionedAt = new Date().toISOString()

  await database
    .update(hackathons)
    .set({
      state: 'final_deliberation',
      finalRankingSubmissionIdsJson: hackathon.state === 'blind_review'
        ? '[]'
        : hackathon.finalRankingSubmissionIdsJson,
      updatedAt: transitionedAt
    })
    .where(eq(hackathons.id, hackathonId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.start_final_deliberation',
    metadata: {
      previousState: hackathon.state,
      nextState: 'final_deliberation',
      rankedSubmissionCount: leaderboardEntries.filter(entry => entry.isRanked).length
    }
  })

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
