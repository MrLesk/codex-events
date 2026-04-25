import type { H3Event } from 'h3'

import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { requirePlatformActor } from '#server/auth/actor'
import { resolveHackathonAuthorization, resolveTeamAuthorization } from '#server/auth/authorization'
import { getDatabase, type AppDatabase } from '#server/database/client'
import { auditLogs, hackathonTracks, submissions, teams, teamMembers } from '#server/database/schema'
import type { hackathons } from '#server/database/schema'
import { ApiError } from './api-error'
import { assertAllowedState, assertGuard } from './lifecycle-guard'
import { getVisibleHackathonOrThrow, requireHackathonAdmin, routeIdParamsSchema } from './hackathon-management'
import { getActiveTeamMembers, getTeamOrThrow, getUsersByIds, serializeTeam, serializeTeamMember } from './team-formation'

const requiredStringSchema = z.string().trim().min(1)

function createOptionalUrlSchema(message: string) {
  return z.string().trim().refine(
    value => value.length === 0 || z.string().url().safeParse(value).success,
    message
  )
}

type SubmissionRequirementConfig = Pick<
  HackathonRecord,
  'requireSubmissionSummary' | 'requireSubmissionRepositoryUrl' | 'requireSubmissionDemoUrl'
>

const submissionBodyShape = {
  projectName: requiredStringSchema,
  summary: z.string().trim(),
  repositoryUrl: createOptionalUrlSchema('Enter a valid repository URL.'),
  demoUrl: createOptionalUrlSchema('Enter a valid demo URL.'),
  trackId: z.string().trim().min(1).nullable().optional()
} satisfies Record<string, z.ZodTypeAny>

type HackathonRecord = typeof hackathons.$inferSelect
type SubmissionRecord = typeof submissions.$inferSelect
type SubmissionInsert = typeof submissions.$inferInsert

export const submissionParamsSchema = routeIdParamsSchema.extend({
  teamId: z.string().trim().min(1)
})

export const createSubmissionBodySchema = z.object(submissionBodyShape)

export const updateSubmissionBodySchema = z.object(submissionBodyShape)

export const updateSubmissionPublicVisibilityBodySchema = z.object({
  isPubliclyVisible: z.coerce.boolean()
})

export const adminWithdrawSubmissionBodySchema = z.object({
  requestedByUserId: z.string().trim().min(1),
  reason: z.string().trim().min(1).optional()
})

export const disqualifySubmissionBodySchema = z.object({
  reason: z.string().trim().min(1).optional()
})

function normalizeSubmissionAuditReason(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.trim()
  return normalizedValue.length > 0 ? normalizedValue : null
}

export function serializeSubmission(
  submission: SubmissionRecord,
  options?: {
    disqualificationReason?: string | null
  }
) {
  return {
    id: submission.id,
    teamId: submission.teamId,
    trackId: submission.trackId,
    status: submission.status,
    projectName: submission.projectName,
    summary: submission.summary,
    repositoryUrl: submission.repositoryUrl,
    demoUrl: submission.demoUrl,
    isPubliclyVisible: submission.isPubliclyVisible,
    submittedAt: submission.submittedAt,
    lockedAt: submission.lockedAt,
    withdrawnAt: submission.withdrawnAt,
    disqualifiedAt: submission.disqualifiedAt,
    disqualificationReason: options?.disqualificationReason ?? null,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt
  }
}

export function isNoSubmissionStatus(status: SubmissionRecord['status']) {
  return status === 'draft' || status === 'withdrawn' || status === 'disqualified'
}

export async function getSubmissionForTeam(database: AppDatabase, teamId: string) {
  return await database.query.submissions.findFirst({
    where: eq(submissions.teamId, teamId),
    orderBy: [desc(submissions.createdAt)]
  }) ?? null
}

export async function getSubmissionForTeamOrThrow(database: AppDatabase, teamId: string) {
  const submission = await getSubmissionForTeam(database, teamId)

  if (!submission) {
    throw new ApiError({
      statusCode: 404,
      code: 'submission_not_found',
      message: 'The requested submission was not found.',
      details: { teamId }
    })
  }

  return submission
}

