import type { AdminApplicationRecord } from '~/domains/applications/admin-application-record'
import type { HackathonRoleAssignment } from '~/domains/hackathons/access'
import type { HackathonState } from '~/domains/hackathons/states'
import type { SubmissionRecord } from '~/domains/submissions/admin-submission-record'
import { formatAdminOperationalTeamProjectLabel } from '~/domains/submissions/project-labels'

export interface JudgeAssignmentSummary {
  id: string
  hackathonId: string
  submissionId: string
  judgeUserId: string
  reviewStage: 'blind_review' | 'pitch_review'
  status: 'assigned' | 'judge_started' | 'judge_completed' | 'skipped'
  assignedAt: string
  startedAt: string | null
  completedAt: string | null
  skippedAt: string | null
  skippedByUserId: string | null
  skipReason: string | null
  ineligibilityStatus: 'eligible' | 'ineligible'
  ineligibilityReason: string | null
  ineligibilityMarkedAt: string | null
  ineligibilityMarkedByUserId: string | null
  createdAt: string
  blindSubmission?: {
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
    status: SubmissionRecord['status']
    submittedAt: string | null
    lockedAt: string | null
    applications: Array<{
      id: string
      status: AdminApplicationRecord['status']
      submittedAt: string
      reviewedAt: string | null
      applicationTermsDocumentId: string
    }>
  }
  pitchSubmission?: {
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
    status: SubmissionRecord['status']
    submittedAt: string | null
    lockedAt: string | null
  }
  criterionScores?: Array<{
    id: string
    evaluationCriterionId: string
    criterionName: string | null
    criterionDescription: string | null
    criterionWeight: number | null
    score: number
    comment: string | null
    createdAt: string
    updatedAt: string
  }>
}

export interface AdminJudgeAssignmentOversightGroup {
  judgeUserId: string
  judgeLabel: string
  activeAssignmentCount: number
  assignedCount: number
  startedCount: number
  assignments: JudgeAssignmentSummary[]
}

export interface PitchReviewCoverageEntry {
  submissionId: string
  projectLabel: string
  teamName: string | null
  reviewedJudgeLabels: string[]
  missingJudgeLabels: string[]
  completedAssignmentCount: number
  totalAssignmentCount: number
}

export interface AdminJudgeAssignmentInterventionPolicy {
  canReassign: boolean
  reassignReason?: string
  canForceSkip: boolean
  forceSkipReason?: string
}

