<script setup lang="ts">
import type { ApiDataResponse, ApiListResponse } from '~/lib/api'
import type {
  AdminApplicationRecord,
  AdminOperationalTeam,
  AdminTeamDetailRecord,
  AdminSubmissionDashboardFilter,
  FinalDeliberationView,
  HackathonRecord,
  HackathonRoleAssignment,
  ShortlistEntry,
  SubmissionRecord,
  WinnerEntry
} from '~/utils/admin-workspace'
import type {
  PrizeRedemptionAdminView,
  PrizeRedemptionBlindRankingEntry,
  PrizeRedemptionFinalRankingEntry,
  PrizeRedemptionRecord
} from '~/utils/prize-redemptions'

import { listAllPaginatedItems, normalizeApiError } from '~/lib/api'
import {
  LazyAccountHackathonsAccountHackathonParticipantsPanel as LazyAccountHackathonParticipantsPanel
} from '#components'
import {
  buildAdminOperationalTeams,
  buildPitchReviewCoverageEntries,
  countActiveAdminOperationalTeams,
  filterActiveAdminOperationalTeams,
  filterAdminOperationalTeams,
  getCurrentLifecycleControl,
  getAdminSubmissionDashboardMetrics,
  getHackathonOperationsPhase,
  formatHackathonState,
  getHackathonStateColor,
  shouldShowApprovedParticipantAttendanceSummary,
  sortAdminOperationalTeamsForSubmissionDashboard
} from '~/utils/admin-workspace'
import { formatTimestamp } from '~/utils/date-formatting'

type AccountHackathonAdminOperationsSection = 'participants' | 'submissions' | 'operations'
type LifecycleMetricCard = {
  key: string
  label: string
  value?: string
  description?: string
  breakdown?: Array<{
    label: string
    value: string
  }>
}

type LifecycleSummaryItem = {
  label: string
  value: string
  description: string
}

const props = defineProps<{
  slug: string
  section: AccountHackathonAdminOperationsSection
}>()

const toast = useToast()
const slug = computed(() => props.slug.trim())
const section = computed(() => props.section)

