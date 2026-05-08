import type { H3Event } from 'h3'

import { and, asc, count, eq, getTableColumns, inArray, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'

import { requirePlatformActor } from '#server/auth/actor'
import {
  assertJudgeAssignmentAccess,
  assertEventAdminAccess,
  resolveEventAuthorization,
  resolveJudgeAssignmentAuthorization,
  type JudgeAssignmentAuthorization
} from '#server/auth/authorization'
import { getDatabase, type AppDatabase } from '#server/database/client'
import {
  evaluationCriteria,
  eventTracks,
  eventRoleAssignments,
  judgeAssignments,
  judgeCriterionScores,
  submissions,
  teamMembers,
  teams,
  userApplications,
  type events
} from '#server/database/schema'
import { ApiError } from '#server/http/api-error'
import { assertAllowedState, assertGuard } from '#server/domains/lifecycle-guard'
import { assertCompetitionEvent, getVisibleEventOrThrow, routeIdParamsSchema } from '#server/domains/events'

type EventRecord = typeof events.$inferSelect
type SubmissionRecord = typeof submissions.$inferSelect
type JudgeAssignmentRecord = typeof judgeAssignments.$inferSelect
type JudgeAssignmentInsert = typeof judgeAssignments.$inferInsert
type EvaluationCriterionRecord = typeof evaluationCriteria.$inferSelect
type JudgeCriterionScoreRecord = typeof judgeCriterionScores.$inferSelect

const activeJudgeAssignmentStatuses = ['assigned', 'judge_started'] as const
const minimumJudgeScore = 1
const maximumJudgeScore = 5
const d1MaxBoundParametersPerStatement = 100

const criterionScoreInputSchema = z.object({
  evaluationCriterionId: z.string().trim().min(1),
  score: z.coerce.number().int().min(minimumJudgeScore).max(maximumJudgeScore),
  comment: z.string().trim().min(1).optional()
})

export const judgingAssignmentParamsSchema = routeIdParamsSchema.extend({
  assignmentId: z.string().trim().min(1)
})

export const completeJudgeAssignmentBodySchema = z.object({
  criterionScores: z.array(criterionScoreInputSchema).min(1)
})

export const saveJudgeAssignmentBodySchema = z.object({
  criterionScores: z.array(criterionScoreInputSchema).min(1)
})

export const completePitchReviewBodySchema = z.object({
  pitchScore: z.coerce.number().int().min(minimumJudgeScore).max(maximumJudgeScore),
  pitchComment: z.string().trim().min(1).optional()
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

export function chunkRowsForD1<T>(rows: T[], boundParametersPerRow: number) {
  if (rows.length === 0) {
    return []
  }

  const maxRowsPerInsert = Math.max(
    1,
    Math.floor(d1MaxBoundParametersPerStatement / boundParametersPerRow)
  )
  const chunks: T[][] = []

  for (let index = 0; index < rows.length; index += maxRowsPerInsert) {
    chunks.push(rows.slice(index, index + maxRowsPerInsert))
  }

  return chunks
}

export function serializeJudgeAssignment(assignment: JudgeAssignmentRecord) {
  return {
    id: assignment.id,
    eventId: assignment.eventId,
    submissionId: assignment.submissionId,
    judgeUserId: assignment.judgeUserId,
    reviewStage: assignment.reviewStage,
    blindReviewSlot: assignment.blindReviewSlot,
    status: assignment.status,
    pitchScore: assignment.pitchScore,
    pitchComment: assignment.pitchComment,
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
  track: typeof eventTracks.$inferSelect | null
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

export function serializePitchSubmission(
  submission: SubmissionRecord,
  team: typeof teams.$inferSelect,
  track: typeof eventTracks.$inferSelect | null
) {
  return {
    id: submission.id,
    projectName: submission.projectName,
    teamName: team.name,
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
    lockedAt: submission.lockedAt
  }
}

type BlindJudgeAssignmentDetail = ReturnType<typeof serializeJudgeAssignment> & {
  blindSubmission: ReturnType<typeof serializeBlindSubmission>
  criterionScores: Array<ReturnType<typeof serializeJudgeCriterionScore>>
}

type PitchJudgeAssignmentDetail = ReturnType<typeof serializeJudgeAssignment> & {
  pitchSubmission: ReturnType<typeof serializePitchSubmission>
}

type JudgeAssignmentDetail = BlindJudgeAssignmentDetail | PitchJudgeAssignmentDetail
export const listJudgeAssignmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(100)
})
type ListJudgeAssignmentsQuery = z.infer<typeof listJudgeAssignmentsQuerySchema>

export type JudgeAssignmentSummary = ReturnType<typeof serializeJudgeAssignment> & {
  blindSubmission?: ReturnType<typeof serializeBlindSubmission>
  pitchSubmission?: ReturnType<typeof serializePitchSubmission>
}

export async function getJudgingAssignmentSummary(
  database: AppDatabase,
  event: Pick<EventRecord, 'id'>
) {
  const [totalRows, activeRows, completedPitchRows] = await Promise.all([
    database
      .select({ total: count() })
      .from(judgeAssignments)
      .where(eq(judgeAssignments.eventId, event.id)),
    database
      .select({ total: count() })
      .from(judgeAssignments)
      .where(and(
        eq(judgeAssignments.eventId, event.id),
        inArray(judgeAssignments.status, [...activeJudgeAssignmentStatuses])
      )),
    database
      .select({ total: count() })
      .from(judgeAssignments)
      .where(and(
        eq(judgeAssignments.eventId, event.id),
        eq(judgeAssignments.reviewStage, 'pitch_review'),
        eq(judgeAssignments.status, 'judge_completed')
      ))
  ])

  return {
    totalAssignmentCount: totalRows[0]?.total ?? 0,
    activeAssignmentCount: activeRows[0]?.total ?? 0,
    completedPitchAssignmentCount: completedPitchRows[0]?.total ?? 0
  }
}

export async function listActiveJudgeAssignmentSummaries(
  database: AppDatabase,
  eventId: string,
  query: ListJudgeAssignmentsQuery = { page: 1, page_size: 100 }
) {
  const activeAssignmentWhere = and(
    eq(judgeAssignments.eventId, eventId),
    inArray(judgeAssignments.status, [...activeJudgeAssignmentStatuses])
  )
  const [rows, totalRows] = await Promise.all([
    database
      .select({
        assignment: getTableColumns(judgeAssignments),
        submission: {
          id: submissions.id,
          projectName: submissions.projectName,
          summary: submissions.summary,
          repositoryUrl: submissions.repositoryUrl,
          demoUrl: submissions.demoUrl,
          status: submissions.status,
          submittedAt: submissions.submittedAt,
          lockedAt: submissions.lockedAt
        },
        team: {
          id: teams.id,
          name: teams.name
        }
      })
      .from(judgeAssignments)
      .innerJoin(submissions, eq(submissions.id, judgeAssignments.submissionId))
      .innerJoin(teams, eq(teams.id, submissions.teamId))
      .where(activeAssignmentWhere)
      .orderBy(asc(judgeAssignments.judgeUserId), asc(judgeAssignments.createdAt))
      .limit(query.page_size)
      .offset((query.page - 1) * query.page_size),
    database
      .select({ total: count() })
      .from(judgeAssignments)
      .where(activeAssignmentWhere)
  ])

  const data = rows.map(({ assignment, submission, team }): JudgeAssignmentSummary => {
    const submissionRecord = {
      id: submission.id,
      teamId: team.id,
      trackId: null,
      status: submission.status,
      projectName: submission.projectName,
      summary: submission.summary,
      repositoryUrl: submission.repositoryUrl,
      demoUrl: submission.demoUrl,
      isPubliclyVisible: false,
      submittedAt: submission.submittedAt,
      lockedAt: submission.lockedAt,
      withdrawnAt: null,
      disqualifiedAt: null,
      createdAt: assignment.createdAt,
      updatedAt: assignment.createdAt
    } satisfies SubmissionRecord

    return assignment.reviewStage === 'pitch_review'
      ? {
          ...serializeJudgeAssignment(assignment),
          pitchSubmission: serializePitchSubmission(submissionRecord, {
            id: team.id,
            eventId,
            name: team.name,
            bio: null,
            slug: '',
            workspaceMode: 'team',
            isOpenToJoinRequests: false,
            createdByUserId: '',
            createdAt: assignment.createdAt,
            updatedAt: assignment.createdAt
          }, null)
        }
      : {
          ...serializeJudgeAssignment(assignment),
          blindSubmission: serializeBlindSubmission(submissionRecord, [], null)
        }
  })

  return {
    data,
    total: totalRows[0]?.total ?? 0
  }
}

export function assertStartJudgingPreparationAllowed(
  event: EventRecord,
  metrics: {
    submittedSubmissionCount: number
  },
  now: Date = new Date()
) {
  assertCompetitionEvent(event)

  assertAllowedState(event.state, ['submission_open'], {
    code: 'event_state_invalid',
    message: 'Submissions can only be stopped while the event is in submission_open.',
    details: {
      eventId: event.id
    }
  })

  assertGuard(Date.parse(event.submissionClosesAt) <= now.getTime(), {
    code: 'submission_window_still_open',
    message: 'Submissions can only be stopped after the submission window closes.',
    details: {
      eventId: event.id,
      submissionClosesAt: event.submissionClosesAt
    }
  })

  assertGuard(metrics.submittedSubmissionCount > 0, {
    code: 'submitted_submissions_required',
    message: 'Stopping submissions requires at least one submitted project.',
    details: {
      eventId: event.id
    }
  })
}

export function assertStartJudgeReviewAllowed(
  event: EventRecord,
  metrics: {
    submittedSubmissionCount: number
    judgePoolCount: number
  }
) {
  assertCompetitionEvent(event)

  assertAllowedState(event.state, ['judging_preparation'], {
    code: 'event_state_invalid',
    message: 'Judge review can only start while the event is in judging_preparation.',
    details: {
      eventId: event.id
    }
  })

  assertGuard(event.blindReviewCount > 0, {
    code: 'blind_review_not_enabled',
    message: 'Blind review can only start when blind review is enabled.',
    details: {
      eventId: event.id
    }
  })

  assertGuard(metrics.submittedSubmissionCount > 0, {
    code: 'submitted_submissions_required',
    message: 'Blind review requires at least one submitted submission.',
    details: {
      eventId: event.id
    }
  })

  assertGuard(metrics.judgePoolCount > 0, {
    code: 'judge_pool_required',
    message: 'Blind review requires at least one judge in the automatic judge pool.',
    details: {
      eventId: event.id
    }
  })

  assertGuard(metrics.judgePoolCount >= event.blindReviewCount, {
    statusCode: 409,
    code: 'distinct_blind_review_judges_required',
    message: 'The automatic judge pool must include enough distinct judges for the configured blind review count.',
    details: {
      eventId: event.id,
      blindReviewCount: event.blindReviewCount,
      judgePoolCount: metrics.judgePoolCount
    }
  })
}

export function assertStartPitchAllowed(
  event: EventRecord,
  metrics: {
    competitionSubmissionCount: number
    finalistSubmissionCount: number
  }
) {
  assertCompetitionEvent(event)

  assertGuard(event.pitchReviewEnabled, {
    code: 'pitch_review_not_enabled',
    message: 'Pitch can only start when pitch review is enabled.',
    details: {
      eventId: event.id
    }
  })

  const requiresShortlist = event.blindReviewCount > 0

  assertAllowedState(event.state, requiresShortlist ? ['shortlist'] : ['judging_preparation'], {
    code: 'event_state_invalid',
    message: requiresShortlist
      ? 'Pitch can only start from shortlist after finalists are selected.'
      : 'Pitch can only start while the event is in judging_preparation.',
    details: {
      eventId: event.id
    }
  })

  assertGuard(
    requiresShortlist ? metrics.finalistSubmissionCount > 0 : metrics.competitionSubmissionCount > 0,
    {
      code: requiresShortlist ? 'pitch_finalists_required' : 'submitted_submissions_required',
      message: requiresShortlist
        ? 'Pitch requires at least one persisted finalist submission.'
        : 'Pitch requires at least one submitted submission.',
      details: {
        eventId: event.id
      }
    }
  )
}

export function assertStartPitchReviewAllowed(
  event: EventRecord,
  metrics: {
    lockedSubmissionCount: number
    finalistSubmissionCount: number
    judgePanelCount: number
  }
) {
  assertCompetitionEvent(event)

  assertGuard(event.pitchReviewEnabled, {
    code: 'pitch_review_not_enabled',
    message: 'Pitch review can only start when pitch review is enabled.',
    details: {
      eventId: event.id
    }
  })

  assertAllowedState(event.state, ['pitch'], {
    code: 'event_state_invalid',
    message: 'Pitch review can only start after the live pitch stage is active.',
    details: {
      eventId: event.id
    }
  })

  assertGuard(
    event.activePitchPresentationSubmissionId === null
    && event.pitchPresentationsCompletedAt !== null,
    {
      code: 'pitch_presentations_incomplete',
      message: 'Pitch review can only start after all pitch presentations have been completed.',
      details: {
        eventId: event.id
      }
    }
  )

  assertGuard(metrics.judgePanelCount > 0, {
    code: 'judge_pool_required',
    message: 'Pitch review requires at least one judge in the automatic judge pool.',
    details: {
      eventId: event.id
    }
  })

  assertGuard(
    metrics.finalistSubmissionCount > 0,
    {
      code: 'pitch_finalists_required',
      message: 'Pitch review requires at least one persisted finalist submission.',
      details: {
        eventId: event.id
      }
    }
  )
}

export function assertAdvancePitchPresentationAllowed(
  event: EventRecord,
  metrics: {
    finalistSubmissionCount: number
  }
) {
  assertCompetitionEvent(event)

  assertGuard(event.pitchReviewEnabled, {
    code: 'pitch_review_not_enabled',
    message: 'Pitch presentation control is only available when pitch review is enabled.',
    details: {
      eventId: event.id
    }
  })

  assertAllowedState(event.state, ['pitch'], {
    code: 'event_state_invalid',
    message: 'Pitch presentation control is only available while the live pitch stage is active.',
    details: {
      eventId: event.id
    }
  })

  assertGuard(metrics.finalistSubmissionCount > 0, {
    code: 'pitch_finalists_required',
    message: 'Pitch presentation control requires at least one finalist submission.',
    details: {
      eventId: event.id
    }
  })

  assertGuard(event.pitchPresentationsCompletedAt === null, {
    code: 'pitch_presentations_already_completed',
    message: 'All pitch presentations have already been completed.',
    details: {
      eventId: event.id
    }
  })
}

export function resolvePitchPresentationState(
  event: EventRecord,
  finalistSubmissionIds: string[]
) {
  const uniqueFinalistSubmissionIds = new Set(finalistSubmissionIds)

  assertGuard(uniqueFinalistSubmissionIds.size === finalistSubmissionIds.length, {
    statusCode: 500,
    code: 'pitch_finalists_invalid',
    message: 'The stored pitch finalists are invalid.',
    details: {
      eventId: event.id
    }
  })

  if (event.pitchPresentationsCompletedAt !== null) {
    assertGuard(event.activePitchPresentationSubmissionId === null, {
      statusCode: 500,
      code: 'pitch_presentation_state_invalid',
      message: 'The stored pitch presentation state is invalid.',
      details: {
        eventId: event.id
      }
    })

    return {
      currentSubmissionId: null,
      currentIndex: null,
      isCompleted: true
    }
  }

  if (!event.activePitchPresentationSubmissionId) {
    return {
      currentSubmissionId: null,
      currentIndex: null,
      isCompleted: false
    }
  }

  const currentIndex = finalistSubmissionIds.findIndex(
    submissionId => submissionId === event.activePitchPresentationSubmissionId
  )

  assertGuard(currentIndex !== -1, {
    statusCode: 500,
    code: 'pitch_presentation_state_invalid',
    message: 'The stored pitch presentation state is invalid.',
    details: {
      eventId: event.id,
      submissionId: event.activePitchPresentationSubmissionId
    }
  })

  return {
    currentSubmissionId: event.activePitchPresentationSubmissionId,
    currentIndex,
    isCompleted: false
  }
}

export function advancePitchPresentation(
  event: EventRecord,
  finalistSubmissionIds: string[],
  advancedAt: string
) {
  const presentationState = resolvePitchPresentationState(event, finalistSubmissionIds)

  if (presentationState.isCompleted) {
    throw new ApiError({
      statusCode: 409,
      code: 'pitch_presentations_already_completed',
      message: 'All pitch presentations have already been completed.',
      details: {
        eventId: event.id
      }
    })
  }

  if (presentationState.currentIndex === null) {
    return {
      activePitchPresentationSubmissionId: finalistSubmissionIds[0] ?? null,
      pitchPresentationsCompletedAt: null
    }
  }

  const nextSubmissionId = finalistSubmissionIds[presentationState.currentIndex + 1] ?? null

  if (nextSubmissionId) {
    return {
      activePitchPresentationSubmissionId: nextSubmissionId,
      pitchPresentationsCompletedAt: null
    }
  }

  return {
    activePitchPresentationSubmissionId: null,
    pitchPresentationsCompletedAt: advancedAt
  }
}

export function prunePitchPresentationProgress(
  event: EventRecord,
  previousSubmissionIds: string[],
  nextSubmissionIds: string[],
  removedSubmissionId: string,
  prunedAt: string
) {
  if (event.pitchPresentationsCompletedAt !== null) {
    return {
      activePitchPresentationSubmissionId: null,
      pitchPresentationsCompletedAt: event.pitchPresentationsCompletedAt
    }
  }

  if (!event.activePitchPresentationSubmissionId) {
    return {
      activePitchPresentationSubmissionId: null,
      pitchPresentationsCompletedAt: null
    }
  }

  if (event.activePitchPresentationSubmissionId !== removedSubmissionId) {
    assertGuard(nextSubmissionIds.includes(event.activePitchPresentationSubmissionId), {
      statusCode: 500,
      code: 'pitch_presentation_state_invalid',
      message: 'The stored pitch presentation state is invalid.',
      details: {
        eventId: event.id,
        submissionId: event.activePitchPresentationSubmissionId
      }
    })

    return {
      activePitchPresentationSubmissionId: event.activePitchPresentationSubmissionId,
      pitchPresentationsCompletedAt: null
    }
  }

  const removedIndex = previousSubmissionIds.findIndex(submissionId => submissionId === removedSubmissionId)
  const nextSubmissionId = removedIndex === -1
    ? null
    : (nextSubmissionIds[removedIndex] ?? null)

  return {
    activePitchPresentationSubmissionId: nextSubmissionId,
    pitchPresentationsCompletedAt: nextSubmissionId ? null : prunedAt
  }
}

export async function listSubmittedSubmissionsForEvent(database: AppDatabase, eventId: string) {
  return await database
    .select(getTableColumns(submissions))
    .from(submissions)
    .innerJoin(teams, eq(teams.id, submissions.teamId))
    .where(and(
      eq(teams.eventId, eventId),
      eq(submissions.status, 'submitted')
    ))
    .orderBy(asc(submissions.submittedAt), asc(submissions.createdAt))
}

export async function listLockedSubmissionsForEvent(database: AppDatabase, eventId: string) {
  return await database
    .select(getTableColumns(submissions))
    .from(submissions)
    .innerJoin(teams, eq(teams.id, submissions.teamId))
    .where(and(
      eq(teams.eventId, eventId),
      eq(submissions.status, 'locked')
    ))
    .orderBy(asc(submissions.lockedAt), asc(submissions.createdAt))
}

export async function listAutomaticJudgePoolForEvent(database: AppDatabase, eventId: string) {
  return await database.query.eventRoleAssignments.findMany({
    where: and(
      eq(eventRoleAssignments.eventId, eventId),
      eq(eventRoleAssignments.isInJudgePool, true)
    ),
    orderBy: [asc(eventRoleAssignments.createdAt), asc(eventRoleAssignments.userId)]
  })
}

export function buildInitialJudgeAssignments(
  eventId: string,
  submittedSubmissions: SubmissionRecord[],
  judgePool: Array<typeof eventRoleAssignments.$inferSelect>,
  blindReviewCount: number,
  assignedAt: string
) {
  if (blindReviewCount === 0 || submittedSubmissions.length === 0) {
    return []
  }

  const loadByJudge = new Map<string, number>()

  for (const judge of judgePool) {
    loadByJudge.set(judge.userId, 0)
  }

  const compareJudgeLoad = (
    left: (typeof eventRoleAssignments.$inferSelect),
    right: (typeof eventRoleAssignments.$inferSelect)
  ) => {
    const leftLoad = loadByJudge.get(left.userId) ?? 0
    const rightLoad = loadByJudge.get(right.userId) ?? 0

    if (leftLoad !== rightLoad) {
      return leftLoad - rightLoad
    }

    if (left.createdAt !== right.createdAt) {
      return left.createdAt.localeCompare(right.createdAt)
    }

    return left.userId.localeCompare(right.userId)
  }

  return submittedSubmissions.flatMap((submission) => {
    const assignedJudgeIds = new Set<string>()

    return Array.from({ length: blindReviewCount }, (_, index) => {
      const availableJudges = judgePool.filter(judge => !assignedJudgeIds.has(judge.userId))
      assertGuard(availableJudges.length > 0, {
        statusCode: 409,
        code: 'distinct_blind_review_judges_required',
        message: 'The automatic judge pool must include enough distinct judges for the configured blind review count.',
        details: {
          eventId,
          submissionId: submission.id,
          blindReviewCount,
          judgePoolCount: judgePool.length
        }
      })
      const selectedJudge = [...availableJudges].sort(compareJudgeLoad)[0]

      if (!selectedJudge) {
        throw new ApiError({
          statusCode: 409,
          code: 'judge_pool_required',
          message: 'Blind review requires at least one judge in the automatic judge pool.',
          details: { eventId }
        })
      }

      assignedJudgeIds.add(selectedJudge.userId)
      loadByJudge.set(selectedJudge.userId, (loadByJudge.get(selectedJudge.userId) ?? 0) + 1)

      return {
        id: crypto.randomUUID(),
        eventId,
        submissionId: submission.id,
        judgeUserId: selectedJudge.userId,
        reviewStage: 'blind_review',
        blindReviewSlot: index + 1,
        status: 'assigned',
        assignedAt,
        createdAt: assignedAt
      } satisfies JudgeAssignmentInsert
    })
  })
}

export function buildPitchReviewAssignments(
  eventId: string,
  finalistSubmissions: SubmissionRecord[],
  judgePanel: Array<typeof eventRoleAssignments.$inferSelect>,
  assignedAt: string
) {
  if (finalistSubmissions.length === 0 || judgePanel.length === 0) {
    return []
  }

  return finalistSubmissions.flatMap(submission =>
    judgePanel.map(judge => ({
      id: crypto.randomUUID(),
      eventId,
      submissionId: submission.id,
      judgeUserId: judge.userId,
      reviewStage: 'pitch_review',
      blindReviewSlot: null,
      status: 'assigned',
      pitchScore: null,
      pitchComment: null,
      assignedAt,
      createdAt: assignedAt
    } satisfies JudgeAssignmentInsert))
  )
}

export function parseStoredPitchFinalistSubmissionIds(event: EventRecord) {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(event.pitchFinalistSubmissionIdsJson)
  } catch {
    throw new ApiError({
      statusCode: 500,
      code: 'pitch_finalists_invalid',
      message: 'The stored pitch finalists are invalid.',
      details: {
        eventId: event.id
      }
    })
  }

  const result = z.array(z.string().trim().min(1)).safeParse(parsedValue)

  if (!result.success) {
    throw new ApiError({
      statusCode: 500,
      code: 'pitch_finalists_invalid',
      message: 'The stored pitch finalists are invalid.',
      details: {
        eventId: event.id
      }
    })
  }

  return result.data
}

export function selectPitchReviewSubmissions(
  event: EventRecord,
  lockedSubmissions: SubmissionRecord[]
) {
  const finalistSubmissionIds = parseStoredPitchFinalistSubmissionIds(event)

  if (finalistSubmissionIds.length === 0) {
    if (event.blindReviewCount === 0 && event.state === 'judging_preparation') {
      return lockedSubmissions
    }

    return []
  }
  const uniqueFinalistSubmissionIds = new Set(finalistSubmissionIds)

  assertGuard(uniqueFinalistSubmissionIds.size === finalistSubmissionIds.length, {
    statusCode: 500,
    code: 'pitch_finalists_invalid',
    message: 'The stored pitch finalists are invalid.',
    details: {
      eventId: event.id
    }
  })

  const lockedSubmissionById = new Map(lockedSubmissions.map(submission => [submission.id, submission]))

  return finalistSubmissionIds.map((submissionId) => {
    const submission = lockedSubmissionById.get(submissionId)

    assertGuard(Boolean(submission), {
      statusCode: 500,
      code: 'pitch_finalists_invalid',
      message: 'The stored pitch finalists are invalid.',
      details: {
        eventId: event.id,
        submissionId
      }
    })

    return submission!
  })
}

export async function buildPrizeEligibilitySnapshots(
  database: AppDatabase,
  eventId: string,
  teamIds: string[],
  snapshotAt: string
) {
  if (teamIds.length === 0) {
    return []
  }

  const eligibleTeamIds = new Set(teamIds)
  const members = (await database
    .select(getTableColumns(teamMembers))
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(
      eq(teams.eventId, eventId),
      isNull(teamMembers.leftAt)
    ))
    .orderBy(asc(teamMembers.joinedAt), asc(teamMembers.createdAt)))
    .filter(member => eligibleTeamIds.has(member.teamId))

  return members.map(member => ({
    id: crypto.randomUUID(),
    eventId,
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

export async function getBlindAssignmentDetails(
  database: AppDatabase,
  assignments: JudgeAssignmentRecord[]
): Promise<BlindJudgeAssignmentDetail[]> {
  if (assignments.length === 0) {
    return []
  }

  const assignmentsByEventId = new Map<string, JudgeAssignmentRecord[]>()

  for (const assignment of assignments) {
    const groupedAssignments = assignmentsByEventId.get(assignment.eventId) ?? []
    groupedAssignments.push(assignment)
    assignmentsByEventId.set(assignment.eventId, groupedAssignments)
  }

  if (assignmentsByEventId.size > 1) {
    const groupedDetails: BlindJudgeAssignmentDetail[] = (await Promise.all(
      [...assignmentsByEventId.values()].map(groupedAssignments =>
        getBlindAssignmentDetails(database, groupedAssignments)
      )
    )).flat()
    const detailsByAssignmentId = new Map(groupedDetails.map(detail => [detail.id, detail]))

    return assignments.map(assignment => detailsByAssignmentId.get(assignment.id)!)
  }

  const eventId = assignments[0]!.eventId

  const [submissionRows, activeMembers, criteria, criterionScores, tracks, applicationRows] = await Promise.all([
    database
      .select(getTableColumns(submissions))
      .from(submissions)
      .innerJoin(teams, eq(teams.id, submissions.teamId))
      .where(eq(teams.eventId, eventId)),
    database
      .select(getTableColumns(teamMembers))
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(and(
        eq(teams.eventId, eventId),
        isNull(teamMembers.leftAt)
      ))
      .orderBy(asc(teamMembers.joinedAt), asc(teamMembers.createdAt)),
    database.query.evaluationCriteria.findMany({
      where: eq(evaluationCriteria.eventId, eventId),
      orderBy: [asc(evaluationCriteria.eventId), asc(evaluationCriteria.displayOrder), asc(evaluationCriteria.createdAt)]
    }),
    database
      .select(getTableColumns(judgeCriterionScores))
      .from(judgeCriterionScores)
      .innerJoin(judgeAssignments, eq(judgeAssignments.id, judgeCriterionScores.judgeAssignmentId))
      .where(and(
        eq(judgeAssignments.eventId, eventId),
        eq(judgeAssignments.reviewStage, 'blind_review')
      ))
      .orderBy(asc(judgeCriterionScores.createdAt)),
    database.query.eventTracks.findMany({
      where: eq(eventTracks.eventId, eventId)
    }),
    database.query.userApplications.findMany({
      where: eq(userApplications.eventId, eventId),
      orderBy: [asc(userApplications.submittedAt), asc(userApplications.createdAt)]
    })
  ])
  const submissionsById = new Map(submissionRows.map(submission => [submission.id, submission]))

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

  const applicationsByEventAndUserId = new Map<string, typeof applicationRows[number]>()

  for (const application of applicationRows) {
    applicationsByEventAndUserId.set(`${application.eventId}:${application.userId}`, application)
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
      .map(member => applicationsByEventAndUserId.get(`${assignment.eventId}:${member.userId}`) ?? null)
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

export async function getPitchAssignmentDetails(
  database: AppDatabase,
  assignments: JudgeAssignmentRecord[]
): Promise<PitchJudgeAssignmentDetail[]> {
  if (assignments.length === 0) {
    return []
  }

  const assignmentsByEventId = new Map<string, JudgeAssignmentRecord[]>()

  for (const assignment of assignments) {
    const groupedAssignments = assignmentsByEventId.get(assignment.eventId) ?? []
    groupedAssignments.push(assignment)
    assignmentsByEventId.set(assignment.eventId, groupedAssignments)
  }

  if (assignmentsByEventId.size > 1) {
    const groupedDetails: PitchJudgeAssignmentDetail[] = (await Promise.all(
      [...assignmentsByEventId.values()].map(groupedAssignments =>
        getPitchAssignmentDetails(database, groupedAssignments)
      )
    )).flat()
    const detailsByAssignmentId = new Map(groupedDetails.map(detail => [detail.id, detail]))

    return assignments.map(assignment => detailsByAssignmentId.get(assignment.id)!)
  }

  const eventId = assignments[0]!.eventId
  const [submissionRows, teamRows, trackRows] = await Promise.all([
    database
      .select(getTableColumns(submissions))
      .from(submissions)
      .innerJoin(teams, eq(teams.id, submissions.teamId))
      .where(eq(teams.eventId, eventId)),
    database.query.teams.findMany({
      where: eq(teams.eventId, eventId)
    }),
    database.query.eventTracks.findMany({
      where: eq(eventTracks.eventId, eventId)
    })
  ])
  const submissionsById = new Map(submissionRows.map(submission => [submission.id, submission]))
  const teamsById = new Map(teamRows.map(team => [team.id, team]))
  const tracksById = new Map(trackRows.map(track => [track.id, track]))

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

    const team = teamsById.get(submission.teamId)

    if (!team) {
      throw new ApiError({
        statusCode: 404,
        code: 'team_not_found',
        message: 'The requested team was not found for this judge assignment.',
        details: {
          assignmentId: assignment.id,
          submissionId: assignment.submissionId,
          teamId: submission.teamId
        }
      })
    }

    return {
      ...serializeJudgeAssignment(assignment),
      pitchSubmission: serializePitchSubmission(
        submission,
        team,
        submission.trackId ? tracksById.get(submission.trackId) ?? null : null
      )
    }
  })
}

export async function getJudgeAssignmentDetails(
  database: AppDatabase,
  assignments: JudgeAssignmentRecord[]
): Promise<JudgeAssignmentDetail[]> {
  if (assignments.length === 0) {
    return []
  }

  const blindAssignments = assignments.filter(assignment => assignment.reviewStage === 'blind_review')
  const pitchAssignments = assignments.filter(assignment => assignment.reviewStage === 'pitch_review')
  const [blindDetails, pitchDetails] = await Promise.all([
    getBlindAssignmentDetails(database, blindAssignments),
    getPitchAssignmentDetails(database, pitchAssignments)
  ])
  const detailsByAssignmentId = new Map(
    [...blindDetails, ...pitchDetails].map(detail => [detail.id, detail])
  )

  return assignments.map((assignment) => {
    const detail = detailsByAssignmentId.get(assignment.id)

    if (!detail) {
      throw new ApiError({
        statusCode: 404,
        code: 'judge_assignment_not_found',
        message: 'The requested judge assignment was not found.',
        details: { assignmentId: assignment.id }
      })
    }

    return detail
  })
}

export async function getJudgeAssignmentDetail(
  database: AppDatabase,
  assignment: JudgeAssignmentRecord
) {
  const [detail] = await getJudgeAssignmentDetails(database, [assignment])

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

async function getJudgeAssignmentRequestContext(
  h3Event: H3Event,
  eventId: string,
  assignmentId: string
) {
  const actor = await requirePlatformActor(h3Event)
  const database = getDatabase(h3Event)
  const event = await getVisibleEventOrThrow(h3Event, eventId)
  assertCompetitionEvent(event)
  const assignmentAuthorization = await resolveJudgeAssignmentAuthorization(h3Event, assignmentId)

  assertGuard(assignmentAuthorization.eventId === eventId, {
    statusCode: 404,
    code: 'judge_assignment_not_found',
    message: 'The requested judge assignment was not found.',
    details: {
      assignmentId,
      eventId
    }
  })

  const assignment = await getJudgeAssignmentOrThrow(database, assignmentId)
  const eventAuthorization = await resolveEventAuthorization(h3Event, eventId)

  return {
    actor,
    database,
    event,
    assignment,
    assignmentAuthorization,
    eventAuthorization
  }
}

export async function requireJudgeAssignmentContext(
  event: H3Event,
  eventId: string,
  assignmentId: string
) {
  const context = await getJudgeAssignmentRequestContext(event, eventId, assignmentId)
  assertJudgeAssignmentAccess(context.assignmentAuthorization)
  return context
}

export function assertJudgeReviewLifecycleState(
  event: EventRecord,
  allowedStates: Array<EventRecord['state']>
) {
  assertAllowedState(event.state, allowedStates, {
    code: 'event_state_invalid',
    message: 'This judging operation is not allowed in the current event state.',
    details: {
      eventId: event.id
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

export function getEventStateForAssignmentReviewStage(
  reviewStage: JudgeAssignmentRecord['reviewStage']
): EventRecord['state'] {
  return reviewStage === 'pitch_review' ? 'pitch_review' : 'blind_review'
}

export function assertAssignmentReviewStageIsActive(
  event: EventRecord,
  assignment: JudgeAssignmentRecord
) {
  assertJudgeReviewLifecycleState(event, [getEventStateForAssignmentReviewStage(assignment.reviewStage)])
}

export async function pickReplacementJudgeUserId(
  database: AppDatabase,
  eventId: string,
  options?: {
    excludeJudgeUserIds?: string[]
    preferredJudgeUserId?: string
    reviewStage?: JudgeAssignmentRecord['reviewStage']
    submissionId?: string
    excludeAssignmentId?: string
  }
) {
  const judgePool = await listAutomaticJudgePoolForEvent(database, eventId)
  const excluded = new Set(options?.excludeJudgeUserIds ?? [])
  const eligibleJudges = judgePool.filter(judge => !excluded.has(judge.userId))

  if (eligibleJudges.length === 0) {
    throw new ApiError({
      statusCode: 409,
      code: 'eligible_replacement_judge_required',
      message: 'No eligible replacement judge is available for this assignment.',
      details: {
        eventId,
        excludedJudgeUserIds: [...excluded]
      }
    })
  }

  const activeAssignments = await database.query.judgeAssignments.findMany({
    where: and(
      eq(judgeAssignments.eventId, eventId),
      eq(judgeAssignments.reviewStage, options?.reviewStage ?? 'blind_review'),
      inArray(judgeAssignments.status, [...activeJudgeAssignmentStatuses])
    )
  })
  const eligibleJudgeUserIds = new Set(eligibleJudges.map(judge => judge.userId))
  const activeSubmissionJudgeUserIds = options?.submissionId
    ? new Set(
        activeAssignments
          .filter(assignment =>
            eligibleJudgeUserIds.has(assignment.judgeUserId)
            && assignment.submissionId === options.submissionId
            && assignment.id !== options.excludeAssignmentId
          )
          .map(assignment => assignment.judgeUserId)
      )
    : new Set<string>()
  const distinctSubmissionEligibleJudges = eligibleJudges.filter(
    judge => !activeSubmissionJudgeUserIds.has(judge.userId)
  )
  const requiresDistinctBlindJudge = options?.reviewStage !== 'pitch_review'
    && Boolean(options?.submissionId)

  if (requiresDistinctBlindJudge) {
    assertGuard(distinctSubmissionEligibleJudges.length > 0, {
      statusCode: 409,
      code: 'eligible_replacement_judge_required',
      message: 'No eligible replacement judge is available without duplicating the blind-review judge for this submission.',
      details: {
        eventId,
        submissionId: options?.submissionId,
        excludedJudgeUserIds: [...excluded]
      }
    })
  }

  const judgesToSelectFrom = requiresDistinctBlindJudge
    ? distinctSubmissionEligibleJudges
    : eligibleJudges

  if (options?.preferredJudgeUserId) {
    const preferred = eligibleJudges.find(judge => judge.userId === options.preferredJudgeUserId)

    assertGuard(Boolean(preferred), {
      code: 'replacement_judge_invalid',
      message: 'The requested replacement judge is not in the automatic judge pool.',
      details: {
        eventId,
        judgeUserId: options.preferredJudgeUserId
      }
    })

    assertGuard(!activeSubmissionJudgeUserIds.has(options.preferredJudgeUserId), {
      code: 'replacement_judge_invalid',
      message: 'The requested replacement judge already has another blind-review assignment for this submission.',
      details: {
        eventId,
        judgeUserId: options.preferredJudgeUserId,
        submissionId: options.submissionId
      }
    })

    return options.preferredJudgeUserId
  }

  const loadByJudge = new Map<string, number>()

  for (const judge of eligibleJudges) {
    loadByJudge.set(judge.userId, 0)
  }

  for (const assignment of activeAssignments) {
    loadByJudge.set(assignment.judgeUserId, (loadByJudge.get(assignment.judgeUserId) ?? 0) + 1)
  }

  return [...judgesToSelectFrom]
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
    eventId: assignment.eventId,
    submissionId: assignment.submissionId,
    judgeUserId,
    reviewStage: assignment.reviewStage,
    blindReviewSlot: assignment.blindReviewSlot,
    status: 'assigned',
    pitchScore: null,
    pitchComment: null,
    assignedAt,
    createdAt: assignedAt
  } satisfies JudgeAssignmentInsert
}

export function calculateAveragePitchScore(assignments: JudgeAssignmentRecord[]) {
  const completedPitchScores = assignments
    .filter(assignment =>
      assignment.reviewStage === 'pitch_review'
      && assignment.status === 'judge_completed'
      && assignment.pitchScore !== null
    )
    .map(assignment => assignment.pitchScore)
    .filter((score): score is number => score !== null)

  if (completedPitchScores.length === 0) {
    return null
  }

  return completedPitchScores.reduce((total, score) => total + score, 0) / completedPitchScores.length
}

async function normalizeJudgeCriterionScores(
  database: AppDatabase,
  eventId: string,
  body: z.infer<typeof saveJudgeAssignmentBodySchema>,
  requireComplete: boolean
) {
  const criteria = await database.query.evaluationCriteria.findMany({
    where: eq(evaluationCriteria.eventId, eventId),
    orderBy: [asc(evaluationCriteria.displayOrder), asc(evaluationCriteria.createdAt)]
  })

  assertGuard(criteria.length > 0, {
    code: 'evaluation_criteria_required',
    message: 'Criterion scores cannot be recorded until evaluation criteria exist for the event.',
    details: {
      eventId
    }
  })

  const criteriaById = new Map(criteria.map(criterion => [criterion.id, criterion]))
  const seenCriterionIds = new Set<string>()

  for (const criterionScore of body.criterionScores) {
    assertGuard(criteriaById.has(criterionScore.evaluationCriterionId), {
      code: 'evaluation_criterion_not_found',
      message: 'Review scores must reference evaluation criteria from this event.',
      details: {
        eventId,
        evaluationCriterionId: criterionScore.evaluationCriterionId
      }
    })

    assertGuard(!seenCriterionIds.has(criterionScore.evaluationCriterionId), {
      code: 'duplicate_criterion_score',
      message: 'Each evaluation criterion can only be scored once per review.',
      details: {
        eventId,
        evaluationCriterionId: criterionScore.evaluationCriterionId
      }
    })

    seenCriterionIds.add(criterionScore.evaluationCriterionId)
  }

  if (requireComplete) {
    assertGuard(seenCriterionIds.size === criteria.length, {
      code: 'complete_criterion_scores_required',
      message: 'A completed review must include a score for every evaluation criterion.',
      details: {
        eventId,
        expectedCriterionCount: criteria.length,
        providedCriterionCount: seenCriterionIds.size
      }
    })
  }

  return body.criterionScores
}

export async function normalizeCompletionCriterionScores(
  database: AppDatabase,
  eventId: string,
  body: z.infer<typeof completeJudgeAssignmentBodySchema>
) {
  return await normalizeJudgeCriterionScores(database, eventId, body, true)
}

export async function normalizeSavedCriterionScores(
  database: AppDatabase,
  eventId: string,
  body: z.infer<typeof saveJudgeAssignmentBodySchema>
) {
  return await normalizeJudgeCriterionScores(database, eventId, body, false)
}

export async function saveJudgeCriterionScores(
  database: AppDatabase,
  assignmentId: string,
  criterionScores: z.infer<typeof saveJudgeAssignmentBodySchema>['criterionScores'],
  savedAt: string
) {
  await database
    .insert(judgeCriterionScores)
    .values(
      criterionScores.map(score => ({
        id: crypto.randomUUID(),
        judgeAssignmentId: assignmentId,
        evaluationCriterionId: score.evaluationCriterionId,
        score: score.score,
        comment: score.comment ?? null,
        createdAt: savedAt,
        updatedAt: savedAt
      }))
    )
    .onConflictDoUpdate({
      target: [
        judgeCriterionScores.judgeAssignmentId,
        judgeCriterionScores.evaluationCriterionId
      ],
      set: {
        score: sql`excluded.score`,
        comment: sql`excluded.comment`,
        updatedAt: savedAt
      }
    })
}

export function normalizePitchReviewCompletion(
  body: z.infer<typeof completePitchReviewBodySchema>
) {
  return {
    pitchScore: body.pitchScore,
    pitchComment: body.pitchComment ?? null
  }
}

export async function requireAdminAssignmentContext(
  event: H3Event,
  eventId: string,
  assignmentId: string
) {
  const context = await getJudgeAssignmentRequestContext(event, eventId, assignmentId)
  assertEventAdminAccess(context.eventAuthorization)
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
      message: 'This operation requires review access to the judge assignment.',
      details: {
        assignmentId: authorization.assignmentId
      }
    }
  )
}
