import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { hackathons, submissions } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import { apiData } from '#server/http/api-response'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
import {
  parseStoredPitchFinalistSubmissionIds,
  prunePitchPresentationProgress
} from '#server/utils/judging'
import {
  assertSubmissionDisqualifiable,
  disqualifySubmissionBodySchema,
  getSubmissionForTeamOrThrow,
  requireAdminSubmissionContext,
  serializeSubmission,
  submissionParamsSchema
} from '#server/utils/submissions'

function pruneStoredSubmissionIdsJson(
  storedSubmissionIdsJson: string,
  submissionId: string,
  error: {
    code: string
    message: string
    hackathonId: string
  }
) {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(storedSubmissionIdsJson)
  } catch {
    throw new ApiError({
      statusCode: 500,
      code: error.code,
      message: error.message,
      details: {
        hackathonId: error.hackathonId
      }
    })
  }

  const parsedSubmissionIds = Array.isArray(parsedValue)
    ? parsedValue
    : null
  const isValidStoredSubmissionIds = parsedSubmissionIds !== null
    && parsedSubmissionIds.every((value): value is string => typeof value === 'string' && value.trim().length > 0)

  if (!isValidStoredSubmissionIds) {
    throw new ApiError({
      statusCode: 500,
      code: error.code,
      message: error.message,
      details: {
        hackathonId: error.hackathonId
      }
    })
  }

  return JSON.stringify(parsedSubmissionIds.filter(value => value !== submissionId))
}

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, submissionParamsSchema)
  const body = await parseValidatedBody(event, disqualifySubmissionBodySchema)
  const { database, hackathon } = await requireAdminSubmissionContext(event, hackathonId, teamId)
  const submission = await getSubmissionForTeamOrThrow(database, teamId)

  assertSubmissionDisqualifiable(hackathon, submission)

  const disqualifiedAt = new Date().toISOString()
  const previousPitchFinalistSubmissionIds = parseStoredPitchFinalistSubmissionIds(hackathon)
  const nextPitchFinalistSubmissionIds = previousPitchFinalistSubmissionIds.filter(
    finalistSubmissionId => finalistSubmissionId !== submission.id
  )
  const pitchPresentationProgress = prunePitchPresentationProgress(
    hackathon,
    previousPitchFinalistSubmissionIds,
    nextPitchFinalistSubmissionIds,
    submission.id,
    disqualifiedAt
  )
  const pitchFinalistSubmissionIdsJson = JSON.stringify(nextPitchFinalistSubmissionIds)
  const finalRankingSubmissionIdsJson = pruneStoredSubmissionIdsJson(
    hackathon.finalRankingSubmissionIdsJson,
    submission.id,
    {
      code: 'final_ranking_invalid',
      message: 'The stored final ranking override is invalid.',
      hackathonId
    }
  )

  await database.batch([
    database
      .update(submissions)
      .set({
        status: 'disqualified',
        disqualifiedAt,
        updatedAt: disqualifiedAt
      })
      .where(eq(submissions.id, submission.id)),
    database
      .update(hackathons)
      .set({
        pitchFinalistSubmissionIdsJson,
        activePitchPresentationSubmissionId: pitchPresentationProgress.activePitchPresentationSubmissionId,
        pitchPresentationsCompletedAt: pitchPresentationProgress.pitchPresentationsCompletedAt,
        finalRankingSubmissionIdsJson,
        updatedAt: disqualifiedAt
      })
      .where(eq(hackathons.id, hackathonId))
  ])

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'submission',
    entityId: submission.id,
    action: 'submission.disqualified',
    metadata: {
      hackathonId,
      teamId,
      reason: body.reason ?? null,
      previousStatus: submission.status,
      nextStatus: 'disqualified'
    }
  })

  return apiData(serializeSubmission({
    ...submission,
    status: 'disqualified',
    disqualifiedAt,
    updatedAt: disqualifiedAt
  }, {
    disqualificationReason: body.reason ?? null
  }))
})