if (!slug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const {
  data: hackathonResponse,
  error: hackathonError
} = await useFetch<ApiDataResponse<HackathonRecord>>(() => `/api/hackathons/slug/${slug.value}`, {
  key: () => `admin-hackathon-operations:${slug.value}`
})

if (hackathonError.value) {
  throw createError({
    statusCode: hackathonError.value.statusCode ?? hackathonError.value.status ?? 500,
    statusMessage: hackathonError.value.statusMessage ?? 'Unable to load the requested hackathon.'
  })
}

if (!hackathonResponse.value?.data) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const hackathonId = computed(() => hackathonResponse.value!.data.id)
const showParticipantsSection = computed(() => section.value === 'participants')
const showSubmissionsSection = computed(() => section.value === 'submissions')
const showLifecycleSection = computed(() => section.value === 'operations')
const workspace = useAdminHackathonWorkspace(hackathonId, {
  loadCriteria: false,
  loadPrizes: showLifecycleSection,
  loadApplicationTermsVersions: false,
  loadWinnerTermsVersions: false,
  loadRoleAssignments: showLifecycleSection,
  loadApplications: false,
  loadTeams: showLifecycleSection,
  loadNoSubmissionTeams: false,
  loadAssignments: showLifecycleSection,
  loadLeaderboard: showLifecycleSection
})
const apiFetch = import.meta.server ? useRequestFetch() : $fetch
type LoadStatus = 'idle' | 'pending' | 'success' | 'error'
type ApplyStagedApplicationDecisionsResponse = ApiDataResponse<{
  appliedCount: number
  approvedCount: number
  rejectedCount: number
}>
type StageApplicationResponse = ApiDataResponse<AdminApplicationRecord>
type SubmissionMonitorData = {
  teamDetails: AdminTeamDetailRecord[]
  teamSubmissions: Array<SubmissionRecord | null>
}
type SubmissionSummary = {
  totalTeams: number
  noSubmissionTeamCount: number
  submittedOrLaterTeamCount: number
  statusCounts: {
    none: number
    draft: number
    submitted: number
    locked: number
    withdrawn: number
    disqualified: number
  }
}
type JudgingSummary = {
  totalAssignmentCount: number
  activeAssignmentCount: number
  completedPitchAssignmentCount: number
}
type JudgeChoice = {
  value: string
  label: string
}
type PitchLineupEntry = {
  submissionId: string
  order: number
  projectName: string | null
  teamName: string | null
  rank: number | null
  status: 'upcoming' | 'live' | 'presented'
}

const mutationError = ref('')
const pendingActionKey = ref<string | null>(null)

const currentHackathon = computed(() => workspace.currentHackathon.value)
const canManage = computed(() => workspace.canManageCurrentHackathon.value)
const roleAssignments = computed(() => workspace.roleAssignments.data.value?.data ?? [])
const assignments = computed(() => workspace.assignments.data.value?.data ?? [])
const assignmentsTotal = computed(() => workspace.assignments.data.value?.meta?.total ?? assignments.value.length)
const judgingSummary = useFetch<ApiDataResponse<JudgingSummary>>(
  () => `/api/hackathons/${hackathonId.value}/judging/summary`,
  {
    key: () => `admin-hackathon-judging-summary:${hackathonId.value}`,
    watch: [hackathonId],
    immediate: showLifecycleSection.value
  }
)
const judgingSummaryData = computed(() => judgingSummary.data.value?.data ?? null)
const leaderboard = computed(() => workspace.leaderboard.data.value?.data ?? [])
const allTeams = computed(() => workspace.teams.data.value ?? [])
const prizes = computed(() => workspace.prizes.data.value?.data ?? [])
const applications = ref<AdminApplicationRecord[]>([])
const applicationsStatus = ref<LoadStatus>('idle')
const applicationsErrorMessage = ref('')
const shortlistEntries = ref<ShortlistEntry[]>([])
const shortlistHasSavedSelection = ref(false)
const shortlistStatus = ref<LoadStatus>('idle')
const shortlistErrorMessage = ref('')
const finalDeliberation = ref<FinalDeliberationView | null>(null)
const finalDeliberationStatus = ref<LoadStatus>('idle')
const finalDeliberationErrorMessage = ref('')
const finalDeliberationDraftOrderedSubmissionIds = ref<string[]>([])
const finalDeliberationHasDraftChanges = ref(false)
const winners = ref<WinnerEntry[]>([])
const winnersStatus = ref<LoadStatus>('idle')
const winnersErrorMessage = ref('')
const redemptions = ref<PrizeRedemptionRecord[]>([])
const prizeRedemptionBlindRankingEntries = ref<PrizeRedemptionBlindRankingEntry[]>([])
const prizeRedemptionFinalRankingEntries = ref<PrizeRedemptionFinalRankingEntry[]>([])
const redemptionsStatus = ref<LoadStatus>('idle')
const redemptionsErrorMessage = ref('')
const submissionSearchInput = ref('')
const submissionStatusFilter = ref<AdminSubmissionDashboardFilter>('all')
const submissionSummary = useFetch<ApiDataResponse<SubmissionSummary>>(
  () => `/api/hackathons/${hackathonId.value}/submissions/summary`,
  {
    key: () => `admin-hackathon-submission-summary:${hackathonId.value}`,
    watch: [hackathonId],
    immediate: showLifecycleSection.value
  }
)
const submissionSummaryData = computed(() => submissionSummary.data.value?.data ?? null)
const submissionSummaryStatus = computed<LoadStatus>(() => normalizeAsyncStatus(submissionSummary.status.value))
const teamDataStatus = computed(() => normalizeAsyncStatus(workspace.teams.status.value))
const submissionMonitorReady = computed(() => showSubmissionsSection.value && canManage.value)
const submissionMonitorCacheState = computed(() =>
  submissionMonitorReady.value ? 'ready' : 'blocked'
)
const {
  data: submissionMonitorData,
  status: submissionMonitorStatus,
  error: submissionMonitorError,
  refresh: refreshSubmissionMonitor
} = useAsyncData<SubmissionMonitorData>(
  () => [
    'admin-hackathon-submission-monitor',
    hackathonId.value,
    submissionMonitorCacheState.value
  ].join(':'),
  async () => {
    if (!submissionMonitorReady.value) {
      return {
        teamDetails: [],
        teamSubmissions: []
      }
    }

    const response = await apiFetch<ApiDataResponse<SubmissionMonitorData>>(
      `/api/hackathons/${hackathonId.value}/teams/submission-monitor`
    )

    return response.data
  },
  {
    watch: [hackathonId, submissionMonitorCacheState],
    default: () => ({
      teamDetails: [],
      teamSubmissions: []
    }),
    immediate: submissionMonitorReady.value
  }
)

function toSectionErrorMessage(error: unknown, fallback: string) {
  const message = normalizeApiError(error).message
  return message && message.length > 0 ? message : fallback
}

async function loadApplications() {
  if (!canLoadApplications.value) {
    applications.value = []
    applicationsStatus.value = 'idle'
    applicationsErrorMessage.value = ''
    return
  }

  applicationsStatus.value = 'pending'
  applicationsErrorMessage.value = ''

  try {
    applications.value = await listAllPaginatedItems(
      async (page, pageSize) => await $fetch<ApiListResponse<AdminApplicationRecord>>(
        `/api/hackathons/${hackathonId.value}/applications`,
        {
          query: {
            page,
            page_size: pageSize
          }
        }
      ),
      100
    )
    applicationsStatus.value = 'success'
  } catch (error) {
    applications.value = []
    applicationsStatus.value = 'error'
    applicationsErrorMessage.value = toSectionErrorMessage(
      error,
      'Application records could not be loaded right now.'
    )
  }
}
const showCheckedInParticipantSummary = computed(() =>
  shouldShowApprovedParticipantAttendanceSummary(currentHackathon.value)
)

const lifecycleMetrics = computed(() => {
  const lockedEntries = leaderboard.value.filter(entry => entry.submissionStatus === 'locked')

  return {
    submittedSubmissionCount: submissionSummaryData.value?.submittedOrLaterTeamCount ?? 0,
    judgePoolCount: roleAssignments.value.filter(assignment => assignment.isInJudgePool).length,
    lockedSubmissionCount: lockedEntries.length,
    activeAssignmentCount: judgingSummaryData.value?.activeAssignmentCount ?? assignments.value.length,
    lockedLeaderboardEntryCount: lockedEntries.length,
    completedReviewCount: lockedEntries.filter(entry => entry.reviewStatus === 'judge_completed').length,
    completedPitchAssignmentCount: judgingSummaryData.value?.completedPitchAssignmentCount ?? 0,
    prizeCount: prizes.value.length,
    hasCurrentWinnerTerms: Boolean(currentHackathon.value?.currentTerms?.winnerTerms)
  }
})

const lifecycleControl = computed(() => {
  if (!currentHackathon.value) {
    return null
  }

  return getCurrentLifecycleControl(currentHackathon.value, lifecycleMetrics.value)
})

function normalizeAsyncStatus(status: string | undefined): LoadStatus {
  switch (status) {
    case 'idle':
    case 'pending':
    case 'error':
      return status
    default:
      return 'success'
  }
}

function combineLoadStatuses(statuses: LoadStatus[]): LoadStatus {
  if (statuses.some(status => status === 'error')) {
    return 'error'
  }

  if (statuses.some(status => status === 'idle' || status === 'pending')) {
    return 'pending'
  }

  return 'success'
}

function formatLoadMetricValue(status: LoadStatus, value: string) {
  if (status === 'idle' || status === 'pending') {
    return 'Loading...'
  }

  if (status === 'error') {
    return 'Unavailable'
  }

  return value
}

function formatLifecycleTimeframe(start: string, end: string) {
  return `${formatTimestamp(start, 'Not scheduled')} - ${formatTimestamp(end, 'Not scheduled')}`
}

const submissionMonitorLoadStatus = computed<LoadStatus>(() => normalizeAsyncStatus(submissionMonitorStatus.value))
const leaderboardDataStatus = computed(() => normalizeAsyncStatus(workspace.leaderboard.status.value))
const roleAssignmentsDataStatus = computed(() => normalizeAsyncStatus(workspace.roleAssignments.status.value))

watch(
  [
    submissionMonitorReady,
    submissionMonitorLoadStatus
  ],
  async ([ready, status]) => {
    if (import.meta.server) {
      return
    }

    if (!ready || status !== 'idle') {
      return
    }

    await refreshSubmissionMonitor()
  },
  {
    immediate: true
  }
)

watch(
  showLifecycleSection,
  async (isVisible) => {
    if (import.meta.server || !isVisible) {
      return
    }

    await Promise.all([
      submissionSummary.status.value === 'idle' ? submissionSummary.refresh() : Promise.resolve(),
      judgingSummary.status.value === 'idle' ? judgingSummary.refresh() : Promise.resolve()
    ])
  },
  {
    immediate: true
  }
)

const submissionOperationalTeams = computed<AdminOperationalTeam[]>(() =>
  buildAdminOperationalTeams(submissionMonitorData.value?.teamDetails ?? [], {
    teamDetails: submissionMonitorData.value?.teamDetails ?? [],
    submissions: submissionMonitorData.value?.teamSubmissions ?? []
  })
)
const activeSubmissionOperationalTeams = computed<AdminOperationalTeam[]>(() =>
  filterActiveAdminOperationalTeams(submissionOperationalTeams.value)
)
const sortedSubmissionTeams = computed(() =>
  sortAdminOperationalTeamsForSubmissionDashboard(activeSubmissionOperationalTeams.value)
)
const filteredSubmissionTeams = computed(() =>
  filterAdminOperationalTeams(sortedSubmissionTeams.value, {
    filter: submissionStatusFilter.value,
    search: submissionSearchInput.value
  })
)
const submissionDashboardMetrics = computed(() =>
  getAdminSubmissionDashboardMetrics(activeSubmissionOperationalTeams.value)
)
const submissionPanelStatus = computed(() =>
  submissionMonitorLoadStatus.value
)
const submissionMonitorErrorMessage = computed(() => {
  if (!submissionMonitorError.value) {
    return ''
  }

  return toSectionErrorMessage(
    submissionMonitorError.value,
    'Detailed submission records could not be loaded right now.'
  )
})
const submissionPanelErrorMessage = computed(() =>
  submissionMonitorErrorMessage.value
)
const operationsPhase = computed(() =>
  currentHackathon.value ? getHackathonOperationsPhase(currentHackathon.value.state) : null
)
const assignmentsDataStatus = computed(() => normalizeAsyncStatus(workspace.assignments.status.value))
const assignmentsErrorMessage = computed(() => {
  if (!workspace.assignments.error.value) {
    return ''
  }

  return toSectionErrorMessage(
    workspace.assignments.error.value,
    'Assignment oversight data could not be loaded right now.'
  )
})
const canLoadApplications = computed(() =>
  Boolean(canManage.value && (showParticipantsSection.value || showLifecycleSection.value))
)
const canLoadShortlist = computed(() =>
  Boolean(
    showLifecycleSection.value
    && currentHackathon.value
    && currentHackathon.value.state === 'shortlist'
  )
)
const canLoadFinalDeliberation = computed(() =>
  Boolean(
    showLifecycleSection.value
    && currentHackathon.value
    && currentHackathon.value.state === 'final_deliberation'
  )
)
const canLoadWinners = computed(() =>
  Boolean(
    showLifecycleSection.value
    && currentHackathon.value
    && currentHackathon.value.state === 'completed'
  )
)
const canLoadPrizeRedemptions = computed(() =>
  Boolean(
    showLifecycleSection.value
    && currentHackathon.value
    && ['winners_announced', 'completed'].includes(currentHackathon.value.state)
  )
)
const showAssignmentsPanel = computed(() =>
  Boolean(
    showLifecycleSection.value
    && currentHackathon.value
    && currentHackathon.value.state === 'blind_review'
  )
)
const showPitchStagePanel = computed(() =>
  Boolean(showLifecycleSection.value && currentHackathon.value?.state === 'pitch')
)
const showPitchReviewPanel = computed(() =>
  Boolean(showLifecycleSection.value && currentHackathon.value?.state === 'pitch_review')
)
const showFinalDeliberationPanel = computed(() =>
  Boolean(showLifecycleSection.value && currentHackathon.value?.state === 'final_deliberation')
)
const hasSavedFinalDeliberationOrder = computed(() =>
  (finalDeliberation.value?.finalRankingSubmissionIds.length ?? 0) > 0
)
const currentFinalDeliberationOrderedSubmissionIds = computed(() => {
  if (finalDeliberationDraftOrderedSubmissionIds.value.length > 0) {
    return finalDeliberationDraftOrderedSubmissionIds.value
  }

  if ((finalDeliberation.value?.finalRankingSubmissionIds.length ?? 0) > 0) {
    return finalDeliberation.value!.finalRankingSubmissionIds
  }

  return (finalDeliberation.value?.entries ?? [])
    .filter((entry): entry is FinalDeliberationView['entries'][number] & { finalRank: number } =>
      entry.finalRank !== null
    )
    .map(entry => entry.submissionId)
})
const shouldPersistDraftOnAnnounceWinners = computed(() =>
  currentFinalDeliberationOrderedSubmissionIds.value.length > 0
  && (!hasSavedFinalDeliberationOrder.value || finalDeliberationHasDraftChanges.value)
)
const showPrizeRedemptionsPanel = computed(() =>
  Boolean(showLifecycleSection.value && currentHackathon.value && ['winners_announced', 'completed'].includes(currentHackathon.value.state))
)
const judgeChoices = computed<JudgeChoice[]>(() =>
  roleAssignments.value
    .filter((assignment): assignment is HackathonRoleAssignment & { user: NonNullable<HackathonRoleAssignment['user']> } =>
      assignment.isInJudgePool && Boolean(assignment.user)
    )
    .map(assignment => ({
      value: assignment.userId,
      label: `${assignment.user.displayName} (${assignment.user.email})`
    }))
)

const PITCH_REVIEW_AUTO_REFRESH_MS = 5000
let pitchReviewAutoRefreshTimer: number | null = null

async function refreshLivePitchReviewData() {
  if (import.meta.server || !showPitchReviewPanel.value || !canManage.value || pendingActionKey.value !== null) {
    return
  }

  if (import.meta.client && document.visibilityState !== 'visible') {
    return
  }

  await Promise.all([
    workspace.hackathon.refresh(),
    workspace.roleAssignments.refresh(),
    workspace.assignments.refresh(),
    workspace.leaderboard.refresh()
  ])
}

function stopPitchReviewAutoRefresh() {
  if (pitchReviewAutoRefreshTimer !== null) {
    window.clearInterval(pitchReviewAutoRefreshTimer)
    pitchReviewAutoRefreshTimer = null
  }
}

watch([
  () => currentHackathon.value?.id,
  canManage,
  canLoadApplications,
  canLoadShortlist,
  canLoadFinalDeliberation,
  canLoadWinners,
  canLoadPrizeRedemptions
], async ([id, allowed]) => {
  if (!id || !allowed) {
    return
  }

  await Promise.all([
    canLoadApplications.value && applicationsStatus.value === 'idle' ? loadApplications() : Promise.resolve(),
    canLoadShortlist.value && shortlistStatus.value === 'idle' ? loadShortlist() : Promise.resolve(),
    canLoadFinalDeliberation.value && finalDeliberationStatus.value === 'idle' ? loadFinalDeliberation() : Promise.resolve(),
    canLoadWinners.value && winnersStatus.value === 'idle' ? loadWinners() : Promise.resolve(),
    canLoadPrizeRedemptions.value && redemptionsStatus.value === 'idle' ? loadPrizeRedemptions() : Promise.resolve()
  ])
}, {
  immediate: true
})

watch([showPitchReviewPanel, canManage, pendingActionKey], async ([visible, allowed, pendingAction]) => {
  if (import.meta.server) {
    return
  }

  stopPitchReviewAutoRefresh()

  if (!visible || !allowed || pendingAction !== null) {
    return
  }

  await refreshLivePitchReviewData()
  pitchReviewAutoRefreshTimer = window.setInterval(() => {
    void refreshLivePitchReviewData()
  }, PITCH_REVIEW_AUTO_REFRESH_MS)
}, {
  immediate: true
})

onBeforeUnmount(() => {
  stopPitchReviewAutoRefresh()
})

const lifecycleHeroClassByColor = {
  primary: '!border-primary/24 !bg-primary/[0.06] dark:!border-primary/34 dark:!bg-primary/[0.08]',
  secondary: '!border-secondary/24 !bg-secondary/[0.08] dark:!border-secondary/34 dark:!bg-secondary/[0.12]',
  neutral: '!border-black/10 !bg-white/72 dark:!border-white/[0.10] dark:!bg-[#101010]/60',
  success: '!border-success/24 !bg-success/[0.06] dark:!border-success/34 dark:!bg-success/[0.08]',
  warning: '!border-warning/24 !bg-warning/[0.06] dark:!border-warning/34 dark:!bg-warning/[0.08]',
  error: '!border-error/24 !bg-error/[0.06] dark:!border-error/34 dark:!bg-error/[0.08]',
  info: '!border-info/24 !bg-info/[0.06] dark:!border-info/34 dark:!bg-info/[0.08]'
} as const

const lifecycleStateColor = computed(() =>
  currentHackathon.value ? getHackathonStateColor(currentHackathon.value.state) : 'neutral'
)

const lifecycleHeroClass = computed(() =>
  lifecycleHeroClassByColor[lifecycleStateColor.value]
)

const approvedApplicationCount = computed(() =>
  applications.value.filter(application => application.status === 'approved').length
)

const rejectedApplicationCount = computed(() =>
  applications.value.filter(application => application.status === 'rejected').length
)

const totalApplicationValue = computed(() =>
  formatLoadMetricValue(applicationsStatus.value, `${applications.value.length}`)
)

const approvedApplicationValue = computed(() =>
  formatLoadMetricValue(applicationsStatus.value, `${approvedApplicationCount.value}`)
)

const rejectedApplicationValue = computed(() =>
  formatLoadMetricValue(applicationsStatus.value, `${rejectedApplicationCount.value}`)
)

const soloTeamCount = computed(() =>
  allTeams.value.filter(team => (team.activeMemberCount ?? 0) <= 1).length
)

const multiPersonTeamCount = computed(() =>
  allTeams.value.filter(team => (team.activeMemberCount ?? 0) > 1).length
)

const soloTeamValue = computed(() =>
  formatLoadMetricValue(teamDataStatus.value, `${soloTeamCount.value}`)
)

const multiPersonTeamValue = computed(() =>
  formatLoadMetricValue(teamDataStatus.value, `${multiPersonTeamCount.value}`)
)
const activeSubmissionTeamCount = computed(() =>
  showLifecycleSection.value
    ? submissionSummaryData.value?.totalTeams ?? 0
    : countActiveAdminOperationalTeams(submissionOperationalTeams.value)
)

const submittedSubmissionCount = computed(() =>
  submissionSummaryData.value?.submittedOrLaterTeamCount ?? 0
)

const draftSubmissionCount = computed(() =>
  submissionSummaryData.value?.statusCounts.draft ?? 0
)

const draftSubmissionValue = computed(() =>
  formatLoadMetricValue(submissionSummaryStatus.value, `${draftSubmissionCount.value}`)
)

const submittedSubmissionValue = computed(() =>
  formatLoadMetricValue(
    combineLoadStatuses([teamDataStatus.value, submissionSummaryStatus.value]),
    `${submittedSubmissionCount.value} / ${activeSubmissionTeamCount.value}`
  )
)

const lockedSubmissionCount = computed(() =>
  leaderboard.value.filter(entry => entry.submissionStatus === 'locked').length
)
const rankedBlindSubmissionCount = computed(() =>
  leaderboard.value.filter(entry => entry.rank !== null).length
)

const completedReviewCount = computed(() =>
  leaderboard.value.filter(entry =>
    entry.submissionStatus === 'locked' && entry.reviewStatus === 'judge_completed'
  ).length
)

const judgingProgressValue = computed(() =>
  formatLoadMetricValue(
    leaderboardDataStatus.value,
    `${completedReviewCount.value} / ${lockedSubmissionCount.value}`
  )
)

const judgePoolCount = computed(() =>
  roleAssignments.value.filter(assignment => assignment.isInJudgePool).length
)

const activePitchPresentationIndex = computed(() => {
  if (!currentHackathon.value?.activePitchPresentationSubmissionId) {
    return null
  }

  const index = currentHackathon.value.pitchPresentationSubmissionIds.findIndex(
    submissionId => submissionId === currentHackathon.value?.activePitchPresentationSubmissionId
  )

  return index === -1 ? null : index
})
const leaderboardEntriesBySubmissionId = computed(() =>
  new Map(leaderboard.value.map(entry => [entry.submissionId, entry] as const))
)
const pitchLineupEntries = computed<PitchLineupEntry[]>(() => {
  if (!currentHackathon.value) {
    return []
  }

  return currentHackathon.value.pitchPresentationSubmissionIds.map((submissionId, index) => {
    const entry = leaderboardEntriesBySubmissionId.value.get(submissionId)
    const status = currentHackathon.value?.pitchPresentationsCompletedAt
      ? 'presented'
      : activePitchPresentationIndex.value === null
        ? 'upcoming'
        : index < activePitchPresentationIndex.value
          ? 'presented'
          : index === activePitchPresentationIndex.value
            ? 'live'
            : 'upcoming'

    return {
      submissionId,
      order: index + 1,
      projectName: entry?.projectName ?? null,
      teamName: entry?.teamName ?? null,
      rank: entry?.rank ?? null,
      status
    }
  })
})
const pitchReviewCoverageEntries = computed(() => {
  if (!currentHackathon.value) {
    return []
  }

  return buildPitchReviewCoverageEntries({
    finalistSubmissionIds: currentHackathon.value.pitchPresentationSubmissionIds,
    leaderboardEntries: leaderboard.value,
    assignments: assignments.value,
    roleAssignments: roleAssignments.value
  })
})
const completedPitchAssignmentCount = computed(() =>
  pitchReviewCoverageEntries.value.reduce(
    (total, entry) => total + entry.completedAssignmentCount,
    0
  )
)
const pitchReviewMissingCoverageEntries = computed(() =>
  pitchReviewCoverageEntries.value.filter(entry => entry.missingJudgeLabels.length > 0)
)
const hasCompletedPitchReviews = computed(() => completedPitchAssignmentCount.value > 0)
const canStartFinalDeliberationFromPitchReview = computed(() =>
  lifecycleControl.value?.key === 'start_final_deliberation' && lifecycleControl.value.isEnabled
)
const canAdvancePitchPresentation = computed(() =>
  Boolean(
    currentHackathon.value
    && currentHackathon.value.state === 'pitch'
    && currentHackathon.value.pitchPresentationSubmissionIds.length > 0
    && currentHackathon.value.pitchPresentationsCompletedAt === null
    && (pendingActionKey.value === null || pendingActionKey.value === 'advance-pitch-presentation')
  )
)
const advancePitchPresentationLabel = computed(() => {
  if (!currentHackathon.value) {
    return 'Enable next presentation'
  }

  if (currentHackathon.value.pitchPresentationsCompletedAt) {
    return 'Pitch presentations complete'
  }

  if (activePitchPresentationIndex.value === null) {
    return 'Enable first presentation'
  }

  return activePitchPresentationIndex.value === currentHackathon.value.pitchPresentationSubmissionIds.length - 1
    ? 'Finish pitch presentations'
    : 'Enable next presentation'
})
const pitchStageAlert = computed(() => {
  if (!currentHackathon.value) {
    return {
      title: 'Live pitch stage is active',
      description: 'Pitch lineup data is still loading.'
    }
  }

  if (currentHackathon.value.pitchPresentationsCompletedAt) {
    return {
      title: 'Pitch presentations are complete',
      description: 'The live lineup is finished. Start pitch review when you are ready to open judge scoring.'
    }
  }

  if (activePitchPresentationIndex.value === null) {
    return {
      title: 'No presentation enabled yet',
      description: 'Enable the first finalist from this lineup when the live pitch stage begins.'
    }
  }

  return {
    title: `Presentation ${activePitchPresentationIndex.value + 1} is live`,
    description: 'Advance the lineup when the current team finishes. Pitch review stays closed until the full lineup is completed.'
  }
})

const completedPitchPresentationCount = computed(() => {
  if (!currentHackathon.value) {
    return 0
  }

  if (currentHackathon.value.pitchPresentationsCompletedAt) {
    return currentHackathon.value.pitchPresentationSubmissionIds.length
  }

  return activePitchPresentationIndex.value === null ? 0 : activePitchPresentationIndex.value
})

const pitchPresentationProgressValue = computed(() => {
  if (!currentHackathon.value) {
    return '0 / 0'
  }

  return `${completedPitchPresentationCount.value} / ${currentHackathon.value.pitchPresentationSubmissionIds.length}`
})

const pitchPresentationProgressDescription = computed(() => {
  if (!currentHackathon.value || currentHackathon.value.pitchPresentationSubmissionIds.length === 0) {
    return 'No finalist presentations are currently queued.'
  }

  if (currentHackathon.value.pitchPresentationsCompletedAt) {
    return 'All finalist presentations are complete. Pitch review can now be opened separately.'
  }

  if (activePitchPresentationIndex.value === null) {
    return 'No finalist is enabled yet. Start the live lineup from the Operations tab.'
  }

  return `Presentation ${activePitchPresentationIndex.value + 1} is currently enabled.`
})

const averageSubmissionsPerJudgeValue = computed(() => {
  const status = combineLoadStatuses([leaderboardDataStatus.value, roleAssignmentsDataStatus.value])

  if (status !== 'success') {
    return formatLoadMetricValue(status, '')
  }

  if (judgePoolCount.value === 0) {
    return 'Unavailable'
  }

  return (lockedSubmissionCount.value / judgePoolCount.value).toFixed(1)
})

const averageSubmissionsPerJudgeDescription = computed(() => {
  if (roleAssignmentsDataStatus.value === 'idle' || roleAssignmentsDataStatus.value === 'pending') {
    return 'Judge pool is loading.'
  }

  if (roleAssignmentsDataStatus.value === 'error') {
    return 'Judge pool is unavailable right now.'
  }

  return judgePoolCount.value === 1
    ? '1 judge currently in the pool.'
    : `${judgePoolCount.value} judges currently in the pool.`
})

const lifecycleSummaryItems = computed<LifecycleSummaryItem[]>(() => {
  if (!currentHackathon.value) {
    return []
  }

  const hackathon = currentHackathon.value

  switch (operationsPhase.value) {
    case 'registration_open':
      return [
        {
          label: 'Current status',
          value: formatHackathonState(hackathon.state),
          description: 'Applications are open and teams can start forming.'
        },
        {
          label: 'Time frame',
          value: formatLifecycleTimeframe(hackathon.registrationOpensAt, hackathon.registrationClosesAt),
          description: 'Configured registration window.'
        }
      ]
    case 'submission_open':
      return [
        {
          label: 'Current status',
          value: formatHackathonState(hackathon.state),
          description: 'Teams can still edit drafts and send final submissions.'
        },
        {
          label: 'Time frame',
          value: formatLifecycleTimeframe(hackathon.submissionOpensAt, hackathon.submissionClosesAt),
          description: 'Configured submission window.'
        }
      ]
    case 'judging':
      if (hackathon.state === 'judging_preparation') {
        return [
          {
            label: 'Current status',
            value: formatHackathonState(hackathon.state),
            description: 'Team formation is closed. Existing submissions can still be revised until the next judging stage starts.'
          },
          {
            label: 'Judging path',
            value: hackathon.blindReviewCount > 0
              ? `${hackathon.blindReviewCount} blind review${hackathon.blindReviewCount === 1 ? '' : 's'} per submission`
              : 'Pitch only',
            description: hackathon.pitchReviewEnabled
              ? 'The live pitch stage and post-pitch review stage are enabled for this hackathon.'
              : 'Final ranking will be based on blind review only.'
          }
        ]
      }

      if (hackathon.state === 'blind_review') {
        return [
          {
            label: 'Current status',
            value: formatHackathonState(hackathon.state),
            description: 'Blind judging is in progress and reviewer identity remains hidden from submissions.'
          },
          {
            label: 'Next stage',
            value: hackathon.pitchReviewEnabled ? 'Shortlist' : 'Final Deliberation',
            description: hackathon.pitchReviewEnabled
              ? 'Admins will save the blind shortlist order and set the finalist boundary once blind reviews are complete.'
              : 'Blind scoring will feed directly into final ranking review.'
          }
        ]
      }

      if (hackathon.state === 'shortlist') {
        return [
          {
            label: 'Current status',
            value: formatHackathonState(hackathon.state),
            description: 'Blind scores are frozen and admins are choosing which submissions advance to the live pitch stage.'
          },
          {
            label: 'Next stage',
            value: 'Pitch',
            description: 'Continue from Operations once the shortlist order and finalist boundary are saved.'
          }
        ]
      }

      if (hackathon.state === 'pitch') {
        return [
          {
            label: 'Current status',
            value: formatHackathonState(hackathon.state),
            description: 'Finalist teams are presenting live. Admins enable each team one at a time and judges do not have post-pitch review assignments yet.'
          },
          {
            label: 'Next stage',
            value: 'Pitch Review',
            description: hackathon.pitchPresentationsCompletedAt
              ? 'The live lineup is complete. Start pitch review when you are ready to open judge scoring.'
              : 'Finish the live lineup from Operations before pitch review can start.'
          }
        ]
      }

      if (hackathon.state === 'pitch_review') {
        return [
          {
            label: 'Current status',
            value: formatHackathonState(hackathon.state),
            description: 'Pitch judges can now see project and team details and submit post-pitch review scores.'
          },
          {
            label: 'Next stage',
            value: 'Final Deliberation',
            description: hasCompletedPitchReviews.value
              ? 'Final ranking review can start once you are ready to close pitch review.'
              : 'Final ranking review stays locked until at least one pitch review has been submitted.'
          }
        ]
      }

      if (hackathon.state === 'final_deliberation') {
        return [
          {
            label: 'Current status',
            value: formatHackathonState(hackathon.state),
            description: 'Combined scores are available and admins can finalize ranking without changing judge votes.'
          },
          {
            label: 'Score model',
            value: hackathon.blindReviewCount > 0 && hackathon.pitchReviewEnabled
              ? `${hackathon.blindScoreWeightPercent}% blind / ${hackathon.pitchScoreWeightPercent}% pitch`
              : hackathon.pitchReviewEnabled
                ? 'Pitch only'
                : 'Blind review only',
            description: 'The final ranking reflects the configured judging stages for this hackathon.'
          }
        ]
      }

      if (hackathon.state === 'winners_announced') {
        return [
          {
            label: 'Current status',
            value: formatHackathonState(hackathon.state),
            description: 'Winners are public and prize redemption can proceed.'
          },
          {
            label: 'Time frame',
            value: `After ${formatTimestamp(hackathon.submissionClosesAt, 'submission close')}`,
            description: 'Outcome and prize workflows stay available until the hackathon is completed.'
          }
        ]
      }

      return [
        {
          label: 'Current status',
          value: formatHackathonState(hackathon.state),
          description: 'Reviews and outcomes are now in progress.'
        },
        {
          label: 'Time frame',
          value: `After ${formatTimestamp(hackathon.submissionClosesAt, 'submission close')}`,
          description: 'Judging starts once the submission window has closed and continues until lifecycle completion.'
        }
      ]
    case 'completed':
      return [
        {
          label: 'Current status',
          value: formatHackathonState(hackathon.state),
          description: 'The lifecycle has finished and no further transitions are available.'
        },
        {
          label: 'Time frame',
          value: formatLifecycleTimeframe(hackathon.registrationOpensAt, hackathon.submissionClosesAt),
          description: 'Lifecycle window from registration opening through the submission deadline.'
        }
      ]
    default:
      return [
        {
          label: 'Current status',
          value: formatHackathonState(hackathon.state),
          description: 'Lifecycle controls remain available from this tab.'
        },
        {
          label: 'Time frame',
          value: formatLifecycleTimeframe(hackathon.registrationOpensAt, hackathon.submissionClosesAt),
          description: 'Configured registration and submission window.'
        }
      ]
  }
})

const lifecycleActionAvailability = computed(() => {
  const hackathon = currentHackathon.value
  const control = lifecycleControl.value

  if (!hackathon) {
    return {
      label: 'Lifecycle status',
      message: 'No further lifecycle action is available from Operations.',
      className: 'text-toned'
    }
  }

  if (!control) {
    if (hackathon.state === 'shortlist') {
      return {
        label: 'Continue from',
        message: 'Use Operations to save the shortlist order and start pitch.',
        className: 'text-warning'
      }
    }

    return {
      label: 'Lifecycle status',
      message: 'No further lifecycle action is available from Operations.',
      className: 'text-toned'
    }
  }

  if (control.isEnabled) {
    return {
      label: 'Available now',
      message: 'This lifecycle action can be run now.',
      className: 'text-success'
    }
  }

  switch (control.key) {
    case 'open_registration':
      if (control.code === 'registration_window_not_open_yet') {
        return {
          label: 'Available when',
          message: `The registration window starts on ${formatTimestamp(hackathon.registrationOpensAt, 'the scheduled opening time')}.`,
          className: 'text-warning'
        }
      }

      return {
        label: 'Unavailable',
        message: `The registration window closed on ${formatTimestamp(hackathon.registrationClosesAt, 'the scheduled closing time')}.`,
        className: 'text-warning'
      }
    case 'open_submission':
      if (control.code === 'registration_window_still_open') {
        return {
          label: 'Available when',
          message: `Registration closes on ${formatTimestamp(hackathon.registrationClosesAt, 'the registration closing time')}. Submission can open after that, while the submission window is active.`,
          className: 'text-warning'
        }
      }

      return {
        label: 'Available when',
        message: `The submission window is active from ${formatTimestamp(hackathon.submissionOpensAt, 'the scheduled opening time')} to ${formatTimestamp(hackathon.submissionClosesAt, 'the scheduled closing time')}.`,
        className: 'text-warning'
      }
    case 'start_judging_preparation':
      if (control.code === 'submission_window_still_open') {
        return {
          label: 'Available when',
          message: `The submission window closes on ${formatTimestamp(hackathon.submissionClosesAt, 'the submission deadline')}. Submissions can be stopped after that.`,
          className: 'text-warning'
        }
      }

      if (control.code === 'submitted_submissions_required') {
        return {
          label: 'Available when',
          message: 'At least one team needs to send a submission before submissions can be stopped.',
          className: 'text-warning'
        }
      }

      return {
        label: 'Available when',
        message: control.reason ?? 'This lifecycle action is not available yet.',
        className: 'text-warning'
      }
    default:
      return {
        label: 'Available when',
        message: control.reason ?? 'This lifecycle action is not available yet.',
        className: 'text-warning'
      }
  }
})

const lifecycleActionHeading = computed(() =>
  lifecycleControl.value || currentHackathon.value?.state !== 'shortlist'
    ? (lifecycleControl.value ? 'Next lifecycle action' : 'Lifecycle status')
    : 'Next lifecycle step'
)

const lifecycleActionLabel = computed(() => {
  if (lifecycleControl.value) {
    return lifecycleControl.value.label
  }

  if (currentHackathon.value?.state === 'shortlist') {
    return 'Continue From Operations'
  }

  return 'No further lifecycle actions'
})

const lifecycleActionDescription = computed(() => {
  if (lifecycleControl.value) {
    return lifecycleControl.value.description
  }

  if (currentHackathon.value?.state === 'shortlist') {
    return 'Shortlist order and finalist selection are managed directly from Operations because the next transition depends on the saved shortlist.'
  }

  return 'The hackathon has reached a stable state with no additional lifecycle transition available from this view.'
})

const lifecycleMetricCards = computed<LifecycleMetricCard[]>(() => {
  switch (operationsPhase.value) {
    case 'registration_open':
      return [
        {
          key: 'applications',
          label: 'Applications',
          breakdown: [
            {
              label: 'Approved',
              value: approvedApplicationValue.value
            },
            {
              label: 'Rejected',
              value: rejectedApplicationValue.value
            }
          ]
        },
        {
          key: 'teams',
          label: 'Teams',
          breakdown: [
            {
              label: 'Solo',
              value: soloTeamValue.value
            },
            {
              label: 'Multiple people',
              value: multiPersonTeamValue.value
            }
          ]
        }
      ]
    case 'submission_open':
      return [
        {
          key: 'drafts',
          label: 'Drafts Created',
          value: draftSubmissionValue.value,
          description: 'Teams that started a submission but have not sent it yet.'
        },
        {
          key: 'submissions',
          label: 'Submissions Sent',
          value: submittedSubmissionValue.value,
          description: 'Submitted projects relative to the total team count.'
        }
      ]
    case 'judging':
      if (currentHackathon.value?.state === 'judging_preparation') {
        return [
          {
            key: 'submitted-projects',
            label: 'Submitted Projects',
            value: submittedSubmissionValue.value,
            description: 'Projects currently submitted and still eligible to be locked when judging starts.'
          },
          {
            key: 'judge-pool',
            label: currentHackathon.value.blindReviewCount > 0 ? 'Judge Pool' : 'Judge Panel',
            value: formatLoadMetricValue(roleAssignmentsDataStatus.value, `${judgePoolCount.value}`),
            description: averageSubmissionsPerJudgeDescription.value
          }
        ]
      }

      if (currentHackathon.value?.state === 'blind_review') {
        return [
          {
            key: 'judging-progress',
            label: 'Blind Reviews Complete',
            value: judgingProgressValue.value,
            description: 'Locked submissions with a completed blind-review outcome.'
          },
          {
            key: 'judge-load',
            label: 'Average Per Judge',
            value: averageSubmissionsPerJudgeValue.value,
            description: averageSubmissionsPerJudgeDescription.value
          }
        ]
      }

      if (currentHackathon.value?.state === 'shortlist') {
        return [
          {
            key: 'locked-submissions',
            label: 'Blind-Ranked Submissions',
            value: formatLoadMetricValue(leaderboardDataStatus.value, `${rankedBlindSubmissionCount.value}`),
            description: 'Ranked blind-review submissions available for shortlist ordering and finalist selection.'
          },
          {
            key: 'judge-load',
            label: 'Judge Pool',
            value: formatLoadMetricValue(roleAssignmentsDataStatus.value, `${judgePoolCount.value}`),
            description: averageSubmissionsPerJudgeDescription.value
          }
        ]
      }

      if (currentHackathon.value?.state === 'pitch') {
        return [
          {
            key: 'pitch-progress',
            label: 'Pitch Progress',
            value: pitchPresentationProgressValue.value,
            description: pitchPresentationProgressDescription.value
          },
          {
            key: 'judge-pool',
            label: 'Judge Panel',
            value: formatLoadMetricValue(roleAssignmentsDataStatus.value, `${judgePoolCount.value}`),
            description: averageSubmissionsPerJudgeDescription.value
          }
        ]
      }

      if (currentHackathon.value?.state === 'pitch_review' || currentHackathon.value?.state === 'final_deliberation' || currentHackathon.value?.state === 'winners_announced') {
        return [
          {
            key: 'locked-submissions',
            label: 'Submitted Projects',
            value: formatLoadMetricValue(leaderboardDataStatus.value, `${lockedSubmissionCount.value}`),
            description: 'Projects that remain in competition after submissions were locked.'
          },
          {
            key: 'judge-pool',
            label: 'Judge Panel',
            value: formatLoadMetricValue(roleAssignmentsDataStatus.value, `${judgePoolCount.value}`),
            description: averageSubmissionsPerJudgeDescription.value
          }
        ]
      }

      return [
        {
          key: 'locked-submissions',
          label: 'Submitted Projects',
          value: formatLoadMetricValue(leaderboardDataStatus.value, `${lockedSubmissionCount.value}`),
          description: 'Projects that remain in competition after submissions were locked.'
        },
        {
          key: 'judge-pool',
          label: 'Judge Pool',
          value: formatLoadMetricValue(roleAssignmentsDataStatus.value, `${judgePoolCount.value}`),
          description: averageSubmissionsPerJudgeDescription.value
        }
      ]
    case 'completed':
      return [
        {
          key: 'applications',
          label: 'Applications',
          value: totalApplicationValue.value,
          description: 'Final application totals for the completed hackathon.',
          breakdown: [
            {
              label: 'Approved',
              value: approvedApplicationValue.value
            },
            {
              label: 'Rejected',
              value: rejectedApplicationValue.value
            }
          ]
        },
        {
          key: 'submissions',
          label: 'Submitted Projects',
          value: submittedSubmissionValue.value,
          description: 'Submitted projects relative to the total team count.'
        }
      ]
    default:
      return []
  }
})

async function refreshOperations() {
  await workspace.refreshWorkspace()
  await Promise.all([
    loadApplications(),
    refreshSubmissionMonitor(),
    loadShortlist(),
    loadFinalDeliberation(),
    loadWinners(),
    loadPrizeRedemptions()
  ])
}

function replaceApplicationsLocally(updatedApplications: AdminApplicationRecord[]) {
  if (updatedApplications.length === 0) {
    return
  }

  const updatedApplicationsById = new Map(
    updatedApplications.map(application => [application.id, application])
  )

  applications.value = applications.value.map((application) => {
    const updatedApplication = updatedApplicationsById.get(application.id)

    if (!updatedApplication) {
      return application
    }

    return {
      ...application,
      ...updatedApplication,
      user: updatedApplication.user ?? application.user,
      applicationTermsDocument: updatedApplication.applicationTermsDocument ?? application.applicationTermsDocument
    }
  })
}

async function runMutation<Result>(
  actionKey: string,
  action: () => Promise<Result>,
  options?: {
    title: string
    description: string
  },
  mutationOptions?: {
    skipRefresh?: boolean
    onSuccess?: (result: Result) => void | Promise<void>
  }
) {
  mutationError.value = ''
  pendingActionKey.value = actionKey
  const scrollPosition = import.meta.client
    ? {
        left: window.scrollX,
        top: window.scrollY
      }
    : null

  try {
    const result = await action()

    if (mutationOptions?.onSuccess) {
      await mutationOptions.onSuccess(result)
    }

    if (options) {
      toast.add({
        title: options.title,
        description: options.description,
        color: 'success'
      })
    }

    if (!mutationOptions?.skipRefresh) {
      await refreshOperations()
    }
  } catch (error) {
    mutationError.value = normalizeApiError(error).message
  } finally {
    pendingActionKey.value = null

    if (scrollPosition) {
      await nextTick()
      window.scrollTo({
        left: scrollPosition.left,
        top: scrollPosition.top
      })
    }
  }
}

async function loadShortlist() {
  if (!canLoadShortlist.value) {
    shortlistEntries.value = []
    shortlistHasSavedSelection.value = false
    shortlistStatus.value = 'idle'
    shortlistErrorMessage.value = ''
    return
  }

  shortlistStatus.value = 'pending'
  shortlistErrorMessage.value = ''

  try {
    const response = await $fetch<ApiListResponse<ShortlistEntry>>(
      `/api/hackathons/${hackathonId.value}/shortlist`
    )
    shortlistEntries.value = response.data
    shortlistHasSavedSelection.value = response.meta?.hasSavedShortlistSelection === true
    shortlistStatus.value = 'success'
  } catch (error) {
    shortlistEntries.value = []
    shortlistHasSavedSelection.value = false
    shortlistStatus.value = 'error'
    shortlistErrorMessage.value = toSectionErrorMessage(
      error,
      'Shortlist ranking data could not be loaded right now.'
    )
  }
}

type ShortlistSelectionPayload = {
  orderedSubmissionIds: string[]
  finalistSubmissionIds: string[]
}

async function persistShortlistSelection(payload: ShortlistSelectionPayload) {
  await $fetch(`/api/hackathons/${hackathonId.value}/shortlist/actions/select-finalists`, {
    method: 'POST',
    body: payload
  })
}

async function selectFinalists(payload: ShortlistSelectionPayload) {
  await runMutation(
    'shortlist-select',
    async () => {
      await persistShortlistSelection(payload)
    },
    {
      title: 'Pitch finalists updated',
      description: 'The saved shortlist order and finalist boundary have been updated for pitch review.'
    }
  )
}

async function startPitch(payload: ShortlistSelectionPayload) {
  if (!shortlistHasSavedSelection.value && import.meta.client) {
    const confirmed = window.confirm(
      [
        'Save the current shortlist and continue to pitch?',
        'This shortlist has not been saved yet. Continuing will save the current finalist boundary and open the live pitch stage.'
      ].join('\n\n')
    )

    if (!confirmed) {
      return
    }
  }

  await runMutation(
    'start-pitch',
    async () => {
      if (!shortlistHasSavedSelection.value || shortlistEntriesChanged(payload)) {
        await persistShortlistSelection(payload)
      }

      await $fetch(`/api/hackathons/${hackathonId.value}/actions/start-pitch`, {
        method: 'POST'
      })
    },
    {
      title: 'Pitch started',
      description: 'The live finalist pitch stage is now open. Enable each presentation from the lineup before opening pitch review.'
    }
  )
}

function shortlistEntriesChanged(payload: ShortlistSelectionPayload) {
  const currentOrderedSubmissionIds = shortlistEntries.value.map(entry => entry.submissionId)
  const currentFinalistSubmissionIds = shortlistEntries.value
    .filter(entry => entry.isPitchFinalist)
    .map(entry => entry.submissionId)

  return (
    payload.orderedSubmissionIds.length !== currentOrderedSubmissionIds.length
    || payload.finalistSubmissionIds.length !== currentFinalistSubmissionIds.length
    || payload.orderedSubmissionIds.some((submissionId, index) => submissionId !== currentOrderedSubmissionIds[index])
    || payload.finalistSubmissionIds.some((submissionId, index) => submissionId !== currentFinalistSubmissionIds[index])
  )
}

async function loadFinalDeliberation() {
  if (!canLoadFinalDeliberation.value) {
    finalDeliberation.value = null
    finalDeliberationStatus.value = 'idle'
    finalDeliberationErrorMessage.value = ''
    finalDeliberationDraftOrderedSubmissionIds.value = []
    finalDeliberationHasDraftChanges.value = false
    return
  }

  finalDeliberationStatus.value = 'pending'
  finalDeliberationErrorMessage.value = ''
  finalDeliberationDraftOrderedSubmissionIds.value = []
  finalDeliberationHasDraftChanges.value = false

  try {
    const response = await $fetch<ApiDataResponse<FinalDeliberationView>>(
      `/api/hackathons/${hackathonId.value}/final-deliberation`
    )
    finalDeliberation.value = response.data
    finalDeliberationStatus.value = 'success'
  } catch (error) {
    finalDeliberation.value = null
    finalDeliberationStatus.value = 'error'
    finalDeliberationErrorMessage.value = toSectionErrorMessage(
      error,
      'Final deliberation data could not be loaded right now.'
    )
  }
}

function syncFinalDeliberationDraft(payload: {
  orderedSubmissionIds: string[]
  hasDraftChanges: boolean
}) {
  finalDeliberationDraftOrderedSubmissionIds.value = payload.orderedSubmissionIds
  finalDeliberationHasDraftChanges.value = payload.hasDraftChanges
}

async function loadWinners() {
  if (!canLoadWinners.value) {
    winners.value = []
    winnersStatus.value = 'idle'
    winnersErrorMessage.value = ''
    return
  }

  winnersStatus.value = 'pending'
  winnersErrorMessage.value = ''

  try {
    const response = await $fetch<ApiListResponse<WinnerEntry>>(
      `/api/hackathons/${hackathonId.value}/winners`
    )
    winners.value = response.data
    winnersStatus.value = 'success'
  } catch (error) {
    winners.value = []
    winnersStatus.value = 'error'
    winnersErrorMessage.value = toSectionErrorMessage(
      error,
      'Winner records could not be loaded right now.'
    )
  }
}

async function loadPrizeRedemptions() {
  if (!canLoadPrizeRedemptions.value) {
    redemptions.value = []
    prizeRedemptionBlindRankingEntries.value = []
    prizeRedemptionFinalRankingEntries.value = []
    redemptionsStatus.value = 'idle'
    redemptionsErrorMessage.value = ''
    return
  }

  redemptionsStatus.value = 'pending'
  redemptionsErrorMessage.value = ''

  try {
    const response = await $fetch<ApiDataResponse<PrizeRedemptionAdminView>>(
      `/api/hackathons/${hackathonId.value}/prize-redemptions`
    )
    winners.value = response.data.winners
    redemptions.value = response.data.redemptions
    prizeRedemptionBlindRankingEntries.value = response.data.blindRankingEntries
    prizeRedemptionFinalRankingEntries.value = response.data.finalRankingEntries
    redemptionsStatus.value = 'success'
  } catch (error) {
    redemptions.value = []
    prizeRedemptionBlindRankingEntries.value = []
    prizeRedemptionFinalRankingEntries.value = []
    redemptionsStatus.value = 'error'
    redemptionsErrorMessage.value = toSectionErrorMessage(
      error,
      'Prize redemption records could not be loaded right now.'
    )
  }
}

async function reassignAssignment(payload: { assignmentId: string, judgeUserId?: string, reason?: string }) {
  await runMutation(
    `reassign:${payload.assignmentId}`,
    async () => {
      await $fetch(
        `/api/hackathons/${hackathonId.value}/judging/assignments/${payload.assignmentId}/actions/reassign`,
        {
          method: 'POST',
          body: payload
        }
      )
    },
    {
      title: 'Assignment reassigned',
      description: 'The blind review assignment has been moved to a different judge.'
    }
  )
}

async function forceSkipAssignment(payload: { assignmentId: string, reason?: string }) {
  await runMutation(
    `force-skip:${payload.assignmentId}`,
    async () => {
      await $fetch(
        `/api/hackathons/${hackathonId.value}/judging/assignments/${payload.assignmentId}/actions/force-skip`,
        {
          method: 'POST',
          body: {
            reason: payload.reason
          }
        }
      )
    },
    {
      title: 'Assignment force-skipped',
      description: 'The active blind review was skipped and redistributed.'
    }
  )
}

async function advancePitchPresentation() {
  if (!currentHackathon.value) {
    return
  }

  const wasNotStarted = activePitchPresentationIndex.value === null
  const wasLastPresentation = activePitchPresentationIndex.value !== null
    && activePitchPresentationIndex.value === currentHackathon.value.pitchPresentationSubmissionIds.length - 1

  await runMutation(
    'advance-pitch-presentation',
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/actions/advance-pitch-presentation`, {
        method: 'POST'
      })
    },
    {
      title: wasNotStarted
        ? 'Pitch presentation enabled'
        : wasLastPresentation
          ? 'Pitch presentations completed'
          : 'Pitch presentation advanced',
      description: wasNotStarted
        ? 'The first finalist is now enabled to present.'
        : wasLastPresentation
          ? 'The live lineup is complete. Pitch review can now be opened separately.'
          : 'The next finalist is now enabled to present.'
    }
  )
}

async function startFinalDeliberation() {
  if (currentHackathon.value?.state === 'pitch_review') {
    if (!hasCompletedPitchReviews.value) {
      return
    }

    if (import.meta.client && pitchReviewMissingCoverageEntries.value.length > 0) {
      const confirmed = window.confirm([
        'Are you sure you want to proceed to the final deliberation?',
        ...pitchReviewMissingCoverageEntries.value.map(entry =>
          `${entry.projectLabel} was not reviewed by ${entry.missingJudgeLabels.join(', ')}.`
        )
      ].join('\n'))

      if (!confirmed) {
        return
      }
    }
  }

  await runMutation(
    'start-final-deliberation',
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/actions/start-final-deliberation`, {
        method: 'POST'
      })
    },
    {
      title: 'Final deliberation started',
      description: 'The final weighted ranking is now ready for admin review.'
    }
  )
}

