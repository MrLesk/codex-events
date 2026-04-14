<script setup lang="ts">
import type {
  ApiDataResponse,
  ApiListResponse,
  FinalDeliberationView,
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

const finalDeliberation = ref<FinalDeliberationView | null>(null)
const finalDeliberationStatus = ref<LoadStatus>('idle')
const finalDeliberationErrorMessage = ref('')

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
  Boolean(currentHackathon.value && currentHackathon.value.state === 'shortlist')
)

const canLoadFinalDeliberation = computed(() =>
  Boolean(currentHackathon.value && currentHackathon.value.state === 'final_deliberation')
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
  Boolean(currentHackathon.value && ['judging_preparation', 'blind_review'].includes(currentHackathon.value.state))
)

const showShortlistPanel = computed(() =>
  Boolean(
    currentHackathon.value
    && currentHackathon.value.blindReviewCount > 0
    && currentHackathon.value.pitchReviewEnabled
    && currentHackathon.value.state === 'shortlist'
  )
)

const showPitchStagePanel = computed(() =>
  Boolean(currentHackathon.value && currentHackathon.value.state === 'pitch')
)

const showPitchReviewPanel = computed(() =>
  Boolean(currentHackathon.value && currentHackathon.value.state === 'pitch_review')
)

const showFinalDeliberationPanel = computed(() =>
  Boolean(currentHackathon.value && currentHackathon.value.state === 'final_deliberation')
)

const showOutcomePanel = computed(() =>
  Boolean(currentHackathon.value && ['winners_announced', 'completed'].includes(currentHackathon.value.state))
)

const showPrizeRedemptionsPanel = computed(() =>
  Boolean(currentHackathon.value && ['winners_announced', 'completed'].includes(currentHackathon.value.state))
)

const showCompetitionSections = computed(() =>
  showAssignmentsPanel.value
  || showShortlistPanel.value
  || showPitchStagePanel.value
  || showPitchReviewPanel.value
  || showFinalDeliberationPanel.value
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

async function loadFinalDeliberation() {
  if (!canLoadFinalDeliberation.value) {
    finalDeliberation.value = null
    finalDeliberationStatus.value = 'idle'
    finalDeliberationErrorMessage.value = ''
    return
  }

  finalDeliberationStatus.value = 'pending'
  finalDeliberationErrorMessage.value = ''

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
    loadFinalDeliberation(),
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

async function selectFinalists(orderedSubmissionIds: string[]) {
  await runMutation(
    'shortlist-select',
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/shortlist/actions/select-finalists`, {
        method: 'POST',
        body: {
          orderedSubmissionIds
        }
      })
    },
    'Pitch finalists updated',
    'The saved finalist set and finalist order have been updated for pitch review.'
  )
}

async function startPitch() {
  await runMutation(
    'start-pitch',
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/actions/start-pitch`, {
        method: 'POST'
      })
    },
    'Pitch started',
    'The live finalist pitch stage is now open. Judges will receive post-pitch review assignments after this stage ends.'
  )
}

async function startFinalDeliberation() {
  await runMutation(
    'start-final-deliberation',
    async () => {
      await $fetch(`/api/hackathons/${hackathonId.value}/actions/start-final-deliberation`, {
        method: 'POST'
      })
    },
    'Final deliberation started',
    'The final weighted ranking is now ready for admin review.'
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
    'Final order updated',
    'The final ranking order has been updated without changing any judge scores.'
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
          v-if="showShortlistPanel || showFinalDeliberationPanel || showOutcomePanel"
          class="grid gap-6"
          :class="(showShortlistPanel || showFinalDeliberationPanel) && showOutcomePanel ? 'xl:grid-cols-[1.15fr_0.85fr]' : ''"
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
            @select-finalists="selectFinalists"
            @start-pitch="startPitch"
          />

          <AdminCompetitionFinalDeliberationPanel
            v-if="showFinalDeliberationPanel"
            :hackathon="currentHackathon"
            :entries="finalDeliberation?.entries ?? []"
            :final-ranking-submission-ids="finalDeliberation?.finalRankingSubmissionIds ?? []"
            :is-loading="finalDeliberationStatus === 'pending'"
            :error-message="finalDeliberationStatus === 'error' ? finalDeliberationErrorMessage : ''"
            :pending-action-key="pendingActionKey"
            @reorder="reorderFinalDeliberation"
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

        <AppCard
          v-if="showPitchStagePanel"
          class="rounded-xl hackathon-workspace-detail-panel"
        >
          <template #header>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-highlighted">
                Pitch
              </h2>
              <p class="text-sm text-muted">
                Finalist teams are presenting live. Judge assignments for post-pitch scoring are created only when you start pitch review after this stage ends.
              </p>
            </div>
          </template>

          <div class="space-y-4">
            <AppAlert
              color="neutral"
              variant="soft"
              title="Live pitch stage is active"
              description="Use the Operations tab to end the live pitch stage and start pitch review when you are ready for judges to score finalists."
            />
          </div>
        </AppCard>

        <AppCard
          v-if="showPitchReviewPanel"
          class="rounded-xl hackathon-workspace-detail-panel"
        >
          <template #header>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-highlighted">
                Pitch Review
              </h2>
              <p class="text-sm text-muted">
                Judges now see full submission details and submit post-pitch scores on the shared `0-10` scale. When you move on, the platform averages the submitted pitch votes only.
              </p>
            </div>
          </template>

          <div class="space-y-4">
            <AppAlert
              color="neutral"
              variant="soft"
              title="Pitch review is live"
              description="Close pitch review once the submitted votes you want to count are in. Missing pitch votes are excluded from the average."
            />

            <div class="flex flex-wrap gap-3">
              <AppButton
                color="primary"
                :loading="pendingActionKey === 'start-final-deliberation'"
                :disabled="pendingActionKey !== null && pendingActionKey !== 'start-final-deliberation'"
                @click="startFinalDeliberation"
              >
                Move to final deliberation
              </AppButton>
            </div>
          </div>
        </AppCard>

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
