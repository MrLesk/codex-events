import type { H3Event } from 'h3'

import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { requirePlatformActor } from '../auth/actor'
import {
  assertBlindJudgeAssignmentAccess,
  assertHackathonAdminAccess,
  resolveHackathonAuthorization,
  resolveJudgeAssignmentAuthorization,
  type JudgeAssignmentAuthorization
} from '../auth/authorization'
import { getDatabase, type AppDatabase } from '../database/client'
import {
  evaluationCriteria,
  hackathonTracks,
  hackathonRoleAssignments,
  judgeAssignments,
  judgeCriterionScores,
  submissions,
  teamMembers,
  teams,
  userApplications,
  type hackathons
} from '../database/schema'
import { ApiError } from './api-error'
import { assertAllowedState, assertGuard } from './lifecycle-guard'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from './hackathon-management'

type HackathonRecord = typeof hackathons.$inferSelect
type SubmissionRecord = typeof submissions.$inferSelect
type JudgeAssignmentRecord = typeof judgeAssignments.$inferSelect
type JudgeAssignmentInsert = typeof judgeAssignments.$inferInsert
type EvaluationCriterionRecord = typeof evaluationCriteria.$inferSelect
type JudgeCriterionScoreRecord = typeof judgeCriterionScores.$inferSelect

const activeJudgeAssignmentStatuses = ['assigned', 'judge_started'] as const

const criterionScoreInputSchema = z.object({
  evaluationCriterionId: z.string().trim().min(1),
  score: z.coerce.number().int().min(0),
  comment: z.string().trim().min(1).optional()
})

export const judgingAssignmentParamsSchema = routeIdParamsSchema.extend({
  assignmentId: z.string().trim().min(1)
})

export const completeJudgeAssignmentBodySchema = z.object({
  criterionScores: z.array(criterionScoreInputSchema).min(1)
})

export const skipJudgeAssignmentBodySchema = z.object({
  reason: z.string().trim().min(1).optional()
})

export const markAssignmentIneligibleBodySchema = z.object({
  reason: z.string().trim().min(1)
})

export const reassignJudgeAssignmentBodySchema = z.object({
  judgeUserId: z.string().trim().min(1).optional(),
  reason: z.string().trim().min(1).optional()
})

export function serializeJudgeAssignment(assignment: JudgeAssignmentRecord) {
  return {
    id: assignment.id,
    hackathonId: assignment.hackathonId,
    submissionId: assignment.submissionId,
    judgeUserId: assignment.judgeUserId,
    status: assignment.status,
    assignedAt: assignment.assignedAt,
    startedAt: assignment.startedAt,
    completedAt: assignment.completedAt,
    skippedAt: assignment.skippedAt,
    skippedByUserId: assignment.skippedByUserId,
    skipReason: assignment.skipReason,
    ineligibilityStatus: assignment.ineligibilityStatus,
    ineligibilityReason: assignment.ineligibilityReason,
    ineligibilityMarkedAt: assignment.ineligibilityMarkedAt,
    ineligibilityMarkedByUserId: assignment.ineligibilityMarkedByUserId,
    createdAt: assignment.createdAt
  }
}

export function serializeJudgeCriterionScore(
  score: JudgeCriterionScoreRecord,
  criterion: EvaluationCriterionRecord | null
) {
  return {
    id: score.id,
    evaluationCriterionId: score.evaluationCriterionId,
    criterionName: criterion?.name ?? null,
    criterionDescription: criterion?.description ?? null,
    criterionWeight: criterion?.weight ?? null,
    score: score.score,
    comment: score.comment,
    createdAt: score.createdAt,
    updatedAt: score.updatedAt
  }
}

function serializeBlindApplication(application: typeof userApplications.$inferSelect) {
  return {
    id: application.id,
    status: application.status,
    submittedAt: application.submittedAt,
    reviewedAt: application.reviewedAt,
    applicationTermsDocumentId: application.applicationTermsDocumentId
  }
}