async function reorderFinalDeliberation(orderedSubmissionIds: string[]) {
  await runMutation(
    'final-deliberation-reorder',
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/final-deliberation/actions/reorder`, {
        method: 'POST',
        body: {
          orderedSubmissionIds
        }
      })
    },
    {
      title: 'Final order updated',
      description: 'The final ranking order has been updated without changing any judge scores.'
    }
  )
}

async function announceWinners() {
  if (!finalDeliberation.value) {
    await loadFinalDeliberation()
  }

  if (!finalDeliberation.value) {
    return
  }

  if (import.meta.client && !hasSavedFinalDeliberationOrder.value) {
    const confirmed = window.confirm([
      'Announce winners and save the current final order?',
      'This final order has not been saved yet. Continuing will save it and publish the winners.'
    ].join('\n\n'))

    if (!confirmed) {
      return
    }
  }

  await runMutation(
    'announce-winners',
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/actions/announce-winners`, {
        method: 'POST',
        ...(shouldPersistDraftOnAnnounceWinners.value
          ? {
              body: {
                orderedSubmissionIds: currentFinalDeliberationOrderedSubmissionIds.value
              }
            }
          : {})
      })
    },
    {
      title: 'Winners announced',
      description: 'The final ranking is now published and prize redemption has been initialized when configured.'
    }
  )
}