export async function getSubmissionDisqualificationReason(
  database: AppDatabase,
  submissionId: string
) {
  const disqualificationAuditLog = await database.query.auditLogs.findFirst({
    where: and(
      eq(auditLogs.entityType, 'submission'),
      eq(auditLogs.entityId, submissionId),
      eq(auditLogs.action, 'submission.disqualified')
    ),
    orderBy: [desc(auditLogs.createdAt)]
  })

  return normalizeSubmissionAuditReason(
    (disqualificationAuditLog?.metadata as { reason?: unknown } | null)?.reason
  )
}

function createConfiguredSubmissionValidationSchema(config: SubmissionRequirementConfig) {
  return z.object(submissionBodyShape).superRefine((input, context) => {
    if (config.requireSubmissionSummary && input.summary.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['summary'],
        message: 'Summary is required.'
      })
    }

    if (config.requireSubmissionRepositoryUrl && input.repositoryUrl.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['repositoryUrl'],
        message: 'Repository URL is required.'
      })
    }

    if (config.requireSubmissionDemoUrl && input.demoUrl.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['demoUrl'],
        message: 'Demo URL is required.'
      })
    }
  })
}

function normalizeOptionalSubmissionValue(value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? ''
  return normalizedValue.length > 0 ? normalizedValue : null
}

export function assertSubmissionBodyMatchesHackathonRequirements(
  hackathon: SubmissionRequirementConfig,
  input: z.infer<typeof createSubmissionBodySchema> | z.infer<typeof updateSubmissionBodySchema>
) {
  const validationResult = createConfiguredSubmissionValidationSchema(hackathon).safeParse(input)

  assertGuard(validationResult.success, {
    code: 'submission_fields_invalid',
    message: 'Complete the required submission fields before saving.',
    details: {
      fieldErrors: validationResult.error?.flatten().fieldErrors
    },
    statusCode: 400
  })
}

export function assertHackathonAllowsSubmissionEditing(hackathon: HackathonRecord) {
  assertAllowedState(hackathon.state, ['submission_open', 'judging_preparation'], {
    code: 'hackathon_state_invalid',
    message: 'Submission updates are only available until judging starts.',
    details: {
      hackathonId: hackathon.id
    }
  })
}

export function assertHackathonAllowsSubmissionCreation(hackathon: HackathonRecord) {
  assertAllowedState(hackathon.state, ['submission_open'], {
    code: 'hackathon_state_invalid',
    message: 'Submission creation is only available while submission is open.',
    details: {
      hackathonId: hackathon.id
    }
  })
}

export function assertNoSubmissionExists(submission: SubmissionRecord | null, teamId: string) {
  assertGuard(!submission, {
    code: 'submission_exists',
    message: 'A team can have at most one submission record.',
    details: {
      teamId
    }
  })
}

export function assertSubmissionMutable(submission: SubmissionRecord) {
  assertAllowedState(submission.status, ['draft', 'submitted'], {
    code: 'submission_state_invalid',
    message: 'Only draft or submitted submissions can be edited.',
    details: {
      submissionId: submission.id
    }
  })
}

async function listSubmissionTracksForHackathon(database: AppDatabase, hackathonId: string) {
  return await database.query.hackathonTracks.findMany({
    columns: {
      id: true
    },
    where: eq(hackathonTracks.hackathonId, hackathonId)
  })
}