export function serializeBlindSubmission(
  submission: SubmissionRecord,
  applications: Array<typeof userApplications.$inferSelect>,
  track: typeof hackathonTracks.$inferSelect | null
) {
  return {
    id: submission.id,
    projectName: submission.projectName,
    summary: submission.summary,
    repositoryUrl: submission.repositoryUrl,
    demoUrl: submission.demoUrl,
    track: track
      ? {
          id: track.id,
          name: track.name,
          description: track.description
        }
      : null,
    status: submission.status,
    submittedAt: submission.submittedAt,
    lockedAt: submission.lockedAt,
    applications: applications.map(serializeBlindApplication)
  }
}

export function assertStartJudgingPreparationAllowed(
  hackathon: HackathonRecord,
  metrics: {
    submittedSubmissionCount: number
    judgePoolCount: number
  },
  now: Date = new Date()
) {
  assertAllowedState(hackathon.state, ['submission_open'], {
    code: 'hackathon_state_invalid',
    message: 'Judging preparation can only start while the hackathon is in submission_open.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(Date.parse(hackathon.submissionClosesAt) <= now.getTime(), {
    code: 'submission_window_still_open',
    message: 'Judging preparation can only start after the submission window closes.',
    details: {
      hackathonId: hackathon.id,
      submissionClosesAt: hackathon.submissionClosesAt
    }
  })

  assertGuard(metrics.submittedSubmissionCount > 0, {
    code: 'submitted_submissions_required',
    message: 'Judging preparation requires at least one submitted submission.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(metrics.judgePoolCount > 0, {
    code: 'judge_pool_required',
    message: 'Judging preparation requires at least one judge in the automatic judge pool.',
    details: {
      hackathonId: hackathon.id
    }
  })
}

export function assertStartJudgeReviewAllowed(
  hackathon: HackathonRecord,
  metrics: {
    lockedSubmissionCount: number
    activeAssignmentCount: number
  }
) {
  assertAllowedState(hackathon.state, ['judging_preparation'], {
    code: 'hackathon_state_invalid',
    message: 'Judge review can only start while the hackathon is in judging_preparation.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(metrics.lockedSubmissionCount > 0, {
    code: 'locked_submissions_required',
    message: 'Judge review requires at least one locked submission.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(metrics.activeAssignmentCount === metrics.lockedSubmissionCount, {
    code: 'active_assignments_required',
    message: 'Judge review requires one active assignment for every locked submission.',
    details: {
      hackathonId: hackathon.id,
      lockedSubmissionCount: metrics.lockedSubmissionCount,
      activeAssignmentCount: metrics.activeAssignmentCount
    }
  })
}

export async function listSubmittedSubmissionsForHackathon(database: AppDatabase, hackathonId: string) {
  const hackathonTeams = await database.query.teams.findMany({
    where: eq(teams.hackathonId, hackathonId),
    columns: {
      id: true
    }
  })

  if (hackathonTeams.length === 0) {
    return []
  }

  return await database.query.submissions.findMany({
    where: and(
      eq(submissions.status, 'submitted'),
      inArray(submissions.teamId, hackathonTeams.map(team => team.id))
    ),
    orderBy: [asc(submissions.submittedAt), asc(submissions.createdAt)]
  })
}

export async function listLockedSubmissionsForHackathon(database: AppDatabase, hackathonId: string) {
  const hackathonTeams = await database.query.teams.findMany({
    where: eq(teams.hackathonId, hackathonId),
    columns: {
      id: true
    }
  })

  if (hackathonTeams.length === 0) {
    return []
  }

  return await database.query.submissions.findMany({
    where: and(
      eq(submissions.status, 'locked'),
      inArray(submissions.teamId, hackathonTeams.map(team => team.id))
    ),
    orderBy: [asc(submissions.lockedAt), asc(submissions.createdAt)]
  })
}