async function approveApplication(application: AdminApplicationRecord) {
  await runMutation(
    `stage:approved:${application.id}`,
    async () => await $fetch<StageApplicationResponse>(
      `/api/hackathons/${application.hackathonId}/applications/${application.id}/actions/approve`,
      {
        method: 'POST'
      }
    ),
    undefined,
    {
      skipRefresh: true,
      onSuccess: response => replaceApplicationsLocally([response.data])
    }
  )
}

async function rejectApplication(application: AdminApplicationRecord) {
  await runMutation(
    `stage:rejected:${application.id}`,
    async () => await $fetch<StageApplicationResponse>(
      `/api/hackathons/${application.hackathonId}/applications/${application.id}/actions/reject`,
      {
        method: 'POST'
      }
    ),
    undefined,
    {
      skipRefresh: true,
      onSuccess: response => replaceApplicationsLocally([response.data])
    }
  )
}

async function withdrawApplication(application: AdminApplicationRecord) {
  const availability = application.adminWithdrawal

  if (!import.meta.client || !availability?.isAllowed) {
    return
  }

  const participantLabel = application.user?.displayName ?? application.user?.email ?? application.userId
  const warningLines = [
    `Withdraw ${participantLabel} from this hackathon?`
  ]

  if (availability.teamAction === 'remove_member') {
    warningLines.push('This will also remove the participant from their active team.')
  }

  if (availability.warning) {
    warningLines.push(availability.warning)
  }

  const confirmed = window.confirm(warningLines.join('\n\n'))

  if (!confirmed) {
    return
  }

  await runMutation(
    `withdraw:${application.id}`,
    async () => await $fetch<StageApplicationResponse>(
      `/api/hackathons/${application.hackathonId}/applications/${application.id}/actions/withdraw`,
      {
        method: 'POST'
      }
    ),
    {
      title: 'Participant withdrawn',
      description: 'The participant application was withdrawn and any related side effects were applied.'
    }
  )
}

