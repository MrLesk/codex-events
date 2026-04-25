import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathons } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  requireHackathonAdmin,
  routeIdParamsSchema
} from '#server/utils/hackathon-management'
import {
  assertSelectFinalistsAllowed,
  assertSelectedFinalistsRespectOrder,
  assertSelectedFinalistsMatchEntries,
  assertSelectedShortlistOrderMatchesEntries,
  listLeaderboardEntries,
  listShortlistEntries,
  selectFinalistsBodySchema
} from '#server/utils/shortlist'
import { parseValidatedBody, parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, selectFinalistsBodySchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)

  assertSelectFinalistsAllowed(hackathon)

  const rankedEntries = (await listLeaderboardEntries(database, hackathonId))
    .filter(entry => entry.isRanked)

  assertSelectedShortlistOrderMatchesEntries(
    body.orderedSubmissionIds,
    rankedEntries.map(entry => ({ submissionId: entry.submission.id }))
  )

  assertSelectedFinalistsMatchEntries(
    body.finalistSubmissionIds,
    rankedEntries.map(entry => ({ submissionId: entry.submission.id }))
  )
  assertSelectedFinalistsRespectOrder(body.finalistSubmissionIds, body.orderedSubmissionIds)

  const selectedAt = new Date().toISOString()

  await database
    .update(hackathons)
    .set({
      pitchFinalistSubmissionIdsJson: JSON.stringify(body.finalistSubmissionIds),
      finalRankingSubmissionIdsJson: JSON.stringify(body.orderedSubmissionIds),
      updatedAt: selectedAt
    })
    .where(eq(hackathons.id, hackathonId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.pitch_finalists_selected',
    metadata: {
      orderedSubmissionIds: body.orderedSubmissionIds,
      finalistSubmissionIds: body.finalistSubmissionIds,
      finalistSubmissionCount: body.finalistSubmissionIds.length
    }
  })

  return apiData(await listShortlistEntries(database, hackathonId))
})
