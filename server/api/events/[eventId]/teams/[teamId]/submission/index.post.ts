import { requirePlatformActor } from '#server/auth/actor'
import { submissions } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { requireTeamAdminContext } from '#server/domains/teams'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
import {
  assertEventAllowsSubmissionCreation,
  assertSubmissionBodyMatchesEventRequirements,
  assertNoSubmissionExists,
  buildSubmissionWritePayload,
  createSubmissionBodySchema,
  getSubmissionForTeam,
  resolveValidatedSubmissionTrackId,
  serializeSubmission,
  submissionParamsSchema
} from '#server/domains/submissions'

export default defineApiHandler(async (h3Event) => {
  await requirePlatformActor(h3Event)
  const { eventId, teamId } = parseValidatedParams(h3Event, submissionParamsSchema)
  const body = await parseValidatedBody(h3Event, createSubmissionBodySchema)
  const { database, event } = await requireTeamAdminContext(h3Event, eventId, teamId)

  assertEventAllowsSubmissionCreation(event)
  const existingSubmission = await getSubmissionForTeam(database, teamId)
  assertNoSubmissionExists(existingSubmission, teamId)
  assertSubmissionBodyMatchesEventRequirements(event, body)
  const trackId = await resolveValidatedSubmissionTrackId(database, eventId, body.trackId)

  const now = new Date().toISOString()
  const submissionId = crypto.randomUUID()
  const patch = {
    ...buildSubmissionWritePayload(body, now),
    trackId
  }

  await database.insert(submissions).values({
    id: submissionId,
    teamId,
    status: 'draft',
    projectName: null,
    summary: null,
    repositoryUrl: null,
    demoUrl: null,
    isPubliclyVisible: false,
    submittedAt: null,
    lockedAt: null,
    withdrawnAt: null,
    disqualifiedAt: null,
    createdAt: now,
    ...patch
  })

  return apiData(serializeSubmission({
    id: submissionId,
    teamId,
    status: 'draft',
    projectName: patch.projectName ?? null,
    summary: patch.summary ?? null,
    repositoryUrl: patch.repositoryUrl ?? null,
    demoUrl: patch.demoUrl ?? null,
    isPubliclyVisible: false,
    submittedAt: null,
    lockedAt: null,
    withdrawnAt: null,
    disqualifiedAt: null,
    createdAt: now,
    updatedAt: now,
    trackId: patch.trackId ?? null
  }))
})
