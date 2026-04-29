import type { JudgeAssignmentSummary } from '~/domains/judging/admin-oversight'
import type { SubmissionRecord } from '~/domains/submissions/admin-submission-record'

export interface LeaderboardEntry {
  teamId: string
  teamName: string
  submissionId: string
  projectName: string | null
  summary: string | null
  repositoryUrl: string | null
  demoUrl: string | null
  submissionStatus: SubmissionRecord['status']
  reviewStatus: JudgeAssignmentSummary['status'] | null
  ineligibilityStatus: JudgeAssignmentSummary['ineligibilityStatus'] | null
  scoreTotal: number | null
  rank: number | null
  criterionScores: Array<{
    evaluationCriterionId: string
    criterionName: string | null
    criterionWeight: number | null
    score: number
    comment: string | null
  }>
}

export interface ShortlistEntry {
  submissionId: string
  projectName: string | null
  summary: string | null
  submissionStatus: SubmissionRecord['status']
  reviewStatus: JudgeAssignmentSummary['status'] | null
  ineligibilityStatus: JudgeAssignmentSummary['ineligibilityStatus'] | null
  scoreTotal: number | null
  rank: number | null
  criterionScores: Array<{
    evaluationCriterionId: string
    criterionName: string | null
    criterionWeight: number | null
    score: number
    comment: string | null
  }>
  isPitchFinalist: boolean
  pitchFinalistRank: number | null
}

export interface FinalDeliberationEntry {
  teamId: string
  teamName: string
  submissionId: string
  projectName: string | null
  summary: string | null
  repositoryUrl: string | null
  demoUrl: string | null
  submissionStatus: SubmissionRecord['status']
  reviewStatus: JudgeAssignmentSummary['status'] | null
  ineligibilityStatus: JudgeAssignmentSummary['ineligibilityStatus'] | null
  scoreTotal: number | null
  scoreRank: number | null
  finalRank: number | null
  blindScore?: number | null
  pitchScore?: number | null
}

export interface FinalDeliberationView {
  entries: FinalDeliberationEntry[]
  finalRankingSubmissionIds: string[]
}
