<script setup lang="ts">
import type {
  AdminApplicationRecord,
  AdminOperationalTeam,
  AdminTeamDetailRecord,
  ApiDataResponse,
  ApiListResponse,
  HackathonRecord,
  NoSubmissionEntry,
  SubmissionRecord,
  TeamSummary
} from '~/utils/admin-workspace'

import {
  buildAdminOperationalTeams,
  formatHackathonState,
  getAdminSubmissionInterventionPolicy,
  getCurrentLifecycleControl,
  getParticipantsLimitSummary,
  normalizeApiError
} from '~/utils/admin-workspace'

type AccountHackathonAdminOperationsSection = 'participants' | 'submissions' | 'operations'
type AccountHackathonParticipantView = 'applications' | 'approved' | 'rejected'

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
const adminOperationalTeamsPageSize = 3
type LoadStatus = 'idle' | 'pending' | 'success' | 'error'
type ApplyStagedApplicationDecisionsResponse = ApiDataResponse<{
  appliedCount: number
  approvedCount: number
  rejectedCount: number
}>
type StageApplicationResponse = ApiDataResponse<AdminApplicationRecord>

const mutationError = ref('')
const pendingActionKey = ref<string | null>(null)
const participantView = ref<AccountHackathonParticipantView>('applications')

const currentHackathon = computed(() => workspace.currentHackathon.value)
const canManage = computed(() => workspace.canManageCurrentHackathon.value)
const roleAssignments = computed(() => workspace.roleAssignments.data.value?.data ?? [])
const assignments = computed(() => workspace.assignments.data.value?.data ?? [])
const leaderboard = computed(() => workspace.leaderboard.data.value?.data ?? [])
const allTeams = computed(() => workspace.teams.data.value ?? [])
const noSubmissionTeams = computed(() => workspace.noSubmissionTeams.data.value?.data ?? [])
const prizes = computed(() => workspace.prizes.data.value?.data ?? [])
const applications = ref<AdminApplicationRecord[]>([])
const applicationsStatus = ref<LoadStatus>('idle')
const applicationsErrorMessage = ref('')

const paginatedTeams = ref<TeamSummary[]>([])
const totalTeams = ref(0)
const currentTeamPage = ref(1)
const teamsStatus = ref<LoadStatus>('idle')
const teamsErrorMessage = ref('')
const isLoadingMoreTeams = ref(false)
const loadMoreTeamsErrorMessage = ref('')

const noSubmissionEntries = ref<NoSubmissionEntry[]>([])
const noSubmissionStatus = ref<LoadStatus>('idle')
const noSubmissionErrorMessage = ref('')

const operationalTeams = ref<AdminOperationalTeam[]>([])
const operationalTeamsStatus = ref<LoadStatus>('idle')
const operationalTeamsErrorMessage = ref('')
const loadedTeamDetails = ref<Array<AdminTeamDetailRecord | null>>([])
const loadedTeamSubmissions = ref<Array<SubmissionRecord | null>>([])
const initializedHackathonId = ref<string | null>(null)
const hasMoreTeams = computed(() => paginatedTeams.value.length < totalTeams.value)

function toSectionErrorMessage(error: unknown, fallback: string) {
  const message = normalizeApiError(error).message
  return message && message.length > 0 ? message : fallback
}

