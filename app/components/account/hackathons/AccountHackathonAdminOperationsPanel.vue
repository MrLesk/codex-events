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
  normalizeApiError
} from '~/utils/admin-workspace'

const props = defineProps<{
  slug: string
}>()

const toast = useToast()
const slug = computed(() => props.slug.trim())

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

const mutationError = ref('')
const pendingActionKey = ref<string | null>(null)

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
    `stage:approved:${application.id}`,
    async () => {
      await $fetch(`/api/hackathons/${application.hackathonId}/applications/${application.id}/actions/approve`, {
        method: 'POST'
      })
    },
    'Decision staged',
    'Approval was staged. It will apply only after you save staged decisions.'
  )
}

async function rejectApplication(application: AdminApplicationRecord) {
  await runMutation(
    `stage:rejected:${application.id}`,
    async () => {
      await $fetch(`/api/hackathons/${application.hackathonId}/applications/${application.id}/actions/reject`, {
        method: 'POST'
      })
    },
    'Decision staged',
    'Rejection was staged. It will apply only after you save staged decisions.'
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
    'Staged decisions applied',
    'Application outcomes were applied and participant emails were queued.'
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
    'Lifecycle updated',
    `${lifecycleControl.value.label} completed successfully.`
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
        <section class="grid gap-4 lg:grid-cols-4">
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
          v-if="lifecycleControl"
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

        <AdminApplicationsReviewPanel
          :applications="applications"
          :participants-limit="currentHackathon.participantsLimit ?? null"
          :is-loading="applicationsStatus === 'pending'"
          :error-message="applicationsStatus === 'error' ? applicationsErrorMessage : ''"
          :pending-action-key="pendingActionKey"
          @approve="approveApplication"
          @reject="rejectApplication"
          @save-decisions="applyStagedApplicationDecisions"
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
  </div>
</template>