async function approveApplicationGroup(applicationsToApprove: AdminApplicationRecord[]) {
  const submittedApplications = applicationsToApprove.filter(application => application.status === 'submitted')
  const shouldClearApproval = submittedApplications.length > 0
    && submittedApplications.every(application => application.preApprovalStatus === 'approved')
  const targetApplications = shouldClearApproval
    ? submittedApplications.filter(application => application.preApprovalStatus === 'approved')
    : submittedApplications.filter(application => application.preApprovalStatus !== 'approved')
  const sortedApplicationIds = submittedApplications
    .map(application => application.id)
    .sort((left, right) => left.localeCompare(right))

  if (targetApplications.length === 0) {
    return
  }

  await runMutation(
    `stage:approved-team:${sortedApplicationIds.join('__')}`,
    async () => await Promise.all(targetApplications.map(async application =>
      await $fetch<StageApplicationResponse>(
        `/api/hackathons/${application.hackathonId}/applications/${application.id}/actions/approve`,
        {
          method: 'POST'
        }
      )
    )),
    undefined,
    {
      skipRefresh: true,
      onSuccess: responses => replaceApplicationsLocally(responses.map(response => response.data))
    }
  )
}

async function applyStagedApplicationDecisions() {
  await runMutation(
    'apply-staged-decisions',
    async () => {
      const response = await $fetch<ApplyStagedApplicationDecisionsResponse>(
        `/api/hackathons/${hackathonId.value}/applications/actions/apply-staged-decisions`,
        {
          method: 'POST'
        }
      )

      if (response.data.appliedCount === 0) {
        throw createError({
          statusCode: 409,
          statusMessage: 'There are no staged decisions to apply.'
        })
      }
    },
    {
      title: 'Staged decisions applied',
      description: 'Application outcomes were applied and participant emails were queued.'
    }
  )
}