function rebuildOperationalTeams() {
  operationalTeams.value = buildAdminOperationalTeams(paginatedTeams.value, {
    teamDetails: loadedTeamDetails.value,
    submissions: loadedTeamSubmissions.value,
    noSubmissionEntries: noSubmissionStatus.value === 'success' ? noSubmissionEntries.value : []
  })
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

async function loadNoSubmissionEntries() {
  noSubmissionStatus.value = 'pending'
  noSubmissionErrorMessage.value = ''

  try {
    const response = await $fetch<ApiDataResponse<NoSubmissionEntry[]>>(
      `/api/hackathons/${hackathonId.value}/no-submission-teams`
    )
    noSubmissionEntries.value = response.data
    noSubmissionStatus.value = 'success'
  } catch (error) {
    noSubmissionEntries.value = []
    noSubmissionStatus.value = 'error'
    noSubmissionErrorMessage.value = toSectionErrorMessage(
      error,
      'The computed no-submission section could not be loaded right now.'
    )
  } finally {
    rebuildOperationalTeams()
  }
}

async function fetchTeamPage(page: number) {
  return await $fetch<ApiListResponse<TeamSummary>>(`/api/hackathons/${hackathonId.value}/teams`, {
    query: {
      page,
      page_size: adminOperationalTeamsPageSize
    }
  })
}

async function loadOperationalTeamDetails() {
  if (paginatedTeams.value.length === 0) {
    loadedTeamDetails.value = []
    loadedTeamSubmissions.value = []
    operationalTeamsStatus.value = 'success'
    operationalTeamsErrorMessage.value = ''
    rebuildOperationalTeams()
    return
  }

  operationalTeamsStatus.value = 'pending'
  operationalTeamsErrorMessage.value = ''

  try {
    const [teamDetails, teamSubmissions] = await Promise.all([
      Promise.all(paginatedTeams.value.map(async (team) => {
        const response = await $fetch<ApiDataResponse<AdminTeamDetailRecord>>(
          `/api/hackathons/${hackathonId.value}/teams/${team.id}`
        )

        return response.data
      })),
      Promise.all(paginatedTeams.value.map(async (team) => {
        const response = await $fetch<ApiDataResponse<SubmissionRecord | null>>(
          `/api/hackathons/${hackathonId.value}/teams/${team.id}/submission`
        )

        return response.data
      }))
    ])

    loadedTeamDetails.value = teamDetails
    loadedTeamSubmissions.value = teamSubmissions
    operationalTeamsStatus.value = 'success'
    rebuildOperationalTeams()
  } catch (error) {
    loadedTeamDetails.value = []
    loadedTeamSubmissions.value = []
    operationalTeams.value = []
    operationalTeamsStatus.value = 'error'
    operationalTeamsErrorMessage.value = toSectionErrorMessage(
      error,
      'Detailed team and submission records could not be loaded right now.'
    )
  }
}

async function loadTeamPages(pageCount: number, options?: { loadMore?: boolean }) {
  const isLoadMore = options?.loadMore ?? false

  if (isLoadMore) {
    isLoadingMoreTeams.value = true
    loadMoreTeamsErrorMessage.value = ''
  } else {
    teamsStatus.value = 'pending'
    teamsErrorMessage.value = ''
    loadMoreTeamsErrorMessage.value = ''
  }

  try {
    const responses = await Promise.all(
      Array.from({ length: pageCount }, async (_, index) => await fetchTeamPage(index + 1))
    )
    const nextTeams = responses.flatMap(response => response.data)
    const uniqueTeams = nextTeams.filter((team, index, items) =>
      items.findIndex(candidate => candidate.id === team.id) === index
    )

    paginatedTeams.value = uniqueTeams
    totalTeams.value = responses.at(-1)?.meta?.total ?? uniqueTeams.length
    currentTeamPage.value = pageCount
    teamsStatus.value = 'success'
    await loadOperationalTeamDetails()
  } catch (error) {
    if (isLoadMore) {
      loadMoreTeamsErrorMessage.value = toSectionErrorMessage(
        error,
        'More teams could not be loaded right now.'
      )
      return
    }

    paginatedTeams.value = []
    totalTeams.value = 0
    currentTeamPage.value = 1
    teamsStatus.value = 'error'
    teamsErrorMessage.value = toSectionErrorMessage(
      error,
      'Team records could not be loaded right now.'
    )
    loadedTeamDetails.value = []
    loadedTeamSubmissions.value = []
    operationalTeams.value = []
    operationalTeamsStatus.value = 'idle'
    operationalTeamsErrorMessage.value = ''
  } finally {
    if (isLoadMore) {
      isLoadingMoreTeams.value = false
    }
  }
}

async function loadMoreTeams() {
  if (isLoadingMoreTeams.value || !hasMoreTeams.value) {
    return
  }

  await loadTeamPages(currentTeamPage.value + 1, {
    loadMore: true
  })
}

async function loadOperationsData(pageCount: number = 1) {
  await Promise.all([
    loadApplications(),
    loadNoSubmissionEntries(),
    loadTeamPages(pageCount)
  ])
}

watch([() => currentHackathon.value?.id, canManage], async ([id, allowed]) => {
  if (!id || !allowed) {
    return
  }

  if (initializedHackathonId.value === id) {
    return
  }

  initializedHackathonId.value = id
  await loadOperationsData(1)
}, {
  immediate: true
})

const actionableTeamCount = computed(() => {
  const hackathonState = currentHackathon.value?.state

  if (!hackathonState || operationalTeamsStatus.value !== 'success') {
    return 0
  }

  return operationalTeams.value.filter((team) => {
    const policy = getAdminSubmissionInterventionPolicy(hackathonState, team.submissionStatus)
    return policy.canAdminWithdraw || policy.canDisqualify
  }).length
})

const showParticipantsSection = computed(() => section.value === 'participants')
const showSubmissionsSection = computed(() => section.value === 'submissions')
const showLifecycleSection = computed(() => section.value === 'operations')

const applicationSummaryValue = computed(() => {
  if (applicationsStatus.value === 'idle' || applicationsStatus.value === 'pending') {
    return 'Loading...'
  }

  if (applicationsStatus.value === 'error') {
    return 'Unavailable'
  }

  return `${applications.value.length}`
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

const rejectedParticipantSummaryValue = computed(() =>
  formatParticipantMetricValue(
    applications.value.filter(application => application.status === 'rejected').length
  )
)

const participantsLimitSummary = computed(() =>
  getParticipantsLimitSummary(
    applications.value,
    currentHackathon.value?.participantsLimit ?? null
  )
)

const filteredParticipantCount = computed(() => {
  if (participantView.value === 'approved') {
    return applications.value.filter(application => application.status === 'approved').length
  }

  if (participantView.value === 'rejected') {
    return applications.value.filter(application => application.status === 'rejected').length
  }

  return applications.value.filter(application => application.status === 'submitted').length
})

const participantFilterTotalLabel = computed(() => {
  if (applicationsStatus.value === 'idle' || applicationsStatus.value === 'pending') {
    return 'Loading...'
  }

  if (applicationsStatus.value === 'error') {
    return 'Unavailable'
  }

  if (participantView.value === 'approved') {
    return `${filteredParticipantCount.value} approved participants`
  }

  if (participantView.value === 'rejected') {
    return `${filteredParticipantCount.value} rejected participants`
  }

  return `${filteredParticipantCount.value} applications`
})

const teamSummaryValue = computed(() => {
  if (teamsStatus.value === 'pending' || operationalTeamsStatus.value === 'pending') {
    return 'Loading...'
  }

  if (teamsStatus.value === 'error' || operationalTeamsStatus.value === 'error') {
    return 'Unavailable'
  }

  return `${operationalTeams.value.length}`
})

const actionableSummaryValue = computed(() => {
  if (operationalTeamsStatus.value === 'pending') {
    return 'Loading...'
  }

  if (operationalTeamsStatus.value === 'error' || teamsStatus.value === 'error') {
    return 'Unavailable'
  }

  return `${actionableTeamCount.value}`
})

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

async function refreshOperations() {
  await workspace.refreshWorkspace()
  await loadOperationsData(currentTeamPage.value)
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
        class="grid gap-4 lg:grid-cols-4"
      >
        <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Hackathon state
          </p>
          <p class="mt-2 text-xl font-semibold text-highlighted">
            {{ formatHackathonState(currentHackathon.state) }}
          </p>
        </div>

        <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Applications
          </p>
          <p class="mt-2 text-xl font-semibold text-highlighted">
            {{ applicationSummaryValue }}
          </p>
        </div>

        <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Teams
          </p>
          <p class="mt-2 text-xl font-semibold text-highlighted">
            {{ teamSummaryValue }}
          </p>
        </div>

        <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Actionable interventions
          </p>
          <p class="mt-2 text-xl font-semibold text-highlighted">
            {{ actionableSummaryValue }}
          </p>
        </div>
      </section>

      <AppCard
        v-if="showLifecycleSection && lifecycleControl"
        class="rounded-xl hackathon-workspace-detail-panel"
      >
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Next Lifecycle Action
            </h2>
            <p class="text-sm text-muted">
              Execute state transitions from operations once readiness criteria are met.
            </p>
          </div>
        </template>

        <div class="grid gap-4">
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Action
            </p>
            <h3 class="text-base font-semibold text-highlighted">
              {{ lifecycleControl.label }}
            </h3>
            <p class="text-sm text-toned">
              {{ lifecycleControl.description }}
            </p>
          </div>

          <AppAlert
            v-if="lifecycleControl.reason"
            color="warning"
            variant="soft"
            title="Not ready yet"
            :description="lifecycleControl.reason"
          />

          <AppButton
            :disabled="!lifecycleControl.isEnabled"
            color="primary"
            size="lg"
            class="justify-center sm:justify-start"
            @click="runLifecycleAction"
          >
            {{ lifecycleControl.label }}
          </AppButton>
        </div>
      </AppCard>

      <section
        v-if="showParticipantsSection"
        class="space-y-4"
      >
        <div
          class="grid gap-4 md:grid-cols-2"
          :class="participantsLimitSummary ? 'xl:grid-cols-4' : 'xl:grid-cols-3'"
        >
          <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Awaiting review
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ submittedParticipantSummaryValue }}
            </p>
          </div>

          <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Approved
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ approvedParticipantSummaryValue }}
            </p>
          </div>

          <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Rejected
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ rejectedParticipantSummaryValue }}
            </p>
          </div>

          <div
            v-if="participantsLimitSummary"
            class="rounded-xl hackathon-workspace-detail-inset px-5 py-5"
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
          <div class="flex min-w-0 flex-wrap items-center gap-1">
            <button
              class="rounded-lg px-4 py-1.5 text-[13px] transition-colors"
              :class="participantView === 'applications' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'text-neutral-700 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="selectParticipantView('applications')"
            >
              Applications
            </button>
            <button
              class="rounded-lg px-4 py-1.5 text-[13px] transition-colors"
              :class="participantView === 'approved' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'text-neutral-700 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="selectParticipantView('approved')"
            >
              Approved
            </button>
            <button
              class="rounded-lg px-4 py-1.5 text-[13px] transition-colors"
              :class="participantView === 'rejected' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'text-neutral-700 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
              @click="selectParticipantView('rejected')"
            >
              Rejected
            </button>
            <span class="ml-4 border-l border-black/8 pl-4 text-[13px] text-neutral-700 dark:border-white/[0.08] dark:text-[#8C8C8C]">
              {{ participantFilterTotalLabel }}
            </span>
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
          @approve="approveApplication"
          @approve-team="approveApplicationGroup"
          @reject="rejectApplication"
          @save-decisions="applyStagedApplicationDecisions"
        />
      </section>

      <section
        v-if="showSubmissionsSection"
        class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]"
      >
        <AdminTeamsOperationsPanel
          :teams="operationalTeams"
          :total-teams="totalTeams"
          :is-loading-teams="teamsStatus === 'pending' || operationalTeamsStatus === 'pending'"
          :team-error-message="teamsStatus === 'error' ? teamsErrorMessage : operationalTeamsStatus === 'error' ? operationalTeamsErrorMessage : ''"
          :is-loading-no-submission="noSubmissionStatus === 'pending'"
          :no-submission-error-message="noSubmissionStatus === 'error' ? noSubmissionErrorMessage : ''"
          :has-more-teams="hasMoreTeams"
          :is-loading-more-teams="isLoadingMoreTeams"
          :load-more-teams-error-message="loadMoreTeamsErrorMessage"
          @load-more-teams="loadMoreTeams"
        />

        <AdminSubmissionInterventionsPanel
          :hackathon-state="currentHackathon.state"
          :teams="operationalTeams"
          :is-loading="teamsStatus === 'pending' || operationalTeamsStatus === 'pending'"
          :error-message="teamsStatus === 'error' ? teamsErrorMessage : operationalTeamsStatus === 'error' ? operationalTeamsErrorMessage : ''"
          :pending-action-key="pendingActionKey"
          @admin-withdraw="adminWithdrawSubmission"
          @disqualify="disqualifySubmission"
        />
      </section>
    </template>
  </div>
</template>