function startCase(value: string) {
  return value
    .split('_')
    .map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function getPitchReviewCoverageJudgeLabel(
  judgeUserId: string,
  roleAssignmentsByUserId: Map<string, Pick<HackathonRoleAssignment, 'userId' | 'user'>>
) {
  const roleAssignment = roleAssignmentsByUserId.get(judgeUserId)
  const displayName = roleAssignment?.user?.displayName?.trim()
  const email = roleAssignment?.user?.email?.trim()

  if (displayName && email) {
    return `${displayName} (${email})`
  }

  if (displayName) {
    return displayName
  }

  if (email) {
    return email
  }

  return judgeUserId
}

function getAdminJudgeAssignmentOversightStatusSortOrder(status: JudgeAssignmentSummary['status']) {
  switch (status) {
    case 'assigned':
      return 0
    case 'judge_started':
      return 1
    case 'judge_completed':
      return 2
    case 'skipped':
      return 3
  }
}

function getAdminJudgeAssignmentOversightProjectLabel(assignment: JudgeAssignmentSummary) {
  const projectName = (
    assignment.blindSubmission?.projectName
    ?? assignment.pitchSubmission?.projectName
  )?.trim()
  return projectName && projectName.length > 0 ? projectName : assignment.submissionId
}

export function buildPitchReviewCoverageEntries(options: {
  finalistSubmissionIds: string[]
  leaderboardEntries: Array<{
    submissionId: string
    projectName: string | null
    teamName: string
    submissionStatus: SubmissionRecord['status']
  }>
  assignments: Array<Pick<JudgeAssignmentSummary, 'submissionId' | 'judgeUserId' | 'reviewStage' | 'status'>>
  roleAssignments?: Array<Pick<HackathonRoleAssignment, 'userId' | 'user'>>
}) {
  const finalistSubmissionIds = new Set(options.finalistSubmissionIds)
  const leaderboardEntriesBySubmissionId = new Map(
    options.leaderboardEntries.map(entry => [entry.submissionId, entry] as const)
  )
  const roleAssignmentsByUserId = new Map(
    (options.roleAssignments ?? []).map(roleAssignment => [roleAssignment.userId, roleAssignment] as const)
  )
  const pitchAssignmentsBySubmissionId = new Map<
    string,
    Array<Pick<JudgeAssignmentSummary, 'judgeUserId' | 'status'>>
  >()

  for (const assignment of options.assignments) {
    if (assignment.reviewStage !== 'pitch_review' || !finalistSubmissionIds.has(assignment.submissionId)) {
      continue
    }

    const existingAssignments = pitchAssignmentsBySubmissionId.get(assignment.submissionId) ?? []
    existingAssignments.push({
      judgeUserId: assignment.judgeUserId,
      status: assignment.status
    })
    pitchAssignmentsBySubmissionId.set(assignment.submissionId, existingAssignments)
  }

  return options.finalistSubmissionIds.map((submissionId) => {
    const leaderboardEntry = leaderboardEntriesBySubmissionId.get(submissionId)
    const projectLabel = formatAdminOperationalTeamProjectLabel(
      leaderboardEntry?.submissionStatus ?? 'locked',
      leaderboardEntry?.projectName ?? null,
      true
    )
    const labeledAssignments = (pitchAssignmentsBySubmissionId.get(submissionId) ?? [])
      .map(assignment => ({
        label: getPitchReviewCoverageJudgeLabel(assignment.judgeUserId, roleAssignmentsByUserId),
        status: assignment.status
      }))
      .sort((left, right) => left.label.localeCompare(right.label, undefined, {
        sensitivity: 'base'
      }))

    return {
      submissionId,
      projectLabel,
      teamName: leaderboardEntry?.teamName ?? null,
      reviewedJudgeLabels: labeledAssignments
        .filter(assignment => assignment.status === 'judge_completed')
        .map(assignment => assignment.label),
      missingJudgeLabels: labeledAssignments
        .filter(assignment => assignment.status !== 'judge_completed')
        .map(assignment => assignment.label),
      completedAssignmentCount: labeledAssignments.filter(
        assignment => assignment.status === 'judge_completed'
      ).length,
      totalAssignmentCount: labeledAssignments.length
    } satisfies PitchReviewCoverageEntry
  })
}

export function formatAdminJudgeAssignmentStatus(status: JudgeAssignmentSummary['status']) {
  return startCase(status)
}

export function getJudgeAssignmentStatusColor(status: JudgeAssignmentSummary['status']) {
  switch (status) {
    case 'assigned':
      return 'warning'
    case 'judge_started':
      return 'primary'
    case 'judge_completed':
      return 'success'
    case 'skipped':
      return 'neutral'
  }
}

export function getAdminJudgeAssignmentInterventionPolicy(
  hackathonState: HackathonState,
  assignmentStatus: JudgeAssignmentSummary['status']
): AdminJudgeAssignmentInterventionPolicy {
  const canReassign = hackathonState === 'blind_review'
    && assignmentStatus === 'assigned'
  const canForceSkip = hackathonState === 'blind_review'
    && assignmentStatus === 'judge_started'

  let reassignReason: string | undefined

  if (!canReassign) {
    if (hackathonState !== 'blind_review') {
      reassignReason = 'Assignment reassignment is only available during blind review.'
    } else {
      reassignReason = 'Only unstarted assignments can be reassigned.'
    }
  }

  let forceSkipReason: string | undefined

  if (!canForceSkip) {
    if (hackathonState !== 'blind_review') {
      forceSkipReason = 'Force-skip is available only once blind review has started.'
    } else {
      forceSkipReason = 'Only started assignments can be force-skipped.'
    }
  }

  return {
    canReassign,
    reassignReason,
    canForceSkip,
    forceSkipReason
  }
}

export function buildAdminJudgeAssignmentOversightGroups(
  assignments: JudgeAssignmentSummary[],
  options?: {
    judgeLabelsByUserId?: Record<string, string>
  }
): AdminJudgeAssignmentOversightGroup[] {
  const judgeLabelsByUserId = options?.judgeLabelsByUserId ?? {}
  const groupedAssignments = new Map<string, AdminJudgeAssignmentOversightGroup>()
  const sortedAssignments = [...assignments].sort((left, right) => {
    const leftJudgeLabel = judgeLabelsByUserId[left.judgeUserId] ?? left.judgeUserId
    const rightJudgeLabel = judgeLabelsByUserId[right.judgeUserId] ?? right.judgeUserId
    const judgeLabelComparison = leftJudgeLabel.localeCompare(rightJudgeLabel, undefined, {
      sensitivity: 'base'
    })

    if (judgeLabelComparison !== 0) {
      return judgeLabelComparison
    }

    const statusComparison = getAdminJudgeAssignmentOversightStatusSortOrder(left.status)
      - getAdminJudgeAssignmentOversightStatusSortOrder(right.status)

    if (statusComparison !== 0) {
      return statusComparison
    }

    const projectLabelComparison = getAdminJudgeAssignmentOversightProjectLabel(left).localeCompare(
      getAdminJudgeAssignmentOversightProjectLabel(right),
      undefined,
      {
        sensitivity: 'base'
      }
    )

    if (projectLabelComparison !== 0) {
      return projectLabelComparison
    }

    return left.id.localeCompare(right.id)
  })

  for (const assignment of sortedAssignments) {
    const existingGroup = groupedAssignments.get(assignment.judgeUserId)

    if (existingGroup) {
      existingGroup.assignments.push(assignment)
      existingGroup.activeAssignmentCount += 1

      if (assignment.status === 'assigned') {
        existingGroup.assignedCount += 1
      } else if (assignment.status === 'judge_started') {
        existingGroup.startedCount += 1
      }

      continue
    }

    groupedAssignments.set(assignment.judgeUserId, {
      judgeUserId: assignment.judgeUserId,
      judgeLabel: judgeLabelsByUserId[assignment.judgeUserId] ?? assignment.judgeUserId,
      activeAssignmentCount: 1,
      assignedCount: assignment.status === 'assigned' ? 1 : 0,
      startedCount: assignment.status === 'judge_started' ? 1 : 0,
      assignments: [assignment]
    })
  }

  return [...groupedAssignments.values()]
}
