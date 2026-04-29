import type { HackathonState } from '~/domains/hackathons/states'
import type {
  AdminSubmissionStatus,
  NoSubmissionEntry,
  SubmissionRecord
} from '~/domains/submissions/admin-submission-record'
import type {
  AdminTeamDetailRecord,
  TeamSummary
} from '~/domains/teams/admin-team-record'

export interface AdminOperationalTeam {
  team: TeamSummary
  detail: AdminTeamDetailRecord | null
  submission: SubmissionRecord | null
  submissionStatus: AdminSubmissionStatus
  activeMemberCount: number
  activeAdminChoices: Array<{
    userId: string
    label: string
  }>
  isInNoSubmissionSection: boolean
  noSubmissionReason: AdminSubmissionStatus
}

export type AdminSubmissionDashboardFilter = 'all'
  | 'none'
  | 'draft'
  | 'submitted'
  | 'locked'
  | 'out'

export interface AdminSubmissionDashboardMetrics {
  totalTeams: number
  noRecordTeams: number
  draftTeams: number
  submittedTeams: number
  lockedTeams: number
  submittedOrLaterTeams: number
  withdrawnTeams: number
  disqualifiedTeams: number
  outTeams: number
}

export interface AdminSubmissionInterventionPolicy {
  canAdminWithdraw: boolean
  adminWithdrawReason?: string
  canDisqualify: boolean
  disqualifyReason?: string
}

