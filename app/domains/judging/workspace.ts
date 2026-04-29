import type { ApiListResponse } from '~/lib/api'
import type { SessionActor } from '~/domains/accounts/session-actor'
import type {
  HackathonRecord
} from '~/domains/hackathons/records'
import type { HackathonState } from '~/domains/hackathons/states'
import type { EvaluationCriterion } from '~/domains/judging/criteria-config'

import { normalizeApiError } from '~/lib/api'
import { isHackathonRoleJudgingEnabled } from '~/domains/hackathons/access'
import { formatHackathonState } from '~/domains/hackathons/states'
import { formatTimestamp } from '~/lib/date-formatting'

export type JudgeAssignmentStatus = 'assigned' | 'judge_started' | 'judge_completed' | 'skipped'
export type JudgeIneligibilityStatus = 'eligible' | 'ineligible'
export type JudgeReviewStage = 'blind_review' | 'pitch_review'

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
  track: {
    id: string
    name: string
    description: string
  } | null
  status: 'draft' | 'submitted' | 'withdrawn' | 'locked' | 'disqualified'
  submittedAt: string | null
  lockedAt: string | null
  applications: BlindApplicationSummary[]
}

export interface PitchSubmissionSummary {
  id: string
  projectName: string | null
  teamName: string
  summary: string | null
  repositoryUrl: string | null
  demoUrl: string | null
  track: {
    id: string
    name: string
    description: string
  } | null
  status: 'draft' | 'submitted' | 'withdrawn' | 'locked' | 'disqualified'
  submittedAt: string | null
  lockedAt: string | null
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

interface BaseJudgeAssignmentDetail {
  id: string
  hackathonId: string
  submissionId: string
  judgeUserId: string
  reviewStage: JudgeReviewStage
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
}

interface BaseJudgeAssignmentApiDetail extends BaseJudgeAssignmentDetail {
  blindReviewSlot: number | null
  pitchScore: number | null
  pitchComment: string | null
}

interface BlindJudgeAssignmentApiDetail extends BaseJudgeAssignmentApiDetail {
  reviewStage: 'blind_review'
  blindReviewSlot: number
  blindSubmission: BlindSubmissionSummary
  criterionScores: JudgeCriterionScore[]
}

interface PitchJudgeAssignmentApiDetail extends BaseJudgeAssignmentApiDetail {
  reviewStage: 'pitch_review'
  blindReviewSlot: null
  pitchSubmission: PitchSubmissionSummary
}

export type JudgeAssignmentApiDetail = BlindJudgeAssignmentApiDetail | PitchJudgeAssignmentApiDetail

export interface BlindJudgeAssignmentDetail extends BaseJudgeAssignmentDetail {
  reviewStage: 'blind_review'
  blindReviewSlot: number
  blindSubmission: BlindSubmissionSummary
  criterionScores: JudgeCriterionScore[]
}

export interface PitchJudgeAssignmentDetail extends BaseJudgeAssignmentDetail {
  reviewStage: 'pitch_review'
  pitchScore: number | null
  pitchComment: string | null
  pitchSubmission: PitchSubmissionSummary
}

export type JudgeAssignmentDetail = BlindJudgeAssignmentDetail | PitchJudgeAssignmentDetail

export interface JudgeInboxGroup {
  hackathon: HackathonRecord
  assignments: JudgeAssignmentDetail[]
}

export interface JudgeDashboardAssignmentSummary {
  total: number
  inReview: number
  ready: number
  ineligible: number
  blind: number
  pitch: number
}

export interface CriterionScoreDraft {
  evaluationCriterionId: string
  criterionName: string
  criterionDescription: string
  criterionWeight: number
  score: string
  comment: string
}

export interface PitchScoreDraft {
  score: string
  comment: string
}

const minimumJudgeScore = 1
const maximumJudgeScore = 5

export interface JudgeAssignmentInboxCardCopy {
  title: string
  subtitle: string | null
  summary: string
  contextLabel: string
  contextValue: string
  reviewSignal: string
  openLabel: string
}

export interface JudgeHackathonDashboardCopy {
  description: string
  actionLabel: string
  overline: string
  queueMeta: string
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
  judge_started: 'Review is underway and can be completed or skipped.',
  judge_completed: 'Scoring is recorded for this assignment.',
  skipped: 'This review was skipped and is no longer active.'
}

const judgeAssignmentStatusSortOrder: Record<JudgeAssignmentStatus, number> = {
  judge_started: 0,
  assigned: 1,
  judge_completed: 2,
  skipped: 3
}

const judgeReviewStageLabels: Record<JudgeReviewStage, string> = {
  blind_review: 'Blind review',
  pitch_review: 'Pitch review'
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

export function isBlindJudgeAssignment(
  assignment: JudgeAssignmentDetail | null | undefined
): assignment is BlindJudgeAssignmentDetail {
  return assignment?.reviewStage === 'blind_review'
}

export function isPitchJudgeAssignment(
  assignment: JudgeAssignmentDetail | null | undefined
): assignment is PitchJudgeAssignmentDetail {
  return assignment?.reviewStage === 'pitch_review'
}

function normalizeBaseJudgeAssignmentDetail(
  assignment: BaseJudgeAssignmentApiDetail
): BaseJudgeAssignmentDetail {
  return {
    id: assignment.id,
    hackathonId: assignment.hackathonId,
    submissionId: assignment.submissionId,
    judgeUserId: assignment.judgeUserId,
    reviewStage: assignment.reviewStage,
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

export function normalizeJudgeAssignmentDetail(
  assignment: JudgeAssignmentApiDetail
): JudgeAssignmentDetail {
  const baseAssignment = normalizeBaseJudgeAssignmentDetail(assignment)

  if (assignment.reviewStage === 'blind_review') {
    return {
      ...baseAssignment,
      reviewStage: 'blind_review',
      blindReviewSlot: assignment.blindReviewSlot,
      blindSubmission: assignment.blindSubmission,
      criterionScores: assignment.criterionScores
    }
  }

  return {
    ...baseAssignment,
    reviewStage: 'pitch_review',
    pitchScore: assignment.pitchScore,
    pitchComment: assignment.pitchComment,
    pitchSubmission: assignment.pitchSubmission
  }
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

export function formatJudgeReviewStage(stage: JudgeReviewStage) {
  return judgeReviewStageLabels[stage]
}

export function formatJudgeIneligibilityStatus(status: JudgeIneligibilityStatus) {
  return ineligibilityLabels[status]
}

export function resolveJudgeIneligibilityColor(status: JudgeIneligibilityStatus) {
  return ineligibilityColors[status]
}

function formatStageAssignmentCount(stage: JudgeReviewStage, count: number) {
  const noun = stage === 'blind_review' ? 'blind assignment' : 'pitch assignment'

  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function formatActiveStageAssignmentCount(stage: JudgeReviewStage, count: number) {
  const adjective = stage === 'blind_review' ? 'blind' : 'pitch'

  return `${count} active ${adjective} assignment${count === 1 ? '' : 's'}`
}

function formatJudgeQueueMeta(stage: JudgeReviewStage, summary: JudgeDashboardAssignmentSummary) {
  if (summary.ready > 0) {
    return `${summary.ready} ${stage === 'blind_review' ? 'ready to start' : 'ready to vote'}`
  }

  if (summary.inReview > 0) {
    return stage === 'blind_review'
      ? 'All active blind reviews are in progress'
      : 'All active pitch votes are in progress'
  }

  return stage === 'blind_review' ? 'No active blind queue yet' : 'No active pitch queue yet'
}

function resolveJudgeDashboardStage(
  hackathon: Pick<HackathonRecord, 'state' | 'blindReviewCount' | 'pitchReviewEnabled'>,
  summary: Pick<JudgeDashboardAssignmentSummary, 'blind' | 'pitch'>
): JudgeReviewStage {
  if (summary.pitch > 0 && summary.blind === 0) {
    return 'pitch_review'
  }

  if (summary.blind > 0 && summary.pitch === 0) {
    return 'blind_review'
  }

  if (summary.pitch > 0) {
    return 'pitch_review'
  }

  if (!hackathon.pitchReviewEnabled) {
    return 'blind_review'
  }

  return hackathon.state === 'pitch_review'
    || hackathon.state === 'pitch'
    || hackathon.state === 'shortlist'
    || (hackathon.state === 'judging_preparation' && hackathon.blindReviewCount === 0)
    ? 'pitch_review'
    : 'blind_review'
}

export function getJudgeAssignmentInboxCardCopy(
  assignment: JudgeAssignmentDetail
): JudgeAssignmentInboxCardCopy {
  if (isBlindJudgeAssignment(assignment)) {
    return {
      title: assignment.blindSubmission.projectName ?? 'Untitled submission',
      subtitle: null,
      summary: assignment.blindSubmission.summary || describeJudgeAssignmentStatus(assignment.status),
      contextLabel: 'Blind context',
      contextValue: formatBlindApplicationCount(assignment.blindSubmission.applications.length),
      reviewSignal: assignment.startedAt ? `Started ${formatJudgeTimestamp(assignment.startedAt)}` : 'Ready to start',
      openLabel: 'Open blind review'
    }
  }

  return {
    title: assignment.pitchSubmission.projectName ?? 'Untitled pitch finalist',
    subtitle: assignment.pitchSubmission.teamName,
    summary: assignment.pitchSubmission.summary
      || 'Every judge on the pitch panel is expected to submit one 1-5 vote.',
    contextLabel: 'Team',
    contextValue: assignment.pitchSubmission.teamName,
    reviewSignal: assignment.startedAt ? `Started ${formatJudgeTimestamp(assignment.startedAt)}` : 'Ready to vote',
    openLabel: 'Open pitch review'
  }
}

export function getJudgeHackathonDashboardCopy(
  hackathon: Pick<HackathonRecord, 'state' | 'blindReviewCount' | 'pitchReviewEnabled'>,
  summary?: JudgeDashboardAssignmentSummary
): JudgeHackathonDashboardCopy {
  const normalizedSummary: JudgeDashboardAssignmentSummary = summary ?? {
    total: 0,
    inReview: 0,
    ready: 0,
    ineligible: 0,
    blind: 0,
    pitch: 0
  }
  const stage = resolveJudgeDashboardStage(hackathon, normalizedSummary)
  const isMixedQueue = normalizedSummary.blind > 0 && normalizedSummary.pitch > 0
  const progressSuffix = normalizedSummary.inReview > 0
    ? `, including ${normalizedSummary.inReview} currently in progress`
    : ''

  if (normalizedSummary.total > 0) {
    if (isMixedQueue) {
      return {
        description: `${formatStageAssignmentCount('blind_review', normalizedSummary.blind)} and ${formatStageAssignmentCount('pitch_review', normalizedSummary.pitch)} are active in your judging queue${progressSuffix}.`,
        actionLabel: 'Open judging queue',
        overline: `${normalizedSummary.total} active assignments`,
        queueMeta: normalizedSummary.ready > 0
          ? `${normalizedSummary.ready} ready to open`
          : 'All active assignments are in progress'
      }
    }

    return {
      description: `${formatStageAssignmentCount(stage, normalizedSummary.total)} ${normalizedSummary.total === 1 ? 'is' : 'are'} active in your ${stage === 'blind_review' ? 'blind-review queue' : 'pitch-review queue'}${progressSuffix}.`,
      actionLabel: stage === 'blind_review' ? 'Open blind review' : 'Open pitch review',
      overline: formatActiveStageAssignmentCount(stage, normalizedSummary.total),
      queueMeta: formatJudgeQueueMeta(stage, normalizedSummary)
    }
  }

  if (hackathon.state === 'pitch') {
    return {
      description: 'Finalist teams are pitching live. Post-pitch review assignments will appear here after admins start pitch review.',
      actionLabel: 'Open hackathon',
      overline: 'Judge assigned',
      queueMeta: formatJudgeQueueMeta('pitch_review', normalizedSummary)
    }
  }

  return {
    description: stage === 'blind_review'
      ? 'You are assigned as a judge for this hackathon. Anonymous blind reviews will appear here when blind review begins.'
      : 'You are assigned as a judge for this hackathon. Finalist pitch votes will appear here when pitch review is active.',
    actionLabel: 'Open hackathon',
    overline: 'Judge assigned',
    queueMeta: formatJudgeQueueMeta(stage, normalizedSummary)
  }
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

export function getJudgeAssignmentActionDisabledReason(
  assignment: Pick<JudgeAssignmentDetail, 'reviewStage'> | null | undefined,
  hackathonState: HackathonState | null | undefined
) {
  if (assignment?.reviewStage !== 'blind_review' || !hackathonState || hackathonState === 'blind_review') {
    return null
  }

  return `Start and skip actions are available only during blind review. Current state: ${formatHackathonState(hackathonState)}.`
}

export function canAutoStartBlindReviewFromScoreSelection(
  assignment: Pick<JudgeAssignmentDetail, 'reviewStage' | 'status'> | null | undefined,
  hackathonState: HackathonState | null | undefined
) {
  return assignment?.reviewStage === 'blind_review'
    && assignment.status === 'assigned'
    && !getJudgeAssignmentActionDisabledReason(assignment, hackathonState)
}

export function canAutoStartPitchReviewFromVoteInput(
  assignment: Pick<JudgeAssignmentDetail, 'reviewStage' | 'status'> | null | undefined,
  hackathonState: HackathonState | null | undefined
) {
  return assignment?.reviewStage === 'pitch_review'
    && assignment.status === 'assigned'
    && hackathonState === 'pitch_review'
}

export function getJudgeActionErrorMessage(
  error: unknown,
  fallback: string = 'The judge action could not be completed.'
) {
  const apiError = normalizeApiError(error)

  if (apiError.code === 'request_failed' && apiError.message === 'The request failed unexpectedly.') {
    return fallback
  }

  return apiError.message.length > 0 ? apiError.message : fallback
}

export function canMarkJudgeAssignmentIneligible(
  assignment: Pick<JudgeAssignmentDetail, 'reviewStage' | 'status' | 'ineligibilityStatus'>
) {
  return assignment.reviewStage === 'blind_review'
    && assignment.ineligibilityStatus !== 'ineligible'
    && (assignment.status === 'judge_started' || assignment.status === 'judge_completed')
}

export function formatJudgeTimestamp(value: string | null | undefined) {
  return formatTimestamp(value, 'Not recorded')
}

export function formatBlindApplicationCount(count: number) {
  return `${count} anonymized application${count === 1 ? '' : 's'}`
}

function isValidJudgeScoreValue(value: string) {
  const normalizedValue = value.trim()

  if (normalizedValue.length === 0 || !/^\d+$/.test(normalizedValue)) {
    return false
  }

  const parsedValue = Number.parseInt(normalizedValue, 10)

  return parsedValue >= minimumJudgeScore && parsedValue <= maximumJudgeScore
}

export function createCriterionScoreDrafts(
  criteria: EvaluationCriterion[],
  assignment: JudgeAssignmentDetail | null | undefined
) {
  const existingScores = isBlindJudgeAssignment(assignment) ? assignment.criterionScores : []
  const scoresByCriterionId = new Map(
    existingScores.map(score => [score.evaluationCriterionId, score])
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
  return drafts.some(draft => !isValidJudgeScoreValue(draft.score))
}

export function buildCompletionCriterionScoresPayload(drafts: CriterionScoreDraft[]) {
  return drafts.map(draft => ({
    evaluationCriterionId: draft.evaluationCriterionId,
    score: Number.parseInt(draft.score.trim(), 10),
    comment: draft.comment.trim() || undefined
  }))
}

export function buildSavedCriterionScoresPayload(drafts: CriterionScoreDraft[]) {
  return drafts
    .filter(draft => isValidJudgeScoreValue(draft.score))
    .map(draft => ({
      evaluationCriterionId: draft.evaluationCriterionId,
      score: Number.parseInt(draft.score.trim(), 10),
      comment: draft.comment.trim() || undefined
    }))
}

export function createPitchScoreDraft(
  assignment: JudgeAssignmentDetail | null | undefined
): PitchScoreDraft {
  if (!isPitchJudgeAssignment(assignment)) {
    return {
      score: '',
      comment: ''
    }
  }

  return {
    score: assignment.pitchScore === null ? '' : String(assignment.pitchScore),
    comment: assignment.pitchComment ?? ''
  }
}

export function hasIncompletePitchScore(draft: PitchScoreDraft) {
  return !isValidJudgeScoreValue(draft.score)
}

export function buildPitchReviewCompletionPayload(draft: PitchScoreDraft) {
  return {
    pitchScore: Number.parseInt(draft.score.trim(), 10),
    pitchComment: draft.comment.trim() || undefined
  }
}
