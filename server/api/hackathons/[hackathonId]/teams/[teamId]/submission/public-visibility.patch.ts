import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { prizeRedemptions, submissions } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { requireTeamAdminContext } from '#server/utils/team-formation'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
import {
  assertSubmissionPublicVisibilityMutable,
  getSubmissionForTeamOrThrow,
  serializeSubmission,
  submissionParamsSchema,
  updateSubmissionPublicVisibilityBodySchema
} from '#server/utils/submissions'
import { refreshCompletedOutcomeCache } from '#server/utils/shortlist'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, submissionParamsSchema)
  const body = await parseValidatedBody(event, updateSubmissionPublicVisibilityBodySchema)
  const { database, hackathon, team } = await requireTeamAdminContext(event, hackathonId, teamId)
  const submission = await getSubmissionForTeamOrThrow(database, team.id)
  const winningRedemption = await database.query.prizeRedemptions.findFirst({
    columns: {
      id: true
    },
    where: eq(prizeRedemptions.teamId, team.id)
  })

  assertSubmissionPublicVisibilityMutable(hackathon, submission, {
    isWinningTeam: Boolean(winningRedemption)
  })

  const updatedAt = new Date().toISOString()

  await database
    .update(submissions)
    .set({
      isPubliclyVisible: body.isPubliclyVisible,
      updatedAt
    })
    .where(eq(submissions.id, submission.id))

  await refreshCompletedOutcomeCache(database, hackathonId)

  return apiData(serializeSubmission({
    ...submission,
    isPubliclyVisible: body.isPubliclyVisible,
    updatedAt
  }))
})