export async function listActiveAssignmentsForSubmissions(database: AppDatabase, submissionIds: string[]) {
  if (submissionIds.length === 0) {
    return []
  }

  return await database.query.judgeAssignments.findMany({
    where: and(
      inArray(judgeAssignments.submissionId, submissionIds),
      inArray(judgeAssignments.status, [...activeJudgeAssignmentStatuses])
    ),
    orderBy: [asc(judgeAssignments.assignedAt), asc(judgeAssignments.createdAt)]
  })
}

export async function listAutomaticJudgePoolForHackathon(database: AppDatabase, hackathonId: string) {
  return await database.query.hackathonRoleAssignments.findMany({
    where: and(
      eq(hackathonRoleAssignments.hackathonId, hackathonId),
      eq(hackathonRoleAssignments.isInJudgePool, true)
    ),
    orderBy: [asc(hackathonRoleAssignments.createdAt), asc(hackathonRoleAssignments.userId)]
  })
}

export function buildInitialJudgeAssignments(
  hackathonId: string,
  submittedSubmissions: SubmissionRecord[],
  judgePool: Array<typeof hackathonRoleAssignments.$inferSelect>,
  assignedAt: string
) {
  const loadByJudge = new Map<string, number>()

  for (const judge of judgePool) {
    loadByJudge.set(judge.userId, 0)
  }

  return submittedSubmissions.map((submission) => {
    const selectedJudge = [...judgePool]
      .sort((left, right) => {
        const leftLoad = loadByJudge.get(left.userId) ?? 0
        const rightLoad = loadByJudge.get(right.userId) ?? 0

        if (leftLoad !== rightLoad) {
          return leftLoad - rightLoad
        }

        if (left.createdAt !== right.createdAt) {
          return left.createdAt.localeCompare(right.createdAt)
        }

        return left.userId.localeCompare(right.userId)
      })[0]

    if (!selectedJudge) {
      throw new ApiError({
        statusCode: 409,
        code: 'judge_pool_required',
        message: 'Judging preparation requires at least one judge in the automatic judge pool.',
        details: { hackathonId }
      })
    }

    loadByJudge.set(selectedJudge.userId, (loadByJudge.get(selectedJudge.userId) ?? 0) + 1)

    return {
      id: crypto.randomUUID(),
      hackathonId,
      submissionId: submission.id,
      judgeUserId: selectedJudge.userId,
      status: 'assigned',
      assignedAt,
      createdAt: assignedAt
    } satisfies JudgeAssignmentInsert
  })
}

export async function buildPrizeEligibilitySnapshots(
  database: AppDatabase,
  hackathonId: string,
  teamIds: string[],
  snapshotAt: string
) {
  if (teamIds.length === 0) {
    return []
  }

  const members = await database.query.teamMembers.findMany({
    where: and(
      inArray(teamMembers.teamId, teamIds),
      isNull(teamMembers.leftAt)
    ),
    orderBy: [asc(teamMembers.joinedAt), asc(teamMembers.createdAt)]
  })

  return members.map(member => ({
    id: crypto.randomUUID(),
    hackathonId,
    teamId: member.teamId,
    userId: member.userId,
    snapshotAt,
    createdAt: snapshotAt
  }))
}

export async function getJudgeAssignmentOrThrow(database: AppDatabase, assignmentId: string) {
  const assignment = await database.query.judgeAssignments.findFirst({
    where: eq(judgeAssignments.id, assignmentId)
  })

  if (!assignment) {
    throw new ApiError({
      statusCode: 404,
      code: 'judge_assignment_not_found',
      message: 'The requested judge assignment was not found.',
      details: { assignmentId }
    })
  }

  return assignment
}

export async function getBlindAssignmentDetail(
  database: AppDatabase,
  assignment: JudgeAssignmentRecord
) {
  const [detail] = await getBlindAssignmentDetails(database, [assignment])

  if (!detail) {
    throw new ApiError({
      statusCode: 404,
      code: 'judge_assignment_not_found',
      message: 'The requested judge assignment was not found.',
      details: { assignmentId: assignment.id }
    })
  }

  return detail
}