async function adminWithdrawSubmission(payload: {
  teamId: string
  requestedByUserId: string
  reason?: string
}) {
  await runMutation(
    `admin-withdraw:${payload.teamId}`,
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/teams/${payload.teamId}/submission/actions/admin-withdraw`, {
        method: 'POST',
        body: payload
      })
    },
    {
      title: 'Submission admin-withdrawn',
      description: 'The submission has been removed from competition on a recorded team-admin request.'
    }
  )
}

async function disqualifySubmission(payload: {
  teamId: string
  reason?: string
}) {
  await runMutation(
    `disqualify:${payload.teamId}`,
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/teams/${payload.teamId}/submission/actions/disqualify`, {
        method: 'POST',
        body: {
          reason: payload.reason
        }
      })
    },
    {
      title: 'Submission disqualified',
      description: 'The submission has been removed from competition through the admin workflow.'
    }
  )
}

async function runLifecycleAction() {
  if (!lifecycleControl.value) {
    return
  }

  if (
    lifecycleControl.value.key === 'start_final_deliberation'
    && currentHackathon.value?.state === 'pitch_review'
  ) {
    await startFinalDeliberation()
    return
  }

  if (
    lifecycleControl.value.key === 'announce_winners'
    && currentHackathon.value?.state === 'final_deliberation'
  ) {
    await announceWinners()
    return
  }

  await runMutation(
    'lifecycle',
    async () => {
      await $fetch(lifecycleControl.value!.endpoint, {
        method: 'POST'
      })
    },
    {
      title: 'Lifecycle updated',
      description: `${lifecycleControl.value.label} completed successfully.`
    }
  )
}
</script>

