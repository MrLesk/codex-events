import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../auth/actor'
import { writeAuditLog } from '../../../../database/audit-log'
import { getDatabase } from '../../../../database/client'
import { hackathons } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  advancePitchPresentation,
  assertAdvancePitchPresentationAllowed,
  listLockedSubmissionsForHackathon,
  resolvePitchPresentationState,
  selectPitchReviewSubmissions
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
  const finalistSubmissions = selectPitchReviewSubmissions(hackathon, lockedSubmissions)

  assertAdvancePitchPresentationAllowed(hackathon, {
    finalistSubmissionCount: finalistSubmissions.length
  })

  const finalistSubmissionIds = finalistSubmissions.map(submission => submission.id)
  const previousPresentationState = resolvePitchPresentationState(hackathon, finalistSubmissionIds)
  const advancedAt = new Date().toISOString()
  const nextPresentationState = advancePitchPresentation(hackathon, finalistSubmissionIds, advancedAt)

  await database
    .update(hackathons)
    .set({
      activePitchPresentationSubmissionId: nextPresentationState.activePitchPresentationSubmissionId,
      pitchPresentationsCompletedAt: nextPresentationState.pitchPresentationsCompletedAt,
      updatedAt: advancedAt
    })
    .where(eq(hackathons.id, hackathonId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.advance_pitch_presentation',
    metadata: {
      previousSubmissionId: previousPresentationState.currentSubmissionId,
      nextSubmissionId: nextPresentationState.activePitchPresentationSubmissionId,
      previousPresentationIndex: previousPresentationState.currentIndex,
      nextPresentationIndex: nextPresentationState.activePitchPresentationSubmissionId
        ? finalistSubmissionIds.findIndex(
            submissionId => submissionId === nextPresentationState.activePitchPresentationSubmissionId
          )
        : null,
      presentationCount: finalistSubmissionIds.length,
      presentationsCompletedAt: nextPresentationState.pitchPresentationsCompletedAt
    }
  })

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
