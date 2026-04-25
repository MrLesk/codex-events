import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathons } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '#server/utils/hackathon-management'
import {
  assertStartShortlistAllowed,
  listLeaderboardEntries
} from '#server/utils/shortlist'
import { parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  const leaderboardEntries = await listLeaderboardEntries(database, hackathonId)

  assertStartShortlistAllowed(hackathon, leaderboardEntries)

  const transitionedAt = new Date().toISOString()

  await database
    .update(hackathons)
    .set({
      state: 'shortlist',
      pitchFinalistSubmissionIdsJson: '[]',
      activePitchPresentationSubmissionId: null,
      pitchPresentationsCompletedAt: null,
      finalRankingSubmissionIdsJson: '[]',
      updatedAt: transitionedAt
    })
    .where(eq(hackathons.id, hackathonId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.start_shortlist',
    metadata: {
      previousState: hackathon.state,
      nextState: 'shortlist',
      rankedSubmissionCount: leaderboardEntries.filter(entry => entry.isRanked).length
    }
  })

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