<template>
  <div class="space-y-8">
    <AppAlert
      v-if="mutationError"
      color="error"
      variant="soft"
      title="Admin operation failed"
      :description="mutationError"
    />

    <AppAlert
      v-if="workspace.hackathon.error.value"
      color="error"
      variant="soft"
      title="Unable to load hackathon"
      :description="workspace.hackathon.error.value.message"
    />

    <AppAlert
      v-else-if="currentHackathon && !canManage"
      color="warning"
      variant="soft"
      title="Admin access required"
      description="This hackathon is visible, but the current actor does not have hackathon-admin capabilities for its operational workspace."
    />

    <template v-else-if="currentHackathon">
      <section
        v-if="showLifecycleSection"
        class="space-y-4"
      >
        <div
          v-if="lifecycleMetricCards.length > 0"
          class="grid gap-4 md:grid-cols-2"
        >
          <div
            v-for="card in lifecycleMetricCards"
            :key="card.key"
            class="!border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 flex h-full flex-col gap-4 rounded-xl px-5 py-5"
          >
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {{ card.label }}
              </p>
              <p
                v-if="card.value"
                class="text-3xl font-semibold text-highlighted"
              >
                {{ card.value }}
              </p>
              <p
                v-if="card.description"
                class="text-sm text-toned"
              >
                {{ card.description }}
              </p>
            </div>

            <div
              v-if="card.breakdown?.length"
              class="grid gap-3 sm:grid-cols-2"
            >
              <div
                v-for="row in card.breakdown"
                :key="`${card.key}-${row.label}`"
                class="rounded-lg border border-black/8 bg-white/62 px-4 py-3 dark:border-white/[0.08] dark:bg-black/10"
              >
                <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  {{ row.label }}
                </p>
                <p class="mt-1 text-lg font-semibold text-highlighted">
                  {{ row.value }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <LazyAdminCompetitionShortlistPanel
          v-if="canLoadShortlist"
          :hackathon-state="currentHackathon.state"
          :shortlist="shortlistEntries"
          :is-shortlist-loading="shortlistStatus === 'pending'"
          :shortlist-error-message="shortlistStatus === 'error' ? shortlistErrorMessage : ''"
          :pending-action-key="pendingActionKey"
          @select-finalists="selectFinalists"
          @start-pitch="startPitch"
        />

        <AppCard
          v-if="!canLoadShortlist"
          :class="['rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60', lifecycleHeroClass]"
        >
          <div class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div class="lg:pr-6">
              <div class="grid gap-5 sm:grid-cols-2">
                <div
                  v-for="item in lifecycleSummaryItems"
                  :key="item.label"
                  class="space-y-2"
                >
                  <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                    {{ item.label }}
                  </p>
                  <p class="text-base font-semibold text-highlighted">
                    {{ item.value }}
                  </p>
                  <p class="text-sm text-toned">
                    {{ item.description }}
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-4 border-t border-black/8 pt-5 dark:border-white/[0.08] lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
              <div class="space-y-1">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  {{ lifecycleActionHeading }}
                </p>
                <h3 class="text-base font-semibold text-highlighted">
                  {{ lifecycleActionLabel }}
                </h3>
                <p class="text-sm text-toned">
                  {{ lifecycleActionDescription }}
                </p>
              </div>

              <div class="space-y-1">
                <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  {{ lifecycleActionAvailability.label }}
                </p>
                <p
                  class="text-sm"
                  :class="lifecycleActionAvailability.className"
                >
                  {{ lifecycleActionAvailability.message }}
                </p>
              </div>

              <AppButton
                v-if="lifecycleControl"
                :disabled="!lifecycleControl.isEnabled"
                color="primary"
                size="md"
                class="justify-center sm:justify-start"
                @click="runLifecycleAction"
              >
                {{ lifecycleControl.label }}
              </AppButton>
            </div>
          </div>
        </AppCard>

        <LazyAdminCompetitionAssignmentsPanel
          v-if="showAssignmentsPanel"
          :hackathon-state="currentHackathon.state"
          :assignments="assignments"
          :total-assignments="assignmentsTotal"
          :judge-choices="judgeChoices"
          :is-loading="assignmentsDataStatus === 'pending'"
          :error-message="assignmentsDataStatus === 'error' ? assignmentsErrorMessage : ''"
          :pending-action-key="pendingActionKey"
          @reassign="reassignAssignment"
          @force-skip="forceSkipAssignment"
        />

        <LazyAdminCompetitionPitchStagePanel
          v-if="showPitchStagePanel"
          :entries="pitchLineupEntries"
          :alert="pitchStageAlert"
          :can-advance="canAdvancePitchPresentation"
          :advance-label="advancePitchPresentationLabel"
          :pending-action-key="pendingActionKey"
          @advance="advancePitchPresentation"
        />

        <LazyAdminCompetitionPitchReviewPanel
          v-if="showPitchReviewPanel"
          :entries="pitchReviewCoverageEntries"
          :has-completed-pitch-reviews="hasCompletedPitchReviews"
          :can-start-final-deliberation="canStartFinalDeliberationFromPitchReview"
          :pending-action-key="pendingActionKey"
          @start-final-deliberation="startFinalDeliberation"
        />

        <LazyAdminCompetitionFinalDeliberationPanel
          v-if="showFinalDeliberationPanel"
          :hackathon="currentHackathon"
          :entries="finalDeliberation?.entries ?? []"
          :final-ranking-submission-ids="finalDeliberation?.finalRankingSubmissionIds ?? []"
          :is-loading="finalDeliberationStatus === 'pending'"
          :error-message="finalDeliberationStatus === 'error' ? finalDeliberationErrorMessage : ''"
          :pending-action-key="pendingActionKey"
          @draft-change="syncFinalDeliberationDraft"
          @reorder="reorderFinalDeliberation"
        />

        <LazyAdminCompetitionPrizeRedemptionsPanel
          v-if="showPrizeRedemptionsPanel"
          :hackathon-state="currentHackathon.state"
          :winners="winners"
          :redemptions="redemptions"
          :blind-ranking-entries="prizeRedemptionBlindRankingEntries"
          :final-ranking-entries="prizeRedemptionFinalRankingEntries"
          :pitch-presentation-submission-ids="currentHackathon.pitchPresentationSubmissionIds"
          :winner-terms-title="currentHackathon.currentTerms?.winnerTerms?.title ?? null"
          :is-loading="redemptionsStatus === 'pending'"
          :error-message="redemptionsStatus === 'error' ? redemptionsErrorMessage : ''"
        />
      </section>

      <section
        v-if="showParticipantsSection"
        class="space-y-4"
      >
        <LazyAccountHackathonParticipantsPanel
          :hackathon-id="hackathonId"
          :applications="applications"
          :is-loading="applicationsStatus === 'pending'"
          :error-message="applicationsStatus === 'error' ? applicationsErrorMessage : ''"
          :pending-action-key="pendingActionKey"
          :show-attendance="showCheckedInParticipantSummary"
          :participants-limit="currentHackathon.participantsLimit ?? null"
          @approve="approveApplication"
          @approve-team="approveApplicationGroup"
          @reject="rejectApplication"
          @withdraw="withdrawApplication"
          @save-decisions="applyStagedApplicationDecisions"
        />
      </section>

      <section
        v-if="showSubmissionsSection"
        class="space-y-6"
      >
        <LazyAdminSubmissionInterventionsPanel
          :hackathon-state="currentHackathon.state"
          :teams="sortedSubmissionTeams"
          :is-loading="submissionPanelStatus === 'pending'"
          :error-message="submissionPanelStatus === 'error' ? submissionPanelErrorMessage : ''"
          :pending-action-key="pendingActionKey"
          @disqualify="disqualifySubmission"
        />

        <LazyAdminTeamsOperationsPanel
          v-model:search="submissionSearchInput"
          v-model:filter="submissionStatusFilter"
          :hackathon-state="currentHackathon.state"
          :teams="filteredSubmissionTeams"
          :metrics="submissionDashboardMetrics"
          :pending-action-key="pendingActionKey"
          :is-loading="submissionPanelStatus === 'pending'"
          :error-message="submissionPanelStatus === 'error' ? submissionPanelErrorMessage : ''"
          @admin-withdraw="adminWithdrawSubmission"
        />
      </section>
    </template>
  </div>
</template>