export async function getBlindAssignmentDetails(
  database: AppDatabase,
  assignments: JudgeAssignmentRecord[]
) {
  if (assignments.length === 0) {
    return []
  }

  const submissionIds = [...new Set(assignments.map(assignment => assignment.submissionId))]
  const hackathonIds = [...new Set(assignments.map(assignment => assignment.hackathonId))]

  const submissionRows = await database.query.submissions.findMany({
    where: inArray(submissions.id, submissionIds)
  })
  const submissionsById = new Map(submissionRows.map(submission => [submission.id, submission]))
  const teamIds = [...new Set(submissionRows.map(submission => submission.teamId))]
  const trackIds = [...new Set(submissionRows.map(submission => submission.trackId).filter((trackId): trackId is string => Boolean(trackId)))]

  const [activeMembers, criteria, criterionScores, tracks] = await Promise.all([
    teamIds.length === 0
      ? Promise.resolve([])
      : database.query.teamMembers.findMany({
          where: and(
            inArray(teamMembers.teamId, teamIds),
            isNull(teamMembers.leftAt)
          ),
          orderBy: [asc(teamMembers.joinedAt), asc(teamMembers.createdAt)]
        }),
    database.query.evaluationCriteria.findMany({
      where: inArray(evaluationCriteria.hackathonId, hackathonIds),
      orderBy: [asc(evaluationCriteria.hackathonId), asc(evaluationCriteria.displayOrder), asc(evaluationCriteria.createdAt)]
    }),
    database.query.judgeCriterionScores.findMany({
      where: inArray(
        judgeCriterionScores.judgeAssignmentId,
        assignments.map(assignment => assignment.id)
      ),
      orderBy: [asc(judgeCriterionScores.createdAt)]
    }),
    trackIds.length === 0
      ? Promise.resolve([])
      : database.query.hackathonTracks.findMany({
          where: inArray(hackathonTracks.id, trackIds)
        })
  ])

  const activeMembersByTeamId = new Map<string, Array<(typeof activeMembers)[number]>>()

  for (const member of activeMembers) {
    const members = activeMembersByTeamId.get(member.teamId) ?? []
    members.push(member)
    activeMembersByTeamId.set(member.teamId, members)
  }

  const criteriaById = new Map(criteria.map(criterion => [criterion.id, criterion]))
  const tracksById = new Map(tracks.map(track => [track.id, track]))

  const criterionScoresByAssignmentId = new Map<string, Array<(typeof criterionScores)[number]>>()

  for (const score of criterionScores) {
    const scores = criterionScoresByAssignmentId.get(score.judgeAssignmentId) ?? []
    scores.push(score)
    criterionScoresByAssignmentId.set(score.judgeAssignmentId, scores)
  }

  const applicationUserIds = [...new Set(activeMembers.map(member => member.userId))]
  const applicationRows = applicationUserIds.length === 0
    ? []
    : await database.query.userApplications.findMany({
        where: and(
          inArray(userApplications.hackathonId, hackathonIds),
          inArray(userApplications.userId, applicationUserIds)
        ),
        orderBy: [asc(userApplications.submittedAt), asc(userApplications.createdAt)]
      })
  const applicationsByHackathonAndUserId = new Map<string, typeof applicationRows[number]>()

  for (const application of applicationRows) {
    applicationsByHackathonAndUserId.set(`${application.hackathonId}:${application.userId}`, application)
  }

  return assignments.map((assignment) => {
    const submission = submissionsById.get(assignment.submissionId)

    if (!submission) {
      throw new ApiError({
        statusCode: 404,
        code: 'submission_not_found',
        message: 'The requested submission was not found for this judge assignment.',
        details: {
          assignmentId: assignment.id,
          submissionId: assignment.submissionId
        }
      })
    }

    const assignmentMembers = activeMembersByTeamId.get(submission.teamId) ?? []
    const applications = assignmentMembers
      .map(member => applicationsByHackathonAndUserId.get(`${assignment.hackathonId}:${member.userId}`) ?? null)
      .filter((application): application is NonNullable<typeof application> => Boolean(application))
    const assignmentScores = criterionScoresByAssignmentId.get(assignment.id) ?? []

    return {
      ...serializeJudgeAssignment(assignment),
      blindSubmission: serializeBlindSubmission(
        submission,
        applications,
        submission.trackId ? tracksById.get(submission.trackId) ?? null : null
      ),
      criterionScores: assignmentScores.map(score =>
        serializeJudgeCriterionScore(score, criteriaById.get(score.evaluationCriterionId) ?? null)
      )
    }
  })
}

