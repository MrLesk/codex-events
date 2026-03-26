<script setup lang="ts">
import type {
  ApiDataResponse,
  ApiListResponse,
  HackathonRecord,
  HackathonRoleAssignment,
  JudgeAssignmentSummary,
  LeaderboardEntry,
  ShortlistEntry,
  WinnerEntry
} from '~/utils/admin-workspace'
import type { PrizeRedemptionAdminView, PrizeRedemptionRecord } from '~/utils/prize-redemptions'

import {
  formatHackathonState,
  getCurrentLifecycleControl,
  getHackathonStateColor,
  normalizeApiError
} from '~/utils/admin-workspace'

definePageMeta({
  layout: 'hackathon-detail',
  middleware: ['require-hackathon-admin']
})

type LoadStatus = 'idle' | 'pending' | 'success' | 'error'

type JudgeChoice = {
  value: string
  label: string
}

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
  key: () => `admin-hackathon-competition:${slug.value}`
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

const mutationError = ref('')
const pendingActionKey = ref<string | null>(null)
const initializedHackathonId = ref<string | null>(null)

const assignments = ref<JudgeAssignmentSummary[]>([])
const assignmentsStatus = ref<LoadStatus>('idle')
const assignmentsErrorMessage = ref('')

const leaderboardEntries = ref<LeaderboardEntry[]>([])
const leaderboardStatus = ref<LoadStatus>('idle')
const leaderboardErrorMessage = ref('')

const shortlistEntries = ref<ShortlistEntry[]>([])
const shortlistStatus = ref<LoadStatus>('idle')
const shortlistErrorMessage = ref('')

const winners = ref<WinnerEntry[]>([])
const winnersStatus = ref<LoadStatus>('idle')
const winnersErrorMessage = ref('')

const redemptions = ref<PrizeRedemptionRecord[]>([])
const redemptionsStatus = ref<LoadStatus>('idle')
const redemptionsErrorMessage = ref('')

const currentHackathon = computed(() => workspace.currentHackathon.value)
const canManage = computed(() => workspace.canManageCurrentHackathon.value)
const prizes = computed(() => workspace.prizes.data.value?.data ?? [])
const roleAssignments = computed(() => workspace.roleAssignments.data.value?.data ?? [])

const canLoadShortlist = computed(() =>
  Boolean(currentHackathon.value && ['shortlist', 'winners_announced', 'completed'].includes(currentHackathon.value.state))
)

const canLoadWinners = computed(() =>
  Boolean(currentHackathon.value && ['winners_announced', 'completed'].includes(currentHackathon.value.state))
)

const judgeChoices = computed<JudgeChoice[]>(() =>
  roleAssignments.value
    .filter((assignment): assignment is HackathonRoleAssignment & { user: NonNullable<HackathonRoleAssignment['user']> } =>
      assignment.role === 'judge' && assignment.isInJudgePool && Boolean(assignment.user)
    )
    .map(assignment => ({
      value: assignment.userId,
      label: `${assignment.user.displayName} (${assignment.user.email})`
    }))
)

const rankedLeaderboardEntries = computed(() =>
  leaderboardEntries.value.filter(entry => entry.rank !== null)
)

const outcomeControl = computed(() => {
  if (!currentHackathon.value || !['shortlist', 'winners_announced'].includes(currentHackathon.value.state)) {
    return null
  }

  const lockedEntries = leaderboardEntries.value.filter(entry => entry.submissionStatus === 'locked')

  return getCurrentLifecycleControl(currentHackathon.value, {
    submittedSubmissionCount: 0,
    judgePoolCount: judgeChoices.value.length,
    lockedSubmissionCount: lockedEntries.length,
    activeAssignmentCount: assignments.value.filter(assignment =>
      assignment.status === 'assigned' || assignment.status === 'judge_started'
    ).length,
    lockedLeaderboardEntryCount: lockedEntries.length,
    completedReviewCount: lockedEntries.filter(entry => entry.reviewStatus === 'judge_completed').length,
    prizeCount: prizes.value.length,
    hasCurrentWinnerTerms: Boolean(currentHackathon.value.currentTerms?.winnerTerms)
  })
})

const assignmentSummaryValue = computed(() => {
  if (assignmentsStatus.value === 'pending') {
    return 'Loading...'
  }

  if (assignmentsStatus.value === 'error') {
    return 'Unavailable'
  }

  return `${assignments.value.length}`
})

const leaderboardSummaryValue = computed(() => {
  if (leaderboardStatus.value === 'pending') {
    return 'Loading...'
  }

  if (leaderboardStatus.value === 'error') {
    return 'Unavailable'
  }

  return `${rankedLeaderboardEntries.value.length}`
})