function startCase(value: string) {
  return value
    .split('_')
    .map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function normalizeAdminSearchValue(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function getAdminOperationalTeamSearchValues(team: AdminOperationalTeam) {
  const activeMembers = (team.detail?.members ?? []).filter(member => member.leftAt === null)

  return [
    team.team.name,
    team.team.slug,
    team.submission?.projectName,
    ...activeMembers.flatMap(member => [
      member.user?.displayName,
      member.user?.email,
      member.userId
    ])
  ]
    .map(normalizeAdminSearchValue)
    .filter(value => value.length > 0)
}

function getAdminOperationalTeamSortPriority(status: AdminSubmissionStatus) {
  switch (status) {
    case 'none':
      return 0
    case 'draft':
      return 1
    case 'submitted':
      return 2
    case 'locked':
      return 3
    case 'withdrawn':
      return 4
    case 'disqualified':
      return 5
  }
}

function getAdminOperationalTeamLastActivityTimestamp(team: AdminOperationalTeam) {
  return team.submission?.submittedAt
    ?? team.submission?.updatedAt
    ?? team.team.updatedAt
}

function isAdminSubmissionDashboardOutStatus(status: AdminSubmissionStatus) {
  return status === 'withdrawn' || status === 'disqualified'
}

function formatOperationalUserLabel(
  user: AdminTeamDetailRecord['members'][number]['user'] | undefined,
  userId: string
) {
  if (!user) {
    return userId
  }

  if (user.displayName && user.email) {
    return `${user.displayName} (${user.email})`
  }

  return user.displayName || user.email || userId
}

export function filterActiveAdminOperationalTeams(teams: AdminOperationalTeam[]) {
  return teams.filter(team => team.activeMemberCount > 0)
}

export function countActiveAdminOperationalTeams(teams: AdminOperationalTeam[]) {
  return filterActiveAdminOperationalTeams(teams).length
}

export function shouldLoadAdminSubmissionMonitor(options: {
  isSubmissionsSection: boolean
  canManage: boolean
  teamDataStatus: 'idle' | 'pending' | 'success' | 'error'
  teamCount: number
}) {
  if (!options.isSubmissionsSection || !options.canManage) {
    return false
  }

  if (options.teamDataStatus !== 'success') {
    return false
  }

  return options.teamCount > 0
}

export function shouldRefreshAdminSubmissionMonitor(options: {
  isReady: boolean
  submissionMonitorStatus: 'idle' | 'pending' | 'success' | 'error'
  teamCount: number
  teamDetailsCount: number
  teamSubmissionsCount: number
}) {
  if (!options.isReady) {
    return false
  }

  if (options.submissionMonitorStatus !== 'success') {
    return false
  }

  if (options.teamCount === 0) {
    return false
  }

  return options.teamDetailsCount !== options.teamCount
    || options.teamSubmissionsCount !== options.teamCount
}

export function formatAdminSubmissionRowToggleLabel(expanded: boolean) {
  return expanded ? 'Collapse' : 'Expand'
}

export function formatSubmissionStatus(status: AdminSubmissionStatus) {
  return status === 'none' ? 'No record' : startCase(status)
}

export function getSubmissionStatusColor(status: AdminSubmissionStatus) {
  switch (status) {
    case 'none':
      return 'neutral'
    case 'draft':
      return 'warning'
    case 'submitted':
      return 'primary'
    case 'locked':
      return 'info'
    case 'withdrawn':
      return 'neutral'
    case 'disqualified':
      return 'error'
  }
}

export function getAdminSubmissionDashboardMetrics(teams: AdminOperationalTeam[]): AdminSubmissionDashboardMetrics {
  const noRecordTeams = teams.filter(team => team.submissionStatus === 'none').length
  const draftTeams = teams.filter(team => team.submissionStatus === 'draft').length
  const submittedTeams = teams.filter(team => team.submissionStatus === 'submitted').length
  const lockedTeams = teams.filter(team => team.submissionStatus === 'locked').length
  const withdrawnTeams = teams.filter(team => team.submissionStatus === 'withdrawn').length
  const disqualifiedTeams = teams.filter(team => team.submissionStatus === 'disqualified').length

  return {
    totalTeams: teams.length,
    noRecordTeams,
    draftTeams,
    submittedTeams,
    lockedTeams,
    submittedOrLaterTeams: submittedTeams + lockedTeams,
    withdrawnTeams,
    disqualifiedTeams,
    outTeams: withdrawnTeams + disqualifiedTeams
  }
}

export function sortAdminOperationalTeamsForSubmissionDashboard(teams: AdminOperationalTeam[]) {
  return [...teams].sort((left, right) => {
    const priorityDifference = getAdminOperationalTeamSortPriority(left.submissionStatus)
      - getAdminOperationalTeamSortPriority(right.submissionStatus)

    if (priorityDifference !== 0) {
      return priorityDifference
    }

    const leftTimestamp = Date.parse(getAdminOperationalTeamLastActivityTimestamp(left))
    const rightTimestamp = Date.parse(getAdminOperationalTeamLastActivityTimestamp(right))

    if (!Number.isNaN(leftTimestamp) && !Number.isNaN(rightTimestamp) && leftTimestamp !== rightTimestamp) {
      return rightTimestamp - leftTimestamp
    }

    return left.team.name.localeCompare(right.team.name)
  })
}

export function filterAdminOperationalTeams(
  teams: AdminOperationalTeam[],
  options?: {
    filter?: AdminSubmissionDashboardFilter
    search?: string | null
  }
) {
  const filter = options?.filter ?? 'all'
  const normalizedSearch = normalizeAdminSearchValue(options?.search)

  return teams.filter((team) => {
    if (filter !== 'all') {
      if (filter === 'out') {
        if (!isAdminSubmissionDashboardOutStatus(team.submissionStatus)) {
          return false
        }
      } else if (team.submissionStatus !== filter) {
        return false
      }
    }

    if (normalizedSearch.length === 0) {
      return true
    }

    return getAdminOperationalTeamSearchValues(team).some(value => value.includes(normalizedSearch))
  })
}

export function getAdminSubmissionInterventionPolicy(
  hackathonState: HackathonState,
  submissionStatus: AdminSubmissionStatus
): AdminSubmissionInterventionPolicy {
  const canAdminWithdraw = ['submission_open', 'judging_preparation'].includes(hackathonState)
    && (submissionStatus === 'draft' || submissionStatus === 'submitted')
  const canDisqualify = ['blind_review', 'shortlist', 'pitch', 'pitch_review', 'final_deliberation', 'winners_announced', 'completed'].includes(hackathonState)
    && submissionStatus === 'locked'

  let adminWithdrawReason: string | undefined

  if (!canAdminWithdraw) {
    if (!['submission_open', 'judging_preparation'].includes(hackathonState)) {
      adminWithdrawReason = 'Admin withdrawal is available only until judging starts.'
    } else {
      adminWithdrawReason = 'Only draft or submitted work can be admin-withdrawn.'
    }
  }

  let disqualifyReason: string | undefined

  if (!canDisqualify) {
    if (!['blind_review', 'shortlist', 'pitch', 'pitch_review', 'final_deliberation', 'winners_announced', 'completed'].includes(hackathonState)) {
      disqualifyReason = 'Disqualification begins only once judging begins.'
    } else {
      disqualifyReason = 'Only locked submissions can be disqualified.'
    }
  }

  return {
    canAdminWithdraw,
    adminWithdrawReason,
    canDisqualify,
    disqualifyReason
  }
}

export function listActiveAdminOperationalTeamMembers(detail: AdminTeamDetailRecord | null) {
  return (detail?.members ?? [])
    .filter(member => member.leftAt === null)
    .map(member => ({
      userId: member.userId,
      role: member.role,
      label: formatOperationalUserLabel(member.user, member.userId)
    }))
}

export function buildAdminOperationalTeams(
  teams: TeamSummary[],
  options?: {
    teamDetails?: Array<AdminTeamDetailRecord | null>
    submissions?: Array<SubmissionRecord | null>
    noSubmissionEntries?: NoSubmissionEntry[]
  }
): AdminOperationalTeam[] {
  const noSubmissionByTeamId = new Map(
    (options?.noSubmissionEntries ?? []).map(entry => [entry.team.id, entry])
  )

  return teams.map((team, index) => {
    const detail = options?.teamDetails?.[index] ?? null
    const noSubmissionEntry = noSubmissionByTeamId.get(team.id)
    const submission = options?.submissions?.[index] ?? noSubmissionEntry?.submission ?? null
    const activeMembers = listActiveAdminOperationalTeamMembers(detail)
    const activeAdmins = activeMembers.filter(member => member.role === 'admin')

    return {
      team,
      detail,
      submission,
      submissionStatus: submission?.status ?? 'none',
      activeMemberCount: activeMembers.length || team.activeMemberCount || 0,
      activeAdminChoices: activeAdmins.map(member => ({
        userId: member.userId,
        label: member.label
      })),
      isInNoSubmissionSection: Boolean(noSubmissionEntry),
      noSubmissionReason: noSubmissionEntry?.submission?.status ?? 'none'
    }
  })
}
