import type {
  ApiListResponse,
  EvaluationCriterion,
  HackathonRecord,
  SessionActor
} from './admin-workspace'
import { isHackathonRoleJudgingEnabled } from './admin-workspace'
import { formatTimestamp } from './date-formatting'

export type JudgeAssignmentStatus = 'assigned' | 'judge_started' | 'judge_completed' | 'skipped'
export type JudgeIneligibilityStatus = 'eligible' | 'ineligible'

export interface BlindApplicationSummary {
  id: string
  status: string
  submittedAt: string | null
  reviewedAt: string | null
  applicationTermsDocumentId: string | null
}

export interface BlindSubmissionSummary {
  id: string
  projectName: string | null
  summary: string | null
  repositoryUrl: string | null
  demoUrl: string | null
  status: 'draft' | 'submitted' | 'withdrawn' | 'locked' | 'disqualified'
  submittedAt: string | null
  lockedAt: string | null
  applications: BlindApplicationSummary[]
}

export interface JudgeCriterionScore {
  id: string
  evaluationCriterionId: string
  criterionName: string | null
  criterionDescription: string | null
  criterionWeight: number | null
  score: number
  comment: string | null
  createdAt: string
  updatedAt: string
}

export interface JudgeAssignmentDetail {
  id: string
  hackathonId: string
  submissionId: string
  judgeUserId: string
  status: JudgeAssignmentStatus
  assignedAt: string
  startedAt: string | null
  completedAt: string | null
  skippedAt: string | null
  skippedByUserId: string | null
  skipReason: string | null
  ineligibilityStatus: JudgeIneligibilityStatus
  ineligibilityReason: string | null
  ineligibilityMarkedAt: string | null
  ineligibilityMarkedByUserId: string | null
  createdAt: string
  blindSubmission: BlindSubmissionSummary
  criterionScores: JudgeCriterionScore[]
}

export interface JudgeInboxGroup {
  hackathon: HackathonRecord
  assignments: JudgeAssignmentDetail[]
}

export interface CriterionScoreDraft {
  evaluationCriterionId: string
  criterionName: string
  criterionDescription: string
  criterionWeight: number
  score: string
  comment: string
}

const judgeAssignmentStatusLabels: Record<JudgeAssignmentStatus, string> = {
  assigned: 'Assigned',
  judge_started: 'In review',
  judge_completed: 'Completed',
  skipped: 'Skipped'
}

const judgeAssignmentStatusColors: Record<JudgeAssignmentStatus, 'neutral' | 'warning' | 'primary' | 'success'> = {
  assigned: 'primary',
  judge_started: 'warning',
  judge_completed: 'success',
  skipped: 'neutral'
}

const judgeAssignmentStatusDescriptions: Record<JudgeAssignmentStatus, string> = {
  assigned: 'Ready to open and start.',
  judge_started: 'Review is underway and can be completed, skipped, or marked ineligible.',
  judge_completed: 'Scoring is locked in unless eligibility changes.',
  skipped: 'This review was declined and reassigned elsewhere.'
}

const judgeAssignmentStatusSortOrder: Record<JudgeAssignmentStatus, number> = {
  judge_started: 0,
  assigned: 1,
  judge_completed: 2,
  skipped: 3
}

const ineligibilityLabels: Record<JudgeIneligibilityStatus, string> = {
  eligible: 'Eligible',
  ineligible: 'Ineligible'
}

const ineligibilityColors: Record<JudgeIneligibilityStatus, 'neutral' | 'error' | 'success'> = {
  eligible: 'success',
  ineligible: 'error'
}

export function getJudgeWorkspaceSubjectKey(subject?: string | null) {
  return subject?.trim() || 'anonymous'
}

export function buildJudgeWorkspaceCacheKey(...parts: Array<string | null | undefined>) {
  return parts
    .map(part => part?.trim())
    .filter(Boolean)
    .join(':')
}

export function filterReviewableHackathons(
  hackathons: HackathonRecord[],
  actor: SessionActor | null | undefined
) {
  if (!actor?.hasPlatformAccount) {
    return []
  }

  if (actor.isPlatformAdmin) {
    return [...hackathons]
  }

  const reviewableHackathonIds = new Set(
    actor.hackathonRoles
      .filter(role => isHackathonRoleJudgingEnabled(role))
      .map(role => role.hackathonId)
  )

  return hackathons.filter(hackathon => reviewableHackathonIds.has(hackathon.id))
}

export function filterExplicitJudgeHackathons(
  hackathons: HackathonRecord[],
  actor: SessionActor | null | undefined
) {
  if (!actor?.hasPlatformAccount) {
    return []
  }

  const explicitJudgeHackathonIds = new Set(
    actor.hackathonRoles
      .filter(role => isHackathonRoleJudgingEnabled(role))
      .map(role => role.hackathonId)
  )

  return hackathons.filter(hackathon => explicitJudgeHackathonIds.has(hackathon.id))
}

