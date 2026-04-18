import type { H3Event } from 'h3'

import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'

import { requirePlatformActor } from '../auth/actor'
import {
  assertJudgeAssignmentAccess,
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
    hackathonId: assignment.hackathonId,
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

export function serializePitchSubmission(
  submission: SubmissionRecord,
  team: typeof teams.$inferSelect,
  track: typeof hackathonTracks.$inferSelect | null
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

export function assertStartJudgingPreparationAllowed(
  hackathon: HackathonRecord,
  metrics: {
    submittedSubmissionCount: number
  },
  now: Date = new Date()
) {
  assertAllowedState(hackathon.state, ['submission_open'], {
    code: 'hackathon_state_invalid',
    message: 'Submissions can only be stopped while the hackathon is in submission_open.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(Date.parse(hackathon.submissionClosesAt) <= now.getTime(), {
    code: 'submission_window_still_open',
    message: 'Submissions can only be stopped after the submission window closes.',
    details: {
      hackathonId: hackathon.id,
      submissionClosesAt: hackathon.submissionClosesAt
    }
  })

  assertGuard(metrics.submittedSubmissionCount > 0, {
    code: 'submitted_submissions_required',
    message: 'Stopping submissions requires at least one submitted project.',
    details: {
      hackathonId: hackathon.id
    }
  })
}

export function assertStartJudgeReviewAllowed(
  hackathon: HackathonRecord,
  metrics: {
    submittedSubmissionCount: number
    judgePoolCount: number
  }
) {
  assertAllowedState(hackathon.state, ['judging_preparation'], {
    code: 'hackathon_state_invalid',
    message: 'Judge review can only start while the hackathon is in judging_preparation.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(hackathon.blindReviewCount > 0, {
    code: 'blind_review_not_enabled',
    message: 'Blind review can only start when blind review is enabled.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(metrics.submittedSubmissionCount > 0, {
    code: 'submitted_submissions_required',
    message: 'Blind review requires at least one submitted submission.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(metrics.judgePoolCount > 0, {
    code: 'judge_pool_required',
    message: 'Blind review requires at least one judge in the automatic judge pool.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(metrics.judgePoolCount >= hackathon.blindReviewCount, {
    statusCode: 409,
    code: 'distinct_blind_review_judges_required',
    message: 'The automatic judge pool must include enough distinct judges for the configured blind review count.',
    details: {
      hackathonId: hackathon.id,
      blindReviewCount: hackathon.blindReviewCount,
      judgePoolCount: metrics.judgePoolCount
    }
  })
}

export function assertStartPitchAllowed(
  hackathon: HackathonRecord,
  metrics: {
    competitionSubmissionCount: number
    finalistSubmissionCount: number
  }
) {
  assertGuard(hackathon.pitchReviewEnabled, {
    code: 'pitch_review_not_enabled',
    message: 'Pitch can only start when pitch review is enabled.',
    details: {
      hackathonId: hackathon.id
    }
  })

  const requiresShortlist = hackathon.blindReviewCount > 0

  assertAllowedState(hackathon.state, requiresShortlist ? ['shortlist'] : ['judging_preparation'], {
    code: 'hackathon_state_invalid',
    message: requiresShortlist
      ? 'Pitch can only start from shortlist after finalists are selected.'
      : 'Pitch can only start while the hackathon is in judging_preparation.',
    details: {
      hackathonId: hackathon.id
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
        hackathonId: hackathon.id
      }
    }
  )
}

export function assertStartPitchReviewAllowed(
  hackathon: HackathonRecord,
  metrics: {
    lockedSubmissionCount: number
    finalistSubmissionCount: number
    judgePanelCount: number
  }
) {
  assertGuard(hackathon.pitchReviewEnabled, {
    code: 'pitch_review_not_enabled',
    message: 'Pitch review can only start when pitch review is enabled.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertAllowedState(hackathon.state, ['pitch'], {
    code: 'hackathon_state_invalid',
    message: 'Pitch review can only start after the live pitch stage is active.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(
    hackathon.activePitchPresentationSubmissionId === null
    && hackathon.pitchPresentationsCompletedAt !== null,
    {
      code: 'pitch_presentations_incomplete',
      message: 'Pitch review can only start after all pitch presentations have been completed.',
      details: {
        hackathonId: hackathon.id
      }
    }
  )

  assertGuard(metrics.judgePanelCount > 0, {
    code: 'judge_pool_required',
    message: 'Pitch review requires at least one judge in the automatic judge pool.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(
    metrics.finalistSubmissionCount > 0,
    {
      code: 'pitch_finalists_required',
      message: 'Pitch review requires at least one persisted finalist submission.',
      details: {
        hackathonId: hackathon.id
      }
    }
  )
}

export function assertAdvancePitchPresentationAllowed(
  hackathon: HackathonRecord,
  metrics: {
    finalistSubmissionCount: number
  }
) {
  assertGuard(hackathon.pitchReviewEnabled, {
    code: 'pitch_review_not_enabled',
    message: 'Pitch presentation control is only available when pitch review is enabled.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertAllowedState(hackathon.state, ['pitch'], {
    code: 'hackathon_state_invalid',
    message: 'Pitch presentation control is only available while the live pitch stage is active.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(metrics.finalistSubmissionCount > 0, {
    code: 'pitch_finalists_required',
    message: 'Pitch presentation control requires at least one finalist submission.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(hackathon.pitchPresentationsCompletedAt === null, {
    code: 'pitch_presentations_already_completed',
    message: 'All pitch presentations have already been completed.',
    details: {
      hackathonId: hackathon.id
    }
  })
}

export function resolvePitchPresentationState(
  hackathon: HackathonRecord,
  finalistSubmissionIds: string[]
) {
  const uniqueFinalistSubmissionIds = new Set(finalistSubmissionIds)

  assertGuard(uniqueFinalistSubmissionIds.size === finalistSubmissionIds.length, {
    statusCode: 500,
    code: 'pitch_finalists_invalid',
    message: 'The stored pitch finalists are invalid.',
    details: {
      hackathonId: hackathon.id
    }
  })

  if (hackathon.pitchPresentationsCompletedAt !== null) {
    assertGuard(hackathon.activePitchPresentationSubmissionId === null, {
      statusCode: 500,
      code: 'pitch_presentation_state_invalid',
      message: 'The stored pitch presentation state is invalid.',
      details: {
        hackathonId: hackathon.id
      }
    })

    return {
      currentSubmissionId: null,
      currentIndex: null,
      isCompleted: true
    }
  }

  if (!hackathon.activePitchPresentationSubmissionId) {
    return {
      currentSubmissionId: null,
      currentIndex: null,
      isCompleted: false
    }
  }

  const currentIndex = finalistSubmissionIds.findIndex(
    submissionId => submissionId === hackathon.activePitchPresentationSubmissionId
  )

  assertGuard(currentIndex !== -1, {
    statusCode: 500,
    code: 'pitch_presentation_state_invalid',
    message: 'The stored pitch presentation state is invalid.',
    details: {
      hackathonId: hackathon.id,
      submissionId: hackathon.activePitchPresentationSubmissionId
    }
  })

  return {
    currentSubmissionId: hackathon.activePitchPresentationSubmissionId,
    currentIndex,
    isCompleted: false
  }
}

export function advancePitchPresentation(
  hackathon: HackathonRecord,
  finalistSubmissionIds: string[],
  advancedAt: string
) {
  const presentationState = resolvePitchPresentationState(hackathon, finalistSubmissionIds)

  if (presentationState.isCompleted) {
    throw new ApiError({
      statusCode: 409,
      code: 'pitch_presentations_already_completed',
      message: 'All pitch presentations have already been completed.',
      details: {
        hackathonId: hackathon.id
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
  hackathon: HackathonRecord,
  previousSubmissionIds: string[],
  nextSubmissionIds: string[],
  removedSubmissionId: string,
  prunedAt: string
) {
  if (hackathon.pitchPresentationsCompletedAt !== null) {
    return {
      activePitchPresentationSubmissionId: null,
      pitchPresentationsCompletedAt: hackathon.pitchPresentationsCompletedAt
    }
  }

  if (!hackathon.activePitchPresentationSubmissionId) {
    return {
      activePitchPresentationSubmissionId: null,
      pitchPresentationsCompletedAt: null
    }
  }

  if (hackathon.activePitchPresentationSubmissionId !== removedSubmissionId) {
    assertGuard(nextSubmissionIds.includes(hackathon.activePitchPresentationSubmissionId), {
      statusCode: 500,
      code: 'pitch_presentation_state_invalid',
      message: 'The stored pitch presentation state is invalid.',
      details: {
        hackathonId: hackathon.id,
        submissionId: hackathon.activePitchPresentationSubmissionId
      }
    })

    return {
      activePitchPresentationSubmissionId: hackathon.activePitchPresentationSubmissionId,
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

export async function listActiveAssignmentsForSubmissions(
  database: AppDatabase,
  submissionIds: string[],
  reviewStage?: JudgeAssignmentRecord['reviewStage']
) {
  if (submissionIds.length === 0) {
    return []
  }

  return await database.query.judgeAssignments.findMany({
    where: and(
      inArray(judgeAssignments.submissionId, submissionIds),
      inArray(judgeAssignments.status, [...activeJudgeAssignmentStatuses]),
      ...(reviewStage ? [eq(judgeAssignments.reviewStage, reviewStage)] : [])
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
    left: (typeof hackathonRoleAssignments.$inferSelect),
    right: (typeof hackathonRoleAssignments.$inferSelect)
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
          hackathonId,
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
          details: { hackathonId }
        })
      }

      assignedJudgeIds.add(selectedJudge.userId)
      loadByJudge.set(selectedJudge.userId, (loadByJudge.get(selectedJudge.userId) ?? 0) + 1)

      return {
        id: crypto.randomUUID(),
        hackathonId,
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
  hackathonId: string,
  finalistSubmissions: SubmissionRecord[],
  judgePanel: Array<typeof hackathonRoleAssignments.$inferSelect>,
  assignedAt: string
) {
  if (finalistSubmissions.length === 0 || judgePanel.length === 0) {
    return []
  }

  return finalistSubmissions.flatMap(submission =>
    judgePanel.map(judge => ({
      id: crypto.randomUUID(),
      hackathonId,
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

export function parseStoredPitchFinalistSubmissionIds(hackathon: HackathonRecord) {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(hackathon.pitchFinalistSubmissionIdsJson)
  } catch {
    throw new ApiError({
      statusCode: 500,
      code: 'pitch_finalists_invalid',
      message: 'The stored pitch finalists are invalid.',
      details: {
        hackathonId: hackathon.id
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
        hackathonId: hackathon.id
      }
    })
  }

  return result.data
}

export function selectPitchReviewSubmissions(
  hackathon: HackathonRecord,
  lockedSubmissions: SubmissionRecord[]
) {
  const finalistSubmissionIds = parseStoredPitchFinalistSubmissionIds(hackathon)

  if (finalistSubmissionIds.length === 0) {
    if (hackathon.blindReviewCount === 0 && hackathon.state === 'judging_preparation') {
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
      hackathonId: hackathon.id
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
        hackathonId: hackathon.id,
        submissionId
      }
    })

    return submission!
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
) {
  if (assignments.length === 0) {
    return []
  }

  const submissionIds = [...new Set(assignments.map(assignment => assignment.submissionId))]
  const submissionRows = await database.query.submissions.findMany({
    where: inArray(submissions.id, submissionIds)
  })
  const submissionsById = new Map(submissionRows.map(submission => [submission.id, submission]))
  const teamIds = [...new Set(submissionRows.map(submission => submission.teamId))]
  const trackIds = [
    ...new Set(
      submissionRows
        .map(submission => submission.trackId)
        .filter((trackId): trackId is string => Boolean(trackId))
    )
  ]

  const [teamRows, trackRows] = await Promise.all([
    teamIds.length === 0
      ? Promise.resolve([])
      : database.query.teams.findMany({
          where: inArray(teams.id, teamIds)
        }),
    trackIds.length === 0
      ? Promise.resolve([])
      : database.query.hackathonTracks.findMany({
          where: inArray(hackathonTracks.id, trackIds)
        })
  ])
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
) {
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
  assertJudgeAssignmentAccess(context.assignmentAuthorization)
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

export function getHackathonStateForAssignmentReviewStage(
  reviewStage: JudgeAssignmentRecord['reviewStage']
): HackathonRecord['state'] {
  return reviewStage === 'pitch_review' ? 'pitch_review' : 'blind_review'
}

export function assertAssignmentReviewStageIsActive(
  hackathon: HackathonRecord,
  assignment: JudgeAssignmentRecord
) {
  assertJudgeReviewLifecycleState(hackathon, [getHackathonStateForAssignmentReviewStage(assignment.reviewStage)])
}

export async function pickReplacementJudgeUserId(
  database: AppDatabase,
  hackathonId: string,
  options?: {
    excludeJudgeUserIds?: string[]
    preferredJudgeUserId?: string
    reviewStage?: JudgeAssignmentRecord['reviewStage']
    submissionId?: string
    excludeAssignmentId?: string
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

  const activeAssignments = await database.query.judgeAssignments.findMany({
    where: and(
      eq(judgeAssignments.hackathonId, hackathonId),
      eq(judgeAssignments.reviewStage, options?.reviewStage ?? 'blind_review'),
      inArray(judgeAssignments.status, [...activeJudgeAssignmentStatuses]),
      inArray(judgeAssignments.judgeUserId, eligibleJudges.map(judge => judge.userId))
    )
  })
  const activeSubmissionJudgeUserIds = options?.submissionId
    ? new Set(
        activeAssignments
          .filter(assignment =>
            assignment.submissionId === options.submissionId
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
        hackathonId,
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
        hackathonId,
        judgeUserId: options.preferredJudgeUserId
      }
    })

    assertGuard(!activeSubmissionJudgeUserIds.has(options.preferredJudgeUserId), {
      code: 'replacement_judge_invalid',
      message: 'The requested replacement judge already has another blind-review assignment for this submission.',
      details: {
        hackathonId,
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
    hackathonId: assignment.hackathonId,
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
  hackathonId: string,
  body: z.infer<typeof saveJudgeAssignmentBodySchema>,
  requireComplete: boolean
) {
  const criteria = await database.query.evaluationCriteria.findMany({
    where: eq(evaluationCriteria.hackathonId, hackathonId),
    orderBy: [asc(evaluationCriteria.displayOrder), asc(evaluationCriteria.createdAt)]
  })

  assertGuard(criteria.length > 0, {
    code: 'evaluation_criteria_required',
    message: 'Criterion scores cannot be recorded until evaluation criteria exist for the hackathon.',
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

  if (requireComplete) {
    assertGuard(seenCriterionIds.size === criteria.length, {
      code: 'complete_criterion_scores_required',
      message: 'A completed review must include a score for every evaluation criterion.',
      details: {
        hackathonId,
        expectedCriterionCount: criteria.length,
        providedCriterionCount: seenCriterionIds.size
      }
    })
  }

  return body.criterionScores
}

export async function normalizeCompletionCriterionScores(
  database: AppDatabase,
  hackathonId: string,
  body: z.infer<typeof completeJudgeAssignmentBodySchema>
) {
  return await normalizeJudgeCriterionScores(database, hackathonId, body, true)
}

export async function normalizeSavedCriterionScores(
  database: AppDatabase,
  hackathonId: string,
  body: z.infer<typeof saveJudgeAssignmentBodySchema>
) {
  return await normalizeJudgeCriterionScores(database, hackathonId, body, false)
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
      message: 'This operation requires review access to the judge assignment.',
      details: {
        assignmentId: authorization.assignmentId
      }
    }
  )
}