export async function resolveValidatedSubmissionTrackId(
  database: AppDatabase,
  hackathonId: string,
  trackId: string | null | undefined
) {
  const availableTracks = await listSubmissionTracksForHackathon(database, hackathonId)
  const normalizedTrackId = trackId?.trim() || null

  if (availableTracks.length === 0) {
    assertGuard(!normalizedTrackId, {
      code: 'submission_track_invalid',
      message: 'The selected submission track is not valid for this hackathon.',
      details: {
        hackathonId,
        trackId: normalizedTrackId
      },
      statusCode: 400
    })

    return null
  }

  assertGuard(Boolean(normalizedTrackId), {
    code: 'submission_track_required',
    message: 'Select a track before saving this submission.',
    details: {
      hackathonId
    },
    statusCode: 400
  })

  assertGuard(
    availableTracks.some(track => track.id === normalizedTrackId),
    {
      code: 'submission_track_invalid',
      message: 'The selected submission track is not valid for this hackathon.',
      details: {
        hackathonId,
        trackId: normalizedTrackId
      },
      statusCode: 400
    }
  )

  return normalizedTrackId
}

export async function assertSubmissionSubmittable(
  database: AppDatabase,
  hackathon: HackathonRecord,
  submission: SubmissionRecord
) {
  assertAllowedState(submission.status, ['draft'], {
    code: 'submission_state_invalid',
    message: 'Only draft submissions can be submitted.',
    details: {
      submissionId: submission.id
    }
  })

  const requiredFieldResult = createConfiguredSubmissionValidationSchema(hackathon).safeParse({
    projectName: submission.projectName,
    summary: normalizeOptionalSubmissionValue(submission.summary) ?? '',
    repositoryUrl: normalizeOptionalSubmissionValue(submission.repositoryUrl) ?? '',
    demoUrl: normalizeOptionalSubmissionValue(submission.demoUrl) ?? ''
  })

  assertGuard(requiredFieldResult.success, {
    code: 'submission_fields_incomplete',
    message: 'Complete the required submission fields before submitting.',
    details: {
      submissionId: submission.id,
      fieldErrors: requiredFieldResult.error?.flatten().fieldErrors
    },
    statusCode: 400
  })

  await resolveValidatedSubmissionTrackId(database, hackathon.id, submission.trackId)
}

export function assertSubmissionWithdrawable(
  hackathon: HackathonRecord,
  submission: SubmissionRecord
) {
  assertAllowedState(hackathon.state, ['submission_open', 'judging_preparation'], {
    code: 'hackathon_state_invalid',
    message: 'Submissions can only be withdrawn until judging starts.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertAllowedState(submission.status, ['draft', 'submitted'], {
    code: 'submission_state_invalid',
    message: 'Only draft or submitted submissions can be withdrawn.',
    details: {
      submissionId: submission.id
    }
  })
}

export function assertSubmissionDisqualifiable(
  hackathon: HackathonRecord,
  submission: SubmissionRecord
) {
  assertAllowedState(hackathon.state, [
    'blind_review',
    'shortlist',
    'pitch',
    'pitch_review',
    'final_deliberation',
    'winners_announced',
    'completed'
  ], {
    code: 'hackathon_state_invalid',
    message: 'Submissions can only be disqualified once judging is underway.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertAllowedState(submission.status, ['locked'], {
    code: 'submission_state_invalid',
    message: 'Only locked submissions can be disqualified.',
    details: {
      submissionId: submission.id
    }
  })
}

export function assertSubmissionPublicVisibilityMutable(
  hackathon: HackathonRecord,
  submission: SubmissionRecord,
  options: {
    isWinningTeam: boolean
  }
) {
  assertAllowedState(hackathon.state, ['completed'], {
    code: 'hackathon_state_invalid',
    message: 'Project publishing is only available after the hackathon is completed.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertAllowedState(submission.status, ['locked'], {
    code: 'submission_state_invalid',
    message: 'Only completed competition projects can be published publicly.',
    details: {
      submissionId: submission.id
    }
  })

  assertGuard(!options.isWinningTeam, {
    code: 'submission_public_visibility_invalid',
    message: 'Winning projects are already published through the winners showcase.',
    details: {
      submissionId: submission.id,
      teamId: submission.teamId
    },
    statusCode: 409
  })
}

