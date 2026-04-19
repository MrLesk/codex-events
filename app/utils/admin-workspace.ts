export const hackathonStateOrder = [
  'draft',
  'registration_open',
  'submission_open',
  'judging_preparation',
  'blind_review',
  'shortlist',
  'pitch',
  'pitch_review',
  'final_deliberation',
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

export interface HackathonTrack {
  id: string
  hackathonId: string
  name: string
  description: string
  displayOrder: number
  createdAt: string
}

export interface AdminApplicationRecord {
  id: string
  hackathonId: string
  userId: string
  status: 'submitted' | 'approved' | 'rejected' | 'withdrawn'
  preApprovalStatus?: 'approved' | 'rejected' | null
  lumaSyncStatus?: 'not_synced' | 'approve_synced' | 'reject_synced' | 'approve_failed' | 'reject_failed' | null
  checkedInAt?: string | null
  submittedAt: string
  withdrawnAt: string | null
  reviewedAt: string | null
  reviewedByUserId: string | null
  applicationTermsDocumentId: string
  applicationTermsAcceptedAt: string
  registrationDetailsJson: string
  createdAt: string
  updatedAt: string
  user?: OperationalUserSummary
  applicationTermsDocument?: TermsDocument
  adminWithdrawal?: {
    isAllowed: boolean
    reason: string | null
    warning: string | null
    activeTeamId: string | null
    teamAction: 'none' | 'remove_member' | 'dissolve_team'
  }
}

export interface HackathonRecord {
  id: string
  name: string
  slug: string
  description: string
  agendaItems: HackathonAgendaItem[]
  tracks?: HackathonTrack[]
  backgroundImageUrl: string | null
  bannerImageUrl: string | null
  discordServerUrl?: string | null
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
  blindReviewCount: number
  pitchReviewEnabled: boolean
  blindScoreWeightPercent: number
  pitchScoreWeightPercent: number
  shortlistFinalistCount: number
  pitchPresentationSubmissionIds: string[]
  activePitchPresentationSubmissionId: string | null
  pitchPresentationsCompletedAt: string | null
  inPersonEvent: boolean
  requireXProfile: boolean
  requireLinkedinProfile: boolean
  requireGithubProfile: boolean
  requireChatgptEmail: boolean
  requireOpenaiOrgId: boolean
  requireLumaEmail: boolean
  requireWhyThisHackathon: boolean
  requireProofOfExecution: boolean
  requireSubmissionSummary: boolean
  requireSubmissionRepositoryUrl: boolean
  requireSubmissionDemoUrl: boolean
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
  discordServerUrl: string
  lumaEventUrl: string
  lumaEventApiId: string
  description: string
  agendaItems: HackathonFormAgendaItem[]
  tracks: HackathonFormTrack[]
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
  blindReviewCount: number
  pitchReviewEnabled: boolean
  blindScoreWeightPercent: number
  pitchScoreWeightPercent: number
  shortlistFinalistCount: number
  inPersonEvent: boolean
  requireXProfile: boolean
  requireLinkedinProfile: boolean
  requireGithubProfile: boolean
  requireChatgptEmail: boolean
  requireOpenaiOrgId: boolean
  requireLumaEmail: boolean
  requireWhyThisHackathon: boolean
  requireProofOfExecution: boolean
  requireSubmissionSummary: boolean
  requireSubmissionRepositoryUrl: boolean
  requireSubmissionDemoUrl: boolean
}

export interface HackathonFormAgendaItem {
  id: string
  startsAt: string
  endsAt: string
  title: string
  details: string
  displayOrder: number
}

export interface HackathonFormTrack {
  id: string
  name: string
  description: string
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

export interface WinnerEntry {
  teamId: string
  teamName: string
  submissionId: string
  projectName: string | null
  summary: string | null
  repositoryUrl: string | null
  demoUrl: string | null
  finalRank: number
  prizes: PrizeDefinition[]
  teamMembers: Array<{
    id: string
    fullName: string
    bio: string | null
    xProfileUrl: string | null
    linkedinProfileUrl: string | null
    githubProfileUrl: string | null
    chatgptEmail?: string | null
    openaiOrgId?: string | null
    profileIconUrl: string | null
  }>
}

export interface PublishedProjectEntry {
  teamId: string
  teamName: string
  submissionId: string
  projectName: string | null
  summary: string | null
  repositoryUrl: string | null
  demoUrl: string | null
  teamMembers: WinnerEntry['teamMembers']
}

export interface FinalDeliberationEntry {
  teamId: string
  teamName: string
  submissionId: string
  projectName: string | null
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

export interface LifecycleMetrics {
  submittedSubmissionCount: number
  judgePoolCount: number
  lockedSubmissionCount: number
  activeAssignmentCount: number
  lockedLeaderboardEntryCount: number
  completedReviewCount: number
  completedPitchAssignmentCount?: number
  prizeCount: number
  hasCurrentWinnerTerms: boolean
}

export interface LifecycleControl {
  key: 'open_registration'
    | 'open_submission'
    | 'start_judging_preparation'
    | 'start_blind_review'
    | 'start_pitch'
    | 'start_pitch_review'
    | 'start_shortlist'
    | 'start_final_deliberation'
    | 'announce_winners'
    | 'complete'
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
    case 'blind_review':
    case 'pitch':
    case 'pitch_review':
      return 'warning'
    case 'shortlist':
    case 'final_deliberation':
      return 'secondary'
    case 'winners_announced':
      return 'success'
    case 'completed':
      return 'neutral'
  }
}

export type HackathonOperationsPhase = 'registration_open' | 'submission_open' | 'judging' | 'completed'

export function getHackathonOperationsPhase(state: HackathonState): HackathonOperationsPhase | null {
  switch (state) {
    case 'registration_open':
      return 'registration_open'
    case 'submission_open':
      return 'submission_open'
    case 'judging_preparation':
    case 'blind_review':
    case 'shortlist':
    case 'pitch':
    case 'pitch_review':
    case 'final_deliberation':
    case 'winners_announced':
      return 'judging'
    case 'completed':
      return 'completed'
    case 'draft':
      return null
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

export function isApplicationCheckedIn(
  application: Pick<AdminApplicationRecord, 'checkedInAt'>
) {
  return Boolean(application.checkedInAt)
}

export function formatApplicationAttendanceStatus(
  application: Pick<AdminApplicationRecord, 'checkedInAt'>
) {
  return isApplicationCheckedIn(application) ? 'Checked in' : 'Not checked in'
}

export function getApplicationAttendanceStatusColor(
  application: Pick<AdminApplicationRecord, 'checkedInAt'>
) {
  return isApplicationCheckedIn(application) ? 'success' : 'neutral'
}

export function shouldShowApprovedParticipantAttendanceSummary(
  hackathon: Pick<HackathonRecord, 'requireLumaEmail' | 'lumaEventApiId'> | null | undefined
) {
  return Boolean(hackathon?.requireLumaEmail && hackathon.lumaEventApiId?.trim())
}

export function shouldShowApplicationLumaSyncStatus(
  application: Pick<AdminApplicationRecord, 'status' | 'lumaSyncStatus'>
) {
  return application.status !== 'submitted' && Boolean(application.lumaSyncStatus)
}

export function listFailedApplicationLumaSyncApplications(
  applications: AdminApplicationRecord[],
  view: 'applications' | 'approved' | 'rejected' | 'withdrawn'
) {
  if (view === 'approved') {
    return applications.filter(application =>
      application.status === 'approved' && application.lumaSyncStatus === 'approve_failed'
    )
  }

  if (view === 'rejected') {
    return applications.filter(application =>
      application.status === 'rejected' && application.lumaSyncStatus === 'reject_failed'
    )
  }

  if (view === 'withdrawn') {
    return applications.filter(application =>
      application.status === 'withdrawn' && application.lumaSyncStatus === 'reject_failed'
    )
  }

  return []
}

export function formatFailedApplicationLumaSyncAlertToggleLabel(count: number, expanded: boolean) {
  if (count <= 0) {
    return ''
  }

  if (expanded) {
    return 'Collapse'
  }

  return 'Expand'
}

export function formatAdminSubmissionRowToggleLabel(expanded: boolean) {
  return expanded ? 'Collapse' : 'Expand'
}

export function formatAdminOperationalTeamProjectLabel(
  submissionStatus: AdminSubmissionStatus,
  projectName: string | null | undefined,
  hasEnteredSubmissionPhase: boolean
) {
  if (submissionStatus === 'none') {
    return hasEnteredSubmissionPhase
      ? 'No submission record yet'
      : 'Submission window not open yet'
  }

  if (submissionStatus === 'draft') {
    return projectName ?? 'Untitled draft'
  }

  return projectName ?? 'Untitled project'
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

export function buildPitchReviewCoverageEntries(options: {
  finalistSubmissionIds: string[]
  leaderboardEntries: Array<Pick<LeaderboardEntry, 'submissionId' | 'projectName' | 'teamName' | 'submissionStatus'>>
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
      return 'success'
    case 'reject_synced':
      return 'error'
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

export function getApprovedParticipantAttendanceSummary(
  applications: AdminApplicationRecord[]
) {
  const approvedApplications = applications.filter(application => application.status === 'approved')
  const checkedInCount = approvedApplications.filter(application => isApplicationCheckedIn(application)).length

  return {
    approvedCount: approvedApplications.length,
    checkedInCount,
    value: `${checkedInCount} / ${approvedApplications.length}`
  }
}

export function getParticipantApplicationStatusSummary(
  applications: Array<Pick<AdminApplicationRecord, 'status'>>
) {
  const submittedCount = applications.filter(application => application.status === 'submitted').length
  const approvedCount = applications.filter(application => application.status === 'approved').length
  const rejectedCount = applications.filter(application => application.status === 'rejected').length
  const withdrawnCount = applications.filter(application => application.status === 'withdrawn').length

  return {
    totalCount: applications.length,
    submittedCount,
    approvedCount,
    rejectedCount,
    withdrawnCount
  }
}

export function formatApprovedParticipantRegistrationSummary(
  applications: Array<Pick<AdminApplicationRecord, 'status'>>
) {
  const summary = getParticipantApplicationStatusSummary(applications)
  return `${summary.approvedCount} / ${summary.totalCount}`
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
  const projectName = assignment.blindSubmission?.projectName?.trim()
  return projectName && projectName.length > 0 ? projectName : assignment.submissionId
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

function formatOperationalUserLabel(user: OperationalUserSummary | undefined, userId: string) {
  if (!user) {
    return userId
  }

  if (user.displayName && user.email) {
    return `${user.displayName} (${user.email})`
  }

  return user.displayName || user.email || userId
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

export interface CriteriaConfigurationValidationIssue {
  criterionId: string
  field: 'name' | 'description' | 'weight'
  message: string
  summaryMessage: string
}

function formatCriteriaConfigurationLabel(name: string, index: number) {
  const trimmedName = name.trim()

  if (trimmedName.length > 0) {
    return `"${trimmedName}"`
  }

  return `Criterion ${index + 1}`
}

export function getCriteriaConfigurationValidationIssues(
  criteria: Array<Pick<EvaluationCriterion, 'id' | 'name' | 'description'> & { weight: unknown }>
) {
  const issues: CriteriaConfigurationValidationIssue[] = []

  criteria.forEach((criterion, index) => {
    const criterionLabel = formatCriteriaConfigurationLabel(criterion.name, index)

    if (criterion.name.trim().length === 0) {
      issues.push({
        criterionId: criterion.id,
        field: 'name',
        message: 'Enter a criterion name.',
        summaryMessage: `${criterionLabel} is missing a name. Enter a short criterion name before saving.`
      })
    }

    if (criterion.description.trim().length === 0) {
      issues.push({
        criterionId: criterion.id,
        field: 'description',
        message: 'Enter a description so judges know what to evaluate.',
        summaryMessage: `${criterionLabel} needs a description. Add a short description so judges know what to evaluate.`
      })
    }

    if (typeof criterion.weight !== 'number' || !Number.isInteger(criterion.weight) || criterion.weight < 0) {
      issues.push({
        criterionId: criterion.id,
        field: 'weight',
        message: 'Enter a whole-number weight of 0 or more.',
        summaryMessage: `${criterionLabel} has an invalid weight. Use a whole number of 0 or more.`
      })
    }
  })

  return issues
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
    discordServerUrl: '',
    lumaEventUrl: '',
    lumaEventApiId: '',
    description: '',
    agendaItems: [],
    tracks: [],
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
    blindReviewCount: 1,
    pitchReviewEnabled: false,
    blindScoreWeightPercent: 70,
    pitchScoreWeightPercent: 30,
    shortlistFinalistCount: 10,
    inPersonEvent: false,
    requireXProfile: false,
    requireLinkedinProfile: false,
    requireGithubProfile: false,
    requireChatgptEmail: true,
    requireOpenaiOrgId: true,
    requireLumaEmail: true,
    requireWhyThisHackathon: false,
    requireProofOfExecution: false,
    requireSubmissionSummary: false,
    requireSubmissionRepositoryUrl: false,
    requireSubmissionDemoUrl: false
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
    discordServerUrl: hackathon.discordServerUrl ?? '',
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
    tracks: [...(hackathon.tracks ?? [])]
      .sort((left, right) => left.displayOrder - right.displayOrder || left.createdAt.localeCompare(right.createdAt))
      .map(track => ({
        id: track.id,
        name: track.name,
        description: track.description,
        displayOrder: track.displayOrder
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
    blindReviewCount: hackathon.blindReviewCount,
    pitchReviewEnabled: hackathon.pitchReviewEnabled,
    blindScoreWeightPercent: hackathon.blindScoreWeightPercent,
    pitchScoreWeightPercent: hackathon.pitchScoreWeightPercent,
    shortlistFinalistCount: hackathon.shortlistFinalistCount,
    inPersonEvent: hackathon.inPersonEvent,
    requireXProfile: hackathon.requireXProfile,
    requireLinkedinProfile: hackathon.requireLinkedinProfile,
    requireGithubProfile: hackathon.requireGithubProfile,
    requireChatgptEmail: hackathon.requireChatgptEmail,
    requireOpenaiOrgId: hackathon.requireOpenaiOrgId,
    requireLumaEmail: hackathon.requireLumaEmail,
    requireWhyThisHackathon: hackathon.requireWhyThisHackathon,
    requireProofOfExecution: hackathon.requireProofOfExecution,
    requireSubmissionSummary: hackathon.requireSubmissionSummary,
    requireSubmissionRepositoryUrl: hackathon.requireSubmissionRepositoryUrl,
    requireSubmissionDemoUrl: hackathon.requireSubmissionDemoUrl
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

export function toHackathonTracksPayload(items: HackathonFormTrack[]) {
  return items
    .map(track => ({
      id: track.id,
      name: track.name.trim(),
      description: track.description.trim(),
      displayOrder: track.displayOrder
    }))
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id.localeCompare(right.id))
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
        reason = 'Submissions can only be stopped after the submission window closes.'
        code = 'submission_window_still_open'
      } else if (metrics.submittedSubmissionCount === 0) {
        reason = 'At least one submitted project is required before submissions can be stopped.'
        code = 'submitted_submissions_required'
      }

      return {
        key: 'start_judging_preparation',
        label: 'Stop Submissions',
        description: 'Close team formation and move into judging preparation while existing submissions stay editable until judging starts.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/start-judging-preparation`,
        isEnabled: !reason,
        reason,
        code
      }
    }
    case 'judging_preparation': {
      if (hackathon.blindReviewCount === 0) {
        let reason: string | undefined
        let code: string | undefined

        if (metrics.submittedSubmissionCount === 0) {
          reason = 'Pitch requires at least one submitted project.'
          code = 'submitted_submissions_required'
        }

        return {
          key: 'start_pitch',
          label: 'Start Pitch',
          description: 'Lock submitted projects, freeze prize eligibility, and open the live pitch stage.',
          endpoint: `/api/hackathons/${hackathon.id}/actions/start-pitch`,
          isEnabled: !reason,
          reason,
          code
        }
      }

      let reason: string | undefined
      let code: string | undefined

      if (metrics.submittedSubmissionCount === 0) {
        reason = 'Blind review requires at least one submitted project.'
        code = 'submitted_submissions_required'
      } else if (metrics.judgePoolCount === 0) {
        reason = 'At least one judge must be in the automatic judge pool before blind review can start.'
        code = 'judge_pool_required'
      } else if (metrics.judgePoolCount < hackathon.blindReviewCount) {
        reason = 'The automatic judge pool must include enough distinct judges for the configured blind review count.'
        code = 'distinct_blind_review_judges_required'
      }

      return {
        key: 'start_blind_review',
        label: 'Start Blind Review',
        description: 'Lock submitted projects, freeze prize eligibility, and open blind judging.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/start-blind-review`,
        isEnabled: !reason,
        reason,
        code
      }
    }
    case 'blind_review': {
      let reason: string | undefined
      let code: string | undefined

      if (metrics.lockedLeaderboardEntryCount === 0) {
        reason = hackathon.pitchReviewEnabled
          ? 'Shortlist requires at least one locked submission.'
          : 'Final deliberation requires at least one locked submission.'
        code = 'locked_submissions_required'
      } else if (metrics.completedReviewCount !== metrics.lockedLeaderboardEntryCount) {
        reason = hackathon.pitchReviewEnabled
          ? 'Every locked submission must have a completed blind-review outcome before shortlist can start.'
          : 'Every locked submission must have a completed blind-review outcome before final deliberation can start.'
        code = 'completed_reviews_required'
      }

      if (hackathon.pitchReviewEnabled) {
        return {
          key: 'start_shortlist',
          label: 'Start Shortlist',
          description: 'Move the hackathon into blind shortlist ordering before the live pitch stage begins.',
          endpoint: `/api/hackathons/${hackathon.id}/actions/start-shortlist`,
          isEnabled: !reason,
          reason,
          code
        }
      }

      return {
        key: 'start_final_deliberation',
        label: 'Start Final Deliberation',
        description: 'Move the hackathon into final score review once blind judging is complete.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/start-final-deliberation`,
        isEnabled: !reason,
        reason,
        code
      }
    }
    case 'shortlist':
      return null
    case 'pitch': {
      let reason: string | undefined
      let code: string | undefined

      if (hackathon.pitchPresentationSubmissionIds.length === 0) {
        reason = 'Pitch review requires at least one finalist submission in the pitch lineup.'
        code = 'pitch_finalists_required'
      } else if (hackathon.pitchPresentationsCompletedAt === null) {
        reason = hackathon.activePitchPresentationSubmissionId
          ? 'Finish the live pitch presentation lineup from Operations before pitch review can start.'
          : 'Enable the first pitch presentation from Operations before pitch review can start.'
        code = 'pitch_presentations_incomplete'
      } else if (metrics.judgePoolCount === 0) {
        reason = 'Pitch review requires at least one judge in the automatic judge pool.'
        code = 'judge_pool_required'
      }

      return {
        key: 'start_pitch_review',
        label: 'Start Pitch Review',
        description: 'Create post-pitch judge assignments and open the finalist review workspace.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/start-pitch-review`,
        isEnabled: !reason,
        reason,
        code
      }
    }
    case 'pitch_review':
      if ((metrics.completedPitchAssignmentCount ?? 0) === 0) {
        return {
          key: 'start_final_deliberation',
          label: 'Move To Final Deliberation',
          description: 'Close pitch review and open the final weighted ranking workspace using submitted pitch votes only.',
          endpoint: `/api/hackathons/${hackathon.id}/actions/start-final-deliberation`,
          isEnabled: false,
          reason: 'At least one submitted pitch review is required before final deliberation can start.',
          code: 'completed_pitch_reviews_required'
        }
      }

      return {
        key: 'start_final_deliberation',
        label: 'Move To Final Deliberation',
        description: 'Close pitch review and open the final weighted ranking workspace using submitted pitch votes only.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/start-final-deliberation`,
        isEnabled: true
      }
    case 'final_deliberation': {
      const needsWinnerTerms = metrics.prizeCount > 0 && !metrics.hasCurrentWinnerTerms

      return {
        key: 'announce_winners',
        label: 'Announce Winners',
        description: 'Publish the final ranking and initialize prize redemption when prizes are configured.',
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
