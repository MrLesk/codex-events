import { requirePlatformActor } from '../../../../../../auth/actor'
import { submissions } from '../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../utils/api-handler'
import { apiData } from '../../../../../../utils/api-response'
import { requireTeamAdminContext } from '../../../../../../utils/team-formation'
import { parseValidatedBody, parseValidatedParams } from '../../../../../../utils/validation'
import {
  assertHackathonAllowsSubmissionEditing,
  assertNoSubmissionExists,
  buildSubmissionWritePayload,
  createSubmissionBodySchema,
  getSubmissionForTeam,
  serializeSubmission,
  submissionParamsSchema
} from '../../../../../../utils/submissions'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, submissionParamsSchema)
  const body = await parseValidatedBody(event, createSubmissionBodySchema)
  const { database, hackathon } = await requireTeamAdminContext(event, hackathonId, teamId)

  assertHackathonAllowsSubmissionEditing(hackathon)
  const existingSubmission = await getSubmissionForTeam(database, teamId)
  assertNoSubmissionExists(existingSubmission, teamId)

  const now = new Date().toISOString()
  const submissionId = crypto.randomUUID()

  await database.insert(submissions).values({
    id: submissionId,
    teamId,
    status: 'draft',
    projectName: null,
    summary: null,
    repositoryUrl: null,
    demoUrl: null,
    submittedAt: null,
    lockedAt: null,
    withdrawnAt: null,
    disqualifiedAt: null,
    createdAt: now,
    ...buildSubmissionWritePayload(body, now)
  })

  return apiData(serializeSubmission({
    id: submissionId,
    teamId,
    status: 'draft',
    projectName: body.projectName ?? null,
    summary: body.summary ?? null,
    repositoryUrl: body.repositoryUrl ?? null,
    demoUrl: body.demoUrl ?? null,
    submittedAt: null,
    lockedAt: null,
    withdrawnAt: null,
    disqualifiedAt: null,
    createdAt: now,
    updatedAt: now
  }))
})