export function buildSubmissionWritePayload(
  input: z.infer<typeof createSubmissionBodySchema> | z.infer<typeof updateSubmissionBodySchema>,
  updatedAt: string
) {
  const payload: Partial<SubmissionInsert> & Pick<SubmissionInsert, 'updatedAt'> = {
    updatedAt
  }

  if ('projectName' in input) {
    payload.projectName = input.projectName
  }

  if ('summary' in input) {
    payload.summary = normalizeOptionalSubmissionValue(input.summary)
  }

  if ('repositoryUrl' in input) {
    payload.repositoryUrl = normalizeOptionalSubmissionValue(input.repositoryUrl)
  }

  if ('demoUrl' in input) {
    payload.demoUrl = normalizeOptionalSubmissionValue(input.demoUrl)
  }

  if ('trackId' in input) {
    payload.trackId = input.trackId?.trim() || null
  }

  return payload
}

export async function requireSubmissionVisibilityContext(event: H3Event, hackathonId: string, teamId: string) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const team = await getTeamOrThrow(database, hackathonId, teamId)
  const hackathonAuthorization = await resolveHackathonAuthorization(event, hackathonId)
  const teamAuthorization = await resolveTeamAuthorization(event, teamId)

  assertGuard(hackathonAuthorization.isHackathonAdmin || teamAuthorization.isTeamMember, {
    code: 'team_submission_access_denied',
    message: 'This operation requires team membership or hackathon admin access.',
    details: {
      hackathonId,
      teamId
    },
    statusCode: 403
  })

  return {
    actor,
    database,
    hackathon,
    team,
    hackathonAuthorization,
    teamAuthorization
  }
}

export async function requireAdminSubmissionContext(event: H3Event, hackathonId: string, teamId: string) {
  const { hackathon, authorization } = await requireHackathonAdmin(event, hackathonId)
  const database = getDatabase(event)
  const team = await getTeamOrThrow(database, hackathonId, teamId)

  return {
    database,
    hackathon,
    team,
    authorization
  }
}

export async function assertRequestedByActiveTeamAdmin(
  database: AppDatabase,
  teamId: string,
  requestedByUserId: string
) {
  const membership = await database.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, requestedByUserId),
      isNull(teamMembers.leftAt)
    )
  })

  assertGuard(membership?.role === 'admin', {
    code: 'team_request_required',
    message: 'Admin withdrawal requires an active team admin request.',
    details: {
      teamId,
      requestedByUserId
    }
  })

  return membership
}

export async function listNoSubmissionTeams(database: AppDatabase, hackathonId: string) {
  const allTeams = await database.query.teams.findMany({
    where: eq(teams.hackathonId, hackathonId),
    orderBy: [asc(teams.name), asc(teams.createdAt)]
  })

  if (allTeams.length === 0) {
    return []
  }

  const allMembers = await database.query.teamMembers.findMany({
    where: and(
      inArray(teamMembers.teamId, allTeams.map(team => team.id)),
      isNull(teamMembers.leftAt)
    ),
    orderBy: [asc(teamMembers.createdAt)]
  })

  const allSubmissions = await database.query.submissions.findMany({
    where: inArray(submissions.teamId, allTeams.map(team => team.id)),
    orderBy: [desc(submissions.createdAt)]
  })

  const usersById = await getUsersByIds(database, allMembers.map(member => member.userId))
  const membersByTeamId = new Map<string, Array<typeof allMembers[number]>>()
  const latestSubmissionByTeamId = new Map<string, SubmissionRecord>()

  for (const member of allMembers) {
    const teamEntries = membersByTeamId.get(member.teamId) ?? []
    teamEntries.push(member)
    membersByTeamId.set(member.teamId, teamEntries)
  }

  for (const submission of allSubmissions) {
    if (!latestSubmissionByTeamId.has(submission.teamId)) {
      latestSubmissionByTeamId.set(submission.teamId, submission)
    }
  }

  return allTeams
    .map((team) => {
      const submission = latestSubmissionByTeamId.get(team.id) ?? null

      return {
        team,
        submission,
        members: (membersByTeamId.get(team.id) ?? []).map(member =>
          serializeTeamMember(member, usersById.get(member.userId) ?? null)
        )
      }
    })
    .filter(entry => entry.submission === null || isNoSubmissionStatus(entry.submission.status))
    .map(entry => ({
      team: serializeTeam(entry.team, {
        activeMemberCount: entry.members.length,
        members: entry.members
      }),
      submission: entry.submission ? serializeSubmission(entry.submission) : null
    }))
}

