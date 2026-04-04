export const hackathonStateOrder = [
  'draft',
  'registration_open',
  'submission_open',
  'judging_preparation',
  'judge_review',
  'shortlist',
  'winners_announced',
  'completed'
] as const

export type HackathonState = typeof hackathonStateOrder[number]
export interface ApiErrorShape {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ApiDataResponse<T> {
  data: T
}

export interface ApiListResponse<T> {
  data: T[]
  meta?: {
    page?: number
    pageSize?: number
    total?: number
    [key: string]: unknown
  }
}

export async function listAllPaginatedItems<T>(
  fetchPage: (page: number, pageSize: number) => Promise<ApiListResponse<T>>,
  pageSize: number = 100
) {
  const items: T[] = []
  let page = 1
  let total: number | null = null

  while (true) {
    const response = await fetchPage(page, pageSize)
    const pageItems = response.data

    items.push(...pageItems)
    total = response.meta?.total ?? total

    const reachedKnownTotal = total !== null && items.length >= total
    const reachedLastPage = pageItems.length < pageSize

    if (pageItems.length === 0 || reachedKnownTotal || reachedLastPage) {
      return items
    }

    page += 1
  }
}

export interface SessionUserIdentity {
  sub: string
  email?: string | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
}

export interface PlatformUserProfile {
  id: string
  email: string
  displayName: string
  firstName: string
  familyName: string
  isPlatformAdmin: boolean
  xProfileUrl?: string | null
  linkedinProfileUrl?: string | null
  githubProfileUrl?: string | null
  chatgptEmail?: string | null
  openaiOrgId?: string | null
  lumaEmail?: string | null
  lumaUsername?: string | null
  profileIconUpdatedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  deletedAt?: string | null
}

export interface OperationalUserSummary {
  id: string
  email: string
  displayName: string
  xProfileUrl?: string | null
  linkedinProfileUrl?: string | null
  githubProfileUrl?: string | null
  chatgptEmail?: string | null
  openaiOrgId?: string | null
  lumaEmail?: string | null
  lumaUsername?: string | null
  profileIconUpdatedAt?: string | null
}

export interface HackathonRoleSummary {
  hackathonId: string
  role: HackathonScopedRole
  isInJudgePool: boolean
  isStaff: boolean
  createdAt: string
}

export interface SessionActor {
  kind: 'anonymous' | 'authenticated_identity' | 'platform_user'
  isAuthenticated: boolean
  hasPlatformAccount: boolean
  sessionUser: SessionUserIdentity | null
  platformUser: PlatformUserProfile | null
  isPlatformAdmin: boolean
  hackathonRoles: HackathonRoleSummary[]
}

export interface TermsReference {
  id: string
  documentType: 'application_terms' | 'winner_terms'
  version: number
  title: string
  publishedAt: string
}

export interface TermsDocument extends TermsReference {
  hackathonId: string
  content: string
  createdAt: string
}

export interface HackathonAgendaItem {
  id: string
  startsAt: string
  endsAt: string | null
  title: string
  details: string | null
  displayOrder: number
}

export interface AdminApplicationRecord {
  id: string
  hackathonId: string
  userId: string
  status: 'submitted' | 'approved' | 'rejected' | 'withdrawn'
  preApprovalStatus?: 'approved' | 'rejected' | null
  lumaSyncStatus?: 'not_synced' | 'approve_synced' | 'reject_synced' | 'approve_failed' | 'reject_failed' | null
  submittedAt: string
  reviewedAt: string | null
  reviewedByUserId: string | null
  applicationTermsDocumentId: string
  applicationTermsAcceptedAt: string
  registrationDetailsJson: string
  createdAt: string
  updatedAt: string
  user?: OperationalUserSummary
  applicationTermsDocument?: TermsDocument
}

export interface HackathonRecord {
  id: string
  name: string
  slug: string
  description: string
  agendaItems: HackathonAgendaItem[]
  backgroundImageUrl: string | null
  bannerImageUrl: string | null
  lumaEventUrl: string | null
  lumaEventApiId: string | null
  city: string
  country: string
  address: string
  registrationOpensAt: string
  registrationClosesAt: string
  submissionOpensAt: string
  submissionClosesAt: string
  state: HackathonState
  maxTeamMembers: number
  participantsLimit?: number | null
  inPersonEvent: boolean
  requireXProfile: boolean
  requireLinkedinProfile: boolean
  requireGithubProfile: boolean
  requireChatgptEmail: boolean
  requireOpenaiOrgId: boolean
  requireLumaEmail: boolean
  requireWhyThisHackathon: boolean
  requireProofOfExecution: boolean
  currentApplicationTermsDocumentId: string | null
  currentWinnerTermsDocumentId: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
  currentTerms?: {
    applicationTerms: TermsReference | null
    winnerTerms: TermsReference | null
  }
}

export interface HackathonFormState {
  name: string
  slug: string
  lumaEventUrl: string
  lumaEventApiId: string
  description: string
  agendaItems: HackathonFormAgendaItem[]
  backgroundImageUrl: string
  bannerImageUrl: string
  city: string
  country: string
  address: string
  registrationOpensAt: string
  registrationClosesAt: string
  submissionOpensAt: string
  submissionClosesAt: string
  maxTeamMembers: number
  participantsLimit: number | null
  inPersonEvent: boolean
  requireXProfile: boolean
  requireLinkedinProfile: boolean
  requireGithubProfile: boolean
  requireChatgptEmail: boolean
  requireOpenaiOrgId: boolean
  requireLumaEmail: boolean
  requireWhyThisHackathon: boolean
  requireProofOfExecution: boolean
}

export interface HackathonFormAgendaItem {
  id: string
  startsAt: string
  endsAt: string
  title: string
  details: string
  displayOrder: number
}

export interface EvaluationCriterion {
  id: string
  hackathonId: string
  name: string
  description: string
  weight: number
  displayOrder: number
  createdAt: string
}

export interface PrizeDefinition {
  id: string
  hackathonId: string
  name: string
  description: string
  rewardType: 'api_credits' | 'subscription' | 'physical' | 'other'
  rewardValue: string
  rewardCurrency: string | null
  awardScope: 'team' | 'member'
  rankStart: number
  rankEnd: number
  displayOrder: number
  createdAt: string
}

export interface HackathonRoleUserSummary {
  id: string
  email: string
  displayName: string
  isPlatformAdmin: boolean
}

export interface HackathonRoleAssignment {
  id: string
  hackathonId: string
  userId: string
  role: HackathonScopedRole
  isInJudgePool: boolean
  isStaff: boolean
  createdAt: string
  user?: HackathonRoleUserSummary
}

export interface TeamSummary {
  id: string
  hackathonId: string
  name: string
  bio: string | null
  slug: string
  isOpenToJoinRequests: boolean
  createdByUserId: string
  createdAt: string
  updatedAt: string
  activeMemberCount?: number
}

export interface TeamMemberSummary {
  id: string
  teamId: string
  userId: string
  role: 'member' | 'admin'
  joinedAt: string
  leftAt: string | null
  createdAt: string
  user?: OperationalUserSummary
}

export interface AdminTeamDetailRecord extends TeamSummary {
  members: TeamMemberSummary[]
}

export interface SubmissionRecord {
  id: string
  teamId: string
  status: 'draft' | 'submitted' | 'withdrawn' | 'locked' | 'disqualified'
  projectName: string | null
  summary: string | null
  repositoryUrl: string | null
  demoUrl: string | null
  submittedAt: string | null
  lockedAt: string | null
  withdrawnAt: string | null
  disqualifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface NoSubmissionEntry {
  team: TeamSummary
  submission: SubmissionRecord | null
}

export type AdminSubmissionStatus = SubmissionRecord['status'] | 'none'

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

export interface JudgeAssignmentSummary {
  id: string
  hackathonId: string
  submissionId: string
  judgeUserId: string
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

export interface LeaderboardEntry {
  teamId: string
  teamName: string
  submissionId: string
  projectName: string | null
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

export interface ShortlistEntry extends LeaderboardEntry {
  finalRank: number
}

export interface WinnerEntry extends ShortlistEntry {
  prizes: PrizeDefinition[]
}

export interface LifecycleMetrics {
  submittedSubmissionCount: number
  judgePoolCount: number
  lockedSubmissionCount: number
  activeAssignmentCount: number
  lockedLeaderboardEntryCount: number
  completedReviewCount: number
  prizeCount: number
  hasCurrentWinnerTerms: boolean
}

export interface LifecycleControl {
  key: 'open_registration' | 'open_submission' | 'start_judging_preparation' | 'start_judge_review' | 'start_shortlist' | 'announce_winners' | 'complete'
  label: string
  description: string
  endpoint: string
  isEnabled: boolean
  reason?: string
  code?: string
}

export interface AdminSubmissionInterventionPolicy {
  canAdminWithdraw: boolean
  adminWithdrawReason?: string
  canDisqualify: boolean
  disqualifyReason?: string
}

export interface AdminJudgeAssignmentInterventionPolicy {
  canReassign: boolean
  reassignReason?: string
  canForceSkip: boolean
  forceSkipReason?: string
}

export interface ParticipantsLimitSummary {
  participantsLimit: number
  approvedCount: number
  stagedApprovedCount: number
  projectedApprovedCount: number
  description: string
}

function startCase(value: string) {
  return value
    .split('_')
    .map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

export function isAdminActor(actor: SessionActor | null | undefined) {
  if (!actor?.hasPlatformAccount) {
    return false
  }

  if (actor.isPlatformAdmin) {
    return true
  }

  return actor.hackathonRoles.some(role => role.role === 'hackathon_admin')
}

export function isHackathonRoleJudgingEnabled(
  role: Pick<HackathonRoleSummary, 'role' | 'isInJudgePool'>
) {
  return role.role === 'judge' || (role.role === 'hackathon_admin' && role.isInJudgePool)
}

export function isHackathonRoleStaffEnabled(
  role: Pick<HackathonRoleSummary, 'role' | 'isStaff'>
) {
  return role.role === 'staff' || (role.role === 'hackathon_admin' && role.isStaff)
}

export function canCreateHackathon(actor: SessionActor | null | undefined) {
  return Boolean(actor?.hasPlatformAccount && actor.isPlatformAdmin)
}

export function canMutateRoleAssignments(actor: SessionActor | null | undefined) {
  return isAdminActor(actor)
}

export function hasHackathonAdminAccess(actor: SessionActor | null | undefined, hackathonId: string) {
  if (!actor?.hasPlatformAccount) {
    return false
  }

  if (actor.isPlatformAdmin) {
    return true
  }

  return actor.hackathonRoles.some(role => role.hackathonId === hackathonId && role.role === 'hackathon_admin')
}

export function hasHackathonParticipantVisibilityAccess(
  actor: SessionActor | null | undefined,
  hackathonId: string
) {
  if (!actor?.hasPlatformAccount) {
    return false
  }

  if (actor.isPlatformAdmin) {
    return true
  }

  return actor.hackathonRoles.some(role =>
    role.hackathonId === hackathonId
    && (role.role === 'hackathon_admin' || role.role === 'staff')
  )
}

export function hasHackathonJudgingAccess(actor: SessionActor | null | undefined, hackathonId: string) {
  if (!actor?.hasPlatformAccount) {
    return false
  }

  return actor.hackathonRoles.some(role =>
    role.hackathonId === hackathonId
    && isHackathonRoleJudgingEnabled(role)
  )
}

export function filterManageableHackathons(hackathons: HackathonRecord[], actor: SessionActor | null | undefined) {
  if (!actor?.hasPlatformAccount) {
    return []
  }

  if (actor.isPlatformAdmin) {
    return [...hackathons]
  }

  const allowedIds = new Set(
    actor.hackathonRoles
      .filter(role => role.role === 'hackathon_admin')
      .map(role => role.hackathonId)
  )

  return hackathons.filter(hackathon => allowedIds.has(hackathon.id))
}

export function formatHackathonState(state: HackathonState) {
  return startCase(state)
}

export function getHackathonStateColor(state: HackathonState) {
  switch (state) {
    case 'draft':
      return 'neutral'
    case 'registration_open':
      return 'info'
    case 'submission_open':
      return 'primary'
    case 'judging_preparation':
      return 'warning'
    case 'judge_review':
      return 'warning'
    case 'shortlist':
      return 'secondary'
    case 'winners_announced':
      return 'success'
    case 'completed':
      return 'neutral'
  }
}

export function getHackathonDashboardStateBadgePresentation(state: HackathonState): {
  color: 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'error' | 'info'
  variant: 'soft' | 'outline'
  className: string
} {
  if (state === 'draft') {
    return {
      color: 'neutral' as const,
      variant: 'outline' as const,
      className: 'border-black/10 bg-black/[0.04] text-neutral-700 dark:border-white/[0.14] dark:bg-white/[0.08] dark:text-white/85'
    }
  }

  return {
    color: getHackathonStateColor(state),
    variant: 'soft' as const,
    className: ''
  }
}

export function formatApplicationStatus(status: AdminApplicationRecord['status']) {
  return startCase(status)
}

export function getApplicationStatusColor(status: AdminApplicationRecord['status']) {
  switch (status) {
    case 'submitted':
      return 'warning'
    case 'approved':
      return 'success'
    case 'rejected':
      return 'error'
    case 'withdrawn':
      return 'neutral'
  }
}

export function shouldShowApplicationLumaSyncStatus(
  application: Pick<AdminApplicationRecord, 'status' | 'lumaSyncStatus'>,
  readOnly: boolean = false
) {
  return !readOnly && application.status !== 'submitted' && Boolean(application.lumaSyncStatus)
}

export function formatApplicationLumaSyncStatus(status: AdminApplicationRecord['lumaSyncStatus']) {
  switch (status) {
    case 'not_synced':
      return 'Luma sync pending'
    case 'approve_synced':
      return 'Luma approved'
    case 'reject_synced':
      return 'Luma rejected'
    case 'approve_failed':
      return 'Luma approval failed'
    case 'reject_failed':
      return 'Luma rejection failed'
    default:
      return ''
  }
}

export function getApplicationLumaSyncStatusColor(status: AdminApplicationRecord['lumaSyncStatus']) {
  switch (status) {
    case 'not_synced':
    case 'approve_failed':
    case 'reject_failed':
      return 'warning'
    case 'approve_synced':
    case 'reject_synced':
      return 'neutral'
    default:
      return 'neutral'
  }
}

function formatRemainingSpots(count: number) {
  return `${count} ${count === 1 ? 'spot' : 'spots'}`
}

export function getParticipantsLimitSummary(
  applications: AdminApplicationRecord[],
  participantsLimit?: number | null
): ParticipantsLimitSummary | null {
  if (!participantsLimit || participantsLimit <= 0) {
    return null
  }

  const approvedCount = applications.filter(application => application.status === 'approved').length
  const stagedApprovedCount = applications.filter(
    application => application.status === 'submitted' && application.preApprovalStatus === 'approved'
  ).length
  const projectedApprovedCount = approvedCount + stagedApprovedCount
  const spotsDelta = participantsLimit - projectedApprovedCount

  let projectedOutcome: string

  if (spotsDelta > 0) {
    projectedOutcome = `leaving ${formatRemainingSpots(spotsDelta)} remaining against the target.`
  } else if (spotsDelta === 0) {
    projectedOutcome = 'matching the target exactly.'
  } else {
    projectedOutcome = `which is ${formatRemainingSpots(Math.abs(spotsDelta))} over the target.`
  }

  return {
    participantsLimit,
    approvedCount,
    stagedApprovedCount,
    projectedApprovedCount,
    description: `Current fill: ${approvedCount}/${participantsLimit} approved against the planning target. If you save the current staged decisions, projected fill becomes ${projectedApprovedCount}/${participantsLimit}, ${projectedOutcome}`
  }
}

export function formatSubmissionStatus(status: AdminSubmissionStatus) {
  return status === 'none' ? 'No Submission' : startCase(status)
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

export function getAdminSubmissionInterventionPolicy(
  hackathonState: HackathonState,
  submissionStatus: AdminSubmissionStatus
): AdminSubmissionInterventionPolicy {
  const canAdminWithdraw = hackathonState === 'submission_open'
    && (submissionStatus === 'draft' || submissionStatus === 'submitted')
  const canDisqualify = ['judge_review', 'shortlist', 'winners_announced', 'completed'].includes(hackathonState)
    && submissionStatus === 'locked'

  let adminWithdrawReason: string | undefined

  if (!canAdminWithdraw) {
    if (hackathonState !== 'submission_open') {
      adminWithdrawReason = 'Admin withdrawal is available only while submission is open.'
    } else {
      adminWithdrawReason = 'Only draft or submitted work can be admin-withdrawn.'
    }
  }

  let disqualifyReason: string | undefined

  if (!canDisqualify) {
    if (!['judge_review', 'shortlist', 'winners_announced', 'completed'].includes(hackathonState)) {
      disqualifyReason = 'Disqualification begins only once judge review starts.'
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

export function getAdminJudgeAssignmentInterventionPolicy(
  hackathonState: HackathonState,
  assignmentStatus: JudgeAssignmentSummary['status']
): AdminJudgeAssignmentInterventionPolicy {
  const canReassign = ['judging_preparation', 'judge_review'].includes(hackathonState)
    && assignmentStatus === 'assigned'
  const canForceSkip = hackathonState === 'judge_review'
    && assignmentStatus === 'judge_started'

  let reassignReason: string | undefined

  if (!canReassign) {
    if (!['judging_preparation', 'judge_review'].includes(hackathonState)) {
      reassignReason = 'Assignment reassignment is only available during judging preparation or judge review.'
    } else {
      reassignReason = 'Only unstarted assignments can be reassigned.'
    }
  }

  let forceSkipReason: string | undefined

  if (!canForceSkip) {
    if (hackathonState !== 'judge_review') {
      forceSkipReason = 'Force-skip is available only once judge review has started.'
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

function formatOperationalUserLabel(user: OperationalUserSummary | undefined, userId: string) {
  if (!user) {
    return userId
  }

  if (user.displayName && user.email) {
    return `${user.displayName} (${user.email})`
  }

  return user.displayName || user.email || userId
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
    const activeAdmins = (detail?.members ?? []).filter(member => member.leftAt === null && member.role === 'admin')

    return {
      team,
      detail,
      submission,
      submissionStatus: submission?.status ?? 'none',
      activeMemberCount: detail?.members.length ?? team.activeMemberCount ?? 0,
      activeAdminChoices: activeAdmins.map(member => ({
        userId: member.userId,
        label: formatOperationalUserLabel(member.user, member.userId)
      })),
      isInNoSubmissionSection: Boolean(noSubmissionEntry),
      noSubmissionReason: noSubmissionEntry?.submission?.status ?? 'none'
    }
  })
}

export function getHackathonStateProgress(state: HackathonState) {
  return hackathonStateOrder.indexOf(state)
}

export function isHackathonStateReached(currentState: HackathonState, targetState: HackathonState) {
  return getHackathonStateProgress(currentState) >= getHackathonStateProgress(targetState)
}

export function createHackathonSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function getAdminWorkspaceSubjectKey(subject: string | null | undefined) {
  return subject?.trim() || 'anonymous'
}

export function buildAdminWorkspaceCacheKey(...parts: Array<string>) {
  return parts.join(':')
}

export function getTermsVersionPublishErrorMessage(title: string, content: string) {
  if (title.trim().length === 0) {
    return 'Enter a title before publishing this terms version.'
  }

  if (content.trim().length === 0) {
    return 'Enter the terms content before publishing this terms version.'
  }

  return ''
}

export function createEmptyHackathonFormState(): HackathonFormState {
  return {
    name: '',
    slug: '',
    lumaEventUrl: '',
    lumaEventApiId: '',
    description: '',
    agendaItems: [],
    backgroundImageUrl: '',
    bannerImageUrl: '',
    city: '',
    country: '',
    address: '',
    registrationOpensAt: '',
    registrationClosesAt: '',
    submissionOpensAt: '',
    submissionClosesAt: '',
    maxTeamMembers: 4,
    participantsLimit: null,
    inPersonEvent: false,
    requireXProfile: false,
    requireLinkedinProfile: false,
    requireGithubProfile: false,
    requireChatgptEmail: true,
    requireOpenaiOrgId: true,
    requireLumaEmail: true,
    requireWhyThisHackathon: false,
    requireProofOfExecution: false
  }
}

export function getNextAgendaItemDefaultTimes(previousItem?: HackathonFormAgendaItem | null) {
  const previousEndsAt = previousItem?.endsAt?.trim() ?? ''

  if (!previousEndsAt) {
    return {
      startsAt: '',
      endsAt: ''
    }
  }

  return {
    startsAt: previousEndsAt,
    endsAt: previousEndsAt
  }
}

export function createHackathonFormState(hackathon: HackathonRecord): HackathonFormState {
  return {
    name: hackathon.name,
    slug: hackathon.slug,
    lumaEventUrl: hackathon.lumaEventUrl ?? '',
    lumaEventApiId: hackathon.lumaEventApiId ?? '',
    description: hackathon.description,
    agendaItems: [...hackathon.agendaItems]
      .sort((left, right) => left.displayOrder - right.displayOrder || left.startsAt.localeCompare(right.startsAt))
      .map(item => ({
        id: item.id,
        startsAt: toDateTimeLocalValue(item.startsAt),
        endsAt: toDateTimeLocalValue(item.endsAt),
        title: item.title,
        details: item.details ?? '',
        displayOrder: item.displayOrder
      })),
    backgroundImageUrl: hackathon.backgroundImageUrl ?? '',
    bannerImageUrl: hackathon.bannerImageUrl ?? '',
    city: hackathon.city,
    country: hackathon.country,
    address: hackathon.address,
    registrationOpensAt: toDateTimeLocalValue(hackathon.registrationOpensAt),
    registrationClosesAt: toDateTimeLocalValue(hackathon.registrationClosesAt),
    submissionOpensAt: toDateTimeLocalValue(hackathon.submissionOpensAt),
    submissionClosesAt: toDateTimeLocalValue(hackathon.submissionClosesAt),
    maxTeamMembers: hackathon.maxTeamMembers,
    participantsLimit: hackathon.participantsLimit ?? null,
    inPersonEvent: hackathon.inPersonEvent,
    requireXProfile: hackathon.requireXProfile,
    requireLinkedinProfile: hackathon.requireLinkedinProfile,
    requireGithubProfile: hackathon.requireGithubProfile,
    requireChatgptEmail: hackathon.requireChatgptEmail,
    requireOpenaiOrgId: hackathon.requireOpenaiOrgId,
    requireLumaEmail: hackathon.requireLumaEmail,
    requireWhyThisHackathon: hackathon.requireWhyThisHackathon,
    requireProofOfExecution: hackathon.requireProofOfExecution
  }
}

export function toHackathonAgendaPayload(items: HackathonFormAgendaItem[]): HackathonAgendaItem[] {
  return items
    .map(item => ({
      id: item.id,
      startsAt: fromDateTimeLocalValue(item.startsAt),
      endsAt: fromDateTimeLocalValue(item.endsAt) || null,
      title: item.title.trim(),
      details: item.details.trim() || null,
      displayOrder: item.displayOrder
    }))
    .sort((left, right) => left.displayOrder - right.displayOrder || left.startsAt.localeCompare(right.startsAt))
}

export function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60_000))
  return local.toISOString().slice(0, 16)
}

export function fromDateTimeLocalValue(value: string) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export function normalizeApiError(error: unknown): ApiErrorShape {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      data?: {
        error?: ApiErrorShape
      }
      response?: {
        _data?: {
          error?: ApiErrorShape
        }
      }
      message?: string
      statusMessage?: string
    }

    const apiError = maybeError.data?.error ?? maybeError.response?._data?.error

    if (apiError?.code && apiError.message) {
      return apiError
    }

    if (typeof maybeError.statusMessage === 'string' && maybeError.statusMessage.length > 0) {
      return {
        code: 'request_failed',
        message: maybeError.statusMessage
      }
    }

    if (typeof maybeError.message === 'string' && maybeError.message.length > 0) {
      return {
        code: 'request_failed',
        message: maybeError.message
      }
    }
  }

  return {
    code: 'request_failed',
    message: 'The request failed unexpectedly.'
  }
}

export function getCurrentLifecycleControl(
  hackathon: HackathonRecord,
  metrics: LifecycleMetrics,
  now: Date = new Date()
): LifecycleControl | null {
  switch (hackathon.state) {
    case 'draft': {
      const registrationOpensAt = Date.parse(hackathon.registrationOpensAt)
      const registrationClosesAt = Date.parse(hackathon.registrationClosesAt)
      const nowTimestamp = now.getTime()
      const isEnabled = nowTimestamp >= registrationOpensAt && nowTimestamp < registrationClosesAt

      let reason: string | undefined
      let code: string | undefined

      if (nowTimestamp < registrationOpensAt) {
        reason = 'Registration can only be opened once the configured registration window starts.'
        code = 'registration_window_not_open_yet'
      } else if (nowTimestamp >= registrationClosesAt) {
        reason = 'Registration can only be opened while the configured registration window is active.'
        code = 'registration_window_closed'
      }

      return {
        key: 'open_registration',
        label: 'Open Registration',
        description: 'Publish the hackathon and move it into the application phase.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/open-registration`,
        isEnabled,
        reason,
        code
      }
    }
    case 'registration_open': {
      const registrationClosesAt = Date.parse(hackathon.registrationClosesAt)
      const submissionOpensAt = Date.parse(hackathon.submissionOpensAt)
      const submissionClosesAt = Date.parse(hackathon.submissionClosesAt)
      const nowTimestamp = now.getTime()
      const isEnabled = nowTimestamp >= registrationClosesAt
        && nowTimestamp >= submissionOpensAt
        && nowTimestamp < submissionClosesAt

      let reason: string | undefined
      let code: string | undefined

      if (nowTimestamp < registrationClosesAt) {
        reason = 'Submission opens only after registration closes.'
        code = 'registration_window_still_open'
      } else if (nowTimestamp < submissionOpensAt || nowTimestamp >= submissionClosesAt) {
        reason = 'Submission can only be opened while the configured submission window is active.'
        code = 'submission_window_closed'
      }

      return {
        key: 'open_submission',
        label: 'Open Submission',
        description: 'Move the hackathon from registration into the team-and-submission phase.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/open-submission`,
        isEnabled,
        reason,
        code
      }
    }
    case 'submission_open': {
      const submissionClosesAt = Date.parse(hackathon.submissionClosesAt)
      const nowTimestamp = now.getTime()
      let reason: string | undefined
      let code: string | undefined

      if (nowTimestamp < submissionClosesAt) {
        reason = 'Judging preparation can only start after the submission window closes.'
        code = 'submission_window_still_open'
      } else if (metrics.submittedSubmissionCount === 0) {
        reason = 'At least one submitted submission is required before judging preparation can start.'
        code = 'submitted_submissions_required'
      } else if (metrics.judgePoolCount === 0) {
        reason = 'At least one judge must be in the automatic judge pool before judging preparation can start.'
        code = 'judge_pool_required'
      }

      return {
        key: 'start_judging_preparation',
        label: 'Start Judging Preparation',
        description: 'Lock submitted projects, freeze prize eligibility, and generate initial judge assignments.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/start-judging-preparation`,
        isEnabled: !reason,
        reason,
        code
      }
    }
    case 'judging_preparation': {
      let reason: string | undefined
      let code: string | undefined

      if (metrics.lockedSubmissionCount === 0) {
        reason = 'Judge review requires at least one locked submission.'
        code = 'locked_submissions_required'
      } else if (metrics.activeAssignmentCount !== metrics.lockedSubmissionCount) {
        reason = 'Every locked submission needs one active assignment before judge review can start.'
        code = 'active_assignments_required'
      }

      return {
        key: 'start_judge_review',
        label: 'Start Judge Review',
        description: 'Open the blind judging workspace once every locked submission has an active assignment.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/start-judge-review`,
        isEnabled: !reason,
        reason,
        code
      }
    }
    case 'judge_review': {
      let reason: string | undefined
      let code: string | undefined

      if (metrics.lockedLeaderboardEntryCount === 0) {
        reason = 'Shortlist requires at least one locked submission.'
        code = 'locked_submissions_required'
      } else if (metrics.completedReviewCount !== metrics.lockedLeaderboardEntryCount) {
        reason = 'Every locked submission must have a completed review outcome before shortlist can start.'
        code = 'completed_reviews_required'
      }

      return {
        key: 'start_shortlist',
        label: 'Start Shortlist',
        description: 'Move the hackathon into final ranking review once all locked submissions are fully reviewed.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/start-shortlist`,
        isEnabled: !reason,
        reason,
        code
      }
    }
    case 'shortlist': {
      const needsWinnerTerms = metrics.prizeCount > 0 && !metrics.hasCurrentWinnerTerms

      return {
        key: 'announce_winners',
        label: 'Announce Winners',
        description: 'Publish the current shortlist outcome and initialize prize redemption when prizes are configured.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/announce-winners`,
        isEnabled: !needsWinnerTerms,
        reason: needsWinnerTerms
          ? 'Current winner terms are required before announcing winners when prizes are configured.'
          : undefined,
        code: needsWinnerTerms ? 'winner_terms_required' : undefined
      }
    }
    case 'winners_announced':
      return {
        key: 'complete',
        label: 'Complete Hackathon',
        description: 'Close the program once winners are announced and the outcome is final.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/complete`,
        isEnabled: true
      }
    case 'completed':
      return null
  }
}
