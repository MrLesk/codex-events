import { requirePlatformActor } from '#server/auth/actor'
import { submissions } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { requireTeamAdminContext } from '#server/utils/team-formation'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
import {
  assertHackathonAllowsSubmissionCreation,
  assertSubmissionBodyMatchesHackathonRequirements,
  assertNoSubmissionExists,
  buildSubmissionWritePayload,
  createSubmissionBodySchema,
  getSubmissionForTeam,
  resolveValidatedSubmissionTrackId,
  serializeSubmission,
  submissionParamsSchema
} from '#server/utils/submissions'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, submissionParamsSchema)
  const body = await parseValidatedBody(event, createSubmissionBodySchema)
  const { database, hackathon } = await requireTeamAdminContext(event, hackathonId, teamId)

  assertHackathonAllowsSubmissionCreation(hackathon)
  const existingSubmission = await getSubmissionForTeam(database, teamId)
  assertNoSubmissionExists(existingSubmission, teamId)
  assertSubmissionBodyMatchesHackathonRequirements(hackathon, body)
  const trackId = await resolveValidatedSubmissionTrackId(database, hackathonId, body.trackId)

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
