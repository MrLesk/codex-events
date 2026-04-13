import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../auth/actor'
import { writeAuditLog } from '../../../../../database/audit-log'
import { getDatabase } from '../../../../../database/client'
import { hackathons } from '../../../../../database/schema'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiData } from '../../../../../utils/api-response'
import {
  requireHackathonAdmin,
  routeIdParamsSchema
} from '../../../../../utils/hackathon-management'
import {
  assertSelectFinalistsAllowed,
  assertSelectedFinalistsMatchEntries,
  listLeaderboardEntries,
  listShortlistEntries,
  selectFinalistsBodySchema
} from '../../../../../utils/shortlist'
import { parseValidatedBody, parseValidatedParams } from '../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, selectFinalistsBodySchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)

  assertSelectFinalistsAllowed(hackathon)

  const rankedEntries = (await listLeaderboardEntries(database, hackathonId))
    .filter(entry => entry.isRanked)

  assertSelectedFinalistsMatchEntries(
    body.orderedSubmissionIds,
    rankedEntries.map(entry => ({ submissionId: entry.submission.id }))
  )

  const selectedAt = new Date().toISOString()

  await database
    .update(hackathons)
    .set({
      pitchFinalistSubmissionIdsJson: JSON.stringify(body.orderedSubmissionIds),
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
      finalistSubmissionCount: body.orderedSubmissionIds.length
    }
  })

  return apiData(await listShortlistEntries(database, hackathonId))
})
