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
  normalizeApiError
} from '~/utils/admin-workspace'

const props = defineProps<{
  slug: string
}>()

type LoadStatus = 'idle' | 'pending' | 'success' | 'error'

type JudgeChoice = {
  value: string
  label: string
}

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
      assignment.isInJudgePool && Boolean(assignment.user)
    )
    .map(assignment => ({
      value: assignment.userId,
      label: `${assignment.user.displayName} (${assignment.user.email})`
    }))
)

const showAssignmentsPanel = computed(() =>
  Boolean(currentHackathon.value && ['judging_preparation', 'judge_review'].includes(currentHackathon.value.state))
)

const showShortlistPanel = computed(() =>
  Boolean(currentHackathon.value && ['judge_review', 'shortlist', 'winners_announced', 'completed'].includes(currentHackathon.value.state))
)

const showOutcomePanel = computed(() =>
  Boolean(currentHackathon.value && ['shortlist', 'winners_announced', 'completed'].includes(currentHackathon.value.state))
)

const showPrizeRedemptionsPanel = computed(() =>
  Boolean(currentHackathon.value && ['winners_announced', 'completed'].includes(currentHackathon.value.state))
)

const showCompetitionSections = computed(() =>
  showAssignmentsPanel.value
  || showShortlistPanel.value
  || showOutcomePanel.value
  || showPrizeRedemptionsPanel.value
)

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
    workspace.roleAssignments.refresh()
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
</script>

<template>
  <div class="space-y-8">
    <AppAlert
      v-if="mutationError"
      color="error"
      variant="soft"
      title="Judging action failed"
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
      description="This hackathon is visible, but the current actor does not have hackathon-admin capabilities for its judging workspace."
    />

    <template v-else-if="currentHackathon">
      <template v-if="showCompetitionSections">
        <AdminCompetitionAssignmentsPanel
          v-if="showAssignmentsPanel"
          :hackathon-state="currentHackathon.state"
          :assignments="assignments"
          :judge-choices="judgeChoices"
          :is-loading="assignmentsStatus === 'pending'"
          :error-message="assignmentsStatus === 'error' ? assignmentsErrorMessage : ''"
          :pending-action-key="pendingActionKey"
          @reassign="reassignAssignment"
          @force-skip="forceSkipAssignment"
        />

        <section
          v-if="showShortlistPanel || showOutcomePanel"
          class="grid gap-6"
          :class="showShortlistPanel && showOutcomePanel ? 'xl:grid-cols-[1.15fr_0.85fr]' : ''"
        >
          <AdminCompetitionShortlistPanel
            v-if="showShortlistPanel"
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
            v-if="showOutcomePanel"
            :hackathon-state="currentHackathon.state"
            :winners="winners"
            :winner-terms-title="currentHackathon.currentTerms?.winnerTerms?.title ?? null"
            :is-loading="winnersStatus === 'pending'"
            :error-message="winnersStatus === 'error' ? winnersErrorMessage : ''"
          />
        </section>

        <AdminCompetitionPrizeRedemptionsPanel
          v-if="showPrizeRedemptionsPanel"
          :hackathon-state="currentHackathon.state"
          :winners="winners"
          :redemptions="redemptions"
          :is-loading="redemptionsStatus === 'pending'"
          :error-message="redemptionsStatus === 'error' ? redemptionsErrorMessage : ''"
        />
      </template>
    </template>
  </div>
</template>