async function getJudgeAssignmentRequestContext(
  event: H3Event,
  hackathonId: string,
  assignmentId: string
) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const assignmentAuthorization = await resolveJudgeAssignmentAuthorization(event, assignmentId)

  assertGuard(assignmentAuthorization.hackathonId === hackathonId, {
    statusCode: 404,
    code: 'judge_assignment_not_found',
    message: 'The requested judge assignment was not found.',
    details: {
      assignmentId,
      hackathonId
    }
  })

  const assignment = await getJudgeAssignmentOrThrow(database, assignmentId)
  const hackathonAuthorization = await resolveHackathonAuthorization(event, hackathonId)

  return {
    actor,
    database,
    hackathon,
    assignment,
    assignmentAuthorization,
    hackathonAuthorization
  }
}

export async function requireJudgeAssignmentContext(
  event: H3Event,
  hackathonId: string,
  assignmentId: string
) {
  const context = await getJudgeAssignmentRequestContext(event, hackathonId, assignmentId)
  assertBlindJudgeAssignmentAccess(context.assignmentAuthorization)
  return context
}

export function assertJudgeReviewLifecycleState(
  hackathon: HackathonRecord,
  allowedStates: Array<HackathonRecord['state']>
) {
  assertAllowedState(hackathon.state, allowedStates, {
    code: 'hackathon_state_invalid',
    message: 'This judging operation is not allowed in the current hackathon state.',
    details: {
      hackathonId: hackathon.id
    }
  })
}

export function assertJudgeAssignmentStatus(
  assignment: JudgeAssignmentRecord,
  allowedStatuses: Array<JudgeAssignmentRecord['status']>,
  message: string
) {
  assertAllowedState(assignment.status, allowedStatuses, {
    code: 'judge_assignment_state_invalid',
    message,
    details: {
      assignmentId: assignment.id
    }
  })
}

export async function pickReplacementJudgeUserId(
  database: AppDatabase,
  hackathonId: string,
  options?: {
    excludeJudgeUserIds?: string[]
    preferredJudgeUserId?: string
  }
) {
  const judgePool = await listAutomaticJudgePoolForHackathon(database, hackathonId)
  const excluded = new Set(options?.excludeJudgeUserIds ?? [])
  const eligibleJudges = judgePool.filter(judge => !excluded.has(judge.userId))

  if (eligibleJudges.length === 0) {
    throw new ApiError({
      statusCode: 409,
      code: 'eligible_replacement_judge_required',
      message: 'No eligible replacement judge is available for this assignment.',
      details: {
        hackathonId,
        excludedJudgeUserIds: [...excluded]
      }
    })
  }

  if (options?.preferredJudgeUserId) {
    const preferred = eligibleJudges.find(judge => judge.userId === options.preferredJudgeUserId)

    assertGuard(Boolean(preferred), {
      code: 'replacement_judge_invalid',
      message: 'The requested replacement judge is not in the automatic judge pool.',
      details: {
        hackathonId,
        judgeUserId: options.preferredJudgeUserId
      }
    })

    return options.preferredJudgeUserId
  }

  const activeAssignments = await database.query.judgeAssignments.findMany({
    where: and(
      eq(judgeAssignments.hackathonId, hackathonId),
      inArray(judgeAssignments.status, [...activeJudgeAssignmentStatuses]),
      inArray(judgeAssignments.judgeUserId, eligibleJudges.map(judge => judge.userId))
    )
  })

  const loadByJudge = new Map<string, number>()

  for (const judge of eligibleJudges) {
    loadByJudge.set(judge.userId, 0)
  }

  for (const assignment of activeAssignments) {
    loadByJudge.set(assignment.judgeUserId, (loadByJudge.get(assignment.judgeUserId) ?? 0) + 1)
  }

  return [...eligibleJudges]
    .sort((left, right) => {
      const leftLoad = loadByJudge.get(left.userId) ?? 0
      const rightLoad = loadByJudge.get(right.userId) ?? 0

      if (leftLoad !== rightLoad) {
        return leftLoad - rightLoad
      }

      if (left.createdAt !== right.createdAt) {
        return left.createdAt.localeCompare(right.createdAt)
      }

      return left.userId.localeCompare(right.userId)
    })[0]!.userId
}

