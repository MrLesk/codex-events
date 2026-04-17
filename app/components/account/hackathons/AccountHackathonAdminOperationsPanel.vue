<script setup lang="ts">
import type {
  AdminApplicationRecord,
  AdminOperationalTeam,
  AdminTeamDetailRecord,
  AdminSubmissionDashboardFilter,
  ApiDataResponse,
  ApiListResponse,
  HackathonRecord,
  SubmissionRecord
} from '~/utils/admin-workspace'

import {
  buildAdminOperationalTeams,
  filterAdminOperationalTeams,
  getApprovedParticipantAttendanceSummary,
  getCurrentLifecycleControl,
  getAdminSubmissionDashboardMetrics,
  getHackathonOperationsPhase,
  formatHackathonState,
  getHackathonStateColor,
  getParticipantsLimitSummary,
  shouldShowApprovedParticipantAttendanceSummary,
  sortAdminOperationalTeamsForSubmissionDashboard,
  normalizeApiError
} from '~/utils/admin-workspace'
import { formatTimestamp } from '~/utils/date-formatting'

type AccountHackathonAdminOperationsSection = 'participants' | 'submissions' | 'operations'
type AccountHackathonParticipantView = 'applications' | 'approved' | 'rejected' | 'withdrawn'
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
const workspace = useAdminHackathonWorkspace(hackathonId)
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

const mutationError = ref('')
const pendingActionKey = ref<string | null>(null)
const participantView = ref<AccountHackathonParticipantView>('applications')
const showParticipantsSection = computed(() => section.value === 'participants')
const showSubmissionsSection = computed(() => section.value === 'submissions')
const showLifecycleSection = computed(() => section.value === 'operations')

const currentHackathon = computed(() => workspace.currentHackathon.value)
const canManage = computed(() => workspace.canManageCurrentHackathon.value)
const roleAssignments = computed(() => workspace.roleAssignments.data.value?.data ?? [])
const assignments = computed(() => workspace.assignments.data.value?.data ?? [])
const leaderboard = computed(() => workspace.leaderboard.data.value?.data ?? [])
const allTeams = computed(() => workspace.teams.data.value ?? [])
const prizes = computed(() => workspace.prizes.data.value?.data ?? [])
const applications = ref<AdminApplicationRecord[]>([])
const applicationsStatus = ref<LoadStatus>('idle')
const applicationsErrorMessage = ref('')
const submissionSearchInput = ref('')
const submissionStatusFilter = ref<AdminSubmissionDashboardFilter>('all')
const initializedHackathonId = ref<string | null>(null)
const noSubmissionTeams = computed(() => workspace.noSubmissionTeams.data.value?.data ?? [])
const noSubmissionStatus = computed<LoadStatus>(() => normalizeAsyncStatus(workspace.noSubmissionTeams.status.value))
const noSubmissionErrorMessage = computed(() =>
  workspace.noSubmissionTeams.error.value?.message ?? ''
)
const teamIdsKey = computed(() => allTeams.value.map(team => team.id).join(':'))
const submissionMonitorEnabled = computed(() =>
  showSubmissionsSection.value && canManage.value
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
    teamIdsKey.value
  ].join(':'),
  async () => {
    if (!submissionMonitorEnabled.value) {
      return {
        teamDetails: [],
        teamSubmissions: []
      }
    }

    if (allTeams.value.length === 0) {
      return {
        teamDetails: [],
        teamSubmissions: []
      }
    }

    const [teamDetails, teamSubmissions] = await Promise.all([
      Promise.all(allTeams.value.map(async (team) => {
        const response = await apiFetch<ApiDataResponse<AdminTeamDetailRecord>>(
          `/api/hackathons/${hackathonId.value}/teams/${team.id}`
        )

        return response.data
      })),
      Promise.all(allTeams.value.map(async (team) => {
        const response = await apiFetch<ApiDataResponse<SubmissionRecord | null>>(
          `/api/hackathons/${hackathonId.value}/teams/${team.id}/submission`
        )

        return response.data
      }))
    ])

    return {
      teamDetails,
      teamSubmissions
    }
  },
  {
    watch: [hackathonId, teamIdsKey, submissionMonitorEnabled],
    default: () => ({
      teamDetails: [],
      teamSubmissions: []
    })
  }
)

