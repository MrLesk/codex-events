export const accountOverviewPagePath = '/api/account/overview' as const

export type AccountOverviewEventType = 'hackathon' | 'meetup' | 'build'

export type AccountOverviewEventState
  = | 'draft'
    | 'registration_open'
    | 'submission_open'
    | 'judging_preparation'
    | 'blind_review'
    | 'shortlist'
    | 'pitch'
    | 'pitch_review'
    | 'final_deliberation'
    | 'winners_announced'
    | 'completed'

export type AccountOverviewApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'withdrawn'

export type AccountOverviewLumaSyncStatus
  = | 'not_synced'
    | 'approve_synced'
    | 'reject_synced'
    | 'approve_failed'
    | 'reject_failed'
    | null

export type AccountOverviewSubmissionStatus
  = | 'draft'
    | 'submitted'
    | 'withdrawn'
    | 'locked'
    | 'disqualified'

export interface AccountOverviewEventSummary {
  id: string
  eventType: AccountOverviewEventType
  name: string
  slug: string
  city: string
  country: string
  state: AccountOverviewEventState
  startsAt: string
  registrationOpensAt: string
  registrationClosesAt: string
  submissionClosesAt: string | null
  maxTeamMembers: number
}

export interface AccountOverviewApplicationSummary {
  id: string
  userId: string
  status: AccountOverviewApplicationStatus
  lumaSyncStatus: AccountOverviewLumaSyncStatus
  submittedAt: string
  withdrawnAt: string | null
  reviewedAt: string | null
  checkedInAt: string | null
  isCheckedIn: boolean
  certificateHiddenAt: string | null
  certificateRevokedAt: string | null
  selectedTrackId: string | null
  updatedAt: string
}

export interface AccountOverviewTeamSummary {
  id: string
  name: string
  slug: string
  membershipRole: 'member' | 'admin'
  joinedAt: string
  leftAt: string | null
  isActiveMembership: boolean
  activeMemberCount: number
}

export interface AccountOverviewSubmissionSummary {
  id: string
  teamId: string
  trackId: string | null
  status: AccountOverviewSubmissionStatus
  projectName: string | null
  summary: string | null
  repositoryUrl: string | null
  demoUrl: string | null
  isPubliclyVisible: boolean
  submittedAt: string | null
  lockedAt: string | null
  withdrawnAt: string | null
  disqualifiedAt: string | null
  disqualificationReason: string | null
  createdAt: string
  updatedAt: string
}

export interface AccountOverviewPrizeSummary {
  id: string
  name: string
}

export interface AccountOverviewOutcomeSummary {
  isShortlisted: boolean
  isWinner: boolean
  finalRank: number | null
  rankedTeamCount: number
  prizes: AccountOverviewPrizeSummary[]
}

export interface AccountOverviewRecord {
  event: AccountOverviewEventSummary
  isPast: boolean
  lastActivityAt: string
  application: AccountOverviewApplicationSummary | null
  activeTeam: AccountOverviewTeamSummary | null
  latestTeam: AccountOverviewTeamSummary | null
  latestSubmission: AccountOverviewSubmissionSummary | null
  outcome: AccountOverviewOutcomeSummary | null
}

export interface AccountOverviewPage {
  current: AccountOverviewRecord[]
  past: AccountOverviewRecord[]
}

export function buildAccountOverviewPageCacheKey() {
  return 'account-overview-page'
}