const shortlistSummaryValue = computed(() => {
  if (!canLoadShortlist.value) {
    return 'Unavailable'
  }

  if (shortlistStatus.value === 'pending') {
    return 'Loading...'
  }

  if (shortlistStatus.value === 'error') {
    return 'Unavailable'
  }

  return `${shortlistEntries.value.length}`
})

const winnerSummaryValue = computed(() => {
  if (!canLoadWinners.value) {
    return 'Pending announcement'
  }

  if (winnersStatus.value === 'pending') {
    return 'Loading...'
  }

  if (winnersStatus.value === 'error') {
    return 'Unavailable'
  }

  return `${winners.value.length}`
})

function toSectionErrorMessage(error: unknown, fallback: string) {
  const message = normalizeApiError(error).message
  return message && message.length > 0 ? message : fallback
}

async function loadAssignments() {
  assignmentsStatus.value = 'pending'
  assignmentsErrorMessage.value = ''

  try {
    const response = await $fetch<ApiListResponse<JudgeAssignmentSummary>>(
      `/api/hackathons/${hackathonId.value}/judging/assignments`
    )
    assignments.value = response.data
    assignmentsStatus.value = 'success'
  } catch (error) {
    assignments.value = []
    assignmentsStatus.value = 'error'
    assignmentsErrorMessage.value = toSectionErrorMessage(
      error,
      'Assignment oversight data could not be loaded right now.'
    )
  }
}

async function loadLeaderboard() {
  leaderboardStatus.value = 'pending'
  leaderboardErrorMessage.value = ''

  try {
    const response = await $fetch<ApiListResponse<LeaderboardEntry>>(
      `/api/hackathons/${hackathonId.value}/leaderboard`
    )
    leaderboardEntries.value = response.data
    leaderboardStatus.value = 'success'
  } catch (error) {
    leaderboardEntries.value = []
    leaderboardStatus.value = 'error'
    leaderboardErrorMessage.value = toSectionErrorMessage(
      error,
      'Competition leaderboard data could not be loaded right now.'
    )
  }
}

async function loadShortlist() {
  if (!canLoadShortlist.value) {
    shortlistEntries.value = []
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
    shortlistStatus.value = 'success'
  } catch (error) {
    shortlistEntries.value = []
    shortlistStatus.value = 'error'
    shortlistErrorMessage.value = toSectionErrorMessage(
      error,
      'Shortlist ranking data could not be loaded right now.'
    )
  }
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
  if (!canLoadWinners.value) {
    redemptions.value = []
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
    redemptions.value = response.data.redemptions
    redemptionsStatus.value = 'success'
  } catch (error) {
    redemptions.value = []
    redemptionsStatus.value = 'error'
    redemptionsErrorMessage.value = toSectionErrorMessage(
      error,
      'Prize redemption records could not be loaded right now.'
    )
  }
}

async function loadCompetitionData() {
  await Promise.all([
    loadAssignments(),
    loadLeaderboard(),
    loadShortlist(),
    loadWinners(),
    loadPrizeRedemptions()
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
  await loadCompetitionData()
}, {
  immediate: true
})

async function refreshCompetition() {
  await Promise.all([
    workspace.hackathon.refresh(),
    workspace.prizes.refresh(),
    workspace.roleAssignments.refresh(),
    workspace.winnerTermsVersions.refresh()
  ])
  await loadCompetitionData()
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
    await refreshCompetition()
  } catch (error) {
    mutationError.value = normalizeApiError(error).message
  } finally {
    pendingActionKey.value = null
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
    'Assignment reassigned',
    'The blind review assignment has been moved to a different judge.'
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
    'Assignment force-skipped',
    'The active blind review was skipped and redistributed.'
  )
}

async function reorderShortlist(orderedSubmissionIds: string[]) {
  await runMutation(
    'shortlist-reorder',
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/shortlist/actions/reorder`, {
        method: 'POST',
        body: {
          orderedSubmissionIds
        }
      })
    },
    'Shortlist updated',
    'The final ranking order has been updated without changing judge scores.'
  )
}

async function announceWinners() {
  await runMutation(
    'announce-winners',
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/actions/announce-winners`, {
        method: 'POST'
      })
    },
    'Winners announced',
    'The final competition outcome is now published.'
  )
}