function toSectionErrorMessage(error: unknown, fallback: string) {
  const message = normalizeApiError(error).message
  return message && message.length > 0 ? message : fallback
}

async function loadApplications() {
  applicationsStatus.value = 'pending'
  applicationsErrorMessage.value = ''

  try {
    const response = await $fetch<ApiListResponse<AdminApplicationRecord>>(
      `/api/hackathons/${hackathonId.value}/applications`
    )
    applications.value = response.data
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

watch([() => currentHackathon.value?.id, canManage], async ([id, allowed]) => {
  if (!id || !allowed) {
    return
  }

  if (initializedHackathonId.value === id) {
    return
  }

  initializedHackathonId.value = id
  await loadApplications()
}, {
  immediate: true
})

function formatParticipantMetricValue(value: number) {
  if (applicationsStatus.value === 'idle' || applicationsStatus.value === 'pending') {
    return 'Loading...'
  }

  if (applicationsStatus.value === 'error') {
    return 'Unavailable'
  }

  return `${value}`
}

const submittedParticipantSummaryValue = computed(() =>
  formatParticipantMetricValue(
    applications.value.filter(application => application.status === 'submitted').length
  )
)

const approvedParticipantSummaryValue = computed(() =>
  formatParticipantMetricValue(
    applications.value.filter(application => application.status === 'approved').length
  )
)

const checkedInParticipantSummaryValue = computed(() => {
  if (applicationsStatus.value === 'idle' || applicationsStatus.value === 'pending') {
    return 'Loading...'
  }

  if (applicationsStatus.value === 'error') {
    return 'Unavailable'
  }

  return getApprovedParticipantAttendanceSummary(applications.value).value
})
const showCheckedInParticipantSummary = computed(() =>
  shouldShowApprovedParticipantAttendanceSummary(currentHackathon.value)
)

const rejectedParticipantSummaryValue = computed(() =>
  formatParticipantMetricValue(
    applications.value.filter(application => application.status === 'rejected').length
  )
)

const withdrawnParticipantSummaryValue = computed(() =>
  formatParticipantMetricValue(
    applications.value.filter(application => application.status === 'withdrawn').length
  )
)

const participantsLimitSummary = computed(() =>
  getParticipantsLimitSummary(
    applications.value,
    currentHackathon.value?.participantsLimit ?? null
  )
)

const lifecycleMetrics = computed(() => {
  const lockedEntries = leaderboard.value.filter(entry => entry.submissionStatus === 'locked')

  return {
    submittedSubmissionCount: Math.max(allTeams.value.length - noSubmissionTeams.value.length, 0),
    judgePoolCount: roleAssignments.value.filter(assignment => assignment.isInJudgePool).length,
    lockedSubmissionCount: lockedEntries.length,
    activeAssignmentCount: assignments.value.length,
    lockedLeaderboardEntryCount: lockedEntries.length,
    completedReviewCount: lockedEntries.filter(entry => entry.reviewStatus === 'judge_completed').length,
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

const teamDataStatus = computed(() => normalizeAsyncStatus(workspace.teams.status.value))
const submissionMonitorLoadStatus = computed<LoadStatus>(() => normalizeAsyncStatus(submissionMonitorStatus.value))
const leaderboardDataStatus = computed(() => normalizeAsyncStatus(workspace.leaderboard.status.value))
const roleAssignmentsDataStatus = computed(() => normalizeAsyncStatus(workspace.roleAssignments.status.value))
const submissionOperationalTeams = computed<AdminOperationalTeam[]>(() =>
  buildAdminOperationalTeams(allTeams.value, {
    teamDetails: submissionMonitorData.value?.teamDetails ?? [],
    submissions: submissionMonitorData.value?.teamSubmissions ?? [],
    noSubmissionEntries: noSubmissionTeams.value
  })
)
const sortedSubmissionTeams = computed(() =>
  sortAdminOperationalTeamsForSubmissionDashboard(submissionOperationalTeams.value)
)
const filteredSubmissionTeams = computed(() =>
  filterAdminOperationalTeams(sortedSubmissionTeams.value, {
    filter: submissionStatusFilter.value,
    search: submissionSearchInput.value
  })
)
const submissionDashboardMetrics = computed(() =>
  getAdminSubmissionDashboardMetrics(submissionOperationalTeams.value)
)
const submissionPanelStatus = computed(() =>
  combineLoadStatuses([teamDataStatus.value, noSubmissionStatus.value, submissionMonitorLoadStatus.value])
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
  workspace.teams.error.value?.message
  || noSubmissionErrorMessage.value
  || submissionMonitorErrorMessage.value
)
const operationsPhase = computed(() =>
  currentHackathon.value ? getHackathonOperationsPhase(currentHackathon.value.state) : null
)

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

const submittedSubmissionCount = computed(() =>
  Math.max(allTeams.value.length - noSubmissionTeams.value.length, 0)
)

const draftSubmissionCount = computed(() =>
  noSubmissionTeams.value.filter(entry => entry.submission?.status === 'draft').length
)

const draftSubmissionValue = computed(() =>
  formatLoadMetricValue(noSubmissionStatus.value, `${draftSubmissionCount.value}`)
)

const submittedSubmissionValue = computed(() =>
  formatLoadMetricValue(
    combineLoadStatuses([teamDataStatus.value, noSubmissionStatus.value]),
    `${submittedSubmissionCount.value} / ${allTeams.value.length}`
  )
)

const lockedSubmissionCount = computed(() =>
  leaderboard.value.filter(entry => entry.submissionStatus === 'locked').length
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
    return 'No finalist is enabled yet. Start the live lineup from the Competition tab.'
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
            description: 'Submitted projects are locked and the next judging stage is being prepared.'
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
            description: 'Continue from the Competition tab once the shortlist order and finalist boundary are saved.'
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
              : 'Finish the live lineup from the Competition tab before pitch review can start.'
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
            description: 'Final ranking review can start once you are ready to close pitch review.'
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
          description: 'Reviews and competition outcomes are now in progress.'
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
        message: 'Use the Competition tab to save the shortlist order and start pitch.',
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
          message: `The submission window closes on ${formatTimestamp(hackathon.submissionClosesAt, 'the submission deadline')}. Judging preparation becomes available after that.`,
          className: 'text-warning'
        }
      }

      if (control.code === 'submitted_submissions_required') {
        return {
          label: 'Available when',
          message: 'At least one team needs to send a submission before judging preparation can start.',
          className: 'text-warning'
        }
      }

      if (control.code === 'judge_pool_required') {
        return {
          label: 'Available when',
          message: 'At least one judge must be added to the judge pool before judging preparation can start.',
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
    return 'Continue From Competition'
  }

  return 'No further lifecycle actions'
})

const lifecycleActionDescription = computed(() => {
  if (lifecycleControl.value) {
    return lifecycleControl.value.description
  }

  if (currentHackathon.value?.state === 'shortlist') {
    return 'Shortlist order and finalist selection are managed from the Competition tab because the next transition depends on the saved shortlist.'
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
      if (currentHackathon.value?.state === 'judging_preparation' || currentHackathon.value?.state === 'blind_review') {
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
            value: formatLoadMetricValue(leaderboardDataStatus.value, `${lockedSubmissionCount.value}`),
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
    refreshSubmissionMonitor()
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

function selectParticipantView(nextView: AccountHackathonParticipantView) {
  participantView.value = nextView
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
            class="hackathon-workspace-detail-inset flex h-full flex-col gap-4 rounded-xl px-5 py-5"
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

        <AppCard
          :class="['rounded-xl hackathon-workspace-detail-panel', lifecycleHeroClass]"
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
      </section>

      <section
        v-if="showParticipantsSection"
        class="space-y-4"
      >
        <div
          class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
          :class="participantsLimitSummary && showCheckedInParticipantSummary ? 'xl:grid-cols-5' : ''"
        >
          <div class="rounded-xl hackathon-workspace-detail-inset px-4 py-4 sm:px-5 sm:py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Awaiting review
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ submittedParticipantSummaryValue }}
            </p>
          </div>

          <div class="rounded-xl hackathon-workspace-detail-inset px-4 py-4 sm:px-5 sm:py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Approved
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ approvedParticipantSummaryValue }}
            </p>
          </div>

          <div
            v-if="showCheckedInParticipantSummary"
            class="rounded-xl hackathon-workspace-detail-inset px-4 py-4 sm:px-5 sm:py-5"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Checked in
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ checkedInParticipantSummaryValue }}
            </p>
            <p class="mt-1 text-xs text-muted">
              Of approved participants
            </p>
          </div>

          <div class="rounded-xl hackathon-workspace-detail-inset px-4 py-4 sm:px-5 sm:py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Rejected
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ rejectedParticipantSummaryValue }}
            </p>
          </div>

          <div
            v-if="participantsLimitSummary"
            class="col-span-2 rounded-xl hackathon-workspace-detail-inset px-4 py-4 sm:col-span-4 sm:px-5 sm:py-5 xl:col-span-1"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Participants limit
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ participantsLimitSummary.participantsLimit }}
            </p>
          </div>
        </div>

        <div class="hackathon-workspace-detail-inset flex flex-col gap-4 rounded-xl p-2">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <button
              class="inline-flex min-w-max grow basis-0 items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:min-w-0 sm:grow-0 sm:basis-auto sm:justify-start"
              :class="participantView === 'applications' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
              @click="selectParticipantView('applications')"
            >
              <span>New</span>
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
                :class="participantView === 'applications' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
              >
                {{ submittedParticipantSummaryValue }}
              </span>
            </button>
            <button
              class="inline-flex min-w-max grow basis-0 items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:min-w-0 sm:grow-0 sm:basis-auto sm:justify-start"
              :class="participantView === 'approved' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
              @click="selectParticipantView('approved')"
            >
              <span>Approved</span>
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
                :class="participantView === 'approved' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
              >
                {{ approvedParticipantSummaryValue }}
              </span>
            </button>
            <button
              class="inline-flex min-w-max grow basis-0 items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:min-w-0 sm:grow-0 sm:basis-auto sm:justify-start"
              :class="participantView === 'rejected' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
              @click="selectParticipantView('rejected')"
            >
              <span>Rejected</span>
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
                :class="participantView === 'rejected' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
              >
                {{ rejectedParticipantSummaryValue }}
              </span>
            </button>
            <button
              class="inline-flex min-w-max grow basis-0 items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:min-w-0 sm:grow-0 sm:basis-auto sm:justify-start"
              :class="participantView === 'withdrawn' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
              @click="selectParticipantView('withdrawn')"
            >
              <span>Withdrawn</span>
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
                :class="participantView === 'withdrawn' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
              >
                {{ withdrawnParticipantSummaryValue }}
              </span>
            </button>
          </div>
        </div>

        <AdminApplicationsReviewPanel
          :hackathon-id="hackathonId"
          :applications="applications"
          :view="participantView"
          :is-loading="applicationsStatus === 'pending'"
          :error-message="applicationsStatus === 'error' ? applicationsErrorMessage : ''"
          :pending-action-key="pendingActionKey"
          search-enabled
          show-attendance
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
        <AdminSubmissionInterventionsPanel
          :hackathon-state="currentHackathon.state"
          :teams="sortedSubmissionTeams"
          :is-loading="submissionPanelStatus === 'pending'"
          :error-message="submissionPanelStatus === 'error' ? submissionPanelErrorMessage : ''"
          :pending-action-key="pendingActionKey"
          @disqualify="disqualifySubmission"
        />

        <AdminTeamsOperationsPanel
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