export function buildReplacementAssignment(
  assignment: JudgeAssignmentRecord,
  judgeUserId: string,
  assignedAt: string
) {
  return {
    id: crypto.randomUUID(),
    hackathonId: assignment.hackathonId,
    submissionId: assignment.submissionId,
    judgeUserId,
    status: 'assigned',
    assignedAt,
    createdAt: assignedAt
  } satisfies JudgeAssignmentInsert
}

export async function normalizeCompletionCriterionScores(
  database: AppDatabase,
  hackathonId: string,
  body: z.infer<typeof completeJudgeAssignmentBodySchema>
) {
  const criteria = await database.query.evaluationCriteria.findMany({
    where: eq(evaluationCriteria.hackathonId, hackathonId),
    orderBy: [asc(evaluationCriteria.displayOrder), asc(evaluationCriteria.createdAt)]
  })

  assertGuard(criteria.length > 0, {
    code: 'evaluation_criteria_required',
    message: 'A review cannot be completed until evaluation criteria exist for the hackathon.',
    details: {
      hackathonId
    }
  })

  const criteriaById = new Map(criteria.map(criterion => [criterion.id, criterion]))
  const seenCriterionIds = new Set<string>()

  for (const criterionScore of body.criterionScores) {
    assertGuard(criteriaById.has(criterionScore.evaluationCriterionId), {
      code: 'evaluation_criterion_not_found',
      message: 'Review scores must reference evaluation criteria from this hackathon.',
      details: {
        hackathonId,
        evaluationCriterionId: criterionScore.evaluationCriterionId
      }
    })

    assertGuard(!seenCriterionIds.has(criterionScore.evaluationCriterionId), {
      code: 'duplicate_criterion_score',
      message: 'Each evaluation criterion can only be scored once per review.',
      details: {
        hackathonId,
        evaluationCriterionId: criterionScore.evaluationCriterionId
      }
    })

    seenCriterionIds.add(criterionScore.evaluationCriterionId)
  }

  assertGuard(seenCriterionIds.size === criteria.length, {
    code: 'complete_criterion_scores_required',
    message: 'A completed review must include a score for every evaluation criterion.',
    details: {
      hackathonId,
      expectedCriterionCount: criteria.length,
      providedCriterionCount: seenCriterionIds.size
    }
  })

  return body.criterionScores
}

export async function requireAdminAssignmentContext(
  event: H3Event,
  hackathonId: string,
  assignmentId: string
) {
  const context = await getJudgeAssignmentRequestContext(event, hackathonId, assignmentId)
  assertHackathonAdminAccess(context.hackathonAuthorization)
  return context
}

export function assertAssignmentReviewActor(
  authorization: JudgeAssignmentAuthorization,
  actorUserId: string
) {
  assertGuard(
    authorization.assignedJudgeUserId === actorUserId,
    {
      statusCode: 403,
      code: 'judge_assignment_access_denied',
      message: 'This operation requires blind-review access to the judge assignment.',
      details: {
        assignmentId: authorization.assignmentId
      }
    }
  )
}
