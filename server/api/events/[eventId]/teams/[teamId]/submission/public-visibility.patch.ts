import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { prizeRedemptions, submissions } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { requireTeamAdminContext } from '#server/domains/teams'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
import {
  assertSubmissionPublicVisibilityMutable,
  getSubmissionForTeamOrThrow,
  serializeSubmission,
  submissionParamsSchema,
  updateSubmissionPublicVisibilityBodySchema
} from '#server/domains/submissions'
import { refreshCompletedOutcomeCache } from '#server/domains/outcomes'

export default defineApiHandler(async (h3Event) => {
  await requirePlatformActor(h3Event)
  const { eventId, teamId } = parseValidatedParams(h3Event, submissionParamsSchema)
  const body = await parseValidatedBody(h3Event, updateSubmissionPublicVisibilityBodySchema)
  const { database, event, team } = await requireTeamAdminContext(h3Event, eventId, teamId)
  const submission = await getSubmissionForTeamOrThrow(database, team.id)
  const winningRedemption = await database.query.prizeRedemptions.findFirst({
    columns: {
      id: true
    },
    where: eq(prizeRedemptions.teamId, team.id)
  })

  assertSubmissionPublicVisibilityMutable(event, submission, {
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

  await refreshCompletedOutcomeCache(database, eventId)

  return apiData(serializeSubmission({
    ...submission,
    isPubliclyVisible: body.isPubliclyVisible,
    updatedAt
  }))
})