export async function listSubmissionMonitorTeams(database: AppDatabase, hackathonId: string) {
  const allTeams = await database.query.teams.findMany({
    where: eq(teams.hackathonId, hackathonId),
    orderBy: [asc(teams.name), asc(teams.createdAt)]
  })

  if (allTeams.length === 0) {
    return {
      teamDetails: [],
      teamSubmissions: []
    }
  }

  const teamIds = allTeams.map(team => team.id)
  const allMembers = await database.query.teamMembers.findMany({
    where: and(
      inArray(teamMembers.teamId, teamIds),
      isNull(teamMembers.leftAt)
    ),
    orderBy: [asc(teamMembers.createdAt)]
  })
  const allSubmissions = await database.query.submissions.findMany({
    where: inArray(submissions.teamId, teamIds),
    orderBy: [desc(submissions.createdAt)]
  })
  const disqualifiedSubmissionIds = allSubmissions
    .filter(submission => submission.status === 'disqualified')
    .map(submission => submission.id)
  const disqualificationAuditLogs = disqualifiedSubmissionIds.length > 0
    ? await database.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.entityType, 'submission'),
          inArray(auditLogs.entityId, disqualifiedSubmissionIds),
          eq(auditLogs.action, 'submission.disqualified')
        ),
        orderBy: [desc(auditLogs.createdAt)]
      })
    : []
  const usersById = await getUsersByIds(database, allMembers.map(member => member.userId))
  const membersByTeamId = new Map<string, Array<typeof allMembers[number]>>()
  const latestSubmissionByTeamId = new Map<string, SubmissionRecord>()
  const disqualificationReasonBySubmissionId = new Map<string, string | null>()

  for (const member of allMembers) {
    const teamEntries = membersByTeamId.get(member.teamId) ?? []
    teamEntries.push(member)
    membersByTeamId.set(member.teamId, teamEntries)
  }

  for (const submission of allSubmissions) {
    if (!latestSubmissionByTeamId.has(submission.teamId)) {
      latestSubmissionByTeamId.set(submission.teamId, submission)
    }
  }

  for (const auditLog of disqualificationAuditLogs) {
    if (disqualificationReasonBySubmissionId.has(auditLog.entityId)) {
      continue
    }

    disqualificationReasonBySubmissionId.set(
      auditLog.entityId,
      normalizeSubmissionAuditReason((auditLog.metadata as { reason?: unknown } | null)?.reason)
    )
  }

  return {
    teamDetails: allTeams.map((team) => {
      const members = membersByTeamId.get(team.id) ?? []

      return serializeTeam(team, {
        activeMemberCount: members.length,
        members: members.map(member =>
          serializeTeamMember(member, usersById.get(member.userId) ?? null)
        )
      })
    }),
    teamSubmissions: allTeams.map((team) => {
      const submission = latestSubmissionByTeamId.get(team.id) ?? null

      if (!submission) {
        return null
      }

      return serializeSubmission(submission, {
        disqualificationReason: submission.status === 'disqualified'
          ? disqualificationReasonBySubmissionId.get(submission.id) ?? null
          : null
      })
    })
  }
}

export async function getTeamSubmissionDetail(database: AppDatabase, hackathonId: string, teamId: string) {
  const team = await getTeamOrThrow(database, hackathonId, teamId)
  const members = await getActiveTeamMembers(database, teamId)
  const usersById = await getUsersByIds(database, members.map(member => member.userId))
  const submission = await getSubmissionForTeam(database, teamId)

  return {
    team: serializeTeam(team, {
      activeMemberCount: members.length,
      members: members.map(member => serializeTeamMember(member, usersById.get(member.userId) ?? null))
    }),
    submission: submission ? serializeSubmission(submission) : null
  }
}