export function filterAssignmentsForActor(
  assignments: JudgeAssignmentDetail[],
  actor: SessionActor | null | undefined
) {
  if (!actor?.hasPlatformAccount || !actor.platformUser) {
    return []
  }

  return assignments.filter(assignment => assignment.judgeUserId === actor.platformUser?.id)
}

export async function listAllVisibleHackathons(
  fetchPage: (page: number, pageSize: number) => Promise<ApiListResponse<HackathonRecord>>,
  pageSize: number = 100
) {
  const collectedHackathons = new Map<string, HackathonRecord>()
  let page = 1
  let total: number | null = null

  while (true) {
    const response = await fetchPage(page, pageSize)
    const pageHackathons = response.data

    for (const hackathon of pageHackathons) {
      collectedHackathons.set(hackathon.id, hackathon)
    }

    total = response.meta?.total ?? total

    const reachedKnownTotal = total !== null && collectedHackathons.size >= total
    const reachedLastPage = pageHackathons.length < pageSize

    if (pageHackathons.length === 0 || reachedKnownTotal || reachedLastPage) {
      return [...collectedHackathons.values()]
    }

    page += 1
  }
}

export function sortJudgeAssignments(assignments: JudgeAssignmentDetail[]) {
  return [...assignments].sort((left, right) => {
    const leftPriority = judgeAssignmentStatusSortOrder[left.status]
    const rightPriority = judgeAssignmentStatusSortOrder[right.status]

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    const leftTimestamp = left.startedAt ?? left.assignedAt
    const rightTimestamp = right.startedAt ?? right.assignedAt

    if (leftTimestamp !== rightTimestamp) {
      return leftTimestamp.localeCompare(rightTimestamp)
    }

    return left.id.localeCompare(right.id)
  })
}

export function formatJudgeAssignmentStatus(status: JudgeAssignmentStatus) {
  return judgeAssignmentStatusLabels[status]
}

export function describeJudgeAssignmentStatus(status: JudgeAssignmentStatus) {
  return judgeAssignmentStatusDescriptions[status]
}

export function resolveJudgeAssignmentStatusColor(status: JudgeAssignmentStatus) {
  return judgeAssignmentStatusColors[status]
}

export function formatJudgeIneligibilityStatus(status: JudgeIneligibilityStatus) {
  return ineligibilityLabels[status]
}

export function resolveJudgeIneligibilityColor(status: JudgeIneligibilityStatus) {
  return ineligibilityColors[status]
}

export function canStartJudgeAssignment(assignment: Pick<JudgeAssignmentDetail, 'status'>) {
  return assignment.status === 'assigned'
}

export function canCompleteJudgeAssignment(assignment: Pick<JudgeAssignmentDetail, 'status'>) {
  return assignment.status === 'judge_started'
}

export function canSkipJudgeAssignment(assignment: Pick<JudgeAssignmentDetail, 'status'>) {
  return assignment.status === 'assigned' || assignment.status === 'judge_started'
}

export function canMarkJudgeAssignmentIneligible(
  assignment: Pick<JudgeAssignmentDetail, 'status' | 'ineligibilityStatus'>
) {
  return assignment.ineligibilityStatus !== 'ineligible'
    && (assignment.status === 'judge_started' || assignment.status === 'judge_completed')
}

export function formatJudgeTimestamp(value: string | null | undefined) {
  return formatTimestamp(value, 'Not recorded')
}

export function formatBlindApplicationCount(count: number) {
  return `${count} anonymized application${count === 1 ? '' : 's'}`
}

export function createCriterionScoreDrafts(
  criteria: EvaluationCriterion[],
  assignment: Pick<JudgeAssignmentDetail, 'criterionScores'> | null | undefined
) {
  const scoresByCriterionId = new Map(
    (assignment?.criterionScores ?? []).map(score => [score.evaluationCriterionId, score])
  )

  return criteria.map((criterion) => {
    const existingScore = scoresByCriterionId.get(criterion.id)

    return {
      evaluationCriterionId: criterion.id,
      criterionName: criterion.name,
      criterionDescription: criterion.description,
      criterionWeight: criterion.weight,
      score: existingScore ? String(existingScore.score) : '',
      comment: existingScore?.comment ?? ''
    } satisfies CriterionScoreDraft
  })
}

export function hasIncompleteCriterionScores(drafts: CriterionScoreDraft[]) {
  return drafts.some((draft) => {
    const normalizedScore = draft.score.trim()

    return normalizedScore.length === 0 || !/^\d+$/.test(normalizedScore)
  })
}

export function buildCompletionCriterionScoresPayload(drafts: CriterionScoreDraft[]) {
  return drafts.map(draft => ({
    evaluationCriterionId: draft.evaluationCriterionId,
    score: Number.parseInt(draft.score.trim(), 10),
    comment: draft.comment.trim() || undefined
  }))
}