async function completeHackathon() {
  await runMutation(
    'complete-hackathon',
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/actions/complete`, {
        method: 'POST'
      })
    },
    'Hackathon completed',
    'The competition outcome is now final.'
  )
}
</script>

<template>
  <AppContainer class="space-y-8 py-10 sm:py-14">
    <AdminWorkspaceHeader
      eyebrow="Admin Competition"
      :title="currentHackathon ? `${currentHackathon.name} competition` : 'Hackathon competition'"
      description="Monitor blind judging, review the computed leaderboard, manage final shortlist ordering, and publish only the canonical winner actions for the current lifecycle state."
    />

    <AdminHackathonWorkspaceTabs
      v-if="currentHackathon"
      :hackathon-slug="currentHackathon.slug"
      current-surface="competition"
    />

    <AppAlert
      v-if="mutationError"
      color="error"
      variant="soft"
      title="Competition action failed"
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
      v-else-if="workspace.hackathon.status.value === 'pending'"
      color="neutral"
      variant="soft"
      title="Loading competition workspace"
      description="Resolving the hackathon, role assignments, and competition surfaces for this admin session."
    />

    <AppAlert
      v-else-if="currentHackathon && !canManage"
      color="warning"
      variant="soft"
      title="Admin access required"
      description="This hackathon is visible, but the current actor does not have hackathon-admin capabilities for its competition workspace."
    />

    <template v-else-if="currentHackathon">
      <section class="grid gap-4 lg:grid-cols-4">
        <div class="rounded-[1.5rem] border border-default/70 bg-elevated/90 px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Hackathon state
          </p>
          <div class="mt-2 flex items-center gap-3">
            <AppBadge
              data-testid="admin-competition-hackathon-state"
              :color="getHackathonStateColor(currentHackathon.state)"
              variant="soft"
            >
              {{ formatHackathonState(currentHackathon.state) }}
            </AppBadge>
          </div>
        </div>

        <div class="rounded-[1.5rem] border border-default/70 bg-elevated/90 px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Assignment oversight
          </p>
          <p class="mt-2 text-xl font-semibold text-highlighted">
            {{ assignmentSummaryValue }}
          </p>
        </div>

        <div class="rounded-[1.5rem] border border-default/70 bg-elevated/90 px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Ranked submissions
          </p>
          <p class="mt-2 text-xl font-semibold text-highlighted">
            {{ leaderboardSummaryValue }}
          </p>
        </div>

        <div class="rounded-[1.5rem] border border-default/70 bg-elevated/90 px-5 py-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Finalized winners
          </p>
          <p class="mt-2 text-xl font-semibold text-highlighted">
            {{ winnerSummaryValue }}
          </p>
        </div>
      </section>

      <AdminCompetitionAssignmentsPanel
        :hackathon-state="currentHackathon.state"
        :assignments="assignments"
        :judge-choices="judgeChoices"
        :is-loading="assignmentsStatus === 'pending'"
        :error-message="assignmentsStatus === 'error' ? assignmentsErrorMessage : ''"
        :pending-action-key="pendingActionKey"
        @reassign="reassignAssignment"
        @force-skip="forceSkipAssignment"
      />

      <section class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminCompetitionShortlistPanel
          :hackathon-state="currentHackathon.state"
          :leaderboard="leaderboardEntries"
          :shortlist="shortlistEntries"
          :is-leaderboard-loading="leaderboardStatus === 'pending'"
          :leaderboard-error-message="leaderboardStatus === 'error' ? leaderboardErrorMessage : ''"
          :is-shortlist-loading="shortlistStatus === 'pending'"
          :shortlist-error-message="shortlistStatus === 'error' ? shortlistErrorMessage : ''"
          :pending-action-key="pendingActionKey"
          @reorder="reorderShortlist"
        />

        <AdminCompetitionOutcomePanel
          :hackathon-state="currentHackathon.state"
          :winners="winners"
          :winner-terms-title="currentHackathon.currentTerms?.winnerTerms?.title ?? null"
          :outcome-control="outcomeControl"
          :is-loading="winnersStatus === 'pending'"
          :error-message="winnersStatus === 'error' ? winnersErrorMessage : ''"
          :pending-action-key="pendingActionKey"
          @announce-winners="announceWinners"
          @complete-hackathon="completeHackathon"
        />
      </section>

      <AdminCompetitionPrizeRedemptionsPanel
        :hackathon-state="currentHackathon.state"
        :winners="winners"
        :redemptions="redemptions"
        :is-loading="redemptionsStatus === 'pending'"
        :error-message="redemptionsStatus === 'error' ? redemptionsErrorMessage : ''"
      />

      <AppAlert
        v-if="!['judging_preparation', 'judge_review', 'shortlist', 'winners_announced', 'completed'].includes(currentHackathon.state)"
        color="neutral"
        variant="soft"
        title="Competition routing is staged"
        description="This surface becomes operational after submissions close and judging preparation begins."
      />

      <div class="rounded-[1.5rem] border border-default/70 bg-elevated/90 px-5 py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Shortlist status
        </p>
        <p class="mt-2 text-sm text-toned">
          Shortlist entries: {{ shortlistSummaryValue }}.
          Current winner terms: {{ currentHackathon.currentTerms?.winnerTerms?.title ?? 'None selected' }}.
        </p>
      </div>
    </template>
  </AppContainer>
</template>
