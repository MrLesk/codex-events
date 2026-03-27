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
  normalizeApiError
} from '~/utils/admin-workspace'

definePageMeta({
  layout: 'hackathon-detail',
  middleware: ['require-hackathon-admin']
})

const route = useRoute()
const toast = useToast()
const slug = computed(() => String(route.params.slug ?? '').trim())

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

const mutationError = ref('')
const pendingActionKey = ref<string | null>(null)

const currentHackathon = computed(() => workspace.currentHackathon.value)
const canManage = computed(() => workspace.canManageCurrentHackathon.value)
const headerStateLabel = computed(() =>
  currentHackathon.value ? formatHackathonState(currentHackathon.value.state).toUpperCase() : ''
)
const headerStateClass = computed(() => {
  if (currentHackathon.value?.state === 'submission_open') {
    return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
  }

  if (currentHackathon.value?.state === 'registration_open') {
    return 'border border-sky-600/35 bg-sky-500/16 text-sky-800 dark:border-sky-400/35 dark:bg-sky-500/14 dark:text-sky-300'
  }

  if (currentHackathon.value?.state === 'winners_announced') {
    return 'bg-green-500/10 text-green-400 border border-green-500/20'
  }

  return 'bg-white/[0.05] text-[#A3A3A3] border border-white/[0.08]'
})
const workspaceSummary = computed(() => {
  if (!currentHackathon.value) {
    return ''
  }

  return [
    formatHackathonWindow(currentHackathon.value.registrationOpensAt, currentHackathon.value.submissionClosesAt),
    currentHackathon.value.city,
    formatMaxTeamMembers(currentHackathon.value.maxTeamMembers)
  ].join(' • ')
})
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

const applicationSummaryValue = computed(() => {
  if (applicationsStatus.value === 'pending') {
    return 'Loading...'
  }

  if (applicationsStatus.value === 'error') {
    return 'Unavailable'
  }

  return `${applications.value.length}`
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

async function refreshOperations() {
  await workspace.refreshWorkspace()
  await loadOperationsData(currentTeamPage.value)
}

async function runMutation(actionKey: string, action: () => Promise<void>, successTitle: string, successDescription: string) {
  mutationError.value = ''
  pendingActionKey.value = actionKey

  try {
    await action()
    toast.add({
      title: successTitle,
      description: successDescription,
      color: 'success'
    })
    await refreshOperations()
  } catch (error) {
    mutationError.value = normalizeApiError(error).message
  } finally {
    pendingActionKey.value = null
  }
}

async function approveApplication(application: AdminApplicationRecord) {
  await runMutation(
    `approve:${application.id}`,
    async () => {
      await $fetch(`/api/hackathons/${application.hackathonId}/applications/${application.id}/actions/approve`, {
        method: 'POST'
      })
    },
    'Application approved',
    'The applicant can now create or join a team for this hackathon.'
  )
}

async function rejectApplication(application: AdminApplicationRecord) {
  await runMutation(
    `reject:${application.id}`,
    async () => {
      await $fetch(`/api/hackathons/${application.hackathonId}/applications/${application.id}/actions/reject`, {
        method: 'POST'
      })
    },
    'Application rejected',
    'The application review outcome has been recorded.'
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
    'Submission admin-withdrawn',
    'The submission has been removed from competition on a recorded team-admin request.'
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
    'Submission disqualified',
    'The submission has been removed from competition through the admin workflow.'
  )
}
</script>

<template>
  <div class="pb-14">
    <section class="border-b border-black/8 bg-white/42 backdrop-blur-lg dark:border-white/[0.08] dark:bg-black/48">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <AdminWorkspaceHeader
          eyebrow="Admin Operations"
          :title="currentHackathon ? `${currentHackathon.name} operations` : 'Hackathon operations'"
          description="Review applications, monitor teams and submission state, and run the admin-only interventions that do not belong in participant or judge workspaces."
          :back-to="`/account/hackathons/${slug}`"
          back-label="Back to hackathon detail"
          :state-label="headerStateLabel"
          :state-class="headerStateClass"
          :summary="workspaceSummary"
        />

        <AdminHackathonWorkspaceTabs
          v-if="currentHackathon"
          :hackathon-slug="currentHackathon.slug"
          current-surface="operations"
        />
      </AppContainer>
    </section>

    <AppContainer class="max-w-[68rem] space-y-8 pt-6">
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
        <section class="grid gap-4 lg:grid-cols-4">
          <div class="rounded-xl border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Hackathon state
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ formatHackathonState(currentHackathon.state) }}
            </p>
          </div>

          <div class="rounded-xl border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Applications
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ applicationSummaryValue }}
            </p>
          </div>

          <div class="rounded-xl border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Teams
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ teamSummaryValue }}
            </p>
          </div>

          <div class="rounded-xl border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111] px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Actionable interventions
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ actionableSummaryValue }}
            </p>
          </div>
        </section>

        <AdminApplicationsReviewPanel
          :applications="applications"
          :is-loading="applicationsStatus === 'pending'"
          :error-message="applicationsStatus === 'error' ? applicationsErrorMessage : ''"
          :pending-action-key="pendingActionKey"
          @approve="approveApplication"
          @reject="rejectApplication"
        />

        <section class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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
    </AppContainer>
  </div>
</template>
