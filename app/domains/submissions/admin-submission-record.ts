import type { TeamSummary } from '~/domains/teams/admin-team-record'

export interface SubmissionRecord {
  id: string
  teamId: string
  trackId: string | null
  status: 'draft' | 'submitted' | 'withdrawn' | 'locked' | 'disqualified'
  projectName: string | null
  summary: string | null
  repositoryUrl: string | null
  demoUrl: string | null
  submittedAt: string | null
  lockedAt: string | null
  withdrawnAt: string | null
  disqualifiedAt: string | null
  disqualificationReason: string | null
  createdAt: string
  updatedAt: string
}

export interface NoSubmissionEntry {
  team: TeamSummary
  submission: SubmissionRecord | null
}

export type AdminSubmissionStatus = SubmissionRecord['status'] | 'none'
